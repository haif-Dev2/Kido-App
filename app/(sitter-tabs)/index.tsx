import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { haptics } from '../../lib/haptics';
import { MAX_CONTENT_WIDTH, useResponsive } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';
import { BookingStatus } from '../../models/types';
import { useAuth } from '../../providers/auth-provider';

const PRIMARY = Colors.light.primary;
const PRIMARY_DARK = '#0D5F5A';
const PRIMARY_SOFT = '#E1F5EE';

type BookingRequest = {
  id: string;
  parentName: string;
  parentPhoto: string | null;
  childCount: number;
  location: string;
  date: string;
  time: string;
  price: number;
  urgent: boolean;
};

type UpcomingBooking = {
  id: string;
  code: string;
  parentName: string;
  parentPhoto: string | null;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: BookingStatus;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function SitterHomeTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { isPhone } = useResponsive();

  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingBooking[]>([]);
  const [stats, setStats] = useState({ completed: 0, rating: 0, reviewsCount: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const contentMaxWidth = isPhone ? undefined : MAX_CONTENT_WIDTH;
  const sitterName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email.split('@')[0]
    : 'there';
  const photoUri = profile?.photo_url
    ?? 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200';

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id, code, status, start_date, end_date, total_price,
          parent:profiles!parent_id(first_name, last_name, photo_url)
        `)
        .eq('babysitter_id', user.id)
        .in('status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS'])
        .order('start_date', { ascending: true })
        .limit(10);

      // Always update from DB (even if empty)
      const pending = (bookings ?? []).filter((b: any) => b.status === 'PENDING');
      const confirmed = (bookings ?? []).filter((b: any) => b.status !== 'PENDING');

      setRequests(pending.map((b: any) => {
        const start = new Date(b.start_date);
        const end = new Date(b.end_date);
        return {
          id: b.id,
          parentName: b.parent ? `${b.parent.first_name} ${b.parent.last_name}`.trim() : 'Parent',
          parentPhoto: b.parent?.photo_url ?? null,
          childCount: 1,
          location: 'Algeria',
          date: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          time: `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} – ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
          price: b.total_price ?? 0,
          urgent: false,
        };
      }));

      setUpcoming(confirmed.map((b: any) => ({
        id: b.id,
        code: b.code ?? b.id.slice(0, 8).toUpperCase(),
        status: b.status as BookingStatus,
        startDate: b.start_date,
        endDate: b.end_date,
        totalPrice: b.total_price ?? 0,
        parentName: b.parent ? `${b.parent.first_name} ${b.parent.last_name}`.trim() : 'Parent',
        parentPhoto: b.parent?.photo_url ?? null,
      })));

      const [{ count: completed }, { count: pendingCount }, { data: reviews }] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('babysitter_id', user.id).eq('status', 'COMPLETED'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('babysitter_id', user.id).eq('status', 'PENDING'),
        supabase.from('reviews').select('rating').eq('babysitter_id', user.id),
      ]);

      const reviewsCount = reviews?.length ?? 0;
      const avgRating = reviewsCount > 0
        ? Math.round((reviews!.reduce((s, r) => s + r.rating, 0) / reviewsCount) * 10) / 10
        : 0;

      setStats({
        completed: completed ?? 0,
        rating: avgRating,
        reviewsCount,
        pending: pendingCount ?? 0,
      });
    } catch (e) {
      console.warn('[sitter-home] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const handleAccept = async (req: BookingRequest) => {
    haptics.medium();
    setActionLoading(req.id);
    try {
      await supabase.from('bookings').update({ status: 'CONFIRMED' }).eq('id', req.id);
      setRequests(prev => prev.filter(r => r.id !== req.id));
      haptics.success();
      Alert.alert('Booking Accepted', `You confirmed the booking for ${req.parentName}.`);
    } catch { } finally { setActionLoading(null); }
  };

  const handleDecline = (req: BookingRequest) => {
    haptics.warning();
    Alert.alert('Decline this booking?', 'The parent will be notified.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(req.id);
            await supabase.from('bookings').update({ status: 'DECLINED' }).eq('id', req.id);
            setRequests(prev => prev.filter(r => r.id !== req.id));
            setActionLoading(null);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F9' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={PRIMARY} />}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={[PRIMARY, PRIMARY_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 28, overflow: 'hidden' }}
        >
          {/* Blobs */}
          <View style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ position: 'absolute', bottom: 0, left: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)' }} />

          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: 16 }}>
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 }}>Kido</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  style={s.iconBtn}
                  onPress={() => router.push('/notifications')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                  {stats.pending > 0 && (
                    <View style={s.bellBadge}>
                      <Text style={s.bellBadgeText}>{stats.pending}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(sitter-tabs)/profile')} activeOpacity={0.85}>
                  <Image
                    source={{ uri: photoUri }}
                    style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)' }}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Greeting */}
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 }}>
              {getGreeting()}, {sitterName.split(' ')[0]}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 20 }}>
              {stats.pending > 0
                ? `You have ${stats.pending} pending request${stats.pending > 1 ? 's' : ''}`
                : upcoming.length > 0
                  ? `${upcoming.length} upcoming booking${upcoming.length > 1 ? 's' : ''} this week`
                  : "No bookings yet — you're ready to accept!"}
            </Text>

            {/* Stats bar */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { icon: 'checkmark-circle', value: String(stats.completed), label: 'Done' },
                { icon: 'star', value: stats.rating > 0 ? stats.rating.toFixed(1) : '–', label: `${stats.reviewsCount} reviews` },
                { icon: 'time', value: String(stats.pending), label: 'Pending' },
              ].map(card => (
                <View key={card.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                  <Ionicons name={card.icon as any} size={18} color="#FFFFFF" style={{ marginBottom: 4 }} />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>{card.value}</Text>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 1 }}>{card.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: 16 }}>
          {/* ── Today's schedule ── */}
          {upcoming.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: PRIMARY }} />
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>Today's schedule</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(sitter-tabs)/jobs')} activeOpacity={0.7}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY }}>See all</Text>
                </TouchableOpacity>
              </View>
              {upcoming.slice(0, 2).map((booking, i) => (
                <Animated.View key={booking.id} entering={FadeInDown.delay(i * 80).duration(400)}>
                  <TouchableOpacity
                    style={s.upcomingCard}
                    onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
                    activeOpacity={0.88}
                  >
                    <View style={[s.upcomingAccent, { backgroundColor: booking.status === BookingStatus.IN_PROGRESS ? '#10B981' : PRIMARY }]} />
                    <View style={{ flex: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Image
                        source={{ uri: booking.parentPhoto ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }}
                        style={{ width: 48, height: 48, borderRadius: 12 }}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>{booking.parentName}</Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                          {new Date(booking.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} – {new Date(booking.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </Text>
                        {booking.status === BookingStatus.IN_PROGRESS && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>In progress</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: PRIMARY }}>{booking.totalPrice.toLocaleString()} DZD</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}

          {/* ── Incoming requests ── */}
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: '#F59E0B' }} />
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>Booking requests</Text>
                {requests.length > 0 && (
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>{requests.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => router.push('/(sitter-tabs)/jobs')} activeOpacity={0.7}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: PRIMARY }}>All jobs</Text>
              </TouchableOpacity>
            </View>

            {requests.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="calendar-outline" size={28} color="#D1D5DB" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 }}>No pending requests</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' }}>New booking requests will appear here</Text>
              </View>
            ) : (
              requests.slice(0, 3).map((req, i) => (
                <Animated.View key={req.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                  <View style={s.requestCard}>
                    {req.urgent && (
                      <View style={s.urgentBadge}>
                        <Ionicons name="flash" size={10} color="#FFFFFF" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>Urgent</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                      <Image
                        source={{ uri: req.parentPhoto ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }}
                        style={{ width: 46, height: 46, borderRadius: 12 }}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{req.parentName}</Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                          {req.date} · {req.time}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{req.location}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Ionicons name="people-outline" size={11} color="#9CA3AF" />
                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{req.childCount} child{req.childCount > 1 ? 'ren' : ''}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: PRIMARY }}>{req.price.toLocaleString()}</Text>
                        <Text style={{ fontSize: 10, color: '#6B7280' }}>DZD</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F5F5F5' }}>
                      <TouchableOpacity
                        style={[s.actionBtn, { borderRightWidth: 1, borderRightColor: '#F5F5F5' }]}
                        onPress={() => handleDecline(req)}
                        disabled={actionLoading === req.id}
                        activeOpacity={0.75}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: actionLoading === req.id ? '#E6F4F0' : PRIMARY_SOFT }]}
                        onPress={() => handleAccept(req)}
                        disabled={actionLoading === req.id}
                        activeOpacity={0.75}
                      >
                        {actionLoading === req.id
                          ? <ActivityIndicator size="small" color={PRIMARY} />
                          : <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>Accept</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5A8A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  upcomingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  upcomingAccent: { width: 4 },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  urgentBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
});