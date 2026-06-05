import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { READING_MAX_WIDTH, useResponsive } from '../lib/responsive';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/auth-provider';

const MOCK_READ_KEY = '@kido:mock_notifications_read';

type NotifType =
  | 'NEW_BOOKING'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_DECLINED'
  | 'NEW_REVIEW'
  | 'DOCUMENT_VERIFIED'
  | 'SYSTEM';

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotifType;
  title: string;
  message: string;
  data: Record<string, any> | null;
  is_read: boolean;
  sent_at: string;
}

/* ──────────────────────────────── Mock fallback ──────────────────────────────── */

const MOCK_NOTIFICATIONS: NotificationRow[] = [
  {
    id: 'mock-1',
    user_id: 'mock',
    type: 'BOOKING_CONFIRMED',
    title: 'Booking confirmed',
    message: 'Amina accepted your booking for tomorrow at 6:00 PM.',
    data: null,
    is_read: false,
    sent_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'mock-2',
    user_id: 'mock',
    type: 'NEW_REVIEW',
    title: 'New 5★ review',
    message: 'Yasmine left you a 5-star review: "Wonderful with the kids!"',
    data: null,
    is_read: false,
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'mock-3',
    user_id: 'mock',
    type: 'SYSTEM',
    title: 'Reminder',
    message: 'You have a booking tomorrow at 6:00 PM with Amina.',
    data: null,
    is_read: true,
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

/* ──────────────────────────────── Type → visuals ──────────────────────────────── */

const typeIcon: Record<NotifType, keyof typeof Ionicons.glyphMap> = {
  NEW_BOOKING:        'calendar-outline',
  BOOKING_CONFIRMED:  'checkmark-circle-outline',
  BOOKING_DECLINED:   'close-circle-outline',
  NEW_REVIEW:         'star-outline',
  DOCUMENT_VERIFIED:  'shield-checkmark-outline',
  SYSTEM:             'notifications-outline',
};

const typeTone: Record<NotifType, { bg: string; fg: string }> = {
  NEW_BOOKING:        { bg: Colors.light.primaryLight, fg: Colors.light.primary },
  BOOKING_CONFIRMED:  { bg: '#DCFCE7',                  fg: '#16A34A'           },
  BOOKING_DECLINED:   { bg: '#FEE2E2',                  fg: '#DC2626'           },
  NEW_REVIEW:         { bg: '#FEF3C7',                  fg: '#D97706'           },
  DOCUMENT_VERIFIED:  { bg: '#EDE9FE',                  fg: '#6366F1'           },
  SYSTEM:             { bg: '#F3F4F6',                  fg: '#6B7280'           },
};

/* ──────────────────────────────── Time helpers ──────────────────────────────── */

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60)            return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60)            return `${min}m ago`;
  const hr  = Math.floor(min / 60);
  if (hr < 24)             return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7)             return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ──────────────────────────────── Screen ──────────────────────────────── */

