import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/auth-provider';
import { haptics } from '../lib/haptics';
import { BookingStatus } from '../models/types';
import { MAX_CONTENT_WIDTH, useResponsive } from '../lib/responsive';

const TEAL = '#007D8C';
const TEAL_DARK = '#005F6B';

type UpcomingBooking = {
  id: string;
  code: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  parentName: string;
  parentPhoto: string | null;
  totalPrice: number;
};

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
  expiresIn: string | null;
};

const FALLBACK_REQUESTS: BookingRequest[] = [
  {
    id: 'req-1',
    parentName: 'Sarah B.',
    parentPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    childCount: 2,
    location: 'Hydra',
    date: 'Tonight',
    time: '7:00 PM – 10:00 PM',
    price: 2400,
    urgent: true,
    expiresIn: '1h',
  },
  {
    id: 'req-2',
    parentName: 'Yasmine K.',
    parentPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    childCount: 1,
    location: 'Bab Ezzouar',
    date: 'Sat, May 9',
    time: '9:30 AM – 1:00 PM',
    price: 2200,
    urgent: false,
    expiresIn: null,
  },
];

const MOCK_UPCOMING = {
  familyName: 'Mansouri Family',
  familyPhoto: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=100',
  childInfo: '2 kids · ages 4, 7',
  verified: true,
  time: '5:30 PM',
  duration: '3h',
  location: 'El Biar',
  countdown: 'in 7h 15m',
};

const TOP_TABS = ['Schedule', 'Messages', 'Earnings', 'Report'] as const;

