import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '../../constants/Colors';
import { MOCK_SITTERS, type MockSitter } from '../../lib/mock/sitters';
import { fetchSitters } from '../../lib/api/sitters';
import { useFavoritesStore } from '../../store/favorites-store';
import { Map } from '../../components/ui/Map';
import { useResponsive } from '../../lib/responsive';

type SortKey = 'relevance' | 'distance' | 'rating' | 'price';
type ViewMode = 'list' | 'map';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isTablet, isDesktop } = useResponsive();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [mode, setMode] = useState<ViewMode>('list');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [sitters, setSitters] = useState<MockSitter[]>(MOCK_SITTERS);

  // Number of result columns by viewport. Map height also scales — bigger
  // viewports get a more useful map (260 / 360 vs the phone 160).
  const gridCols = isDesktop ? 3 : isTablet ? 2 : 1;
  const mapHeight = isDesktop ? 360 : isTablet ? 260 : 160;

  // Shared favorites store (synced with the Home tab and persisted to AsyncStorage).
  const favoriteIds   = useFavoritesStore(s => s.ids);
  const toggleFavorite = useFavoritesStore(s => s.toggle);
  const hydrateFavorites = useFavoritesStore(s => s.hydrate);

  useEffect(() => { hydrateFavorites(); }, [hydrateFavorites]);

  useEffect(() => { fetchSitters().then(setSitters); }, []);

  const activeFilterCount = (verifiedOnly ? 1 : 0) + (availableNowOnly ? 1 : 0);

  const openFilters = () => {
    Alert.alert(
      'Filters',
      'Quick filters:',
      [
        {
          text: verifiedOnly ? '✓ Verified only' : 'Verified only',
          onPress: () => setVerifiedOnly(v => !v),
        },
        {
          text: availableNowOnly ? '✓ Available now' : 'Available now',
          onPress: () => setAvailableNowOnly(v => !v),
        },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => { setVerifiedOnly(false); setAvailableNowOnly(false); },
        },
        { text: 'Close', style: 'cancel' },
      ],
    );
  };

  const results = useMemo<MockSitter[]>(() => {
    const q = query.trim().toLowerCase();
    const list = sitters.filter(s => {
      if (q && ![s.firstName, s.lastName, s.neighborhood].some(x => x.toLowerCase().includes(q))) return false;
      if (verifiedOnly && !s.identityVerified) return false;
      if (availableNowOnly && !s.availableNow) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'distance': return a.distanceKm - b.distanceKm;
        case 'rating':   return b.averageRating - a.averageRating;
        case 'price':    return a.hourlyRate - b.hourlyRate;
        default:         return 0;
      }
    });
  }, [query, sort, verifiedOnly, availableNowOnly, sitters]);

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar */}
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search city or area..."
              placeholderTextColor="#9CA3AF"
              style={s.searchInput}
              accessibilityLabel="Search"
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={s.filterBtn}
            activeOpacity={0.8}
            onPress={openFilters}
            accessibilityRole="button"
            accessibilityLabel={`Filters, ${activeFilterCount} active`}
          >
            <Ionicons name="options" size={18} color="#FFFFFF" />
            {activeFilterCount > 0 ? (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={[s.map, { height: mapHeight }]}>
          <Map
            markers={results.map(s => ({
              latitude: s.latitude,
              longitude: s.longitude,
              title: `${s.firstName} ${s.lastName}`,
              description: `${s.hourlyRate} DZD/hr`,
            }))}
            center={{ latitude: 36.7372, longitude: 3.0869 }}
            showUserLocation
            height={mapHeight}
            onMarkerPress={(marker) => {
              const sitter = results.find(s => s.firstName + ' ' + s.lastName === marker.title);
              if (sitter) {
                router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } });
              }
            }}
          />

          <View style={s.mapPill}>
            <Ionicons name="location" size={14} color={Colors.light.primary} />
            <Text style={s.mapPillText}>Algiers · {results.length} nearby</Text>
          </View>

          {/* View mode toggle */}
          <View style={s.viewToggle}>
            <TouchableOpacity
              style={[s.viewToggleItem, mode === 'list' && s.viewToggleActive]}
              onPress={() => setMode('list')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="List view"
              accessibilityState={{ selected: mode === 'list' }}
            >
              <Ionicons name="list" size={13} color={mode === 'list' ? '#FFFFFF' : Colors.light.text} />
              <Text style={[s.viewToggleText, mode === 'list' && { color: '#FFFFFF' }]}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.viewToggleItem, mode === 'map' && s.viewToggleActive]}
              onPress={() => setMode('map')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Map view"
              accessibilityState={{ selected: mode === 'map' }}
            >
              <Ionicons name="map" size={13} color={mode === 'map' ? '#FFFFFF' : Colors.light.text} />
              <Text style={[s.viewToggleText, mode === 'map' && { color: '#FFFFFF' }]}>Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary + sort */}
        <View style={s.summaryRow}>
          <Text style={s.summaryCount}>{results.length} babysitters found</Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {(['relevance', 'distance', 'rating', 'price'] as SortKey[]).map(k => (
              <TouchableOpacity key={k} onPress={() => setSort(k)} activeOpacity={0.7} accessibilityRole="button">
                <Text style={[s.sortLabel, sort === k && s.sortLabelActive]}>{label(k)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results list */}
        {mode === 'list' ? (
          results.length === 0 ? (
            <View style={{ paddingHorizontal: 20 }}>
              <View style={s.empty}>
                <Ionicons name="search-outline" size={28} color="#9CA3AF" />
                <Text style={s.emptyTitle}>No babysitters found</Text>
                <Text style={s.emptySubtitle}>Try clearing filters or changing your search</Text>
              </View>
            </View>
          ) : gridCols === 1 ? (
            // Single-column phone list (preserves the original mobile UX).
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              {results.map(sitter => (
                <RowCard
                  key={sitter.id}
                  sitter={sitter}
                  isFavorite={favoriteIds.has(sitter.id)}
                  onToggleFavorite={() => toggleFavorite(sitter.id)}
                  onPress={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
                />
              ))}
            </View>
          ) : (
            // Tablet/desktop grid (2 or 3 columns).
            <View style={{ paddingHorizontal: 14 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {results.map(sitter => (
                  <View
                    key={sitter.id}
                    style={{ width: `${100 / gridCols}%`, paddingHorizontal: 6, paddingBottom: 12 }}
                  >
                    <RowCard
                      sitter={sitter}
                      isFavorite={favoriteIds.has(sitter.id)}
                      onToggleFavorite={() => toggleFavorite(sitter.id)}
                      onPress={() => router.push({ pathname: '/sitter/[id]', params: { id: sitter.uuid ?? String(sitter.id) } })}
                    />
                  </View>
                ))}
              </View>
            </View>
          )
        ) : (
          <View style={s.mapMode}>
            <Ionicons name="map-outline" size={36} color={Colors.light.primary} />
            <Text style={s.mapModeTitle}>Map view</Text>
            <Text style={s.mapModeSubtitle}>{results.length} babysitter{results.length === 1 ? '' : 's'} on the map above</Text>
            <TouchableOpacity
              style={s.mapModeBtn}
              activeOpacity={0.85}
              onPress={() => setMode('list')}
            >
              <Ionicons name="list" size={16} color="#FFFFFF" />
              <Text style={s.mapModeBtnText}>Switch to list</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function label(k: SortKey) {
  return ({ relevance: 'Relevance', distance: 'Distance', rating: 'Rating', price: 'Price' })[k];
}

/* ──────────────────────────────── Row card (shared with Home) ──────────────────────────────── */

function RowCard({
  sitter, onPress, isFavorite, onToggleFavorite,
}: {
  sitter: MockSitter; onPress: () => void; isFavorite: boolean; onToggleFavorite: () => void;
}) {
  return (
    <TouchableOpacity style={s.rowCard} activeOpacity={0.9} onPress={onPress} accessibilityRole="button">
      <View style={s.rowAccent} />
      <View style={{ flexDirection: 'row', flex: 1, padding: 12 }}>
        <View>
          <Image source={{ uri: sitter.photo }} style={s.rowAvatar} contentFit="cover" transition={200} />
          {sitter.identityVerified ? (
            <View style={[s.verifiedDot, { top: -3, right: -3 }]}>
              <Ionicons name="checkmark" size={9} color="#FFFFFF" />
            </View>
          ) : null}
          {sitter.availableNow ? <View style={s.onlineDot} /> : null}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.rowName}>{sitter.firstName} {sitter.lastName}</Text>
            {sitter.identityVerified ? (
              <Ionicons name="checkmark-circle" size={14} color={Colors.light.primary} style={{ marginLeft: 4 }} />
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
            <Text style={s.rowLocation}>Algiers, {sitter.neighborhood} · {sitter.distanceKm}km</Text>
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
            <Text style={s.rowReviewCount}> {sitter.averageRating.toFixed(1)} ({sitter.reviewsCount})</Text>
          </View>
          <View style={s.chipRow}>
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
}: { label: string; tone: 'primary' | 'neutral'; icon?: keyof typeof Ionicons.glyphMap }) {
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
  page: { flex: 1, backgroundColor: '#F5F6F8' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#EDEDED',
    borderRadius: 14, height: 48, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.light.text },
  filterBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EC4899',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // Map
  map: {
    marginHorizontal: 20, marginTop: 12,
    height: 160, borderRadius: 14,
    backgroundColor: '#DEF1EE',
    overflow: 'hidden',
  },
  pin: {
    position: 'absolute',
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.light.primary,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  mapPill: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mapPillText: { fontSize: 12, color: Colors.light.text, fontWeight: '700' },
  viewToggle: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 999, padding: 2,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  viewToggleItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    // Slightly bigger padding so each option meets a usable tap target
    // even when the visual stays small.
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
  },
  viewToggleActive: { backgroundColor: Colors.light.primary },
  viewToggleText: { fontSize: 11, fontWeight: '700', color: Colors.light.text },

  // Summary & sort
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 14, marginBottom: 10,
  },
  summaryCount: { fontSize: 15, fontWeight: '800', color: Colors.light.text },
  sortLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  sortLabelActive: { color: Colors.light.primary, fontWeight: '700' },

  // Row card (same design as home)
  rowCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowAccent: { width: 3, backgroundColor: Colors.light.primary },
  rowAvatar: { width: 48, height: 48, borderRadius: 10 },
  verifiedDot: {
    position: 'absolute', top: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute', bottom: -2, left: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF',
  },
  rowName: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  rowLocation: { fontSize: 12, color: '#6B7280', marginLeft: 2 },
  rowReviewCount: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tinyChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
  },
  tinyChipText: { fontSize: 10, fontWeight: '700' },
  priceBig: { fontSize: 20, fontWeight: '800', color: Colors.light.primary },
  priceSmall: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  availableInline: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  availableDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  availableInlineText: { color: '#10B981', fontSize: 11, fontWeight: '700' },

  // Empty state
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text, marginTop: 4 },
  emptySubtitle: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 24 },

  // Map mode placeholder
  mapMode: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mapModeTitle: { fontSize: 16, fontWeight: '800', color: Colors.light.text, marginTop: 4 },
  mapModeSubtitle: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  mapModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 10,
  },
  mapModeBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
