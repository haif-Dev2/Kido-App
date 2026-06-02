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
    id: 'req-1',
    code: 'REQ-001',
    status: BookingStatus.PENDING,
    parentName: 'Sarah B.',
    parentPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    startDate: new Date(Date.now() + 3 * 3600000).toISOString(),
    endDate: new Date(Date.now() + 6 * 3600000).toISOString(),
    totalPrice: 2400,
    location: 'Hydra',
    childCount: 2,
    urgent: true,
  },
  {
    id: 'req-2',
    code: 'REQ-002',
    status: BookingStatus.PENDING,
    parentName: 'Yasmine K.',
    parentPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
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
  const [jobs, setJobs] = useState<Job[]>(FALLBACK_JOBS); // ← Updated with fallback
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
          id, code, status, start_date, end_date, total_price,
          parent:profiles!parent_id(first_name, last_name, photo_url)
        `)
        .eq('babysitter_id', user.id)
        .order('start_date', { ascending: false })
        .limit(30);

      // Only replace fallback when real data exists
      if (data && data.length > 0) {
        setJobs(
          data.map((b: any) => ({
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
          }))
        );
      }
      // If data is empty → keep FALLBACK_JOBS
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
                    <Image
                      source={{
                        uri: job.parentPhoto ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
                      }}
                      style={{ width: 50, height: 50, borderRadius: 14 }}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text
                          style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}
                          numberOfLines={1}
                        >
                          {job.parentName}
                        </Text>
                        <View
                          style={{
                            backgroundColor: config.bg,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 99,
                          }}
                        >
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
                      <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY, marginTop: 4 }}>
                        {job.totalPrice.toLocaleString()} DZD
                      </Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  {job.status === BookingStatus.PENDING && (
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F5F5F5' }}>
                      <TouchableOpacity
                        style={[s.actionBtn, { borderRightWidth: 1, borderRightColor: '#F5F5F5' }]}
                        onPress={() => handleDecline(job)}
                        disabled={actionLoading === job.id}
                        activeOpacity={0.75}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: '#E1F5EE' }]}
                        onPress={() => handleAccept(job)}
                        disabled={actionLoading === job.id}
                        activeOpacity={0.75}
                      >
                        {actionLoading === job.id ? (
                          <ActivityIndicator size="small" color={PRIMARY} />
                        ) : (
                          <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>Accept</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {job.status === BookingStatus.IN_PROGRESS && (
                    <TouchableOpacity
                      style={[
                        s.actionBtn,
                        { borderTopWidth: 1, borderTopColor: '#F5F5F5', backgroundColor: '#E1F5EE' },
                      ]}
                      onPress={() => handleComplete(job)}
                      disabled={actionLoading === job.id}
                      activeOpacity={0.75}
                    >
                      {actionLoading === job.id ? (
                        <ActivityIndicator size="small" color={PRIMARY} />
                      ) : (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>
                          Mark as Complete
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {job.status === BookingStatus.CONFIRMED && (
                    <TouchableOpacity
                      style={[
                        s.actionBtn,
                        { borderTopWidth: 1, borderTopColor: '#F5F5F5', flex: 0, height: 44 },
                      ]}
                      onPress={() => router.push({ pathname: '/booking/[id]', params: { id: job.id } })}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>View details</Text>
                    </TouchableOpacity>
                  )}
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
  actionBtn: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
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