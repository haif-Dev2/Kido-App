import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable, RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VisitorBanner } from '../../components/ui/VisitorBanner';
import { Colors } from '../../constants/Colors';
import { applyRealDistances, fetchSitters } from '../../lib/api/sitters';
import { getCurrentLocation } from '../../lib/location-service';
import { MOCK_SITTERS, type MockSitter } from '../../lib/mock/sitters';
import { fluid, MAX_CONTENT_WIDTH, useResponsive } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/auth-provider';
import { useFavoritesStore } from '../../store/favorites-store';

function getGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

type FilterKey = 'all' | 'now' | 'verified' | 'near';

/* ── Centred content wrapper — caps width on desktop ── */
function ContentWrap({ children, hp, maxW = MAX_CONTENT_WIDTH }: {
  children: React.ReactNode;
  hp: number;
  maxW?: number;
}) {
  return (
    <View style={{ maxWidth: maxW, width: '100%', alignSelf: 'center', paddingHorizontal: hp }}>
      {children}
    </View>
  );
}

export default function HomeScreen() {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { profile, session, isVisitor } = useAuth();
  const { isTablet, isDesktop, isWide, hPad, width: vw } = useResponsive();

  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(['all']));
  const [unreadCount, setUnreadCount] = useState(0);
  const [greeting, setGreeting] = useState<string>(() => getGreeting());
  const [refreshing, setRefreshing] = useState(false);
  const [sitters, setSitters] = useState<MockSitter[]>(MOCK_SITTERS);

  // New contextual greeting + available count
  const hour = new Date().getHours();
  const contextualGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.first_name ?? session?.user?.user_metadata?.first_name ?? 'there';
  const availableCount = sitters.filter(s => s.availableNow).length;

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (key === 'all') {
        return new Set(['all']);
      }
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.delete('all');
        next.add(key);
      }
      if (next.size === 0) return new Set(['all']);
      return next;
    });
  };

  // Responsive layout values
  const gridCols       = isDesktop ? 3 : isTablet ? 2 : 1;
  const cardLimit      = isDesktop ? 9 : isTablet ? 6 : 3;
  const nearbyCardW    = isDesktop ? 220 : isTablet ? 200 : 170;
  const nearbyAsGrid   = isDesktop || isTablet;
  const heroMaxW       = isWide ? MAX_CONTENT_WIDTH : undefined;

  // Fluid typography
  const greetingFs = fluid(13, 16, vw);
  const nameFs     = fluid(22, 30, vw);
  const sectionFs  = fluid(17, 22, vw);

  const favoriteIds      = useFavoritesStore(s => s.ids);
  const toggleFavorite   = useFavoritesStore(s => s.toggle);
  const hydrateFavorites = useFavoritesStore(s => s.hydrate);

  useEffect(() => { hydrateFavorites(); }, [hydrateFavorites]);

  useEffect(() => {
    fetchSitters().then(async (list) => {
      setSitters(list);
      try {
        const loc = await getCurrentLocation();
        if (loc) setSitters(applyRealDistances(list, loc.latitude, loc.longitude));
      } catch { /* Location denied — keep default distances */ }
    });
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) { setUnreadCount(3); return; }
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) { console.warn('[home] unread count error:', error.message); setUnreadCount(0); return; }
    setUnreadCount(count ?? 0);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setGreeting(getGreeting());
      (async () => { await fetchUnreadCount(); if (cancelled) return; })();
      return () => { cancelled = true; };
    }, [fetchUnreadCount]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setGreeting(getGreeting());
    await Promise.all([fetchUnreadCount(), fetchSitters().then(setSitters)]);
    setRefreshing(false);
  }, [fetchUnreadCount]);

  const greetingName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email.split('@')[0]
    : 'Welcome';
  const photoUri = profile?.photo_url
    ?? 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=200';

  // Apply active filters
  const nearby = useMemo(() => {
    let list = [...sitters];

    if (!activeFilters.has('all')) {
      list = list.filter(s => {
        if (activeFilters.has('now') && !s.availableNow) return false;
        if (activeFilters.has('verified') && !s.identityVerified) return false;
        if (activeFilters.has('near') && s.distanceKm > 3) return false;
        return true;
      });
    }

    return list
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, cardLimit);
  }, [sitters, activeFilters, cardLimit]);

  const topRated = useMemo(
    () => [...sitters]
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, cardLimit),
    [sitters, cardLimit],
  );

  const recent = useMemo(() => {
    const topRatedIds = new Set(topRated.map(s => s.id));
    const available = sitters.filter(s => s.availableNow && !topRatedIds.has(s.id));
    if (available.length > 0) return available.slice(0, cardLimit);
    return sitters.filter(s => !topRatedIds.has(s.id)).slice(0, cardLimit);
  }, [sitters, topRated, cardLimit]);

  return (
    <View style={s.page}>
      {isVisitor && <VisitorBanner />}
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
        {/* ── Gradient hero ── */}
        <View style={s.hero}>
          <LinearGradient
            colors={[Colors.light.primary, '#006B79']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.heroBlob1} />
          <View style={s.heroBlob2} />

          <View style={{ maxWidth: heroMaxW, width: '100%', alignSelf: 'center' }}>
            <View style={[s.headerRow, { paddingTop: insets.top + 10, paddingHorizontal: hPad }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 }}>
                  Kido
                </Text>
              </View>

              {!isVisitor && (
                <TouchableOpacity
                  style={s.iconBtn}
                  onPress={() => router.push('/notifications')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                >
                  <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                  {unreadCount > 0 ? (
                    <View style={s.bellBadge}>
                      <Text style={s.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              )}

              {!isVisitor && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
                  <Image source={{ uri: photoUri }} style={s.avatarSm} contentFit="cover" transition={200} />
                </TouchableOpacity>
              )}
            </View>

            {/* Improved Hero Greeting */}
            <View style={{ marginHorizontal: hPad, marginTop: isDesktop ? 20 : 14, marginBottom: 4 }}>
              {isVisitor ? (
                <>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }}>
                    Find trusted babysitters
                  </Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16, lineHeight: 19 }}>
                    Verified profiles · Real reviews · Book in minutes
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                      onPress={() => router.push('/register')}
                      activeOpacity={0.88}
                    >
                      <Text style={{ color: Colors.light.primary, fontSize: 14, fontWeight: '700' }}>Sign Up Free</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}
                      onPress={() => router.push('/login')}
                      activeOpacity={0.88}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Log In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 }}>
                    {greeting}, {greetingName.split(' ')[0]}
                  </Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16 }}>
                    {availableCount > 0
                      ? `${availableCount} sitter${availableCount !== 1 ? 's' : ''} available near you`
                      : 'Find your perfect babysitter'}
                  </Text>
                  <TouchableOpacity
                    style={{ alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    onPress={() => router.push('/(tabs)/search')}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="search" size={15} color={Colors.light.primary} />
                    <Text style={{ color: Colors.light.primary, fontSize: 14, fontWeight: '700' }}>Find a Babysitter</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ── Promo banner ── */}
        <ContentWrap hp={hPad}>
          <Pressable
            style={({ pressed }) => [s.promo, pressed && { opacity: 0.94 }]}
            onPress={() => Alert.alert(
              'Promo code applied!',
              'Use code KIDO20 at checkout to get 20% off your first booking.',
              [
                { text: 'Browse sitters', onPress: () => router.push('/(tabs)/search') },
                { text: 'OK', style: 'cancel' },
              ]
            )}
            accessibilityRole="button"
            accessibilityLabel="Promo: 20% off first booking"
          >
            <LinearGradient
              colors={['#FF8A5B', '#EC5C8D']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={s.promoIconWrap}>
              <Ionicons name="sparkles" size={isTablet ? 24 : 20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.promoTitle, isTablet && { fontSize: 16 }]}>First booking? Get 20% off</Text>
              <Text style={[s.promoSubtitle, isTablet && { fontSize: 13 }]}>Use code KIDO20 at checkout</Text>
            </View>
            <View style={s.promoArrow}>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        </ContentWrap>

        {/* ── Filter chips ── */}
        <View style={{ maxWidth: heroMaxW, alignSelf: 'center', width: '100%' }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: hPad, gap: 8 }}
            style={{ marginTop: 18 }}
          >
            <Chip label="All" active={activeFilters.has('all')} onPress={() => toggleFilter('all')} />
            <Chip label="Available Now" active={activeFilters.has('now')} onPress={() => toggleFilter('now')} />
            <Chip label="Verified" active={activeFilters.has('verified')} onPress={() => toggleFilter('verified')} icon="checkmark-circle" />
            <Chip label="Near Me" active={activeFilters.has('near')} onPress={() => toggleFilter('near')} />
          </ScrollView>
        </View>

        {/* ── Nearby Babysitters ── */}
        <SectionHeader title="Nearby Babysitters" hp={hPad} sectionFs={sectionFs} onSeeAll={() => router.push('/(tabs)/search')} />
        {nearby.length === 0 ? (
          <ContentWrap hp={hPad}><EmptyMessage label="No sitters match this filter" /></ContentWrap>
        ) : nearbyAsGrid ? (
          <ContentWrap hp={hPad - 6}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {nearby.map(sitter => (
                <View key={sitter.id} style={{ width: `${100 / (isDesktop ? 4 : 3)}%`, paddingHorizontal: 6, paddingBottom: 12 }}>
                  <NearbyCard
                    sitter={sitter}
                    cardWidth={undefined}
                    onPress={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
                    onBook={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
                  />
                </View>
              ))}
            </View>
          </ContentWrap>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: hPad, gap: 12, paddingBottom: 4 }}
          >
            {nearby.map(sitter => (
              <NearbyCard
                key={sitter.id}
                sitter={sitter}
                cardWidth={nearbyCardW}
                onPress={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
                onBook={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
              />
            ))}
          </ScrollView>
        )}

        {/* ── Top Rated This Week ── */}
        <SectionHeader title="Top Rated This Week" hp={hPad} sectionFs={sectionFs} onSeeAll={() => router.push('/(tabs)/search')} />
        <ResponsiveSitterGrid
          cols={gridCols}
          hp={hPad}
          sitters={topRated}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          router={router}
        />

        {/* ── Recently Active ── */}
        <SectionHeader title="Recently Active" hp={hPad} sectionFs={sectionFs} onSeeAll={() => router.push('/(tabs)/search')} />
        <ResponsiveSitterGrid
          cols={gridCols}
          hp={hPad}
          sitters={recent}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          router={router}
        />
      </ScrollView>
    </View>
  );
}

