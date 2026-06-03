import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar,
  Check,
  ChevronLeft,
  CircleAlert, CircleCheck,
  Clock,
  Hourglass,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  Star,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SitterDistanceTracker } from '../../components/SitterDistanceTracker';
import { Avatar } from '../../components/ui/Avatar';
import { Button, IconButton } from '../../components/ui/Button';
import { Map } from '../../components/ui/Map';
import { Rating } from '../../components/ui/Rating';
import { fetchSitterById } from '../../lib/api/sitters';
import { haptics } from '../../lib/haptics';
import { MOCK_BOOKINGS, type MockBooking } from '../../lib/mock/bookings';
import { MOCK_SITTERS, type MockSitter } from '../../lib/mock/sitters';
import { READING_MAX_WIDTH, useResponsive } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';
import { BookingStatus } from '../../models/types';

/**
 * Booking Detail — premium status-first layout with hero gradient,
 * glassmorphism cards, and smooth entry animations.
 */
export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  const [booking, setBooking] = useState<MockBooking>(MOCK_BOOKINGS[0]);
  const [sitter, setSitter] = useState<MockSitter>(MOCK_SITTERS[0]);
  const [status, setStatus] = useState<BookingStatus>(MOCK_BOOKINGS[0].status);

  useEffect(() => {
    async function load() {
      // Try mock first
      const mockBooking = MOCK_BOOKINGS.find(b => String(b.id) === String(id));
      if (mockBooking) {
        setBooking(mockBooking);
        setStatus(mockBooking.status);
        setSitter(MOCK_SITTERS.find(s => s.id === mockBooking.sitterId) ?? MOCK_SITTERS[0]);
        return;
      }

      // Try Supabase
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id, code, status, start_date, end_date, duration_hours, total_price, created_at, babysitter_id,
            sitter:profiles!babysitter_id(first_name, last_name, photo_url)
          `)
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          const sp = (data.sitter as any) ?? {};
          const loaded: MockBooking = {
            id: data.id,
            code: data.code ?? String(id).slice(0, 8).toUpperCase(),
            status: data.status as BookingStatus,
            startDate: data.start_date,
            endDate: data.end_date,
            duration: data.duration_hours ?? 1,
            totalPrice: data.total_price ?? 0,
            createdAt: data.created_at,
            babySitterId: data.babysitter_id,
            parentId: 0,
            sitterId: 0,
            sitterName: `${sp.first_name ?? ''} ${sp.last_name ?? ''}`.trim() || 'Sitter',
            sitterPhoto: sp.photo_url ?? MOCK_SITTERS[0].photo,
          };
          setBooking(loaded);
          setStatus(loaded.status);
          const sitterData = await fetchSitterById(data.babysitter_id);
          setSitter(sitterData ?? MOCK_SITTERS[0]);
          return;
        }
      } catch {}

      // Fallback
      setBooking(MOCK_BOOKINGS[0]);
      setStatus(MOCK_BOOKINGS[0].status);
      setSitter(MOCK_SITTERS[0]);
    }
    load();
  }, [id]);

  const dateLabel = formatDate(booking.startDate);
  const timeLabel = `${timeOf(booking.startDate)} – ${timeOf(booking.endDate)}`;

  const m = statusConfig[status];

  return (
    <View className="flex-1 bg-surface-1 items-center">
      {/* Top bar — caps width on tablet+ to align with the body content. */}
      <View
        style={{ paddingTop: insets.top + 4, width: '100%', maxWidth: contentMaxWidth }}
        className="px-4 pb-3 flex-row items-center bg-surface-1 z-10"
      >
        <IconButton icon={ChevronLeft} label="Back" variant="ghost" size={44} onPress={() => router.back()} />
        <View className="flex-1 items-center">
          <Text className="text-overline text-text-muted">BOOKING</Text>
          <Text className="text-body font-body-bold text-text-primary" style={{ fontVariant: ['tabular-nums'] }}>
            #{booking.code}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ width: '100%', maxWidth: contentMaxWidth }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status Hero with gradient ── */}
        <Animated.View entering={FadeInDown.duration(400)} className="mx-4 mt-2">
          <LinearGradient
            colors={m.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 24 }}
          >
            <View className="flex-row items-start gap-4">
              <Animated.View
                entering={ZoomIn.duration(400).delay(200)}
                className="w-14 h-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}
              >
                <m.icon size={26} color="#FFFFFF" strokeWidth={2} />
              </Animated.View>
              <View className="flex-1">
                <Text className="text-title-lg font-display-bold text-white">{m.title}</Text>
                <Text className="text-body font-body text-white/80 mt-1">{m.subtitle}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Sitter card ── */}
        <Animated.View entering={FadeInDown.duration(380).delay(80)} className="mx-4 mt-5">
          <Pressable
            onPress={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
            accessibilityRole="button"
            accessibilityLabel={`Open ${sitter.firstName}'s profile`}
            className="bg-surface-2 rounded-xl border border-border p-4 flex-row items-center gap-3"
            style={{
              shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 }, elevation: 2,
            }}
          >
            <Avatar uri={sitter.photo} name={`${sitter.firstName} ${sitter.lastName}`} size={56} verified={sitter.identityVerified} />
            <View className="flex-1">
              <Text className="text-title font-display-bold text-text-primary">
                {sitter.firstName} {sitter.lastName}
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <MapPin size={12} color="#6B6A62" />
                <Text className="text-body-sm font-body text-text-secondary">
                  {sitter.neighborhood} · {sitter.distanceKm}km
                </Text>
              </View>
              <View className="flex-row items-center gap-3 mt-1.5">
                <Rating value={sitter.averageRating} count={sitter.reviewsCount} size="sm" />
                {sitter.identityVerified && (
                  <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-pill bg-success-soft">
                    <Shield size={10} color="#059669" strokeWidth={2.5} />
                    <Text className="text-caption font-body-bold text-success">Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── Real-time location tracking ── */}
        {(status === BookingStatus.CONFIRMED || status === BookingStatus.IN_PROGRESS) && (
          <Animated.View entering={FadeInDown.duration(380).delay(120)} className="mx-4 mt-5">
            <SitterDistanceTracker
              sitterId={sitter.id}
              sitterName={`${sitter.firstName} ${sitter.lastName}`}
            />
          </Animated.View>
        )}

        {/* ── Sitter location map ── */}
        {(status === BookingStatus.CONFIRMED || status === BookingStatus.IN_PROGRESS) && (
          <Section title="Sitter location" delay={130}>
            <View style={{ borderRadius: 16, overflow: 'hidden' }}>
              <Map
                center={{ latitude: sitter.latitude, longitude: sitter.longitude }}
                markers={[{
                  latitude: sitter.latitude,
                  longitude: sitter.longitude,
                  title: `${sitter.firstName} ${sitter.lastName}`,
                  description: sitter.neighborhood,
                }]}
                height={200}
                showUserLocation
              />
            </View>
          </Section>
        )}

        {/* ── Appointment details ── */}
        <Section title="Appointment" delay={140}>
          <View
            className="bg-surface-2 rounded-xl border border-border overflow-hidden"
            style={{
              shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 }, elevation: 1,
            }}
          >
            <InfoRow icon={Calendar} label="Date" value={dateLabel} />
            <View className="mx-4 h-px bg-border" />
            <InfoRow icon={Clock} label="Time" value={timeLabel} />
            <View className="mx-4 h-px bg-border" />
            <InfoRow icon={Hourglass} label="Duration" value={`${booking.duration} hour${booking.duration > 1 ? 's' : ''}`} />
          </View>
        </Section>

        {/* ── Price breakdown ── */}
        <Section title="Price breakdown" delay={180}>
          <View
            className="bg-surface-2 rounded-xl border border-border p-4 gap-3"
            style={{
              shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 }, elevation: 1,
            }}
          >
            <PriceRow label={`${booking.duration} hours × ${sitter.hourlyRate} DZD`} value={`${booking.totalPrice} DZD`} />
            <View className="h-px bg-border" />
            <View className="flex-row items-center justify-between">
              <Text className="text-body-lg font-body-bold text-text-primary">Total</Text>
              <View className="flex-row items-baseline gap-1">
                <Text
                  className="text-title-lg font-display-bold text-primary"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {booking.totalPrice}
                </Text>
                <Text className="text-body-sm font-body text-text-muted">DZD</Text>
              </View>
            </View>
          </View>
        </Section>

        {/* ── Timeline ── */}
        <Section title="Status timeline" delay={220}>
          <Timeline status={status} createdAt={booking.createdAt} />
        </Section>

        {/* ── Action buttons ── */}
        <Animated.View
          entering={FadeInUp.duration(380).delay(280)}
          className="mx-4 mt-6 gap-3"
        >
          {status === BookingStatus.COMPLETED && (
            <Button
              label="Leave a review"
              variant="primary"
              size="lg"
              leftIcon={Star}
              hapticFeedback="success"
              onPress={() => router.push({ pathname: '/review/new/[bookingId]', params: { bookingId: String(booking.id) } })}
            />
          )}

          {status === BookingStatus.CONFIRMED && (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Message"
                  variant="soft"
                  size="lg"
                  leftIcon={MessageCircle}
                  onPress={() => router.push({
                    pathname: '/chat/[sitterId]' as any,
                    params: {
                      sitterId: String(sitter.uuid ?? sitter.id),
                      sitterName: `${sitter.firstName} ${sitter.lastName}`,
                      sitterAvatar: sitter.photo,
                    },
                  })}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Call"
                  variant="secondary"
                  size="lg"
                  leftIcon={Phone}
                  onPress={() => {
                    haptics.medium();
                    const phone = sitter?.phone;
                    if (!phone) {
                      Alert.alert('Not available', 'This sitter has no phone number on file.');
                      return;
                    }
                    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() =>
                      Alert.alert('Cannot call', 'Your device could not open the phone app.')
                    );
                  }}
                />
              </View>
            </View>
          )}

          {(status === BookingStatus.DECLINED || status === BookingStatus.CANCELLED || status === BookingStatus.UNAVAILABLE) && (
            <Button
              label="Find another sitter"
              variant="primary"
              size="lg"
              onPress={() => router.push('/(tabs)/search')}
            />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ──────────────────────────────── pieces ──────────────────────────────── */

const statusConfig: Record<BookingStatus, {
  title: string; subtitle: string; icon: any;
  gradient: string[];
}> = {
  [BookingStatus.PENDING]: {
    title: 'Waiting for sitter',
    subtitle: 'Your request is in her inbox — she usually replies quickly.',
    icon: Hourglass,
    gradient: ['#F59E0B', '#F97316'],
  },
  [BookingStatus.CONFIRMED]: {
    title: 'Confirmed ✓',
    subtitle: "You're all set. We'll remind you 1 hour before.",
    icon: CircleCheck,
    gradient: ['#059669', '#067A6F'],
  },
  [BookingStatus.IN_PROGRESS]: {
    title: 'In Progress',
    subtitle: 'The sitter is currently taking care of your children.',
    icon: Clock,
    gradient: ['#3B82F6', '#2563EB'],
  },
  [BookingStatus.COMPLETED]: {
    title: 'All done',
    subtitle: 'How was it? Your review helps other families.',
    icon: Check,
    gradient: ['#067A6F', '#0D9488'],
  },
  [BookingStatus.CANCELLED]: {
    title: 'Cancelled',
    subtitle: 'No charge. You can book again anytime.',
    icon: X,
    gradient: ['#DC2626', '#EF4444'],
  },
  [BookingStatus.DECLINED]: {
    title: 'Declined',
    subtitle: 'Try a similar sitter nearby — there are many around.',
    icon: CircleAlert,
    gradient: ['#DC2626', '#E11D48'],
  },
  [BookingStatus.UNAVAILABLE]: {
    title: 'On hold ⏸',
    subtitle: 'This sitter is currently with another family. You will be notified when she is free.',
    icon: Clock,
    gradient: ['#6B7280', '#9CA3AF'],
  },
};

function Timeline({ status, createdAt }: { status: BookingStatus; createdAt: string }) {
  const steps = [
    { label: 'Requested', active: true, when: shortDate(createdAt) },
    {
      label: 'Sitter confirms',
      active: status !== BookingStatus.PENDING && status !== BookingStatus.CANCELLED,
      when: status === BookingStatus.PENDING ? 'Waiting…' : status === BookingStatus.DECLINED ? 'Declined' : shortDate(createdAt),
    },
    {
      label: 'Care day',
      active: status === BookingStatus.COMPLETED,
      when: status === BookingStatus.COMPLETED ? 'Today' : status === BookingStatus.CONFIRMED ? 'Upcoming' : '—',
    },
    {
      label: 'Completed',
      active: status === BookingStatus.COMPLETED,
      when: status === BookingStatus.COMPLETED ? 'Done' : '—',
    },
  ];

  return (
    <View
      className="bg-surface-2 rounded-xl border border-border p-4"
      style={{
        shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 }, elevation: 1,
      }}
    >
      {steps.map((s, i) => (
        <View key={s.label} className="flex-row items-start">
          <View className="items-center" style={{ width: 28 }}>
            <Animated.View
              entering={ZoomIn.duration(300).delay(260 + i * 80)}
              className={`w-5 h-5 rounded-full items-center justify-center ${
                s.active ? 'bg-primary' : 'bg-surface-3 border border-border'
              }`}
            >
              {s.active && <Check size={11} color="#FFF" strokeWidth={3} />}
            </Animated.View>
            {i < steps.length - 1 && (
              <View
                className={`w-0.5 ${s.active && steps[i + 1].active ? 'bg-primary' : 'bg-border'}`}
                style={{ height: 32 }}
              />
            )}
          </View>
          <View className="flex-1 ml-3 pb-4">
            <Text className={`text-body-lg font-body-bold ${s.active ? 'text-text-primary' : 'text-text-muted'}`}>
              {s.label}
            </Text>
            <Text className="text-body-sm font-body text-text-muted">{s.when}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(380).delay(delay)} className="mx-4 mt-6">
      <Text className="text-title font-display-bold text-text-primary mb-3">{title}</Text>
      {children}
    </Animated.View>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3.5">
      <View className="w-10 h-10 rounded-xl bg-primary-soft items-center justify-center">
        <Icon size={18} color="#067A6F" strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text className="text-caption text-text-muted font-body-bold">{label.toUpperCase()}</Text>
        <Text className="text-body-lg font-body-semi text-text-primary mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-body-lg font-body text-text-secondary">{label}</Text>
      <Text className="text-body-lg font-body-semi text-text-primary" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

/* ──────────────────────────────── fmt ──────────────────────────────── */

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeOf(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}