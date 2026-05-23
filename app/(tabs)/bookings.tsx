import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MOCK_BOOKINGS, type MockBooking } from '../../lib/mock/bookings';
import { MOCK_SITTERS } from '../../lib/mock/sitters';
import { haptics } from '../../lib/haptics';
import { supabase } from '../../lib/supabase';
import { BookingStatus } from '../../models/types';
import { Colors } from '../../constants/Colors';
import { useResponsive } from '../../lib/responsive';

type TabKey = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

const TAB_LABELS: { key: TabKey; label: string; status?: BookingStatus }[] = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending',   status: BookingStatus.PENDING },
  { key: 'confirmed', label: 'Confirmed', status: BookingStatus.CONFIRMED },
  { key: 'completed', label: 'Completed', status: BookingStatus.COMPLETED },
  { key: 'cancelled', label: 'Cancelled', status: BookingStatus.CANCELLED },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; icon: string; color: string; bg: string }> = {
  [BookingStatus.PENDING]:     { label: 'Pending',    icon: '⚡', color: '#D97706', bg: '#FEF3C7' },
  [BookingStatus.CONFIRMED]:   { label: 'Confirmed',  icon: '✓',  color: '#059669', bg: '#D1FAE5' },
  [BookingStatus.IN_PROGRESS]: { label: 'Active',     icon: '▶',  color: '#2563EB', bg: '#DBEAFE' },
  [BookingStatus.COMPLETED]:   { label: 'Completed',  icon: '✓',  color: '#6B7280', bg: '#F3F4F6' },
  [BookingStatus.CANCELLED]:   { label: 'Cancelled',  icon: '✕',  color: '#DC2626', bg: '#FEE2E2' },
  [BookingStatus.DECLINED]:    { label: 'Declined',   icon: '✕',  color: '#DC2626', bg: '#FEE2E2' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isTablet, isDesktop } = useResponsive();

  // Responsive grid: 1 col phone, 2 col tablet/desktop. Booking cards have
  // enough content that 3 cols feel cramped even on 1280-px screens.
  const gridCols = isDesktop || isTablet ? 2 : 1;

  const [items, setItems] = useState<MockBooking[]>(MOCK_BOOKINGS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('bookings')
          .select(`id, code, status, start_date, end_date, total_price,
            sitter:profiles!babysitter_id(first_name, last_name, photo_url)`)
          .eq('parent_id', user.id)
          .order('start_date', { ascending: false });

        if (!error && data && data.length > 0) {
          setItems(data.map((b: any) => ({
            id: b.id, babySitterId: 0, parentId: 0,
            sitterId: 0, code: b.code, status: b.status as BookingStatus,
            startDate: b.start_date, endDate: b.end_date,
            duration: 0, totalPrice: b.total_price ?? 0,
            createdAt: '',
            sitterName: b.sitter ? `${b.sitter.first_name} ${b.sitter.last_name}`.trim() : 'Sitter',
            sitterPhoto: b.sitter?.photo_url ?? MOCK_SITTERS[0].photo,
          })));
          return;
        }
      }
    } catch { /* keep mock data */ }
    finally { setLoading(false); setRefreshing(false); }
    setItems(MOCK_BOOKINGS);
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);
  useFocusEffect(useCallback(() => { loadBookings(true); }, [loadBookings]));

  const countFor = (key: TabKey) => {
    if (key === 'all') return items.length;
    const tab = TAB_LABELS.find(t => t.key === key);
    return tab?.status ? items.filter(b => b.status === tab.status).length : 0;
  };

  const stats = useMemo(() => {
    const upcoming = items.filter(b =>
      b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING
    ).length;
    const completed = items.filter(b => b.status === BookingStatus.COMPLETED).length;
    const totalSpent = items
      .filter(b => b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
    return { upcoming, completed, totalSpent };
  }, [items]);

  const filtered = activeTab === 'all'
    ? items
    : items.filter(b => {
        const tab = TAB_LABELS.find(t => t.key === activeTab);
        return tab?.status ? b.status === tab.status : true;
      });

  if (loading) {
    return (
      <View style={[s.page, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      {/* Header — gradient hero on tablet/desktop, flat on phone */}
      <LinearGradient
        colors={['#E6F4F5', '#FFFFFF']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={s.header}
      >
        <View>
          <Text style={s.headerTitle}>My Bookings</Text>
          <Text style={s.headerSubtitle}>Track and manage your appointments</Text>
        </View>

        {/* Quick-stats row */}
        <View style={s.statsRow}>
          <StatPill icon="calendar" tint={Colors.light.primary}
            value={String(stats.upcoming)} label="Upcoming" />
          <StatPill icon="checkmark-done" tint="#10B981"
            value={String(stats.completed)} label="Completed" />
          <StatPill icon="card" tint="#EC4899"
            value={`${stats.totalSpent.toLocaleString()} DZD`} label="Spent" />
        </View>
      </LinearGradient>

      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabs}
        style={s.tabsScroll}
      >
        {TAB_LABELS.map(tab => {
          const count = countFor(tab.key);
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => { haptics.tap(); setActiveTab(tab.key); }}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>
                {tab.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Booking list / grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingTop: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadBookings(true)} tintColor={Colors.light.primary} />
        }
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={s.emptyTitle}>No bookings here</Text>
            <Text style={s.emptySubtitle}>Book a babysitter to get started</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/search')}>
              <Text style={s.emptyBtnText}>Find a sitter</Text>
            </TouchableOpacity>
          </View>
        ) : gridCols === 1 ? (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {filtered.map(booking => (
              <BookingCard key={String(booking.id)} booking={booking} router={router} />
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {filtered.map(booking => (
                <View
                  key={String(booking.id)}
                  style={{ width: `${100 / gridCols}%`, paddingHorizontal: 6, paddingBottom: 12 }}
                >
                  <BookingCard booking={booking} router={router} />
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatPill({
  icon, tint, value, label,
}: { icon: keyof typeof Ionicons.glyphMap; tint: string; value: string; label: string }) {
  return (
    <View style={s.statPill}>
      <View style={[s.statIcon, { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.statValue} numberOfLines={1}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function BookingCard({ booking, router }: { booking: MockBooking; router: any }) {
  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG[BookingStatus.PENDING];
  const timeRange = `${formatTime(booking.startDate)}–${formatTime(booking.endDate)}`;

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Image source={{ uri: booking.sitterPhoto }} style={s.avatar} contentFit="cover" transition={200} />
        <View style={s.cardInfo}>
          <Text style={s.sitterName} numberOfLines={1}>{booking.sitterName}</Text>
          <Text style={s.bookingCode}>Booking #{booking.code}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[s.statusText, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
        </View>
      </View>

      <View style={s.dateRow}>
        <View style={s.dateItem}>
          <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
          <Text style={s.dateText} numberOfLines={1}>{formatDate(booking.startDate)}</Text>
        </View>
        <View style={s.dateItem}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
          <Text style={s.dateText}>{timeRange}</Text>
        </View>
      </View>

      <View style={s.cardBottom}>
        <Text style={s.price}>{booking.totalPrice} DZD</Text>
        <TouchableOpacity
          style={s.detailsBtn}
          onPress={() => { haptics.light(); router.push({ pathname: '/booking/[id]', params: { id: String(booking.id) } }); }}
          activeOpacity={0.7}
        >
          <Text style={s.detailsText}>Details</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F6F8' },

  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    gap: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statPill: {
    flex: 1, minWidth: 130,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#EEF0F2',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 2 },

  tabsScroll: { backgroundColor: '#FFFFFF', maxHeight: 56 },
  tabs: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 36,
  },
  tabActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    borderWidth: 1, borderColor: '#F3F4F6',
  },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  cardInfo: { flex: 1 },
  sitterName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  bookingCode: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700' },

  dateRow: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12, color: '#6B7280' },

  cardBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  price: { fontSize: 18, fontWeight: '800', color: Colors.light.primary },
  detailsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, backgroundColor: '#E6F4F5',
  },
  detailsText: { fontSize: 13, color: Colors.light.primary, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280' },
  emptyBtn: {
    marginTop: 16, backgroundColor: Colors.light.primary,
    paddingHorizontal: 24, paddingVertical: 13, borderRadius: 24,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
