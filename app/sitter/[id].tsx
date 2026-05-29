import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { MOCK_SITTERS, MOCK_REVIEWS, type MockSitter } from '../../lib/mock/sitters';
import { fetchSitterById } from '../../lib/api/sitters';
import { haptics } from '../../lib/haptics';
import { Map } from '../../components/ui/Map';
import { READING_MAX_WIDTH, useResponsive } from '../../lib/responsive';
import { useAuth } from '../../providers/auth-provider';
import { LoginPromptModal } from '../../components/ui/LoginPromptModal';

/* ─── Design tokens ─── */
const TEAL = '#0F6E56';
const TEAL_DARK = '#085041';
const TEAL_SOFT = '#E1F5EE';
const AMBER_BG = '#FAEEDA';
const AMBER_FG = '#633806';
const BLUE_BG = '#E6F1FB';
const BLUE_FG = '#0C447C';
const WHITE = '#FFFFFF';
const SURFACE_BG = '#F8F7F4';      // warm body background
const SURFACE_2 = '#FFFFFF';
const SURFACE_3 = '#F5F4EF';        // stat card / chip gray bg
const TEXT = '#141413';
const TEXT_MUTED = '#6B6A62';
const BORDER = '#EAE7DE';
const STAR_GOLD = '#EF9F27';
const GREEN = '#1D9E75';

const HERO_HEIGHT = 200;
const AVATAR_SIZE = 80;