export default function SitterHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const { isPhone } = useResponsive();

  // Use a single column on phones; on tablet/desktop split into a 2-column
  // layout where the primary feed (upcoming + requests) is on the left and
  // earnings / tips / quick actions sit on the right.
  const twoCol = !isPhone;
  const contentMaxWidth = isPhone ? undefined : MAX_CONTENT_WIDTH;

  const [upcoming, setUpcoming] = useState<UpcomingBooking[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>(FALLBACK_REQUESTS);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('Schedule');
  const [stats, setStats] = useState({ completed: 0, rating: 0, reviewsCount: 0, pending: 0 });

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

      if (bookings) {
        const pending = bookings.filter((b: any) => b.status === 'PENDING');
        const confirmed = bookings.filter((b: any) => b.status !== 'PENDING');

        // Map pending bookings to request cards
        if (pending.length > 0) {
          setRequests(pending.map((b: any) => {
            const start = new Date(b.start_date);
            const end = new Date(b.end_date);
            return {
              id: b.id,
              parentName: b.parent
                ? `${b.parent.first_name} ${b.parent.last_name}`.trim()
                : 'Parent',
              parentPhoto: b.parent?.photo_url ?? null,
              childCount: 1,
              location: 'Algiers',
              date: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
              time: `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} – ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
              price: b.total_price ?? 0,
              urgent: false,
              expiresIn: null,
            };
          }));
        }

        setUpcoming(confirmed.map((b: any) => ({
          id: b.id,
          code: b.code ?? b.id.slice(0, 8).toUpperCase(),
          status: b.status as BookingStatus,
          startDate: b.start_date,
          endDate: b.end_date,
          totalPrice: b.total_price ?? 0,
          parentName: b.parent
            ? `${b.parent.first_name} ${b.parent.last_name}`.trim()
            : 'Parent',
          parentPhoto: b.parent?.photo_url ?? null,
        })));
      }

      const [{ count: completed }, { count: pending }, { data: reviews }] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('babysitter_id', user.id)
          .eq('status', 'COMPLETED'),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('babysitter_id', user.id)
          .eq('status', 'PENDING'),
        supabase
          .from('reviews')
          .select('rating')
          .eq('babysitter_id', user.id),
      ]);

      const reviewsCount = reviews?.length ?? 0;
      const avgRating = reviewsCount > 0
        ? Math.round((reviews!.reduce((s, r) => s + r.rating, 0) / reviewsCount) * 10) / 10
        : 0;

      setStats({
        completed: completed ?? 0,
        rating: avgRating,
        reviewsCount,
        pending: pending ?? 0,
      });
    } catch (e) {
      console.warn('[sitter-home] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const handleAccept = async (requestId: string) => {
    haptics.medium();
    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'CONFIRMED' })
        .eq('id', requestId);

      // Optimistic: remove from requests, add to upcoming
      const accepted = requests.find(r => r.id === requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (accepted) {
        setUpcoming(prev => [...prev, {
          id: requestId,
          code: requestId.slice(0, 8).toUpperCase(),
          status: BookingStatus.CONFIRMED,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          totalPrice: accepted.price,
          parentName: accepted.parentName,
          parentPhoto: accepted.parentPhoto,
        }]);
      }

      if (error) console.warn('[accept] supabase error:', error.message);
      haptics.success();
      Alert.alert('✅ Booking Accepted', `You confirmed the booking for ${accepted?.parentName ?? 'the parent'}. They will be notified.`);
    } catch (e) {
      console.warn('[accept] error:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = (requestId: string) => {
    haptics.warning();
    Alert.alert(
      'Decline this booking?',
      'The parent will be notified and can book another sitter.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(requestId);
            try {
              await supabase
                .from('bookings')
                .update({ status: 'DECLINED' })
                .eq('id', requestId);
              setRequests(prev => prev.filter(r => r.id !== requestId));
              haptics.tap();
            } catch (e) {
              console.warn('[decline] error:', e);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const sitterName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email.split('@')[0]
    : 'Sitter';
  const sitterPhoto = profile?.photo_url
    ?? 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200';

  if (loading) {
    return (
      <View style={[s.page, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  // === The screen's actual scrollable content (placed inside a centered
  //     max-width column on wide viewports).
  const scrollContent = (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={TEAL} />
      }
    >
      {/* Greeting hero */}
      <LinearGradient
        colors={[TEAL, TEAL_DARK]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.greetingHero}
      >
        <View style={s.greetingCircle1} />
        <View style={s.greetingCircle2} />

        <View style={s.greetingRow}>
          <Image source={{ uri: sitterPhoto }} style={s.greetingAvatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={s.greetingHello}>Hello,</Text>
            <Text style={s.greetingName} numberOfLines={1}>{sitterName}</Text>
            <View style={s.onlineRow}>
              <View style={s.onlineDot} />
              <Text style={s.onlineText}>Online · accepting bookings</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            {stats.pending > 0 ? (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{stats.pending}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Stats overview — 4 cards inside the hero */}
        <View style={s.statsGrid}>
          <SitterStatCard
            icon="checkmark-circle"
            value={String(stats.completed)}
            label="Completed"
          />
          <SitterStatCard
            icon="star"
            value={stats.rating > 0 ? stats.rating.toFixed(1) : '–'}
            label={stats.reviewsCount > 0 ? `${stats.reviewsCount} reviews` : 'No reviews'}
          />
          <SitterStatCard
            icon="time"
            value={String(stats.pending)}
            label="Pending"
          />
          <SitterStatCard
            icon="trending-up"
            value="98%"
            label="Response"
          />
        </View>
      </LinearGradient>

      {/* Top tabs */}
      <View style={s.topTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topTabsScroll}>
          {TOP_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.topTab, activeTab === tab && s.topTabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[s.topTabText, activeTab === tab && s.topTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Body — single column on phone, 2-col on tablet+ */}
      <View style={twoCol ? s.bodyTwoCol : undefined}>
        <View style={twoCol ? s.colMain : undefined}>
          {/* Up next today */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Up next today</Text>
            <Text style={s.countdown}>
              {upcoming.length > 1
                ? `+${upcoming.length - 1} more this week`
                : MOCK_UPCOMING.countdown}
            </Text>
          </View>

          <Animated.View entering={FadeInDown.duration(400)} style={s.upNextCard}>
            <LinearGradient
              colors={['#1A2332', '#263445', '#2D4050']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
            />
            <View style={s.upNextDecorCircle} />

            <View style={s.upNextContent}>
              <View style={s.upNextLeft}>
                <View style={s.upNextAvatarRow}>
                  <Image
                    source={{ uri: MOCK_UPCOMING.familyPhoto }}
                    style={s.upNextAvatar}
                    contentFit="cover"
                  />
                  {MOCK_UPCOMING.verified && (
                    <View style={s.verifiedBadge}>
                      <Ionicons name="checkmark" size={8} color="#FFF" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.upNextFamily}>{MOCK_UPCOMING.familyName}</Text>
                  <Text style={s.upNextInfo}>{MOCK_UPCOMING.childInfo}</Text>
                </View>
              </View>

              <Pressable style={s.upNextArrow}>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </Pressable>
            </View>

            <View style={s.upNextBadges}>
              <View style={s.badge}>
                <Ionicons name="time-outline" size={12} color="#FFF" />
                <Text style={s.badgeText}>{MOCK_UPCOMING.time}</Text>
              </View>
              <View style={s.badge}>
                <Ionicons name="timer-outline" size={12} color="#FFF" />
                <Text style={s.badgeText}>{MOCK_UPCOMING.duration}</Text>
              </View>
              <View style={s.badge}>
                <Ionicons name="location-outline" size={12} color="#FFF" />
                <Text style={s.badgeText}>{MOCK_UPCOMING.location}</Text>
              </View>
            </View>
          </Animated.View>

          {/* New requests */}
          <View style={s.newRequestsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.sectionTitle}>New requests</Text>
              {requests.length > 0 && (
                <View style={s.newBadge}>
                  <Text style={s.newBadgeText}>{requests.length} new</Text>
                </View>
              )}
            </View>
          </View>

          {requests.length === 0 ? (
            <View style={s.emptyRequests}>
              <Ionicons name="calendar-outline" size={32} color={TEAL} />
              <Text style={s.emptyRequestsText}>No pending requests</Text>
              <Text style={s.emptyRequestsSub}>New booking requests will appear here</Text>
            </View>
          ) : requests.map((req, idx) => (
            <Animated.View
              key={req.id}
              entering={FadeInDown.duration(400).delay(100 + idx * 80)}
            >
              <View style={s.requestCard}>
                {req.urgent && (
                  <View style={s.urgentRow}>
                    <Ionicons name="flash" size={12} color="#DC2626" />
                    <Text style={s.urgentText}>URGENT · expires in {req.expiresIn}</Text>
                  </View>
                )}

                <View style={s.requestParentRow}>
                  <Image
                    source={{ uri: req.parentPhoto ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }}
                    style={s.requestAvatar}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.requestName}>{req.parentName}</Text>
                    <View style={s.requestMeta}>
                      <Ionicons name="people-outline" size={12} color="#6B7280" />
                      <Text style={s.requestMetaText}>{req.childCount} {req.childCount === 1 ? 'child' : 'kids'}</Text>
                      <Ionicons name="location-outline" size={12} color="#6B7280" style={{ marginLeft: 8 }} />
                      <Text style={s.requestMetaText}>{req.location}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.requestDateRow}>
                  <View style={s.requestDateLeft}>
                    <View style={s.dateIcon}>
                      <Ionicons name="calendar-outline" size={14} color={TEAL} />
                    </View>
                    <View>
                      <Text style={s.requestDate}>{req.date}</Text>
                      <Text style={s.requestTime}>{req.time}</Text>
                    </View>
                  </View>
                  <View style={s.requestPriceCol}>
                    <Text style={s.requestPrice}>{req.price}</Text>
                    <Text style={s.requestPriceUnit}>DZD</Text>
                  </View>
                </View>

                <View style={s.requestActions}>
                  <TouchableOpacity
                    style={[s.declineBtn, actionLoading === req.id && { opacity: 0.5 }]}
                    onPress={() => handleDecline(req.id)}
                    activeOpacity={0.8}
                    disabled={actionLoading !== null}
                  >
                    <Ionicons name="close-outline" size={16} color="#6B7280" />
                    <Text style={s.declineBtnText}>Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.acceptBtn, actionLoading === req.id && { opacity: 0.7 }]}
                    onPress={() => handleAccept(req.id)}
                    activeOpacity={0.85}
                    disabled={actionLoading !== null}
                  >
                    <LinearGradient
                      colors={[TEAL, '#00A99D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
                    />
                    {actionLoading === req.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                        <Text style={s.acceptBtnText}>Accept Booking</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Right column on tablet/desktop: earnings + quick actions + tips */}
        <View style={twoCol ? s.colSide : undefined}>
          {/* Earnings card */}
          <Animated.View entering={FadeInDown.duration(400).delay(150)} style={s.earningsCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={s.cardLabel}>This week</Text>
              <View style={s.trendChip}>
                <Ionicons name="trending-up" size={11} color="#10B981" />
                <Text style={s.trendText}>+12%</Text>
              </View>
            </View>
            <Text style={s.earningsValue}>
              28 400 <Text style={s.earningsUnit}>DZD</Text>
            </Text>
            <Text style={s.earningsHint}>Across {stats.completed} completed bookings</Text>

            <View style={s.miniBars}>
              {[40, 28, 65, 52, 80, 45, 70].map((h, i) => (
                <View key={i} style={s.miniBarTrack}>
                  <View style={[s.miniBar, { height: `${h}%` as any }]} />
                </View>
              ))}
            </View>
            <View style={s.miniBarLabels}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <Text key={i} style={s.miniBarLabel}>{d}</Text>
              ))}
            </View>
          </Animated.View>

          {/* Quick actions */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={s.actionsCard}>
            <Text style={s.cardLabel}>Quick actions</Text>
            <View style={s.actionGrid}>
              <ActionTile icon="calendar" label="Availability" tint={TEAL} />
              <ActionTile icon="chatbubbles" label="Messages" tint="#EC4899" />
              <ActionTile icon="document-text" label="Reports" tint="#F59E0B" />
              <ActionTile icon="settings" label="Settings" tint="#6366F1" />
            </View>
          </Animated.View>

          {/* Pro tip */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={s.proTipCard}>
            <View style={s.proTipIcon}>
              <Ionicons name="bulb" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.proTipTitle}>Pro Tip 💡</Text>
              <Text style={s.proTipText}>
                Sitters that respond quickly get{' '}
                <Text style={{ fontWeight: '700', color: TEAL }}>3× more</Text> accepted bookings.
              </Text>
            </View>
          </Animated.View>
        </View>
      </View>
    </ScrollView>
  );

  // Wrap with a centered max-width column on tablets+.
  return (
    <View style={[s.page, { paddingTop: insets.top, alignItems: 'center' }]}>
      <View style={{ flex: 1, width: '100%', maxWidth: contentMaxWidth }}>
        {scrollContent}
      </View>
    </View>
  );
}

function SitterStatCard({
  icon, value, label,
}: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={s.statCard}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.85)" />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function ActionTile({
  icon, label, tint,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string }) {
  return (
    <TouchableOpacity style={s.actionTile} activeOpacity={0.85} accessibilityRole="button">
      <View style={[s.actionIcon, { backgroundColor: tint + '20' }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAFAF7' },

  // Greeting hero
  greetingHero: {
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16,
    overflow: 'hidden',
  },
  greetingCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60,
  },
  greetingCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -30,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetingAvatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  greetingHello: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
  greetingName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 1 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  onlineText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },

  bellBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EC4899',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: TEAL,
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  statsGrid: {
    flexDirection: 'row', gap: 8, marginTop: 16,
  },
  statCard: {
    flex: 1, minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, padding: 10,
    alignItems: 'flex-start', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.78)', fontWeight: '600' },

  // Top tabs
  topTabsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  topTabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  topTab: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginRight: 0,
  },
  topTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: TEAL,
  },
  topTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  topTabTextActive: {
    color: TEAL,
    fontWeight: '700',
  },

  // 2-column layout (tablet+)
  bodyTwoCol: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    gap: 0,
  },
  colMain:  { flex: 1.4 },
  colSide:  { flex: 1, paddingTop: 20 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  countdown: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Up next today card
  upNextCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    minHeight: 120,
  },
  upNextDecorCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  upNextContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upNextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  upNextAvatarRow: { position: 'relative' },
  upNextAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#263445',
  },
  upNextFamily: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  upNextInfo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  upNextArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },

  // New requests
  newRequestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  newBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  seeAll: { fontSize: 13, fontWeight: '600', color: TEAL, marginRight: 2 },

  // Request card
  requestCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  requestParentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestAvatar: { width: 40, height: 40, borderRadius: 20 },
  requestName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  requestMetaText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  requestDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  requestDateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E6F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestDate: { fontSize: 13, fontWeight: '700', color: TEAL },
  requestTime: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  requestPriceCol: { alignItems: 'flex-end' },
  requestPrice: { fontSize: 22, fontWeight: '800', color: TEAL },
  requestPriceUnit: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  emptyRequests: {
    alignItems: 'center', paddingVertical: 32, gap: 6,
    backgroundColor: '#F9FAFB', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
    marginBottom: 12,
  },
  emptyRequestsText: { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 4 },
  emptyRequestsSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  declineBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Earnings card (side column)
  earningsCard: {
    marginHorizontal: 16, marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 16, gap: 6,
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },
  earningsValue: { fontSize: 28, fontWeight: '800', color: TEAL, marginTop: 4 },
  earningsUnit: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  earningsHint: { fontSize: 12, color: '#9CA3AF' },
  trendChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, backgroundColor: '#ECFDF5',
  },
  trendText: { fontSize: 11, color: '#10B981', fontWeight: '700' },
  miniBars: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    height: 56, marginTop: 12,
  },
  miniBarTrack: {
    flex: 1, height: '100%',
    backgroundColor: '#F0F0F0', borderRadius: 6,
    overflow: 'hidden', justifyContent: 'flex-end',
  },
  miniBar: { width: '100%', backgroundColor: TEAL, borderRadius: 6 },
  miniBarLabels: { flexDirection: 'row', gap: 6, marginTop: 6 },
  miniBarLabel: { flex: 1, fontSize: 10, color: '#9CA3AF', textAlign: 'center', fontWeight: '600' },

  // Quick actions
  actionsCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12,
  },
  actionTile: {
    width: '47%' as any,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0',
    backgroundColor: '#FAFAF7',
  },
  actionIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A' },

  // Pro tip
  proTipCard: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  proTipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTipTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  proTipText: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
});
