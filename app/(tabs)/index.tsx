import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Colors } from '../../constants/Colors';
import { MOCK_SITTERS, type MockSitter } from '../../lib/mock/sitters';
import { fetchSitters, applyRealDistances } from '../../lib/api/sitters';
import { getCurrentLocation } from '../../lib/location-service';
import { useAuth } from '../../providers/auth-provider';
import { supabase } from '../../lib/supabase';
import { useFavoritesStore } from '../../store/favorites-store';
import { useResponsive } from '../../lib/responsive';

function getGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

type FilterKey = 'all' | 'babysitter' | 'now' | 'verified' | 'near';

function applyFilter(list: MockSitter[], filter: FilterKey): MockSitter[] {
  switch (filter) {
    case 'now':      return list.filter(s => s.availableNow);
    case 'verified': return list.filter(s => s.identityVerified);
    case 'near':     return list.filter(s => s.distanceKm <= 2);
    case 'babysitter':
    case 'all':
    default:         return list;
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, session } = useAuth();
  const { isTablet, isDesktop } = useResponsive();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [greeting, setGreeting] = useState<string>(() => getGreeting());
  const [refreshing, setRefreshing] = useState(false);
  const [sitters, setSitters] = useState<MockSitter[]>(MOCK_SITTERS);

  // Responsive grid: 1 column on phones, 2 on tablets (768–1023),
  // 3 on desktop (1024+). Used for the "Top Rated" and "Recently Active"
  // sections; the "Nearby" rail keeps its horizontal carousel everywhere.
  const gridCols = isDesktop ? 3 : isTablet ? 2 : 1;
  // Show more sitters on bigger viewports — there's room to fill.
  const cardLimit = isDesktop ? 9 : isTablet ? 6 : 3;

  // Shared favorites store (synced with the Search tab and persisted to AsyncStorage).
  const favoriteIds   = useFavoritesStore(s => s.ids);
  const toggleFavorite = useFavoritesStore(s => s.toggle);
  const hydrateFavorites = useFavoritesStore(s => s.hydrate);

  useEffect(() => { hydrateFavorites(); }, [hydrateFavorites]);

  useEffect(() => {
    fetchSitters().then(async (list) => {
      setSitters(list);
      try {
        const loc = await getCurrentLocation();
        if (loc) setSitters(applyRealDistances(list, loc.latitude, loc.longitude));
      } catch {
        // Location denied — keep default distances
      }
    });
  }, []);

  // Refresh unread notifications count whenever this screen gains focus,
  // and re-evaluate the time-of-day greeting.
  const fetchUnreadCount = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      // Fallback for the demo: keep showing 3 unread when not signed-in.
      setUnreadCount(3);
      return;
    }
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) {
      console.warn('[home] unread count error:', error.message);
      setUnreadCount(0);
      return;
    }
    setUnreadCount(count ?? 0);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setGreeting(getGreeting());
      (async () => {
        await fetchUnreadCount();
        if (cancelled) return;
      })();
      return () => { cancelled = true; };
    }, [fetchUnreadCount]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setGreeting(getGreeting());
    await Promise.all([fetchUnreadCount(), fetchSitters().then(setSitters)]);
    setRefreshing(false);
  }, [fetchUnreadCount]);

  const handleNotifications = () => {
    router.push('/notifications');
  };

  const handlePromo = () => {
    Alert.alert(
      'Promo code applied!',
      'Use code KIDO20 at checkout to get 20% off your first booking.',
      [
        { text: 'Browse sitters', onPress: () => router.push('/(tabs)/search') },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleBookNow = (sitterId: string) => {
    router.push({ pathname: '/sitter/[id]', params: { id: sitterId } });
  };

  const greetingName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email.split('@')[0]
    : 'Welcome';
  const photoUri = profile?.photo_url
    ?? 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=200';

  const filtered = useMemo(() => applyFilter(sitters, filter), [sitters, filter]);
  const nearby   = useMemo(
    () => [...filtered].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, cardLimit),
    [filtered, cardLimit],
  );
  const topRated = useMemo(
    () => [...filtered].sort((a, b) => b.averageRating - a.averageRating).slice(0, cardLimit),
    [filtered, cardLimit],
  );
  // "Recently Active" = available-now sitters that aren't already shown above.
  // Falls back to the rest of the filtered list (excluding top rated) when no one is "now".
  const recent = useMemo(() => {
    const topRatedIds = new Set(topRated.map(s => s.id));
    const available  = filtered.filter(s => s.availableNow && !topRatedIds.has(s.id));
    if (available.length > 0) return available.slice(0, cardLimit);
    return filtered.filter(s => !topRatedIds.has(s.id)).slice(0, cardLimit);
  }, [filtered, topRated, cardLimit]);

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.primary}
            colors={[Colors.light.primary]}
          />
        }
      >
        {/* Greeting */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting} <Text>🧡</Text></Text>
            <Text style={s.userName} numberOfLines={1}>{greetingName}</Text>
          </View>

          <TouchableOpacity
            style={s.iconBtn}
            onPress={handleNotifications}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
          >
            <Ionicons name="notifications-outline" size={20} color={Colors.light.text} />
            {unreadCount > 0 ? (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            <Image
              source={{ uri: photoUri }}
              style={s.avatarSm}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <Pressable
          style={s.searchBar}
          onPress={() => router.push('/(tabs)/search')}
          accessibilityRole="search"
        >
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <Text style={s.searchPlaceholder}>Search babysitters near you...</Text>
          <View style={s.searchAction}>
            <Ionicons name="options-outline" size={18} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Promo banner — teal with subtle coral accent */}
        <Pressable
          style={({ pressed }) => [s.promo, pressed && { opacity: 0.94 }]}
          onPress={handlePromo}
          accessibilityRole="button"
          accessibilityLabel="Promo: 20% off first booking"
        >
          <LinearGradient
            colors={[Colors.light.primary, '#005C68']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.promoIconWrap}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.promoTitle}>First booking? Get 20% off</Text>
            <Text style={s.promoSubtitle}>Use code KIDO20 at checkout</Text>
          </View>
          <View style={s.promoArrow}>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          style={{ marginTop: 16 }}
        >
          <Chip label="All"           active={filter === 'all'}        onPress={() => setFilter('all')} />
          <Chip label="Babysitter"    active={filter === 'babysitter'} onPress={() => setFilter('babysitter')} />
          <Chip label="Available Now" active={filter === 'now'}        onPress={() => setFilter('now')} />
          <Chip label="Verified"      active={filter === 'verified'}   onPress={() => setFilter('verified')} icon="checkmark-circle" />
          <Chip label="Near Me"       active={filter === 'near'}       onPress={() => setFilter('near')} />
        </ScrollView>

        {/* Nearby Babysitters */}
        <SectionHeader title="Nearby Babysitters" onSeeAll={() => router.push('/(tabs)/search')} />
        {nearby.length === 0 ? (
          <EmptyMessage label="No sitters match this filter" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
          >
            {nearby.map(sitter => (
              <NearbyCard
                key={sitter.id}
                sitter={sitter}
                onPress={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
                onBook={() => handleBookNow(sitter.uuid ?? String(sitter.id))}
              />
            ))}
          </ScrollView>
        )}

        {/* Top Rated This Week */}
        <SectionHeader title="Top Rated This Week" onSeeAll={() => router.push('/(tabs)/search')} />
        <ResponsiveSitterGrid
          cols={gridCols}
          sitters={topRated}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          router={router}
        />

        {/* Recently Active */}
        <SectionHeader title="Recently Active" onSeeAll={() => router.push('/(tabs)/search')} />
        <ResponsiveSitterGrid
          cols={gridCols}
          sitters={recent}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          router={router}
        />
      </ScrollView>
    </View>
  );
}