export default function SitterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPhone } = useResponsive();
  const { isVisitor } = useAuth();

  const [sitter, setSitter] = useState<MockSitter | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'schedule' | 'reviews'>('about');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    fetchSitterById(id).then(s => {
      setSitter(s ?? MOCK_SITTERS[0]);
      setLoading(false);
    });
  }, [id]);

  const reviews = MOCK_REVIEWS.filter(r => sitter && r.babySitterId === sitter.id);

  if (loading || !sitter) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE_BG }}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  const services = [
    { name: 'Babysitting', subtitle: 'Day care · up to 8h', rate: sitter.hourlyRate },
    { name: 'Overnight care', subtitle: 'Evening + night shift', rate: sitter.hourlyRate },
  ];

  const skills = ['5+ yrs experience', 'CPR certified', 'First Aid', 'Background checked'];

  const initials = `${sitter.firstName[0] ?? ''}${sitter.lastName[0] ?? ''}`.toUpperCase();

  // On phones the page is edge-to-edge. On tablets/desktop we cap the
  // content column at READING_MAX_WIDTH (720px) for comfortable line lengths
  // — the surrounding `_layout.tsx` already centers everything inside the
  // 1280px app surface, so this only narrows the inner column.
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_BG, alignItems: 'center' }}>
      <ScrollView
        style={{ width: '100%', maxWidth: contentMaxWidth }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
      >
        {/* ─── HERO ─── */}
        <View style={[s.hero, { height: HERO_HEIGHT, paddingTop: insets.top + 12 }]}>
          <LinearGradient
            colors={[TEAL, TEAL_DARK]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.heroBubble1} />

          {/* Top buttons */}
          <View style={s.heroTopRow}>
            <Pressable
              onPress={() => { haptics.tap(); router.back(); }}
              style={s.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={18} color={WHITE} />
            </Pressable>
            <Pressable
              onPress={() => { haptics.light(); setFavorited(v => !v); }}
              style={s.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Ionicons
                name={favorited ? 'heart' : 'heart-outline'}
                size={16}
                color={favorited ? '#FF4D6D' : WHITE}
              />
            </Pressable>
          </View>

          {sitter.availableNow ? (
            <Text style={s.heroAvailableLabel}>Available Now</Text>
          ) : null}
        </View>

        {/* ─── BODY ─── */}
        <View style={s.body}>
          {/* Avatar overflowing the boundary between hero & body.
              `avatarWrap` spans full body width and centers its child, which
              works reliably on both web and native (no transform tricks). */}
          <View style={s.avatarWrap}>
            <View style={s.avatarBox}>
              <View style={s.avatarRing}>
                {sitter.photo ? (
                  <Image
                    source={{ uri: sitter.photo }}
                    style={s.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
              <View style={s.verifiedDot}>
                <Ionicons name="checkmark" size={11} color={WHITE} />
              </View>
            </View>
          </View>
          <Text style={s.name}>
            {sitter.firstName} {sitter.lastName}
          </Text>
          <View style={s.locationRow}>
            <Ionicons name="location" size={12} color={TEXT_MUTED} />
            <Text style={s.location}>Algiers, {sitter.neighborhood}</Text>
          </View>

          <View style={s.starsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name="star"
                size={13}
                color={i < Math.round(sitter.averageRating) ? STAR_GOLD : '#E5E7EB'}
              />
            ))}
            <Text style={s.ratingText}>
              {sitter.averageRating} ({sitter.reviewsCount} reviews)
            </Text>
          </View>

          {/* Stats grid */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statValue}>{sitter.hourlyRate}</Text>
              <Text style={s.statLabel}>DZD / hour</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>5+ yrs</Text>
              <Text style={s.statLabel}>Experience</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>{sitter.distanceKm} km</Text>
              <Text style={s.statLabel}>Away</Text>
            </View>
          </View>

          {/* Trust badges */}
          <View style={s.badgesRow}>
            <View style={[s.badge, { backgroundColor: TEAL_SOFT }]}>
              <Text style={[s.badgeText, { color: TEAL_DARK }]}>✓ Gov ID Verified</Text>
            </View>
            <View style={[s.badge, { backgroundColor: AMBER_BG }]}>
              <Text style={[s.badgeText, { color: AMBER_FG }]}>+ First Aid</Text>
            </View>
            <View style={[s.badge, { backgroundColor: BLUE_BG }]}>
              <Text style={[s.badgeText, { color: BLUE_FG }]}>★ {sitter.averageRating} Rating</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={s.tabsRow}>
            {(['about', 'schedule', 'reviews'] as const).map(tab => {
              const active = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => { haptics.light(); setActiveTab(tab); }}
                  style={s.tab}
                  accessibilityRole="button"
                >
                  <Text style={[s.tabText, active && s.tabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                  {active ? <View style={s.tabUnderline} /> : null}
                </Pressable>
              );
            })}
          </View>

          {/* Tab content */}
          {activeTab === 'about' ? (
            <>
              <SectionHeader icon="person-outline" label="About me" />
              <Text style={s.aboutText}>{sitter.bio}</Text>

              <SectionHeader icon="globe-outline" label="Languages" style={{ marginTop: 22 }} />
              <View style={s.chipsRow}>
                {sitter.languages.map(lang => (
                  <View key={lang} style={s.langChip}>
                    <Text style={s.langChipText}>{lang}</Text>
                  </View>
                ))}
              </View>

              <SectionHeader icon="star-outline" label="Skills" style={{ marginTop: 22 }} />
              <View style={s.chipsRow}>
                {skills.map(skill => (
                  <View key={skill} style={s.skillChip}>
                    <Text style={s.skillChipText}>{skill}</Text>
                  </View>
                ))}
              </View>

              <SectionHeader icon="briefcase-outline" label="Services & pricing" style={{ marginTop: 22 }} />
              <View style={{ gap: 8 }}>
                {services.map((service, idx) => (
                  <View key={idx} style={s.serviceCard}>
                    <View style={s.serviceLeft}>
                      <View style={s.serviceDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.serviceName}>{service.name}</Text>
                        <Text style={s.serviceSub}>{service.subtitle}</Text>
                      </View>
                    </View>
                    <Text style={s.servicePrice}>{service.rate} DZD/hr</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {activeTab === 'schedule' ? (
            <>
              <SectionHeader icon="map-outline" label="Location" />
              <View style={s.mapWrap}>
                <Map
                  center={{
                    latitude: sitter.latitude,
                    longitude: sitter.longitude,
                    title: `${sitter.firstName} ${sitter.lastName}`,
                  }}
                  markers={[{
                    latitude: sitter.latitude,
                    longitude: sitter.longitude,
                    title: `${sitter.firstName} ${sitter.lastName}`,
                    description: sitter.neighborhood,
                  }]}
                  height={260}
                />
              </View>
              <Text style={[s.aboutText, { marginTop: 12 }]}>
                Available for bookings in Algiers, {sitter.neighborhood} area. Response time typically {sitter.responseMinutes} minutes.
              </Text>
            </>
          ) : null}

          {activeTab === 'reviews' ? (
            <View style={{ marginTop: 4 }}>
              {reviews.length === 0 ? (
                <Text style={s.aboutText}>No reviews yet.</Text>
              ) : (
                reviews.map(r => (
                  <View key={r.id} style={s.reviewCard}>
                    <View style={s.reviewHead}>
                      <Text style={s.reviewName}>{r.parentName}</Text>
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Ionicons
                            key={i}
                            name="star"
                            size={12}
                            color={i < r.rating ? STAR_GOLD : '#E5E7EB'}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={s.aboutText}>{r.comment}</Text>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ─── Bottom bar ─── */}
      {/* The outer absolute view spans the full screen so the divider line
          stretches edge-to-edge; the inner View caps width on tablets+desktop
          so the price + Book button stay aligned with the body content. */}
      <View style={[s.bottomBarOuter, { paddingBottom: insets.bottom + 12 }]}>
        <View style={[s.bottomBarInner, { maxWidth: contentMaxWidth }]}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={s.priceValue}>{sitter.hourlyRate} DZD</Text>
              <Text style={s.priceUnit}> /hr</Text>
            </View>
            {sitter.availableNow ? (
              <View style={s.availableRow}>
                <View style={s.availableDot} />
                <Text style={s.availableText}>Available now</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              haptics.medium();
              if (isVisitor) {
                setShowLoginPrompt(true);
                return;
              }
              router.push({ pathname: '/booking/new/[sitterId]', params: { sitterId: sitter.uuid ?? String(sitter.id) } });
            }}
            style={s.bookBtn}
            accessibilityRole="button"
            accessibilityLabel="Book Now"
          >
            <Text style={s.bookBtnText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={16} color={WHITE} />
          </Pressable>
        </View>
      </View>

      {/* Visitor → login prompt */}
      <LoginPromptModal
        visible={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        action="book a babysitter"
      />
    </View>
  );
}

/* ─── Reusable section header ─── */
function SectionHeader({
  icon,
  label,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  style?: any;
}) {
  return (
    <View style={[ss.secTitle, style]}>
      <View style={ss.secIcon}>
        <Ionicons name={icon} size={11} color={TEAL} />
      </View>
      <Text style={ss.secLabel}>{label}</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  secTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  secIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: TEAL_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT,
  },
});

/* ─── Styles ─── */
const s = StyleSheet.create({
  // Hero — gradient applied via LinearGradient child
  hero: {
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBubble1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -50,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  iconBtn: {
    // 44×44 minimum tap target (Apple HIG). Visual circle stays the same
    // size via the inner icon — only the hit area is enlarged.
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvailableLabel: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: WHITE,
    opacity: 0.85,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  avatarWrap: {
    position: 'absolute',
    top: -AVATAR_SIZE / 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  avatarBox: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    position: 'relative',
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: WHITE,
    backgroundColor: '#9FE1CB',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '500',
    color: TEAL,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: TEAL,
    borderWidth: 2,
    borderColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Body
  body: {
    backgroundColor: SURFACE_BG,
    paddingTop: AVATAR_SIZE / 2 + 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  name: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '500',
    color: TEXT,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 6,
  },
  location: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginLeft: 4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: SURFACE_3,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
    color: TEAL,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
  },

  // Trust badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  tabTextActive: {
    color: TEAL,
    fontWeight: '500',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -StyleSheet.hairlineWidth,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: TEAL,
  },

  // Body content
  aboutText: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 21,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: SURFACE_3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    borderRadius: 20,
  },
  langChipText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  skillChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: TEAL_SOFT,
    borderRadius: 20,
  },
  skillChipText: {
    fontSize: 12,
    color: TEAL_DARK,
  },

  // Service cards
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACE_3,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  serviceLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEAL,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT,
  },
  serviceSub: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: TEAL,
  },

  // Map
  mapWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },

  // Reviews
  reviewCard: {
    backgroundColor: SURFACE_2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT,
  },

  // Bottom bar — split into outer (full-width divider) and inner (centered
  // up to contentMaxWidth on tablets+desktop).
  bottomBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SURFACE_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    paddingHorizontal: 20,
    paddingTop: 14,
    alignItems: 'center',
  },
  bottomBarInner: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '500',
    color: TEXT,
  },
  priceUnit: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
    marginRight: 4,
  },
  availableText: {
    fontSize: 11,
    color: TEAL,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TEAL,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bookBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: WHITE,
  },
});
