import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, type MapLocation } from '../../components/ui/Map';
import { VisitorBanner } from '../../components/ui/VisitorBanner';
import { Colors } from '../../constants/Colors';
import { applyRealDistances, fetchSitters } from '../../lib/api/sitters';
import { calculateDistance, getCurrentLocation } from '../../lib/location-service';
import { MOCK_SITTERS, type MockSitter } from '../../lib/mock/sitters';
import { useResponsive } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/auth-provider';
import { useFavoritesStore } from '../../store/favorites-store';

type SortKey = 'relevance' | 'distance' | 'rating' | 'price';
type ViewMode = 'list' | 'map';
type GeoSuggestion = {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  boundingBox: [number, number, number, number];
};

// Clean Tifinagh (Amazigh) characters
function cleanAmazigh(text: string): string {
  return text.replace(/[\u2D30-\u2D7F]+/g, '').replace(/\s{2,}/g, ' ').trim();
}

// ── Algeria instant suggestions (Mostaganem + Relizane + Algiers) ──
const ALGERIA_AREAS: GeoSuggestion[] = [
  // Mostaganem areas
  { name: 'Mostaganem',    displayName: 'Mostaganem, Wilaya de Mostaganem, Algérie',  lat: 35.9317, lon: 0.0892,  boundingBox: [35.88, 35.97, 0.03,  0.16]  },
  { name: 'Tijditt',       displayName: 'Tijditt, Mostaganem, Algérie',               lat: 35.9278, lon: 0.0978,  boundingBox: [35.91, 35.95, 0.07,  0.13]  },
  { name: 'Stidia',        displayName: 'Stidia, Mostaganem, Algérie',                lat: 35.8568, lon: 0.0292,  boundingBox: [35.83, 35.88, 0.00,  0.07]  },
  { name: 'Mesra',         displayName: 'Mesra, Mostaganem, Algérie',                 lat: 35.8892, lon: 0.1156,  boundingBox: [35.86, 35.92, 0.08,  0.16]  },
  { name: 'Aïn Tédelès',   displayName: 'Aïn Tédelès, Mostaganem, Algérie',          lat: 36.0050, lon: 0.3067,  boundingBox: [35.97, 36.04, 0.27,  0.35]  },
  { name: 'Hassi Mamèche', displayName: 'Hassi Mamèche, Mostaganem, Algérie',         lat: 35.9439, lon: 0.2442,  boundingBox: [35.91, 35.98, 0.20,  0.29]  },
  { name: 'Sidi Ali',      displayName: 'Sidi Ali, Mostaganem, Algérie',              lat: 36.1031, lon: 0.4539,  boundingBox: [36.07, 36.14, 0.41,  0.50]  },
  { name: 'Kheireddine',   displayName: 'Kheireddine, Mostaganem, Algérie',           lat: 36.0522, lon: 0.2047,  boundingBox: [36.02, 36.09, 0.16,  0.25]  },
  { name: 'Tazgaït',       displayName: 'Tazgaït, Mostaganem, Algérie',              lat: 35.9731, lon: 0.1458,  boundingBox: [35.94, 36.01, 0.10,  0.19]  },
  // Relizane areas
  { name: 'Relizane',      displayName: 'Relizane, Wilaya de Relizane, Algérie',      lat: 35.7343, lon: 0.5568,  boundingBox: [35.68, 35.79, 0.49,  0.63]  },
  { name: 'Hay El Badr',   displayName: 'Hay El Badr, Relizane, Algérie',             lat: 35.7420, lon: 0.5750,  boundingBox: [35.72, 35.76, 0.55,  0.60]  },
  { name: 'Sidi Khettab',  displayName: 'Sidi Khettab, Relizane, Algérie',            lat: 35.7200, lon: 0.5500,  boundingBox: [35.70, 35.74, 0.53,  0.57]  },
  { name: 'Oued Rhiou',    displayName: 'Oued Rhiou, Relizane, Algérie',              lat: 35.9606, lon: 0.9197,  boundingBox: [35.93, 35.99, 0.89,  0.95]  },
  // Algiers
  { name: 'Algiers',       displayName: 'Alger, Algérie',                             lat: 36.7372, lon: 3.0869,  boundingBox: [36.69, 36.80, 2.98,  3.18]  },
  { name: 'Hydra',         displayName: 'Hydra, Alger, Algérie',                      lat: 36.7510, lon: 3.0490,  boundingBox: [36.74, 36.76, 3.03,  3.07]  },
  { name: 'Bab El Oued',   displayName: 'Bab El Oued, Alger, Algérie',               lat: 36.7917, lon: 3.0500,  boundingBox: [36.78, 36.80, 3.03,  3.07]  },
];