function EmptyMessage({ label }: { label: string }) {
  return (
    <View style={s.emptyBox}>
      <Ionicons name="search-outline" size={20} color="#9CA3AF" />
      <Text style={s.emptyText}>{label}</Text>
    </View>
  );
}

/**
 * Responsive sitter grid: 1/2/3 columns based on viewport.
 * On phones it falls back to a vertical list of full-width row cards
 * (matches the original mobile design). On tablets/desktop the cards wrap
 * into a CSS-flex-style grid with even gaps.
 */
function ResponsiveSitterGrid({
  cols, sitters, favoriteIds, onToggleFavorite, router,
}: {
  cols: number;
  sitters: MockSitter[];
  favoriteIds: Set<number>;
  onToggleFavorite: (id: number) => void;
  router: ReturnType<typeof useRouter>;
}) {
  if (sitters.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <EmptyMessage label="No sitters match this filter" />
      </View>
    );
  }

  // Single column → keep the original RowCard list (full width).
  if (cols === 1) {
    return (
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {sitters.map(sitter => (
          <RowCard
            key={sitter.id}
            sitter={sitter}
            isFavorite={favoriteIds.has(sitter.id)}
            onToggleFavorite={() => onToggleFavorite(sitter.id)}
            onPress={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
          />
        ))}
      </View>
    );
  }

  // Multi-column grid (tablet/desktop). Use flexBasis with a small gap so
  // each row evenly distributes — works in both react-native-web and native.
  const gap = 12;
  const basis = `${100 / cols}%` as const;
  return (
    <View style={{ paddingHorizontal: 20 - gap / 2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {sitters.map(sitter => (
          <View
            key={sitter.id}
            style={{ width: basis, paddingHorizontal: gap / 2, paddingBottom: gap }}
          >
            <RowCard
              sitter={sitter}
              isFavorite={favoriteIds.has(sitter.id)}
              onToggleFavorite={() => onToggleFavorite(sitter.id)}
              onPress={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/* ──────────────────────────────── Chip ──────────────────────────────── */

function Chip({
  label, active, onPress, icon,
}: {
  label: string; active: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? '#FFFFFF' : Colors.light.primary}
          style={{ marginRight: 4 }}
        />
      ) : null}
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ──────────────────────────────── Section header ──────────────────────────────── */

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onSeeAll ? (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} hitSlop={10}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.light.primary} />
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ──────────────────────────────── Nearby tile card ──────────────────────────────── */

function NearbyCard({
  sitter, onPress, onBook,
}: {
  sitter: MockSitter; onPress: () => void; onBook: () => void;
}) {
  return (
    <TouchableOpacity style={s.nearbyCard} activeOpacity={0.92} onPress={onPress}>
      <View style={{ alignItems: 'center' }}>
        <View>
          <Image
            source={{ uri: sitter.photo }}
            style={s.nearbyAvatar}
            contentFit="cover"
            transition={200}
          />
          {sitter.identityVerified ? (
            <View style={s.verifiedDot}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
        <Text style={s.nearbyName} numberOfLines={1}>
          {sitter.firstName} {sitter.lastName}
        </Text>
        <View style={s.nearbyDistanceRow}>
          <Ionicons name="location-outline" size={11} color="#9CA3AF" />
          <Text style={s.nearbyDistance}>{sitter.distanceKm}km away</Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Ionicons
              key={i}
              name="star"
              size={11}
              color={i <= Math.round(sitter.averageRating) ? '#F5A524' : '#E5E7EB'}
            />
          ))}
          <Text style={s.reviewCount}> {sitter.averageRating.toFixed(1)} ({sitter.reviewsCount})</Text>
        </View>
        {sitter.identityVerified ? (
          <View style={s.verifiedPill}>
            <Ionicons name="checkmark-circle" size={11} color={Colors.light.primary} />
            <Text style={s.verifiedPillText}>Verified</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginTop: 8 }}>
        <Text style={s.priceBig}>{sitter.hourlyRate}</Text>
        <Text style={s.priceSmall}> DZD/hr</Text>
      </View>

      <TouchableOpacity
        style={s.bookBtn}
        activeOpacity={0.85}
        onPress={onBook}
        accessibilityRole="button"
        accessibilityLabel={`Book ${sitter.firstName}`}
      >
        <Text style={s.bookBtnText}>Book Now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

/* ──────────────────────────────── Row card (list item) ──────────────────────────────── */

function RowCard({
  sitter, onPress, isFavorite, onToggleFavorite,
}: {
  sitter: MockSitter; onPress: () => void; isFavorite: boolean; onToggleFavorite: () => void;
}) {
  return (
    <TouchableOpacity
      style={s.rowCard}
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${sitter.firstName} ${sitter.lastName}, ${sitter.averageRating} stars`}
    >
      <View style={s.rowAccent} />
      <View style={{ flexDirection: 'row', flex: 1, padding: 12, alignItems: 'flex-start' }}>
        <View>
          <Image
            source={{ uri: sitter.photo }}
            style={s.rowAvatar}
            contentFit="cover"
            transition={200}
          />
          {sitter.identityVerified ? (
            <View style={[s.verifiedDot, { top: -3, right: -3 }]}>
              <Ionicons name="checkmark" size={9} color="#FFFFFF" />
            </View>
          ) : null}
          {sitter.availableNow ? (
            <View style={s.onlineDot} />
          ) : null}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.rowName} numberOfLines={1}>
              {sitter.firstName} {sitter.lastName}
            </Text>
            {sitter.identityVerified ? (
              <Ionicons name="checkmark-circle" size={14} color={Colors.light.primary} style={{ marginLeft: 4 }} />
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
            <Text style={s.rowLocation} numberOfLines={1}>
              Algiers, {sitter.neighborhood} · {sitter.distanceKm}km
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons
                key={i}
                name="star"
                size={12}
                color={i <= Math.round(sitter.averageRating) ? '#F5A524' : '#E5E7EB'}
              />
            ))}
            <Text style={s.rowReviewCount}>
              {' '}{sitter.averageRating.toFixed(1)} ({sitter.reviewsCount})
            </Text>
          </View>

          <View style={s.rowChipsRow}>
            <TinyChip label={sitter.experience} tone="neutral" />
            {sitter.identityVerified && <TinyChip label="Verified" tone="primary" icon="checkmark-circle" />}
            {sitter.govIdVerified && <TinyChip label="Gov. ID" tone="neutral" icon="information-circle-outline" />}
            {sitter.availableNow && (
              <View style={s.availableInline}>
                <View style={s.availableDot} />
                <Text style={s.availableInlineText}>Available</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={s.priceBig}>{sitter.hourlyRate}</Text>
          </View>
          <Text style={s.priceSmall}>DZD/hr</Text>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            hitSlop={10}
            style={{ marginTop: 6, padding: 2 }}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#EC4899' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TinyChip({
  label, tone, icon,
}: {
  label: string; tone: 'primary' | 'neutral'; icon?: keyof typeof Ionicons.glyphMap;
}) {
  const bg = tone === 'primary' ? Colors.light.primaryLight : '#FFFFFF';
  const fg = tone === 'primary' ? Colors.light.primary : '#6B7280';
  const borderColor = tone === 'primary' ? Colors.light.primaryLight : '#E5E7EB';
  return (
    <View style={[s.tinyChip, { backgroundColor: bg, borderColor }]}>
      {icon ? <Ionicons name={icon} size={10} color={fg} style={{ marginRight: 3 }} /> : null}
      <Text style={[s.tinyChipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/* ──────────────────────────────── styles ──────────────────────────────── */

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF7F2' },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  greeting: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: Colors.light.text, marginTop: 2 },
  iconBtn: {
    // Min 44×44 to meet Apple HIG / Material specs across all viewports.
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EC4899', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  // Avatar bumped from 40 → 44 to satisfy the 44×44 tap-target minimum
  // when used as a button to the profile tab.
  avatarSm: { width: 44, height: 44, borderRadius: 22 },

  // Search
  searchBar: {
    marginHorizontal: 20, marginTop: 14,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#EDEDED',
    borderRadius: 14, height: 52,
    paddingHorizontal: 14, gap: 10,
  },
  searchPlaceholder: { flex: 1, color: '#9CA3AF', fontSize: 14 },
  searchAction: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.light.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  // Promo
  promo: {
    marginHorizontal: 20, marginTop: 14,
    height: 72, borderRadius: 16, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 14,
    shadowColor: Colors.light.primary, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  promoIconWrap: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  promoTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  promoSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  promoArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Chips
  chip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    minHeight: 40,
  },
  chipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  chipText: { fontSize: 13, color: Colors.light.text, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  // Section header
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 20, marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.light.text },
  seeAllText: { color: Colors.light.primary, fontSize: 13, fontWeight: '600', marginRight: 2 },

  // Nearby tile
  nearbyCard: {
    width: 170, padding: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  nearbyAvatar: { width: 64, height: 64, borderRadius: 32 },
  verifiedDot: {
    position: 'absolute', top: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  nearbyName: { fontSize: 14, fontWeight: '700', color: Colors.light.text, marginTop: 8, textAlign: 'center' },
  nearbyDistanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  nearbyDistance: { fontSize: 11, color: '#9CA3AF', marginLeft: 2 },
  reviewCount: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    backgroundColor: Colors.light.primaryLight, marginTop: 6, gap: 3,
  },
  verifiedPillText: { color: Colors.light.primary, fontSize: 11, fontWeight: '700' },
  priceBig: { fontSize: 20, fontWeight: '800', color: Colors.light.primary },
  priceSmall: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  bookBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 999, height: 44, // bumped 38 → 44 (HIG tap-target min)
    alignItems: 'center', justifyContent: 'center',
    marginTop: 12,
  },
  bookBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Row card
  rowCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowAccent: { width: 3, backgroundColor: Colors.light.primary },
  rowAvatar: { width: 48, height: 48, borderRadius: 10 },
  rowName: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  rowLocation: { fontSize: 12, color: '#6B7280', marginLeft: 2, flex: 1 },
  rowReviewCount: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  rowChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  onlineDot: {
    position: 'absolute', bottom: -2, left: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF',
  },

  // Tiny chip
  tinyChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
  },
  tinyChipText: { fontSize: 10, fontWeight: '700' },

  // Available inline
  availableInline: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 3,
    gap: 4,
  },
  availableDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  availableInlineText: { color: '#10B981', fontSize: 11, fontWeight: '700' },

  // Empty state
  emptyBox: {
    marginHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
