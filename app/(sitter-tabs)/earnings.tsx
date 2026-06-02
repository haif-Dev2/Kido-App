import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, RefreshControl, ScrollView,
    Text, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { BookingStatus } from '../../models/types';

const PRIMARY = Colors.light.primary;

type EarningEntry = {
  id: string; code: string;
  parentName: string; date: string;
  amount: number; status: BookingStatus;
};

export default function EarningsTab() {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<EarningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totals, setTotals] = useState({ thisWeek: 0, thisMonth: 0, allTime: 0, jobsCount: 0 });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('bookings')
        .select(`
          id, code, status, start_date, total_price,
          parent:profiles!parent_id(first_name, last_name)
        `)
        .eq('babysitter_id', user.id)
        .eq('status', BookingStatus.COMPLETED)
        .order('start_date', { ascending: false })
        .limit(20);

      if (data) {
        const mapped: EarningEntry[] = data.map((b: any) => ({
          id: b.id, code: b.code ?? b.id.slice(0, 8).toUpperCase(),
          status: b.status,
          parentName: b.parent ? `${b.parent.first_name} ${b.parent.last_name}`.trim() : 'Parent',
          date: new Date(b.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          amount: b.total_price ?? 0,
        }));
        setEntries(mapped);

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisWeek = mapped.filter(e => new Date(e.date) >= weekAgo).reduce((s, e) => s + e.amount, 0);
        const thisMonth = mapped.filter(e => new Date(e.date) >= monthAgo).reduce((s, e) => s + e.amount, 0);
        const allTime = mapped.reduce((s, e) => s + e.amount, 0);
        setTotals({ thisWeek, thisMonth, allTime, jobsCount: mapped.length });
      }
    } catch { } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          bounces={false} overScrollMode="never"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={PRIMARY} />}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Hero card */}
          <LinearGradient
            colors={[PRIMARY, '#0D5F5A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 16, paddingBottom: 28, paddingHorizontal: 20 }}
          >
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 4 }}>Total earned this month</Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 }}>
              {totals.thisMonth.toLocaleString()} <Text style={{ fontSize: 18, fontWeight: '600' }}>DZD</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              {[
                { label: 'This week', value: `${totals.thisWeek.toLocaleString()} DZD` },
                { label: 'All time', value: `${totals.allTime.toLocaleString()} DZD` },
                { label: 'Jobs done', value: String(totals.jobsCount) },
              ].map(stat => (
                <View key={stat.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{stat.value}</Text>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '500' }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* Withdrawal (coming soon) */}
          <View style={{ margin: 16 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB', opacity: 0.6 }}
              activeOpacity={0.7}
              onPress={() => {}}
              disabled
            >
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="card-outline" size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>Request withdrawal</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>Chargily payment — coming soon</Text>
              </View>
              <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>Soon</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* History */}
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: PRIMARY }} />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>Earning history</Text>
            </View>
            {entries.length === 0 ? (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' }}>
                <Ionicons name="wallet-outline" size={28} color="#D1D5DB" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 10 }}>No earnings yet</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Completed sessions will appear here</Text>
              </View>
            ) : (
              entries.map(entry => (
                <View key={entry.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{entry.parentName}</Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{entry.date} · #{entry.code}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: PRIMARY }}>+{entry.amount.toLocaleString()} DZD</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}