export default function NotificationsScreen() {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { session, profile } = useAuth();   // Added profile
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  const [items, setItems]       = useState<NotificationRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingMock, setUsingMock]   = useState(false);

  const userId = session?.user?.id;

  const load = useCallback(async () => {
    if (!userId) {
      try {
        const readIdsRaw = await AsyncStorage.getItem(MOCK_READ_KEY);
        const readIds: string[] = JSON.parse(readIdsRaw ?? '[]');

        const mocksWithState = MOCK_NOTIFICATIONS.map(n => ({
          ...n,
          is_read: readIds.includes(String(n.id)) ? true : n.is_read,
        }));

        setItems(mocksWithState);
        setUsingMock(true);
      } catch {
        setItems(MOCK_NOTIFICATIONS);
        setUsingMock(true);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('[notifications] fetch error:', error.message);
      try {
        const readIdsRaw = await AsyncStorage.getItem(MOCK_READ_KEY);
        const readIds: string[] = JSON.parse(readIdsRaw ?? '[]');
        const mocksWithState = MOCK_NOTIFICATIONS.map(n => ({
          ...n,
          is_read: readIds.includes(String(n.id)) ? true : n.is_read,
        }));
        setItems(mocksWithState);
      } catch {
        setItems(MOCK_NOTIFICATIONS);
      }
      setUsingMock(true);
    } else if (!data || data.length === 0) {
      try {
        const readIdsRaw = await AsyncStorage.getItem(MOCK_READ_KEY);
        const readIds: string[] = JSON.parse(readIdsRaw ?? '[]');
        const mocksWithState = MOCK_NOTIFICATIONS.map(n => ({
          ...n,
          is_read: readIds.includes(String(n.id)) ? true : n.is_read,
        }));
        setItems(mocksWithState);
      } catch {
        setItems(MOCK_NOTIFICATIONS);
      }
      setUsingMock(true);
    } else {
      setItems(data as NotificationRow[]);
      setUsingMock(false);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const unreadCount = useMemo(() => items.filter(n => !n.is_read).length, [items]);

  const markAsRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));

    if (!usingMock && userId) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } else if (usingMock) {
      try {
        const readIdsRaw = await AsyncStorage.getItem(MOCK_READ_KEY);
        const readIds: string[] = JSON.parse(readIdsRaw ?? '[]');
        if (!readIds.includes(id)) {
          readIds.push(id);
          await AsyncStorage.setItem(MOCK_READ_KEY, JSON.stringify(readIds));
        }
      } catch (e) {
        console.warn('Failed to persist mock read state', e);
      }
    }
  }, [usingMock, userId]);

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;

    setItems(prev => prev.map(n => ({ ...n, is_read: true })));

    if (!usingMock && userId) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) {
        Alert.alert('Could not update', error.message);
        await load();
      }
    } else if (usingMock) {
      const allIds = items.map(n => String(n.id));
      try {
        await AsyncStorage.setItem(MOCK_READ_KEY, JSON.stringify(allIds));
      } catch (e) {
        console.warn('Failed to persist mock read-all state', e);
      }
    }
  }, [unreadCount, usingMock, userId, items, load]);

  const onItemPress = useCallback(async (n: NotificationRow) => {
    if (!n.is_read) await markAsRead(n.id);

    const bookingId = n.data?.booking_id;
    if (!bookingId) return;

    // Fix: Route based on user role
    if (profile?.role === 'BABY_SITTER') {
      router.push({ 
        pathname: '/job/[id]' as any, 
        params: { id: String(bookingId), passedStatus: 'PENDING' } 
      });
    } else {
      router.push({ pathname: '/booking/[id]', params: { id: String(bookingId) } });
    }
  }, [markAsRead, router, profile]);

  return (
    <View style={[s.page, { paddingTop: insets.top, alignItems: 'center' }]}>
      {/* Header */}
      <View style={[s.headerRow, { width: '100%', maxWidth: contentMaxWidth }]}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Notifications</Text>
          <Text style={s.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={markAllAsRead}
          activeOpacity={0.8}
          disabled={unreadCount === 0}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
        >
          <Text style={[s.markAllText, unreadCount === 0 && s.markAllDisabled]}>
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={Colors.light.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={28} color="#9CA3AF" />
          </View>
          <Text style={s.emptyTitle}>No notifications yet</Text>
          <Text style={s.emptySubtitle}>
            You&apos;ll see booking updates, reviews and reminders here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ width: '100%', maxWidth: contentMaxWidth }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.light.primary}
            />
          }
        >
          {items.map(n => (
            <NotificationItem
              key={n.id}
              notification={n}
              onPress={() => onItemPress(n)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* ──────────────────────────────── Item ──────────────────────────────── */

function NotificationItem({
  notification, onPress,
}: { notification: NotificationRow; onPress: () => void }) {
  const tone = typeTone[notification.type] ?? typeTone.SYSTEM;
  const icon = typeIcon[notification.type] ?? typeIcon.SYSTEM;
  const unread = !notification.is_read;

  return (
    <TouchableOpacity
      style={[s.card, unread && s.cardUnread]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.message}`}
    >
      <View style={[s.cardIcon, { backgroundColor: tone.bg }]}>
        <Ionicons name={icon} size={20} color={tone.fg} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={s.cardTopRow}>
          <Text
            style={[s.cardTitle, unread && s.cardTitleUnread]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text style={s.cardTime}>{timeAgo(notification.sent_at)}</Text>
        </View>
        <Text style={s.cardMessage} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>

      {unread ? <View style={s.unreadDot} /> : null}
    </TouchableOpacity>
  );
}

/* ──────────────────────────────── styles ──────────────────────────────── */

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F6F8' },

  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle:    { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  markAllText:    { fontSize: 13, fontWeight: '700', color: Colors.light.primary },
  markAllDisabled:{ color: '#C1C7D0' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#F0F0F0',
    borderRadius: 14, padding: 12, gap: 12, marginTop: 10,
  },
  cardUnread: {
    borderColor: Colors.light.primaryLight,
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  cardTitle:        { flex: 1, fontSize: 14, color: Colors.light.text, fontWeight: '600' },
  cardTitleUnread:  { fontWeight: '800' },
  cardTime:         { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  cardMessage:      { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.light.primary,
    marginTop: 6, marginLeft: 4,
  },
});