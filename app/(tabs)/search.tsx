import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Map } from '../../components/ui/Map';
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

// ── Algeria instant suggestions (no network needed) ──
const ALGERIA_AREAS: GeoSuggestion[] = [
  // Mostaganem city & communes
  { name: 'Mostaganem',    displayName: 'Mostaganem, Wilaya de Mostaganem, Algérie',   lat: 35.9317, lon: 0.0892,  boundingBox: [35.88, 35.97, 0.03,  0.16]  },
  { name: 'Tijditt',       displayName: 'Tijditt, Mostaganem, Algérie',                lat: 35.9278, lon: 0.0978,  boundingBox: [35.91, 35.95, 0.07,  0.13]  },
  { name: 'Salamandre',    displayName: 'Salamandre, Mostaganem, Algérie',             lat: 35.9200, lon: 0.0760,  boundingBox: [35.90, 35.94, 0.05,  0.11]  },
  { name: 'Stidia',        displayName: 'Stidia, Mostaganem, Algérie',                 lat: 35.8568, lon: 0.0292,  boundingBox: [35.83, 35.88, 0.00,  0.07]  },
  { name: 'Mazagran',      displayName: 'Mazagran, Mostaganem, Algérie',               lat: 35.9256, lon: 0.0583,  boundingBox: [35.90, 35.95, 0.03,  0.09]  },
  { name: 'Mesra',         displayName: 'Mesra, Mostaganem, Algérie',                  lat: 35.8892, lon: 0.1156,  boundingBox: [35.86, 35.92, 0.08,  0.16]  },
  { name: 'Aïn Tédelès',   displayName: 'Aïn Tédelès, Mostaganem, Algérie',           lat: 36.0050, lon: 0.3067,  boundingBox: [35.97, 36.04, 0.27,  0.35]  },
  { name: 'Bouguirat',     displayName: 'Bouguirat, Mostaganem, Algérie',              lat: 36.0569, lon: 0.0833,  boundingBox: [36.02, 36.10, 0.04,  0.13]  },
  { name: 'Hassi Mamèche', displayName: 'Hassi Mamèche, Mostaganem, Algérie',          lat: 35.9439, lon: 0.2442,  boundingBox: [35.91, 35.98, 0.20,  0.29]  },
  { name: 'Sidi Ali',      displayName: 'Sidi Ali, Mostaganem, Algérie',               lat: 36.1031, lon: 0.4539,  boundingBox: [36.07, 36.14, 0.41,  0.50]  },
  { name: 'Aïn Nouissy',   displayName: 'Aïn Nouissy, Mostaganem, Algérie',           lat: 35.9208, lon: 0.0369,  boundingBox: [35.89, 35.95, 0.00,  0.08]  },
  { name: 'Sayada',        displayName: 'Sayada, Mostaganem, Algérie',                 lat: 36.0808, lon: 0.1467,  boundingBox: [36.05, 36.11, 0.11,  0.19]  },
  { name: 'Mansourah',     displayName: 'Mansourah, Mostaganem, Algérie',              lat: 36.0231, lon: 0.0594,  boundingBox: [35.99, 36.06, 0.02,  0.10]  },
  { name: 'Kheireddine',   displayName: 'Kheireddine, Mostaganem, Algérie',            lat: 36.0522, lon: 0.2047,  boundingBox: [36.02, 36.09, 0.16,  0.25]  },
  { name: 'Sirat',         displayName: 'Sirat, Mostaganem, Algérie',                  lat: 35.8808, lon: 0.1853,  boundingBox: [35.85, 35.92, 0.14,  0.23]  },
  { name: 'Fornaka',       displayName: 'Fornaka, Mostaganem, Algérie',                lat: 36.0189, lon: 0.3786,  boundingBox: [35.99, 36.05, 0.34,  0.42]  },
  { name: 'Souaflia',      displayName: 'Souaflia, Mostaganem, Algérie',               lat: 36.1144, lon: 0.2583,  boundingBox: [36.08, 36.15, 0.22,  0.30]  },
  { name: 'Tazgaït',       displayName: 'Tazgaït, Mostaganem, Algérie',               lat: 35.9731, lon: 0.1458,  boundingBox: [35.94, 36.01, 0.10,  0.19]  },
  { name: 'Nekmaria',      displayName: 'Nekmaria, Mostaganem, Algérie',               lat: 36.0369, lon: 0.4786,  boundingBox: [36.01, 36.07, 0.44,  0.52]  },
  { name: 'Achaacha',      displayName: 'Achaacha, Mostaganem, Algérie',               lat: 36.1847, lon: 0.1894,  boundingBox: [36.15, 36.22, 0.14,  0.24]  },
  { name: 'Touahria',      displayName: 'Touahria, Mostaganem, Algérie',               lat: 35.9058, lon: 0.2417,  boundingBox: [35.87, 35.94, 0.19,  0.29]  },
  { name: 'Aïn Sidi Cherif', displayName: 'Aïn Sidi Cherif, Mostaganem, Algérie',     lat: 36.0783, lon: 0.0242,  boundingBox: [36.04, 36.11, -0.02, 0.07]  },
  { name: 'Khadra',        displayName: 'Khadra, Mostaganem, Algérie',                 lat: 35.9892, lon: 0.0203,  boundingBox: [35.96, 36.02, -0.02, 0.07]  },
  { name: 'Ouled Maallah', displayName: 'Ouled Maallah, Mostaganem, Algérie',          lat: 35.8253, lon: 0.2094,  boundingBox: [35.79, 35.86, 0.16,  0.26]  },
  { name: 'Oued El Kheir', displayName: 'Oued El Kheir, Mostaganem, Algérie',          lat: 35.9592, lon: 0.1739,  boundingBox: [35.93, 35.99, 0.14,  0.21]  },
  // Relizane city & communes
  { name: 'Relizane',      displayName: 'Relizane, Wilaya de Relizane, Algérie',       lat: 35.7343, lon: 0.5568,  boundingBox: [35.68, 35.79, 0.49,  0.63]  },
  { name: 'Hay El Badr',   displayName: 'Hay El Badr, Relizane, Algérie',              lat: 35.7420, lon: 0.5750,  boundingBox: [35.72, 35.76, 0.55,  0.60]  },
  { name: 'Sidi Khettab',  displayName: 'Sidi Khettab, Relizane, Algérie',             lat: 35.7200, lon: 0.5500,  boundingBox: [35.70, 35.74, 0.53,  0.57]  },
  { name: 'Oued Rhiou',    displayName: 'Oued Rhiou, Relizane, Algérie',               lat: 35.9606, lon: 0.9197,  boundingBox: [35.93, 35.99, 0.89,  0.95]  },
  // Algiers city & communes
  { name: 'Algiers',       displayName: 'Alger, Algérie',                              lat: 36.7372, lon: 3.0869,  boundingBox: [36.69, 36.80, 2.98,  3.18]  },
  { name: 'Hydra',         displayName: 'Hydra, Alger, Algérie',                       lat: 36.7510, lon: 3.0490,  boundingBox: [36.74, 36.76, 3.03,  3.07]  },
  { name: 'Bab El Oued',   displayName: 'Bab El Oued, Alger, Algérie',                lat: 36.7917, lon: 3.0500,  boundingBox: [36.78, 36.80, 3.03,  3.07]  },
  { name: 'Kouba',         displayName: 'Kouba, Alger, Algérie',                       lat: 36.7200, lon: 3.1000,  boundingBox: [36.70, 36.74, 3.07,  3.13]  },
  { name: 'Dely Ibrahim',  displayName: 'Dely Ibrahim, Alger, Algérie',               lat: 36.7500, lon: 2.9500,  boundingBox: [36.73, 36.77, 2.92,  2.98]  },
];

