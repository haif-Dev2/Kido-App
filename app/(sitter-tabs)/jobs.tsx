import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { haptics } from '../../lib/haptics';
import { supabase } from '../../lib/supabase';
import { BookingStatus } from '../../models/types';

const PRIMARY = Colors.light.primary;

type JobTab = 'requests' | 'upcoming' | 'history';

type Job = {
  id: string;
  code: string;
  status: BookingStatus;
  parentName: string;
  parentPhoto: string | null;
  parentId: string;
  parentRating: number;
  parentBookingCount: number;
  startDate: string;
  endDate: string;
  totalPrice: number;
  location?: string;
  childCount?: number;
  urgent?: boolean;
};

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  PENDING: { bg: '#FEF3C7', fg: '#D97706', label: 'Pending' },
  CONFIRMED: { bg: '#E1F5EE', fg: PRIMARY, label: 'Confirmed' },
  IN_PROGRESS: { bg: '#DBEAFE', fg: '#2563EB', label: 'In Progress' },
  COMPLETED: { bg: '#F0FDF4', fg: '#16A34A', label: 'Completed' },
  DECLINED: { bg: '#FEF2F2', fg: '#DC2626', label: 'Declined' },
  CANCELLED: { bg: '#F9FAFB', fg: '#6B7280', label: 'Cancelled' },
};

// Fallback jobs shown when no real bookings exist in the database
const FALLBACK_JOBS: Job[] = [
  {
    id: 'mock-req-1',
    code: 'REQ-001',
    status: BookingStatus.PENDING,
    parentName: 'Sarah B.',
    parentPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    parentId: 'mock-parent-1',
    parentRating: 4.8,
    parentBookingCount: 7,
    startDate: new Date(Date.now() + 3 * 3600000).toISOString(),
    endDate: new Date(Date.now() + 6 * 3600000).toISOString(),
    totalPrice: 2400,
    location: 'Hydra',
    childCount: 2,
    urgent: true,
  },
  {
    id: 'mock-req-2',
    code: 'REQ-002',
    status: BookingStatus.PENDING,
    parentName: 'Yasmine K.',
    parentPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    parentId: 'mock-parent-2',
    parentRating: 4.5,
    parentBookingCount: 3,
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 + 4 * 3600000).toISOString(),
    totalPrice: 2200,
    location: 'Bab Ezzouar',
    childCount: 1,
    urgent: false,
  },
];

