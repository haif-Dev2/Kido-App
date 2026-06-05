import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VisitorBanner } from '../../components/ui/VisitorBanner';
import { Colors } from '../../constants/Colors';
import { fetchSitters } from '../../lib/api/sitters';
import { MOCK_SITTERS, type MockSitter } from '../../lib/mock/sitters';
import { MAX_CONTENT_WIDTH } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/auth-provider';

function getGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

type FilterKey = 'all' | 'now' | 'verified' | 'near';

function applyFilter(list: MockSitter[], filter: FilterKey): MockSitter[] {
  switch (filter) {
    case 'now':      return list.filter(s => s.availableNow);
    case 'verified': return list.filter(s => s.identityVerified);
    case 'near':     return list.filter(s => s.distanceKm <= 5);
    default:         return list;
  }
}

/* ── Centred content wrapper ── */
function ContentWrap({ children, hp = 16 }: { 
  children: React.ReactNode; 
  hp?: number;
}) {
  return (
    <View style={{ 
      width: '100%', 
      maxWidth: MAX_CONTENT_WIDTH, 
      alignSelf: 'center', 
      paddingHorizontal: hp 
    }}>
      {children}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, isVisitor, profile } = useAuth();
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [sitters, setSitters] = useState<MockSitter[]>(MOCK_SITTERS);
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(['all']));
  const [unreadCount, setUnreadCount] = useState(0);

  const isCompact = width < 768;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = session?.user?.user_metadata?.first_name ?? 'there';
  const photoUri = profile?.photo_url
    ?? session?.user?.user_metadata?.avatar_url
    ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200';

  // Nearby sitters
  const nearby = useMemo(() => {
    let list = sitters;
    if (!activeFilters.has('all')) {
      list = Array.from(activeFilters).reduce((acc, f) => applyFilter(acc, f), list);
    }
    return list;
  }, [sitters, activeFilters]);

  const topRated = useMemo(() => 
    [...nearby].sort((a, b) => b.averageRating - a.averageRating).slice(0, 6),
  [nearby]);

  const availableNow = useMemo(() => 
    nearby.filter(s => s.availableNow),
  [nearby]);

  const availableCount = availableNow.length;

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (key === 'all') {
        return new Set(['all']);
      }
      next.delete('all');
      if (next.has(key)) {
        next.delete(key);
        if (next.size === 0) next.add('all');
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const fetchSittersData = useCallback(async () => {
    if (isVisitor) {
      setSitters(MOCK_SITTERS);
      return;
    }
    try {
      const data = await fetchSitters();
      setSitters(data.length > 0 ? data : MOCK_SITTERS);
    } catch {
      setSitters(MOCK_SITTERS);
    }
  }, [isVisitor]);

  const fetchUnreadCount = useCallback(async () => {
    if (isVisitor) { setUnreadCount(0); return; }
    const userId = session?.user?.id;
    if (!userId) { setUnreadCount(2); return; }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error || count === null) {
      setUnreadCount(2);
      return;
    }
    setUnreadCount(count);
  }, [session?.user?.id, isVisitor]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSittersData(), fetchUnreadCount()]);
    setRefreshing(false);
  }, [fetchSittersData, fetchUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      fetchSittersData();
      fetchUnreadCount();
    }, [fetchSittersData, fetchUnreadCount])
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {isVisitor && <VisitorBanner />}

      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {/* HERO */}
        <LinearGradient
          colors={['#0F766E', '#0D5F5A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
        >
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 }}>
                  Kido
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {!isVisitor && (
                  <TouchableOpacity onPress={() => router.push('/notifications')} hitSlop={12}>
                    <View>
                      <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                      {unreadCount > 0 && (
                        <View style={{
                          position: 'absolute', top: -4, right: -4,
                          minWidth: 18, height: 18, borderRadius: 9,
                          backgroundColor: '#EF4444',
                          alignItems: 'center', justifyContent: 'center',
                          borderWidth: 2, borderColor: '#0F766E'
                        }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                            {unreadCount > 99 ? '99' : unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                {!isVisitor && (
                  <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
                    <Image 
                      source={{ uri: photoUri }} 
                      style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF' }} 
                      contentFit="cover" 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={{ marginTop: 24 }}>
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginBottom: 2 }}>
                {greeting}, {firstName}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14 }}>
                {availableCount > 0 ? `${availableCount} sitters available near you` : 'Find a babysitter near you'}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  paddingHorizontal: 18,
                  paddingVertical: 13,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                }}
                onPress={() => router.push('/(tabs)/search')}
                activeOpacity={0.88}
              >
                <Ionicons name="search" size={16} color={Colors.light.primary} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.primary }}>Find a Babysitter</Text>
              </TouchableOpacity>
            </View>
          </ContentWrap>
        </LinearGradient>

        {/* PROMO BANNER */}
        <ContentWrap>
          <View style={{ marginTop: 8 }}>
            <Pressable
              style={({ pressed }) => [
                s.promo,
                pressed && { opacity: 0.94 },
              ]}
              onPress={() => Alert.alert('Promo', 'Summer special: First booking 20% off!')}
            >
              <LinearGradient
                colors={['#FEF3C7', '#FDE68A']}
                style={{ padding: 20, borderRadius: 20 }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#92400E' }}>🎉 Summer Special</Text>
                <Text style={{ fontSize: 13, color: '#B45309', marginTop: 4 }}>First booking gets 20% off • Limited time</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ContentWrap>

        {/* FILTER CHIPS */}
        <ContentWrap hp={16}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
          >
            {[
              { key: 'all', label: 'All', icon: 'apps' },
              { key: 'now', label: 'Available now', icon: 'time' },
              { key: 'verified', label: 'Verified', icon: 'shield-checkmark' },
              { key: 'near', label: 'Nearby (< 5km)', icon: 'location' },
            ].map(item => (
              <TouchableOpacity
                key={item.key}
                onPress={() => toggleFilter(item.key as FilterKey)}
                style={[
                  s.chip,
                  activeFilters.has(item.key as FilterKey) && s.chipActive
                ]}
              >
                <Ionicons 
                  name={item.icon as any} 
                  size={16} 
                  color={activeFilters.has(item.key as FilterKey) ? '#FFFFFF' : '#64748B'} 
                />
                <Text style={[
                  s.chipText,
                  activeFilters.has(item.key as FilterKey) && s.chipTextActive
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ContentWrap>

        {/* SECTIONS */}
        <ContentWrap hp={16}>
          {availableNow.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={s.sectionTitle}>Available right now</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                  <Text style={{ color: Colors.light.primary, fontWeight: '600', fontSize: 14 }}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {availableNow.slice(0, 5).map(sitter => (
                  <TouchableOpacity 
                    key={sitter.id} 
                    onPress={() => router.push(`/sitter/${sitter.id}`)}
                    style={s.card}
                  >
                    <Image source={{ uri: sitter.photo }} style={s.cardImage} contentFit="cover" />
                    <View style={{ padding: 12 }}>
                      <Text style={s.cardName}>{sitter.firstName}</Text>
                      <Text style={s.cardMeta}>{sitter.neighborhood} • {sitter.hourlyRate} DA/h</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View>
            <Text style={s.sectionTitle}>Highly rated sitters</Text>
            {topRated.map(sitter => (
              <TouchableOpacity 
                key={sitter.id}
                style={s.row}
                onPress={() => router.push(`/sitter/${sitter.id}`)}
              >
                <Image source={{ uri: sitter.photo }} style={s.rowAvatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName}>{sitter.firstName} {sitter.lastName?.[0]}.</Text>
                  <Text style={s.rowLocation} numberOfLines={1}>
                    {sitter.location} · {sitter.distanceKm}km
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '700', color: '#10B981' }}>{sitter.averageRating} ★</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>{sitter.reviewsCount} reviews</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ContentWrap>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  promo: {
    marginTop: 4,
    height: 76,
    borderRadius: 18,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    width: 160,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 110,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    gap: 14,
  },
  rowAvatar: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowLocation: {
    fontSize: 13,
    color: '#64748B',
  },
});