/* ──────────────────────────────── EmptyMessage ──────────────────────────────── */
function EmptyMessage({ label }: { label: string }) {
  return (
    <View style={s.emptyBox}>
      <Ionicons name="search-outline" size={20} color="#9CA3AF" />
      <Text style={s.emptyText}>{label}</Text>
    </View>
  );
}

/* ──────────────────────────────── ResponsiveSitterGrid ──────────────────────────────── */
function ResponsiveSitterGrid({
  cols, hp, sitters, favoriteIds, onToggleFavorite, router,
}: {
  cols: number;
  hp: number;
  sitters: MockSitter[];
  favoriteIds: Set<number>;
  onToggleFavorite: (id: number) => void;
  router: ReturnType<typeof useRouter>;
}) {
  if (sitters.length === 0) {
    return (
      <ContentWrap hp={hp}><EmptyMessage label="No sitters match this filter" /></ContentWrap>
    );
  }

  if (cols === 1) {
    return (
      <ContentWrap hp={hp}>
        <View style={{ gap: 10 }}>
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
      </ContentWrap>
    );
  }

  const gap   = 14;
  const basis = `${100 / cols}%` as const;
  return (
    <ContentWrap hp={hp - gap / 2}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {sitters.map(sitter => (
          <View key={sitter.id} style={{ width: basis, paddingHorizontal: gap / 2, paddingBottom: gap }}>
            <RowCard
              sitter={sitter}
              isFavorite={favoriteIds.has(sitter.id)}
              onToggleFavorite={() => onToggleFavorite(sitter.id)}
              onPress={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
            />
          </View>
        ))}
      </View>
    </ContentWrap>
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
        <Ionicons name={icon} size={14} color={active ? '#FFFFFF' : Colors.light.primary} style={{ marginRight: 4 }} />
      ) : null}
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ──────────────────────────────── SectionHeader ──────────────────────────────── */
function SectionHeader({ title, hp, sectionFs, onSeeAll }: {
  title: string;
  hp: number;
  sectionFs: number;
  onSeeAll?: () => void;
}) {
  return (
    <View style={[s.sectionRow, { paddingHorizontal: hp, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={s.sectionAccent} />
        <Text style={[s.sectionTitle, { fontSize: sectionFs }]}>{title}</Text>
      </View>
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

/* ──────────────────────────────── NearbyCard ──────────────────────────────── */
function NearbyCard({
  sitter, cardWidth, onPress, onBook,
}: {
  sitter: MockSitter;
  cardWidth: number | undefined;
  onPress: () => void;
  onBook: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.nearbyCard, cardWidth != null && { width: cardWidth }]}
      activeOpacity={0.92}
      onPress={onPress}
    >
      <View style={{ alignItems: 'center' }}>
        <View>
          <Image source={{ uri: sitter.photo }} style={s.nearbyAvatar} contentFit="cover" transition={200} />
          {sitter.identityVerified ? (
            <View style={s.verifiedDot}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
        <Text style={s.nearbyName} numberOfLines={1}>{sitter.firstName} {sitter.lastName}</Text>
        <View style={s.nearbyDistanceRow}>
          <Ionicons name="location-outline" size={11} color="#9CA3AF" />
          <Text style={s.nearbyDistance}>{sitter.distanceKm}km away</Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Ionicons key={i} name="star" size={11}
              color={i <= Math.round(sitter.averageRating) ? '#F5A524' : '#E5E7EB'} />
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

/* ──────────────────────────────── RowCard ──────────────────────────────── */
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
      <View style={{ flexDirection: 'row', flex: 1, padding: 14, alignItems: 'flex-start' }}>
        <View>
          <Image source={{ uri: sitter.photo }} style={s.rowAvatar} contentFit="cover" transition={200} />
          {sitter.identityVerified ? (
            <View style={[s.verifiedDot, { top: -3, right: -3 }]}>
              <Ionicons name="checkmark" size={9} color="#FFFFFF" />
            </View>
          ) : null}
          {sitter.availableNow ? <View style={s.onlineDot} /> : null}
        </View>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.rowName} numberOfLines={1}>{sitter.firstName} {sitter.lastName}</Text>
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
              <Ionicons key={i} name="star" size={12}
                color={i <= Math.round(sitter.averageRating) ? '#F5A524' : '#E5E7EB'} />
            ))}
            <Text style={s.rowReviewCount}> {sitter.averageRating.toFixed(1)} ({sitter.reviewsCount})</Text>
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
          <Text style={s.priceBig}>{sitter.hourlyRate}</Text>
          <Text style={s.priceSmall}>DZD/hr</Text>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            hitSlop={10}
            style={{ marginTop: 8, padding: 2 }}
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

/* ──────────────────────────────── TinyChip ──────────────────────────────── */
function TinyChip({
  label, tone, icon,
}: {
  label: string; tone: 'primary' | 'neutral'; icon?: keyof typeof Ionicons.glyphMap;
}) {
  const bg          = tone === 'primary' ? Colors.light.primaryLight : '#FFFFFF';
  const fg          = tone === 'primary' ? Colors.light.primary : '#6B7280';
  const borderColor = tone === 'primary' ? Colors.light.primaryLight : '#E5E7EB';
  return (
    <View style={[s.tinyChip, { backgroundColor: bg, borderColor }]}>
      {icon ? <Ionicons name={icon} size={10} color={fg} style={{ marginRight: 3 }} /> : null}
      <Text style={[s.tinyChipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/* ──────────────────────────────── Styles ──────────────────────────────── */
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F4F6F9' },

  hero: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 22,
    overflow: 'hidden',
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  heroBlob1: {
    position: 'absolute', top: -40, right: -30,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  heroBlob2: {
    position: 'absolute', bottom: 0, left: -50,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    gap: 12,
  },
  iconBtn: {
    width: 46, height: 46, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: -5, right: -5,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF5A8A',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  avatarSm: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
  },

  promo: {
    marginTop: 18,
    height: 76, borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 14,
    shadowColor: '#EC5C8D', shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  promoIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  promoTitle:    { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  promoSubtitle: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  promoArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  chip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    minHeight: 40,
  },
  chipActive:     { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  chipText:       { fontSize: 13, color: Colors.light.text, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 22, marginBottom: 12,
  },
  sectionTitle:  { fontWeight: '800', color: Colors.light.text },
  sectionAccent: { width: 4, height: 20, borderRadius: 2, backgroundColor: Colors.light.primary },
  seeAllText:    { color: Colors.light.primary, fontSize: 13, fontWeight: '600', marginRight: 2 },

  nearbyCard: {
    width: 170, padding: 14,
    backgroundColor: '#FFFFFF', borderRadius: 18,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  nearbyAvatar: { width: 68, height: 68, borderRadius: 34 },
  verifiedDot: {
    position: 'absolute', top: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  nearbyName:        { fontSize: 14, fontWeight: '700', color: Colors.light.text, marginTop: 8, textAlign: 'center' },
  nearbyDistanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  nearbyDistance:    { fontSize: 11, color: '#9CA3AF', marginLeft: 2 },
  reviewCount:       { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    backgroundColor: Colors.light.primaryLight, marginTop: 6, gap: 3,
  },
  verifiedPillText: { color: Colors.light.primary, fontSize: 11, fontWeight: '700' },
  priceBig:   { fontSize: 20, fontWeight: '800', color: Colors.light.primary },
  priceSmall: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  bookBtn: {
    backgroundColor: Colors.light.primary,
    borderRadius: 999, height: 44,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 12,
  },
  bookBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  rowCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  rowAccent:      { width: 4, backgroundColor: Colors.light.primary },
  rowAvatar:      { width: 54, height: 54, borderRadius: 12 },
  rowName:        { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  rowLocation:    { fontSize: 12, color: '#6B7280', marginLeft: 2, flex: 1 },
  rowReviewCount: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  rowChipsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  onlineDot: {
    position: 'absolute', bottom: -2, left: -2,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF',
  },

  tinyChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
  },
  tinyChipText: { fontSize: 10, fontWeight: '700' },

  availableInline: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 3, gap: 4,
  },
  availableDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  availableInlineText: { color: '#10B981', fontSize: 11, fontWeight: '700' },

  emptyBox: {
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1, borderColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  emptyText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
});