// ── Nominatim helper functions ──
async function fetchGeoSuggestions(query: string): Promise<GeoSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const localMatches = ALGERIA_AREAS.filter(a =>
    a.name.toLowerCase().includes(q) || a.displayName.toLowerCase().includes(q)
  ).slice(0, 3);
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KidoApp/1.0 (kido.dz)' },
    });
    const data = await res.json();
    const nominatimResults: GeoSuggestion[] = (data ?? []).map((item: any) => ({
      name: cleanAmazigh(
        item.address?.city ?? item.address?.town ?? item.address?.village ??
        item.address?.suburb ?? item.address?.neighbourhood ??
        item.address?.road ?? item.name ?? query
      ),
      displayName: cleanAmazigh(item.display_name),
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      boundingBox: item.boundingbox.map(parseFloat) as [number, number, number, number],
    }));
    const merged = [...localMatches];
    for (const nr of nominatimResults) {
      const isDupe = merged.some(m =>
        Math.abs(m.lat - nr.lat) < 0.01 && Math.abs(m.lon - nr.lon) < 0.01
      );
      if (!isDupe) merged.push(nr);
    }
    return merged.slice(0, 6);
  } catch {
    return localMatches;
  }
}

function zoomFromBBox(bb: [number, number, number, number]): number {
  const lonDelta = Math.abs(bb[3] - bb[2]);
  const zoom = Math.round(Math.log2(360 / lonDelta));
  return Math.min(Math.max(zoom - 1, 9), 17);
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isVisitor } = useAuth();
  const { isTablet, isDesktop } = useResponsive();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [mode, setMode] = useState<ViewMode>('list');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [sitters, setSitters] = useState<MockSitter[]>(MOCK_SITTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [searchCenter, setSearchCenter] = useState<{
    lat: number; lon: number; name: string;
    boundingBox: [number, number, number, number];
    radiusKm: number;
  } | null>(null);

  const [committedResultCount, setCommittedResultCount] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const pendingSubmitRef = useRef(false);

  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [maxDistanceKm, setMaxDistanceKm] = useState(0);

  const [pendingMinRating, setPendingMinRating] = useState(0);
  const [pendingMaxPrice, setPendingMaxPrice] = useState(0);
  const [pendingMaxDist, setPendingMaxDist] = useState(0);
  const [pendingVerified, setPendingVerified] = useState(false);
  const [pendingAvailNow, setPendingAvailNow] = useState(false);

  const gridCols = isDesktop ? 3 : isTablet ? 2 : 1;
  const { height: SCREEN_H } = Dimensions.get('window');
  const listMapHeight = Math.round(SCREEN_H * 0.38);

  const favoriteIds = useFavoritesStore(s => s.ids);
  const toggleFavorite = useFavoritesStore(s => s.toggle);
  const hydrateFavorites = useFavoritesStore(s => s.hydrate);

  const [liveSitters, setLiveSitters] = useState<Array<{
    id: string; firstName: string; lastName: string; photo: string | null;
    lat: number; lon: number; neighborhood: string;
    hourlyRate: number; avgRating: number; reviewsCount: number;
    identityVerified: boolean;
  }>>([]);
  const [selectedSitter, setSelectedSitter] = useState<typeof liveSitters[0] | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => { hydrateFavorites(); }, [hydrateFavorites]);

  useEffect(() => {
    fetchSitters().then(async (list) => {
      setSitters(list);
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          setUserLocation({ lat: loc.latitude, lon: loc.longitude });
          setSitters(applyRealDistances(list, loc.latitude, loc.longitude));
        }
      } catch {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchLiveSitters = async () => {
      const { data } = await supabase
        .from('sitter_locations')
        .select(`
          sitter_id, latitude, longitude, neighborhood,
          sitter:profiles!sitter_id(
            id, first_name, last_name, photo_url,
            babysitter_details(hourly_rate, average_rating, reviews_count, identity_verified)
          )
        `)
        .eq('is_available', true);

      if (data && data.length > 0) {
        setLiveSitters(data.map((row: any) => ({
          id: row.sitter_id,
          firstName: row.sitter?.first_name ?? '',
          lastName: row.sitter?.last_name ?? '',
          photo: row.sitter?.photo_url ?? null,
          lat: row.latitude,
          lon: row.longitude,
          neighborhood: row.neighborhood ?? '',
          hourlyRate: row.sitter?.babysitter_details?.hourly_rate ?? 0,
          avgRating: row.sitter?.babysitter_details?.average_rating ?? 0,
          reviewsCount: row.sitter?.babysitter_details?.reviews_count ?? 0,
          identityVerified: row.sitter?.babysitter_details?.identity_verified ?? false,
        })));
      }
    };

    fetchLiveSitters();
    const interval = setInterval(fetchLiveSitters, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fixed debounce useEffect (Fix 1)
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }
    if (searchCenter?.name.toLowerCase() === q.toLowerCase()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      const found = await fetchGeoSuggestions(q);
      setSuggestions(found);
      setShowSuggestions(found.length > 0);
      setLoadingSuggestions(false);
      if (pendingSubmitRef.current) {
        pendingSubmitRef.current = false;
        if (found.length > 0) {
          selectCity(found[0]);
        } else {
          setSearchNotFound(true);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, searchCenter]);

  const selectCity = (suggestion: GeoSuggestion) => {
    Keyboard.dismiss();
    pendingSubmitRef.current = false;
    setSearchNotFound(false);
    const [minLat, maxLat, minLon, maxLon] = suggestion.boundingBox;
    const newCenter = {
      lat: suggestion.lat,
      lon: suggestion.lon,
      name: suggestion.name,
      boundingBox: suggestion.boundingBox,
      radiusKm: 0,
    };
    setSearchCenter(newCenter);
    setQuery(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);

    const count = sitters.filter(s =>
      s.latitude >= minLat && s.latitude <= maxLat &&
      s.longitude >= minLon && s.longitude <= maxLon
    ).length;
    setCommittedResultCount(count);
  };

  const activeFilterCount =
    (verifiedOnly ? 1 : 0) + (availableNowOnly ? 1 : 0) +
    (minRating > 0 ? 1 : 0) + (maxPrice > 0 ? 1 : 0) + (maxDistanceKm > 0 ? 1 : 0);

  const hasActiveSearch = searchCenter !== null || searchNotFound;

  const openFilters = () => {
    setPendingMinRating(minRating);
    setPendingMaxPrice(maxPrice);
    setPendingMaxDist(maxDistanceKm);
    setPendingVerified(verifiedOnly);
    setPendingAvailNow(availableNowOnly);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setMinRating(pendingMinRating);
    setMaxPrice(pendingMaxPrice);
    setMaxDistanceKm(pendingMaxDist);
    setVerifiedOnly(pendingVerified);
    setAvailableNowOnly(pendingAvailNow);
    setShowFilters(false);
  };

  const clearAllFilters = () => {
    setPendingMinRating(0);
    setPendingMaxPrice(0);
    setPendingMaxDist(0);
    setPendingVerified(false);
    setPendingAvailNow(false);
  };

  // Fixed map markers (Fix 3)
  const mapMarkers = useMemo(() => {
    const bboxPredicate = searchCenter && !searchNotFound
      ? (lat: number, lon: number) => {
          const [minLat, maxLat, minLon, maxLon] = searchCenter.boundingBox;
          return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
        }
      : () => true;

    const live = liveSitters
      .filter(s => bboxPredicate(s.lat, s.lon))
      .map(s => ({
        latitude: s.lat,
        longitude: s.lon,
        title: `${s.firstName} ${s.lastName}`,
        description: `${s.hourlyRate} DZD/hr`,
        photoUrl: s.photo ?? undefined,
        markerId: s.id,
      }));

    const mock = sitters
      .filter(s => bboxPredicate(s.latitude, s.longitude))
      .map(s => ({
        latitude: s.latitude,
        longitude: s.longitude,
        title: `${s.firstName} ${s.lastName}`,
        description: `${s.hourlyRate} DZD/hr`,
        photoUrl: s.photo ?? undefined,
        markerId: s.uuid ?? String(s.id),
      }));

    return live.length > 0 ? live : mock;
  }, [liveSitters, sitters, searchCenter, searchNotFound]);

  // Fixed results (Fix 1)
  const results = useMemo<MockSitter[]>(() => {
    if (searchNotFound) return [];
    if (!searchCenter) return [];
    const [minLat, maxLat, minLon, maxLon] = searchCenter.boundingBox;
    return sitters
      .map(s => ({
        ...s,
        distanceKm: Math.round(
          calculateDistance(searchCenter.lat, searchCenter.lon, s.latitude, s.longitude) * 10
        ) / 10,
      }))
      .filter(s => {
        if (s.latitude < minLat || s.latitude > maxLat) return false;
        if (s.longitude < minLon || s.longitude > maxLon) return false;
        if (verifiedOnly && !s.identityVerified) return false;
        if (availableNowOnly && !s.availableNow) return false;
        if (minRating > 0 && s.averageRating < minRating) return false;
        if (maxPrice > 0 && s.hourlyRate > maxPrice) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case 'distance': return a.distanceKm - b.distanceKm;
          case 'rating':   return b.averageRating - a.averageRating;
          case 'price':    return a.hourlyRate - b.hourlyRate;
          default:         return a.distanceKm - b.distanceKm;
        }
      });
  }, [sitters, searchCenter, searchNotFound, sort, verifiedOnly, availableNowOnly, minRating, maxPrice]);

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      {isVisitor && <VisitorBanner />}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or area..."
            placeholderTextColor="#9CA3AF"
            style={s.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (suggestions.length > 0) {
                selectCity(suggestions[0]);
              } else {
                pendingSubmitRef.current = true;
              }
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
                setLoadingSuggestions(false);
                setSearchNotFound(false);
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={s.filterBtn}
          activeOpacity={0.8}
          onPress={openFilters}
          accessibilityRole="button"
          accessibilityLabel={`Filters, ${activeFilterCount} active`}
        >
          <Ionicons name="options" size={18} color="#FFFFFF" />
          {activeFilterCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {showSuggestions && (
        <View style={s.suggestionsBox}>
          {loadingSuggestions ? (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.light.primary} />
            </View>
          ) : suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.lat}-${item.lon}`}
              onPress={() => selectCity(item)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 16, paddingVertical: 13,
                borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: '#F5F5F5',
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="location-outline" size={16} color={Colors.light.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }} numberOfLines={1}>
                  {item.displayName}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={
        mode === 'map'
          ? { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 20, overflow: 'hidden', marginTop: 6 }
          : { height: listMapHeight, marginHorizontal: 12, marginTop: 6, borderRadius: 20, overflow: 'hidden' }
      }>
        <Map
          markers={mapMarkers}
          center={
            searchCenter
              ? { latitude: searchCenter.lat, longitude: searchCenter.lon }
              : userLocation
                ? { latitude: userLocation.lat, longitude: userLocation.lon }
                : { latitude: 36.7372, longitude: 3.0869 }
          }
          userLocationOverride={
            userLocation ? { latitude: userLocation.lat, longitude: userLocation.lon } : null
          }
          showUserLocation={true}
          zoom={searchCenter ? zoomFromBBox(searchCenter.boundingBox) : 12}
          height={mode === 'map' ? '100%' : listMapHeight}
          onMarkerPress={(marker: MapLocation) => {
            const liveSitter = liveSitters.find(s => s.id === marker.markerId);
            if (liveSitter) { setSelectedSitter(liveSitter); setShowPopup(true); return; }
            const mockSitter = sitters.find(s => (s.uuid ?? String(s.id)) === marker.markerId);
            if (mockSitter) router.push({ pathname: '/sitter/[id]', params: { id: mockSitter.uuid ?? String(mockSitter.id) } });
          }}
        />

        <View style={s.mapBottomBar}>
          <View style={s.mapPill}>
            <Ionicons name="location" size={14} color={Colors.light.primary} />
            <Text style={s.mapPillText} numberOfLines={1}>
              {committedResultCount !== null
                ? ` ${committedResultCount} bsitter${committedResultCount !== 1 ? 's' : ''} found`
                : 'Search a location'}
            </Text>
          </View>
          <View style={s.viewToggle}>
            <TouchableOpacity
              style={[s.viewToggleItem, mode === 'list' && s.viewToggleActive]}
              onPress={() => setMode('list')}
              activeOpacity={0.8}
            >
              <Ionicons name="list" size={14} color={mode === 'list' ? '#FFFFFF' : Colors.light.text} />
              <Text style={[s.viewToggleText, mode === 'list' && { color: '#FFFFFF' }]}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.viewToggleItem, mode === 'map' && s.viewToggleActive]}
              onPress={() => setMode('map')}
              activeOpacity={0.8}
            >
              <Ionicons name="map" size={14} color={mode === 'map' ? '#FFFFFF' : Colors.light.text} />
              <Text style={[s.viewToggleText, mode === 'map' && { color: '#FFFFFF' }]}>Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {mode === 'list' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {hasActiveSearch && (
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4 }}>
                {results.length} babysitter{results.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          )}
          {hasActiveSearch && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
              style={{ marginBottom: 8 }}
            >
              {(['relevance', 'distance', 'rating', 'price'] as SortKey[]).map(key => (
                <TouchableOpacity
                  key={key}
                  style={[s.sortChip, sort === key && s.sortChipActive]}
                  onPress={() => setSort(key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.sortChipTxt, sort === key && s.sortChipTxtActive]}>
                    {key === 'relevance' ? 'Relevance' : key === 'distance' ? 'Distance' : key === 'rating' ? 'Rating' : 'Price'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {hasActiveSearch ? (
            results.length === 0 ? (
              <View style={s.noResults}>
                <Ionicons name="search-outline" size={32} color="#9CA3AF" />
                <Text style={s.noResultsText}>No babysitters found</Text>
                <Text style={s.noResultsSub}>Try a different city or remove some filters</Text>
              </View>
            ) : gridCols === 1 ? (
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
            <View style={s.hint}>
              <Ionicons name="search-outline" size={28} color="#D1D5DB" />
              <Text style={s.hintText}>Search a city or neighborhood to find babysitters</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Filter Modal - Full Content */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowFilters(false)}>
          <Pressable style={s.filterSheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <TouchableOpacity
                onPress={() => setShowFilters(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close filters"
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>Filtres</Text>
              <TouchableOpacity onPress={clearAllFilters} hitSlop={8}>
                <Text style={s.sheetClearAll}>Tout effacer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={s.filterSection}>
                <Text style={s.filterLabel}>Quick filters</Text>
                <View style={s.toggleRow}>
                  <TouchableOpacity
                    style={[s.toggleChip, pendingVerified && s.toggleChipActive]}
                    onPress={() => setPendingVerified(v => !v)}
                  >
                    <Ionicons name="shield-checkmark-outline" size={14} color={pendingVerified ? '#fff' : Colors.light.primary} />
                    <Text style={[s.toggleChipTxt, pendingVerified && s.toggleChipTxtActive]}>Verified only</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.toggleChip, pendingAvailNow && s.toggleChipActive]}
                    onPress={() => setPendingAvailNow(v => !v)}
                  >
                    <Ionicons name="flash-outline" size={14} color={pendingAvailNow ? '#fff' : Colors.light.primary} />
                    <Text style={[s.toggleChipTxt, pendingAvailNow && s.toggleChipTxtActive]}>Available now</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.filterSection}>
                <Text style={s.filterLabel}>Minimum rating</Text>
                <View style={s.ratingRow}>
                  {[0, 3, 3.5, 4, 4.5].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[s.ratingChip, pendingMinRating === r && s.ratingChipActive]}
                      onPress={() => setPendingMinRating(r)}
                    >
                      {r === 0 ? (
                        <Text style={[s.ratingChipTxt, pendingMinRating === r && s.ratingChipTxtActive]}>Any</Text>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="star" size={12} color={pendingMinRating === r ? '#fff' : '#F59E0B'} />
                          <Text style={[s.ratingChipTxt, pendingMinRating === r && s.ratingChipTxtActive]}>{r}+</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.filterSection}>
                <Text style={s.filterLabel}>Max price / hour</Text>
                <View style={s.ratingRow}>
                  {[0, 300, 400, 500, 700].map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[s.ratingChip, pendingMaxPrice === p && s.ratingChipActive]}
                      onPress={() => setPendingMaxPrice(p)}
                    >
                      <Text style={[s.ratingChipTxt, pendingMaxPrice === p && s.ratingChipTxtActive]}>
                        {p === 0 ? 'Any' : `≤${p} DZD`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.filterSection}>
                <Text style={s.filterLabel}>Max distance</Text>
                <View style={s.ratingRow}>
                  {[0, 1, 3, 5, 10].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[s.ratingChip, pendingMaxDist === d && s.ratingChipActive]}
                      onPress={() => setPendingMaxDist(d)}
                    >
                      <Text style={[s.ratingChipTxt, pendingMaxDist === d && s.ratingChipTxtActive]}>
                        {d === 0 ? 'Any' : `≤${d} km`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity style={s.applyBtn} onPress={applyFilters} activeOpacity={0.9}>
              <Text style={s.applyBtnTxt}>Show results</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Popup Modal - Full Content */}
      <Modal
        visible={showPopup}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPopup(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
          onPress={() => setShowPopup(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: insets.bottom + 24,
            }}
            onPress={() => {}}
          >
            {selectedSitter && (
              <>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 }} />

                <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
                  <Image
                    source={{ uri: selectedSitter.photo ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' }}
                    style={{ width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: Colors.light.primary }}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>
                      {selectedSitter.firstName} {selectedSitter.lastName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{selectedSitter.neighborhood}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <Ionicons name="star" size={13} color="#F5A524" />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
                        {selectedSitter.avgRating.toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>({selectedSitter.reviewsCount} reviews)</Text>
                      {selectedSitter.identityVerified && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E1F5EE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 }}>
                          <Ionicons name="checkmark-circle" size={11} color={Colors.light.primary} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.light.primary }}>Verified</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.light.primary }}>
                      {selectedSitter.hourlyRate}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>DZD/hr</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#10B981' }}>Available</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                    onPress={() => {
                      setShowPopup(false);
                      router.push({ pathname: '/sitter/[id]', params: { id: selectedSitter.id } });
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>View Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 2, backgroundColor: Colors.light.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                    onPress={() => {
                      setShowPopup(false);
                      router.push({
                        pathname: '/booking/new/[sitterId]' as any,
                        params: { sitterId: selectedSitter.id },
                      });
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

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
            <Text style={s.rowLocation}>{sitter.location} · {sitter.distanceKm}km</Text>
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

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, gap: 10,
    backgroundColor: '#F5F6F8',
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
  mapExpanded: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 20,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  mapBottomBar: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
    flex: 1,
    maxWidth: '60%',
  },
  mapPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    flexShrink: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 3,
    gap: 2,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  viewToggleItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },
  viewToggleActive: { backgroundColor: Colors.light.primary },
  viewToggleText: { fontSize: 13, fontWeight: '600', color: Colors.light.text },
  suggestionsBox: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    zIndex: 20,
    overflow: 'hidden',
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  sortChipTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  sortChipTxtActive: {
    color: '#FFFFFF',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  noResultsSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  hint: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  hintText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
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
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32,
    paddingTop: 12,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  sheetClearAll: { fontSize: 13, fontWeight: '700', color: Colors.light.primary },
  filterSection: { paddingHorizontal: 20, marginBottom: 20 },
  filterLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  toggleRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  toggleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1.5,
    borderColor: Colors.light.primary,
    backgroundColor: '#FFFFFF',
  },
  toggleChipActive: { backgroundColor: Colors.light.primary },
  toggleChipTxt: { fontSize: 13, fontWeight: '600', color: Colors.light.primary },
  toggleChipTxtActive: { color: '#FFFFFF' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, borderWidth: 1,
    borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  ratingChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  ratingChipTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  ratingChipTxtActive: { color: '#FFFFFF' },
  applyBtn: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  applyBtnTxt: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});