async function fetchGeoSuggestions(query: string): Promise<GeoSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();

  const localMatches = ALGERIA_AREAS.filter(a =>
    a.name.toLowerCase().includes(q) || a.displayName.toLowerCase().includes(q)
  ).slice(0, 3);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=dz`;
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

function inBBox(lat: number, lon: number, bb: [number, number, number, number]): boolean {
  const [minLat, maxLat, minLon, maxLon] = bb;
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
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
  const [sitters, setSitters] = useState<MockSitter[]>(MOCK_SITTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [searchCenter, setSearchCenter] = useState<{
    lat: number; lon: number; name: string;
    boundingBox: [number, number, number, number];
  } | null>(null);

  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationAttempted, setLocationAttempted] = useState(false);

  // Live sitters from real-time DB
  const [liveSitters, setLiveSitters] = useState<Array<{
    id: string;
    firstName: string;
    lastName: string;
    photo: string | null;
    lat: number;
    lon: number;
    hourlyRate: number;
    avgRating: number;
    reviewsCount: number;
    neighborhood: string;
  }>>([]);

  const [noLocationFound, setNoLocationFound] = useState(false);

  const pendingSubmitRef = useRef(false);
  const committedSearchNameRef = useRef<string>('');

  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [maxDistanceKm, setMaxDistanceKm] = useState(0);
  const [pendingMinRating, setPendingMinRating] = useState(0);
  const [pendingMaxPrice, setPendingMaxPrice] = useState(0);
  const [pendingMaxDist, setPendingMaxDist] = useState(0);
  const [pendingVerified, setPendingVerified] = useState(false);

  const gridCols = isDesktop ? 3 : isTablet ? 2 : 1;
  const { height: SCREEN_H } = Dimensions.get('window');
  const listMapHeight = Math.round(SCREEN_H * 0.38);

  const favoriteIds = useFavoritesStore(s => s.ids);
  const toggleFavorite = useFavoritesStore(s => s.toggle);
  const hydrateFavorites = useFavoritesStore(s => s.hydrate);

  useEffect(() => { hydrateFavorites(); }, [hydrateFavorites]);

  // Request location on mount
  useEffect(() => {
    fetchSitters().then(async (list) => {
      setSitters(list);
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          setUserLocation({ lat: loc.latitude, lon: loc.longitude });
          setSitters(applyRealDistances(list, loc.latitude, loc.longitude));
        }
      } catch {
        // Location denied — map still shows with default center
      } finally {
        setLocationAttempted(true);
      }
    }).catch(() => {
      setLocationAttempted(true);
    });
  }, []);

  // Fetch live sitters from sitter_locations table
  const fetchLiveSitters = useCallback(async () => {
    const { data, error } = await supabase
      .from('sitter_locations')
      .select(`
        sitter_id, latitude, longitude, neighborhood,
        sitter:profiles!sitter_id(
          first_name, last_name, photo_url,
          babysitter_details(hourly_rate, average_rating, reviews_count, identity_verified)
        )
      `)
      .eq('is_available', true);

    if (error) {
      console.warn('[fetchLiveSitters] error:', error.message);
      return;
    }

    if (data) {
      setLiveSitters(data.map((row: any) => ({
        id: row.sitter_id,
        firstName: row.sitter?.first_name ?? '',
        lastName: row.sitter?.last_name ?? '',
        photo: row.sitter?.photo_url ?? null,
        lat: Number(row.latitude),
        lon: Number(row.longitude),
        neighborhood: row.neighborhood ?? '',
        hourlyRate: row.sitter?.babysitter_details?.hourly_rate ?? 0,
        avgRating: row.sitter?.babysitter_details?.average_rating ?? 0,
        reviewsCount: row.sitter?.babysitter_details?.reviews_count ?? 0,
      })));
    }
  }, []);

  useEffect(() => {
    fetchLiveSitters();
    const interval = setInterval(fetchLiveSitters, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveSitters]);

  useFocusEffect(useCallback(() => {
    fetchLiveSitters();
  }, [fetchLiveSitters]));

  // ── Debounced suggestion fetch ──
  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }

    if (committedSearchNameRef.current === q.toLowerCase() && !noLocationFound) {
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
          setNoLocationFound(true);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const selectCity = (suggestion: GeoSuggestion) => {
    Keyboard.dismiss();
    pendingSubmitRef.current = false;
    setNoLocationFound(false);
    committedSearchNameRef.current = suggestion.name.toLowerCase();
    setSearchCenter({
      lat: suggestion.lat,
      lon: suggestion.lon,
      name: suggestion.name,
      boundingBox: suggestion.boundingBox,
    });
    setQuery(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const activeFilterCount =
    (verifiedOnly ? 1 : 0) +
    (minRating > 0 ? 1 : 0) + (maxPrice > 0 ? 1 : 0) + (maxDistanceKm > 0 ? 1 : 0);

  const hasActiveSearch = searchCenter !== null || noLocationFound;

  const openFilters = () => {
    setPendingMinRating(minRating);
    setPendingMaxPrice(maxPrice);
    setPendingMaxDist(maxDistanceKm);
    setPendingVerified(verifiedOnly);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setMinRating(pendingMinRating);
    setMaxPrice(pendingMaxPrice);
    setMaxDistanceKm(pendingMaxDist);
    setVerifiedOnly(pendingVerified);
    setShowFilters(false);
  };

  const clearAllFilters = () => {
    setPendingMinRating(0);
    setPendingMaxPrice(0);
    setPendingMaxDist(0);
    setPendingVerified(false);
  };

  const results = useMemo<MockSitter[]>(() => {
    if (noLocationFound) return [];
    if (!searchCenter) return [];

    // Convert live sitters to MockSitter shape
    const liveSitterIds = new Set(liveSitters.map(s => s.id));
    const liveAsMock: MockSitter[] = liveSitters
      .filter(s => inBBox(s.lat, s.lon, searchCenter.boundingBox))
      .map(s => ({
        // BabySitter base fields
        id: s.id as any,
        uuid: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: '',
        phone: '',
        photo: s.photo ?? 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200',
        role: 'BABY_SITTER' as any,
        createdAt: new Date().toISOString(),
        isVerified: false,
        experience: '1–2 years',
        hourlyRate: s.hourlyRate,
        availabilities: [],
        averageRating: s.avgRating,
        location: s.neighborhood && s.neighborhood !== 'Algeria' ? s.neighborhood : 'Algeria',
        isValidated: true,
        identityVerified: false,
        // MockSitter extended fields
        neighborhood: s.neighborhood || 'Algeria',
        distanceKm: Math.round(
          calculateDistance(searchCenter.lat, searchCenter.lon, s.lat, s.lon) * 10
        ) / 10,
        reviewsCount: s.reviewsCount,
        bio: '',
        languages: [],
        specialties: [],
        responseMinutes: 30,
        govIdVerified: false,
        policeCheck: false,
        availableNow: true,
        latitude: s.lat,
        longitude: s.lon,
      }));

    // Mock sitters (exclude duplicates) — only show available ones
    const mockResults = sitters
      .filter(s => !liveSitterIds.has(s.uuid ?? String(s.id)))
      .map(s => ({
        ...s,
        distanceKm: Math.round(
          calculateDistance(searchCenter.lat, searchCenter.lon, s.latitude, s.longitude) * 10
        ) / 10,
      }))
      .filter(s => {
        if (!inBBox(s.latitude, s.longitude, searchCenter.boundingBox)) return false;
        if (verifiedOnly && !s.identityVerified) return false;
        if (minRating > 0 && s.averageRating < minRating) return false;
        if (maxPrice > 0 && s.hourlyRate > maxPrice) return false;
        return true;
      });

    return [...liveAsMock, ...mockResults].sort((a, b) => {
      switch (sort) {
        case 'distance': return a.distanceKm - b.distanceKm;
        case 'rating':   return b.averageRating - a.averageRating;
        case 'price':    return a.hourlyRate - b.hourlyRate;
        default:         return a.distanceKm - b.distanceKm;
      }
    });
  }, [liveSitters, sitters, searchCenter, noLocationFound, sort, verifiedOnly, minRating, maxPrice, userLocation]);

  // Only show live (available) sitters + mock demo sitters on the map
  const mapMarkers = useMemo(() => {
    // Live sitters — only those with is_available=true in sitter_locations
    const live = liveSitters.map(s => ({
      latitude: s.lat,
      longitude: s.lon,
      title: `${s.firstName} ${s.lastName}`.trim() || 'Sitter',
      description: `${s.hourlyRate} DZD/hr`,
      markerId: s.id,
    }));

    // Mock sitters — always show (demo data)
    const liveIds = new Set(liveSitters.map(s => s.id));
    const mock = MOCK_SITTERS
      .filter(s => !liveIds.has(s.uuid ?? String(s.id)))
      .map(s => ({
        latitude: s.latitude,
        longitude: s.longitude,
        title: `${s.firstName} ${s.lastName}`,
        description: `${s.hourlyRate} DZD/hr`,
        markerId: s.uuid ?? String(s.id),
      }));

    return [...live, ...mock];
  }, [liveSitters]);

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      {isVisitor && <VisitorBanner />}

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
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button always visible */}
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

      {/* Suggestions dropdown */}
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

      {/* Map Container */}
      {(userLocation || searchCenter || locationAttempted) ? (
        <View style={
          mode === 'map'
            ? { flex: 1, overflow: 'hidden', borderRadius: 20, marginHorizontal: 12, marginBottom: 12, marginTop: 6 }
            : { height: listMapHeight, overflow: 'hidden', borderRadius: 20, marginHorizontal: 12, marginTop: 6 }
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
            onMarkerPress={(marker) => {
              const liveSitter = liveSitters.find(s => s.id === marker.markerId);
              if (liveSitter) {
                router.push({ pathname: '/sitter/[id]', params: { id: liveSitter.id } });
                return;
              }
              const mockSitter = MOCK_SITTERS.find(s => (s.uuid ?? String(s.id)) === marker.markerId);
              if (mockSitter) {
                router.push({ pathname: '/sitter/[id]', params: { id: mockSitter.uuid ?? String(mockSitter.id) } });
              }
            }}
          />

          <View style={s.mapBottomBar}>
            <View style={s.mapPill}>
              <Ionicons name="location" size={14} color={Colors.light.primary} />
              <Text style={s.mapPillText} numberOfLines={1}>
                {hasActiveSearch
                  ? `${results.length} babysitter${results.length !== 1 ? 's' : ''} nearby`
                  : 'Search a city or area'}
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
      ) : (
        <View style={[{ height: listMapHeight, marginHorizontal: 12, borderRadius: 20, overflow: 'hidden', marginTop: 6, backgroundColor: '#d4ecea', alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color="#0F766E" size="small" />
          <Text style={{ color: '#0F766E', fontSize: 12, fontWeight: '600', marginTop: 8 }}>
            Getting your location...
          </Text>
        </View>
      )}

      {/* List content */}
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
                    <View key={sitter.id} style={{ width: `${100 / gridCols}%`, paddingHorizontal: 6, paddingBottom: 12 }}>
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

      {/* Filter modal */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowFilters(false)}>
          <Pressable style={s.filterSheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <TouchableOpacity onPress={() => setShowFilters(false)} hitSlop={12}>
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
    </View>
  );
}

/* ── RowCard ── */
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
          {sitter.identityVerified && (
            <View style={[s.verifiedDot, { top: -3, right: -3 }]}>
              <Ionicons name="checkmark" size={9} color="#FFFFFF" />
            </View>
          )}
          {sitter.availableNow && <View style={s.onlineDot} />}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={s.rowName}>{sitter.firstName} {sitter.lastName}</Text>
            {sitter.identityVerified && (
              <Ionicons name="checkmark-circle" size={14} color={Colors.light.primary} style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="location-outline" size={11} color="#9CA3AF" />
            <Text style={s.rowLocation}>{sitter.location} · {sitter.distanceKm}km</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons key={i} name="star" size={12} color={i <= Math.round(sitter.averageRating) ? '#F5A524' : '#E5E7EB'} />
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
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#EC4899' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TinyChip({ label, tone, icon }: { label: string; tone: 'primary' | 'neutral'; icon?: keyof typeof Ionicons.glyphMap }) {
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
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDEDED',
    borderRadius: 14, height: 48, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.light.text },
  filterBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EC4899',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  mapBottomBar: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10,
  },
  mapPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: 22, shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 6, elevation: 3, flex: 1, maxWidth: '60%',
  },
  mapPillText: { fontSize: 13, fontWeight: '600', color: Colors.light.text, flexShrink: 1 },
  viewToggle: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 22, padding: 3, gap: 2,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  viewToggleItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
  },
  viewToggleActive: { backgroundColor: Colors.light.primary },
  viewToggleText: { fontSize: 13, fontWeight: '600', color: Colors.light.text },
  suggestionsBox: {
    marginHorizontal: 16, marginTop: 4,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12,
    elevation: 6, zIndex: 20, overflow: 'hidden',
  },
  sortChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  sortChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  sortChipTxt: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  sortChipTxtActive: { color: '#FFFFFF' },
  noResults: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  noResultsText: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 },
  noResultsSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  hint: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  hintText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginTop: 12, lineHeight: 20 },
  rowCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  rowAccent: { width: 3, backgroundColor: Colors.light.primary },
  rowAvatar: { width: 48, height: 48, borderRadius: 10 },
  verifiedDot: {
    position: 'absolute', top: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#10B981', alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF',
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, paddingTop: 12, maxHeight: '88%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16,
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
    borderColor: Colors.light.primary, backgroundColor: '#FFFFFF',
  },
  toggleChipActive: { backgroundColor: Colors.light.primary },
  toggleChipTxt: { fontSize: 13, fontWeight: '600', color: Colors.light.primary },
  toggleChipTxtActive: { color: '#FFFFFF' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  ratingChipActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  ratingChipTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  ratingChipTxtActive: { color: '#FFFFFF' },
  applyBtn: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  applyBtnTxt: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});