// app/job/[id].tsx
// Sitter job detail screen — mirrors booking/[id].tsx quality from the sitter's perspective.
// Accept/Decline/Complete stay on the jobs list card. This screen is for information + communication.

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { haptics } from '../../lib/haptics';
import { supabase } from '../../lib/supabase';

// New imports for consistent UI
import { MessageCircle, Phone } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';

const PRIMARY = Colors.light.primary;

// ── Status config (sitter perspective) ───────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  title: string; subtitle: string;
  icon: string; gradient: [string, string];
}> = {
  PENDING: {
    title: 'Awaiting your response',
    subtitle: 'Review the details below and accept or decline from your Jobs tab.',
    icon: 'time-outline',
    gradient: ['#F59E0B', '#F97316'],
  },
  CONFIRMED: {
    title: 'Job confirmed ✓',
    subtitle: "You're all set. Get ready for the session.",
    icon: 'checkmark-circle-outline',
    gradient: ['#059669', '#067A6F'],
  },
  IN_PROGRESS: {
    title: 'Session in progress',
    subtitle: 'You are currently on the job.',
    icon: 'play-circle-outline',
    gradient: ['#3B82F6', '#2563EB'],
  },
  COMPLETED: {
    title: 'Job completed ✓',
    subtitle: 'Great work! The parent can now leave you a review.',
    icon: 'ribbon-outline',
    gradient: ['#067A6F', '#0D9488'],
  },
  DECLINED: {
    title: 'You declined this job',
    subtitle: 'The parent was notified and can book another sitter.',
    icon: 'close-circle-outline',
    gradient: ['#DC2626', '#EF4444'],
  },
  CANCELLED: {
    title: 'Booking cancelled',
    subtitle: 'The parent cancelled this booking.',
    icon: 'ban-outline',
    gradient: ['#6B7280', '#9CA3AF'],
  },
  CANCELLED_BY_SITTER: {
    title: 'You cancelled this job',
    subtitle: 'The parent has been notified and can book another sitter.',
    icon: 'close-circle-outline',
    gradient: ['#DC2626', '#EF4444'],
  },
  UNAVAILABLE: {
    title: 'On hold',
    subtitle: 'This request is paused while you complete another session.',
    icon: 'pause-circle-outline',
    gradient: ['#6B7280', '#9CA3AF'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(360).delay(delay)} style={sec.wrap}>
      <Text style={sec.title}>{title}</Text>
      {children}
    </Animated.View>
  );
}

const sec = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 20 },
  title: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
});

// ── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={ir.row}>
      <View style={ir.iconWrap}>
        <Ionicons name={icon as any} size={16} color={PRIMARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value}>{value}</Text>
      </View>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  iconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, color: '#0F172A', fontWeight: '600', marginTop: 1 },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function JobDetailScreen() {
  const { id, passedStatus, passedCancellationReason } = useLocalSearchParams<{
    id: string;
    passedStatus?: string;
    passedCancellationReason?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<{
    id: string;
    code: string;
    status: string;
    startDate: string;
    endDate: string;
    durationHours: number;
    totalPrice: number;
    createdAt: string;
    childrenCount: number;
    childrenAges: number[] | null;
    specialNotes: string | null;
    cancellationReason: string | null;
    parentId: string;
    parentName: string;
    parentPhoto: string | null;
    parentPhone: string | null;
    parentRating: number;
    parentBookingCount: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Mock IDs — use passedStatus passed from navigation
      if (id && typeof id === 'string' && (id.startsWith('mock-') || id.startsWith('req-'))) {
        setJob({
          id,
          code: id.replace('mock-req-', 'REQ-00').replace('req-', 'REQ-00'),
          status: passedStatus ?? 'PENDING',
          startDate: new Date(Date.now() + 3 * 3600000).toISOString(),
          endDate: new Date(Date.now() + 6 * 3600000).toISOString(),
          durationHours: 3,
          totalPrice: 2400,
          createdAt: new Date().toISOString(),
          childrenCount: 2,
          childrenAges: [3, 6],
          specialNotes: 'Sample notes for demo job',
          cancellationReason: passedCancellationReason ?? null,
          parentId: 'mock-parent',
          parentName: id === 'mock-req-1' ? 'Sarah B.' : 'Yasmine K.',
          parentPhoto: id === 'mock-req-1'
            ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'
            : 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
          parentPhone: null,
          parentRating: id === 'mock-req-1' ? 4.8 : 4.5,
          parentBookingCount: id === 'mock-req-1' ? 7 : 3,
        });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id, code, status, cancellation_reason, start_date, end_date, duration_hours, total_price,
            created_at, children_count, children_ages, special_notes, parent_id,
            parent:profiles!parent_id(
              id, first_name, last_name, photo_url, phone,
              parent_details(avg_rating, rating_count)
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          const p = (data.parent as any) ?? {};
          const pd = p.parent_details ?? {};
          setJob({
            id: data.id,
            code: data.code ?? data.id.slice(0, 8).toUpperCase(),
            status: data.status,
            startDate: data.start_date,
            endDate: data.end_date,
            durationHours: data.duration_hours ?? 1,
            totalPrice: data.total_price ?? 0,
            createdAt: data.created_at,
            childrenCount: data.children_count ?? 1,
            childrenAges: data.children_ages ?? null,
            specialNotes: data.special_notes ?? null,
            cancellationReason: data.cancellation_reason ?? null,
            parentId: data.parent_id,
            parentName: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Parent',
            parentPhoto: p.photo_url ?? null,
            parentPhone: p.phone ?? null,
            parentRating: pd.avg_rating ?? 0,
            parentBookingCount: pd.rating_count ?? 0,
          });
        } else {
          if (passedStatus) {
            setJob({
              id: String(id),
              code: String(id).slice(0, 8).toUpperCase(),
              status: passedStatus,
              startDate: new Date().toISOString(),
              endDate: new Date(Date.now() + 3 * 3600000).toISOString(),
              durationHours: 3,
              totalPrice: 2400,
              createdAt: new Date().toISOString(),
              childrenCount: 2,
              childrenAges: [3, 6],
              specialNotes: null,
              cancellationReason: passedCancellationReason ?? null,
              parentId: '',
              parentName: 'Parent',
              parentPhoto: null,
              parentPhone: null,
              parentRating: 0,
              parentBookingCount: 0,
            });
          }
        }
      } catch (e) {
        console.warn('[job detail] load error:', e);
        if (passedStatus) {
          setJob({
            id: String(id),
            code: String(id).slice(0, 8).toUpperCase(),
            status: passedStatus,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 3 * 3600000).toISOString(),
            durationHours: 3,
            totalPrice: 2400,
            createdAt: new Date().toISOString(),
            childrenCount: 2,
            childrenAges: [3, 6],
            specialNotes: null,
            cancellationReason: passedCancellationReason ?? null,
            parentId: '',
            parentName: 'Parent',
            parentPhoto: null,
            parentPhone: null,
            parentRating: 0,
            parentBookingCount: 0,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, passedStatus, passedCancellationReason]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F9' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F9' }}>
        <Ionicons name="alert-circle-outline" size={40} color="#9CA3AF" />
        <Text style={{ fontSize: 15, color: '#6B7280', marginTop: 10 }}>Job not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 14, color: PRIMARY, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const effectiveCancellationReason = job.cancellationReason ?? passedCancellationReason ?? '';
  const statusKey =
    job.status === 'CANCELLED' && effectiveCancellationReason === 'sitter_cancelled'
      ? 'CANCELLED_BY_SITTER'
      : job.status;
  const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.PENDING;

  const isActive = ['CONFIRMED', 'IN_PROGRESS'].includes(String(job.status));

  // Format children ages
  const agesLabel = job.childrenAges && job.childrenAges.length > 0
    ? job.childrenAges.map(a => a === 0 ? '< 1 yr' : `${a} yr`).join(', ')
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      {/* ── Top bar ── */}
      <View style={[s.topBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          onPress={() => { haptics.tap(); router.back(); }}
          style={s.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.topBarLabel}>JOB DETAIL</Text>
          <Text style={s.topBarCode}>#{job.code}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status hero ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ marginHorizontal: 16, marginTop: 12 }}>
          <LinearGradient
            colors={cfg.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroGradient}
          >
            <Animated.View entering={ZoomIn.duration(380).delay(150)} style={s.heroIconWrap}>
              <Ionicons name={cfg.icon as any} size={26} color="#FFFFFF" />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>{cfg.title}</Text>
              <Text style={s.heroSubtitle}>{cfg.subtitle}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Parent card ── */}
        <Section title="Parent" delay={80}>
          <View style={s.parentCard}>
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: job.parentPhoto ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' }}
                style={s.parentAvatar}
                contentFit="cover"
              />
              {job.parentRating > 0 && (
                <View style={s.ratingBadge}>
                  <Ionicons name="star" size={9} color="#FFFFFF" />
                  <Text style={s.ratingBadgeText}>{job.parentRating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.parentName}>{job.parentName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                {job.parentRating > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Ionicons
                        key={i}
                        name="star"
                        size={12}
                        color={i <= Math.round(job.parentRating) ? '#F5A524' : '#E5E7EB'}
                      />
                    ))}
                    <Text style={s.parentRatingText}>{job.parentRating.toFixed(1)}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>No rating yet</Text>
                )}
                {job.parentBookingCount > 0 && (
                  <>
                    <Text style={{ fontSize: 11, color: '#D1D5DB' }}>·</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>
                      {job.parentBookingCount} booking{job.parentBookingCount !== 1 ? 's' : ''}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </Section>

        {/* ── Booking details ── */}
        <Section title="Booking details" delay={140}>
          <View style={s.infoCard}>
            <InfoRow icon="calendar-outline" label="Date" value={formatDate(job.startDate)} />
            <InfoRow
              icon="time-outline"
              label="Time"
              value={`${formatTime(job.startDate)} – ${formatTime(job.endDate)}`}
            />
            <InfoRow
              icon="hourglass-outline"
              label="Duration"
              value={`${job.durationHours} hour${job.durationHours !== 1 ? 's' : ''}`}
            />
            <InfoRow
              icon="people-outline"
              label="Children"
              value={`${job.childrenCount} child${job.childrenCount !== 1 ? 'ren' : ''}${agesLabel ? ` · ${agesLabel}` : ''}`}
            />
            {job.specialNotes && (
              <InfoRow icon="document-text-outline" label="Notes" value={job.specialNotes} />
            )}
          </View>
        </Section>

        {/* ── Price ── */}
        <Section title="Earnings" delay={180}>
          <View style={s.priceCard}>
            <View>
              <Text style={s.priceLabel}>Total earnings</Text>
              <Text style={s.priceValue}>{job.totalPrice.toLocaleString()} DZD</Text>
            </View>
            <View style={s.pricePill}>
              <Ionicons name="wallet-outline" size={14} color={PRIMARY} />
              <Text style={s.pricePillText}>{job.durationHours}h session</Text>
            </View>
          </View>
        </Section>

        {/* ── Request date ── */}
        <Animated.View entering={FadeInDown.duration(340).delay(220)} style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Text style={{ fontSize: 11, color: '#C4C4C4', textAlign: 'center' }}>
            Requested on {new Date(job.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </Animated.View>

        {/* ── Actions — Message & Call using shared Button component ── */}
        {isActive && (
          <Animated.View
            entering={FadeInDown.duration(340).delay(260)}
            className="mx-4 mt-6 gap-3"
          >
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Message"
                  variant="soft"
                  size="lg"
                  leftIcon={MessageCircle}
                  onPress={() => {
                    haptics.light();
                    router.push({
                      pathname: '/chat/[sitterId]' as any,
                      params: {
                        sitterId: job.parentId,
                        sitterName: job.parentName,
                        sitterAvatar: job.parentPhoto ?? '',
                        bookingId: job.id,
                      },
                    });
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Call"
                  variant="secondary"
                  size="lg"
                  leftIcon={Phone}
                  onPress={() => {
                    haptics.light();
                    if (!job.parentPhone) {
                      Alert.alert('Not available', 'No phone number on file for this parent.');
                      return;
                    }
                    Linking.openURL(`tel:${job.parentPhone.replace(/\s/g, '')}`).catch(() =>
                      Alert.alert('Cannot call', 'Unable to open the phone app.')
                    );
                  }}
                />
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 },
  topBarCode: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginTop: 1 },

  // Hero
  heroGradient: {
    borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'flex-start', gap: 16,
  },
  heroIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', lineHeight: 22 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 4, lineHeight: 18 },

  // Parent card
  parentCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  parentAvatar: { width: 56, height: 56, borderRadius: 16 },
  ratingBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: '#F5A524', borderRadius: 99,
    paddingHorizontal: 5, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  ratingBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  parentName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  parentRatingText: { fontSize: 12, fontWeight: '600', color: '#374151', marginLeft: 3 },

  // Info card
  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    overflow: 'hidden',
  },

  // Price card
  priceCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  priceLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  priceValue: { fontSize: 24, fontWeight: '800', color: PRIMARY, marginTop: 2 },
  pricePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E1F5EE', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99,
  },
  pricePillText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
});