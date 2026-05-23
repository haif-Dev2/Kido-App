import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { MOCK_SITTERS, type MockSitter } from '../../lib/mock/sitters';
import { useFavoritesStore } from '../../store/favorites-store';
import { useResponsive } from '../../lib/responsive';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isTablet, isDesktop } = useResponsive();
  const favoriteIds    = useFavoritesStore(s => s.ids);
  const toggleFavorite = useFavoritesStore(s => s.toggle);
  const hydrate        = useFavoritesStore(s => s.hydrate);

  useEffect(() => { hydrate(); }, [hydrate]);

  const sitters = MOCK_SITTERS.filter(s => favoriteIds.has(s.id));
  const cols = isDesktop ? 3 : isTablet ? 2 : 1;

  return (
    <View style={[s.page, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#FFE4E6', '#FFFFFF']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={s.header}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Favorites</Text>
          <Text style={s.subtitle}>
            {sitters.length === 0
              ? 'Save sitters you love'
              : `${sitters.length} ${sitters.length === 1 ? 'sitter' : 'sitters'} saved`}
          </Text>
        </View>
        <View style={s.heartChip}>
          <Ionicons name="heart" size={18} color="#EC4899" />
          <Text style={s.heartChipText}>{sitters.length}</Text>
        </View>
      </LinearGradient>

      {sitters.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="heart-outline" size={48} color="#EC4899" />
          </View>
          <Text style={s.emptyTitle}>No favorites yet</Text>
          <Text style={s.emptySubtitle}>Tap the heart on any sitter to save them here</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/search')}>
            <Ionicons name="search" size={16} color="#FFFFFF" />
            <Text style={s.emptyBtnText}>Find a sitter</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 110 }}
          showsVerticalScrollIndicator={false}
        >
          {cols === 1 ? (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {sitters.map(item => (
                <FavCard key={item.id} sitter={item} onPress={() =>
                  router.push({ pathname: '/sitter/[id]', params: { id: item.uuid ?? String(item.id) } })
                } onRemove={() => toggleFavorite(item.id)} />
              ))}
            </View>
          ) : (
            <View style={{ paddingHorizontal: 10 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {sitters.map(item => (
                  <View key={item.id} style={{ width: `${100 / cols}%`, paddingHorizontal: 6, paddingBottom: 12 }}>
                    <FavCard sitter={item} onPress={() =>
                      router.push({ pathname: '/sitter/[id]', params: { id: item.uuid ?? String(item.id) } })
                    } onRemove={() => toggleFavorite(item.id)} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function FavCard({
  sitter, onPress, onRemove,
}: { sitter: MockSitter; onPress: () => void; onRemove: () => void }) {
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.9} onPress={onPress}>
      {/* Photo with overlay */}
      <View style={s.photoWrap}>
        <Image source={{ uri: sitter.photo }} style={s.photo} contentFit="cover" transition={200} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity
          style={s.heartBtn}
          onPress={(e) => { e.stopPropagation(); onRemove(); }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Remove from favorites"
        >
          <Ionicons name="heart" size={18} color="#EC4899" />
        </TouchableOpacity>
        {sitter.availableNow ? (
          <View style={s.availChip}>
            <View style={s.availDot} />
            <Text style={s.availText}>Available now</Text>
          </View>
        ) : null}
        <View style={s.photoFooter}>
          <Text style={s.photoName} numberOfLines={1}>
            {sitter.firstName} {sitter.lastName}
          </Text>
          <View style={s.photoLocRow}>
            <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={s.photoLoc} numberOfLines={1}>
              {sitter.neighborhood} · {sitter.distanceKm}km
            </Text>
          </View>
        </View>
      </View>

      {/* Card body */}
      <View style={s.body}>
        <View style={s.ratingRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <Ionicons
              key={i}
              name="star"
              size={12}
              color={i <= Math.round(sitter.averageRating) ? '#F5A524' : '#E5E7EB'}
            />
          ))}
          <Text style={s.ratingText}>
            {sitter.averageRating.toFixed(1)} ({sitter.reviewsCount})
          </Text>
        </View>

        <View style={s.priceRow}>
          <View>
            <Text style={s.price}>
              {sitter.hourlyRate} <Text style={s.priceUnit}>DZD/hr</Text>
            </Text>
          </View>
          <View style={s.bookBtn}>
            <Text style={s.bookBtnText}>Book</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F6F8' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  heartChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#FCE7E7',
  },
  heartChipText: { fontSize: 14, fontWeight: '800', color: '#EC4899' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  photoWrap: { width: '100%', height: 160, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  heartBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  availChip: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.95)',
  },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  availText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  photoFooter: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  photoName: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  photoLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  photoLoc: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' },

  body: { padding: 14, gap: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginLeft: 4 },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 18, fontWeight: '800', color: Colors.light.primary },
  priceUnit: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, backgroundColor: Colors.light.primary,
  },
  bookBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#FFE4E6',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 6 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  emptyBtn: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