export default function JobsTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<JobTab>('requests');
  const [jobs, setJobs] = useState<Job[]>(FALLBACK_JOBS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('bookings')
        .select(`
          id, code, status, start_date, end_date, total_price, parent_id,
          parent:profiles!parent_id(
            id, first_name, last_name, photo_url,
            parent_details(avg_rating, rating_count)
          )
        `)
        .eq('babysitter_id', user.id)
        .order('start_date', { ascending: false })
        .limit(30);

      if (data && data.length > 0) {
        setJobs(
          data.map((b: any) => ({
            id: b.id,
            code: b.code ?? b.id.slice(0, 8).toUpperCase(),
            status: b.status as BookingStatus,
            startDate: b.start_date,
            endDate: b.end_date,
            totalPrice: b.total_price ?? 0,
            parentId: b.parent_id ?? '',
            parentName: b.parent
              ? `${b.parent.first_name} ${b.parent.last_name}`.trim()
              : 'Parent',
            parentPhoto: b.parent?.photo_url ?? null,
            parentRating: b.parent?.parent_details?.avg_rating ?? 0,
            parentBookingCount: b.parent?.parent_details?.rating_count ?? 0,
          }))
        );
      }
    } catch (e) {
      console.warn('[jobs] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const handleAccept = async (job: Job) => {
    haptics.medium();
    setActionLoading(job.id);
    try {
      await supabase.from('bookings').update({ status: 'CONFIRMED' }).eq('id', job.id);
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: BookingStatus.CONFIRMED } : j))
      );
      haptics.success();
      Alert.alert('Accepted', `Booking confirmed for ${job.parentName}.`);
    } catch {} finally {
      setActionLoading(null);
    }
  };

  const handleDecline = (job: Job) => {
    haptics.warning();
    Alert.alert('Decline?', 'The parent will be notified.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(job.id);
          await supabase.from('bookings').update({ status: 'DECLINED' }).eq('id', job.id);
          setJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: BookingStatus.DECLINED } : j))
          );
          setActionLoading(null);
        },
      },
    ]);
  };

  const handleCancel = (job: Job) => {
    haptics.warning();
    Alert.alert(
      'Cancel this booking?',
      'The parent will be notified. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(job.id);
            await supabase.from('bookings').update({ status: 'CANCELLED' }).eq('id', job.id);
            setJobs((prev) =>
              prev.map((j) => (j.id === job.id ? { ...j, status: BookingStatus.CANCELLED } : j))
            );
            setActionLoading(null);
          },
        },
      ]
    );
  };

  const handleComplete = (job: Job) => {
    haptics.medium();
    Alert.alert('Mark as complete?', 'This will notify the parent and open the rating screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          setActionLoading(job.id);
          await supabase.from('bookings').update({ status: 'COMPLETED' }).eq('id', job.id);
          setJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: BookingStatus.COMPLETED } : j))
          );
          setActionLoading(null);
          haptics.success();
          router.push({ pathname: '/review/new/[bookingId]', params: { bookingId: job.id } });
        },
      },
    ]);
  };

  const filtered = jobs.filter((j) => {
    if (activeTab === 'requests') return j.status === BookingStatus.PENDING;
    if (activeTab === 'upcoming')
      return j.status === BookingStatus.CONFIRMED || j.status === BookingStatus.IN_PROGRESS;
    return (
      j.status === BookingStatus.COMPLETED ||
      j.status === BookingStatus.CANCELLED ||
      j.status === BookingStatus.DECLINED
    );
  });

  const tabCounts = {
    requests: jobs.filter((j) => j.status === BookingStatus.PENDING).length,
    upcoming: jobs.filter(
      (j) => j.status === BookingStatus.CONFIRMED || j.status === BookingStatus.IN_PROGRESS
    ).length,
    history: jobs.filter(
      (j) =>
        j.status === BookingStatus.COMPLETED ||
        j.status === BookingStatus.CANCELLED ||
        j.status === BookingStatus.DECLINED
    ).length,
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.headerTitle}>My Jobs</Text>
        <View style={s.tabChips}>
          {(['requests', 'upcoming', 'history'] as JobTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tabChip, activeTab === tab && s.tabChipActive]}
              onPress={() => {
                haptics.light();
                setActiveTab(tab);
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.tabChipText, activeTab === tab && s.tabChipTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tabCounts[tab] > 0 ? ` (${tabCounts[tab]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={PRIMARY} />
          }
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 110 }}
        >
          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="briefcase-outline" size={32} color="#D1D5DB" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 10 }}>
                {activeTab === 'requests'
                  ? 'No pending requests'
                  : activeTab === 'upcoming'
                  ? 'No upcoming jobs'
                  : 'No past jobs'}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: '#9CA3AF',
                  marginTop: 4,
                  textAlign: 'center',
                }}
              >
                {activeTab === 'requests'
                  ? 'New booking requests will appear here'
                  : 'Jobs will appear here once confirmed'}
              </Text>
            </View>
          ) : (
            filtered.map((job) => {
              const config = STATUS_COLORS[job.status] ?? STATUS_COLORS.PENDING;
              const start = new Date(job.startDate);
              const end = new Date(job.endDate);

              return (
                <View key={job.id} style={s.jobCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                    {/* Parent avatar — tappable to see profile info */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        haptics.light();
                        Alert.alert(
                          job.parentName,
                          `Rating: ${job.parentRating > 0 ? `${job.parentRating.toFixed(1)} ⭐` : 'No rating yet'}\nBookings: ${job.parentBookingCount}`,
                          [{ text: 'OK' }]
                        );
                      }}
                    >
                      <View>
                        <Image
                          source={{ uri: job.parentPhoto ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }}
                          style={{ width: 50, height: 50, borderRadius: 14 }}
                          contentFit="cover"
                        />
                        {/* Rating badge on avatar */}
                        {job.parentRating > 0 && (
                          <View style={{
                            position: 'absolute', bottom: -4, right: -4,
                            backgroundColor: '#F5A524', borderRadius: 99,
                            paddingHorizontal: 4, paddingVertical: 1,
                            flexDirection: 'row', alignItems: 'center', gap: 1,
                            borderWidth: 1.5, borderColor: '#FFFFFF',
                          }}>
                            <Ionicons name="star" size={8} color="#FFFFFF" />
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>
                              {job.parentRating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                            {job.parentName}
                          </Text>
                          {job.parentBookingCount > 0 && (
                            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                              {job.parentBookingCount} booking{job.parentBookingCount !== 1 ? 's' : ''} completed
                            </Text>
                          )}
                        </View>
                        <View style={{ backgroundColor: config.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: config.fg }}>
                            {config.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                        {start.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        · {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} –{' '}
                        {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>
                          {job.totalPrice.toLocaleString()} DZD
                        </Text>

                        {/* Chat button */}
                        {(job.status === BookingStatus.PENDING ||
                          job.status === BookingStatus.CONFIRMED ||
                          job.status === BookingStatus.IN_PROGRESS) && (
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 4,
                              backgroundColor: '#E1F5EE', paddingHorizontal: 10,
                              paddingVertical: 5, borderRadius: 99,
                            }}
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
                            activeOpacity={0.8}
                          >
                            <Ionicons name="chatbubble-outline" size={12} color={PRIMARY} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY }}>Chat</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Unified Action buttons */}
                  <View style={s.cardBottom}>
                    {/* Details always on the left */}
                    <TouchableOpacity
                      style={s.detailsBtn}
                      onPress={() => router.push({ pathname: '/job/[id]' as any, params: { id: job.id } })}
                      activeOpacity={0.75}
                    >
                      <Text style={s.detailsBtnText}>Details</Text>
                      <Ionicons name="chevron-forward" size={13} color={PRIMARY} />
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {/* PENDING: decline (X) + accept (✓) */}
                      {job.status === BookingStatus.PENDING && (
                        <>
                          <TouchableOpacity
                            style={[s.iconBtn, { backgroundColor: '#FEF2F2' }]}
                            onPress={() => handleDecline(job)}
                            disabled={actionLoading === job.id}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="close" size={18} color="#EF4444" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.iconBtn, { backgroundColor: '#E1F5EE' }]}
                            onPress={() => handleAccept(job)}
                            disabled={actionLoading === job.id}
                            activeOpacity={0.8}
                          >
                            {actionLoading === job.id
                              ? <ActivityIndicator size="small" color={PRIMARY} />
                              : <Ionicons name="checkmark" size={18} color={PRIMARY} />}
                          </TouchableOpacity>
                        </>
                      )}

                      {/* CONFIRMED: Cancel button */}
                      {job.status === BookingStatus.CONFIRMED && (
                        <TouchableOpacity
                          style={[s.iconBtn, { backgroundColor: '#FEF2F2', width: 'auto' as any, paddingHorizontal: 12 }]}
                          onPress={() => handleCancel(job)}
                          disabled={actionLoading === job.id}
                          activeOpacity={0.8}
                        >
                          {actionLoading === job.id
                            ? <ActivityIndicator size="small" color="#EF4444" />
                            : <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>Cancel</Text>}
                        </TouchableOpacity>
                      )}

                      {/* IN_PROGRESS: complete button */}
                      {job.status === BookingStatus.IN_PROGRESS && (
                        <TouchableOpacity
                          style={[s.iconBtn, { backgroundColor: '#E1F5EE', width: 'auto' as any, paddingHorizontal: 14 }]}
                          onPress={() => handleComplete(job)}
                          disabled={actionLoading === job.id}
                          activeOpacity={0.8}
                        >
                          {actionLoading === job.id
                            ? <ActivityIndicator size="small" color={PRIMARY} />
                            : <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>Complete</Text>}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  tabChips: { flexDirection: 'row', gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tabChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabChipTextActive: { color: '#FFFFFF' },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardBottom: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  detailsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, backgroundColor: '#EEF9F8',
  },
  detailsBtnText: { fontSize: 13, fontWeight: '700', color: Colors.light.primary },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginTop: 24,
  },
});