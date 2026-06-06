

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

const TEAL = '#007D8C';
const ONBOARDING_KEY = '@kido:onboarding_done';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const markDone = () => AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});

const SLIDES = [
  {
    id: 0,
    titlePrefix: 'Trouvez',
    titlePrefixColor: TEAL,
    titleRest: ' des baby-sitters\nde confiance',
    subtitle: 'Parcourez des profils vérifiés, consultez les avis et trouvez le match parfait pour votre famille.',
    icon: 'search',
    iconColor: '#FFFFFF',
    iconBg: TEAL,
    circleBg: '#E6F4F5',
  },
  {
    id: 1,
    titlePrefix: 'Réservez',
    titlePrefixColor: '#111827',
    titleRest: ' en quelques minutes',
    subtitle: 'Choisissez la date, l\'heure et vos préférences. Recevez une confirmation instantanée.',
    icon: 'calendar-outline',
    iconColor: '#FFFFFF',
    iconBg: '#F9A8D4',
    circleBg: '#FDF2F8',
  },
  {
    id: 2,
    titlePrefix: 'Sécurisé',
    titlePrefixColor: '#111827',
    titleRest: ', Vérifié & Fiable',
    subtitle: 'Tous les baby-sitters passent une vérification d\'identité et un contrôle par notre équipe.',
    icon: 'shield-checkmark-outline',
    iconColor: '#FFFFFF',
    iconBg: TEAL,
    circleBg: '#E6F4F5',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== currentIndex) setCurrentIndex(page);
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentIndex(index);
  };

  const handleSkip = () => {
    markDone();
    router.replace('/login');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      // Last slide → go to login (replace so back is impossible)
      markDone();
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>

      {/* Skip button — top right */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map(slide => (
          <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={[styles.circleOuter, { backgroundColor: slide.circleBg }]}>
              <View style={[styles.circleInner, { backgroundColor: slide.iconBg }]}>
                <Ionicons name={slide.icon as any} size={28} color={slide.iconColor} />
              </View>
            </View>
            <Text style={styles.title}>
              <Text style={{ color: slide.titlePrefixColor, fontWeight: '800' }}>
                {slide.titlePrefix}
              </Text>
              <Text>{slide.titleRest}</Text>
            </Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={styles.bottom}>
        {/* Pagination dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToSlide(i)} hitSlop={12}>
              <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Next / Commencer */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {currentIndex === SLIDES.length - 1 ? 'Commencer' : 'Suivant'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#FFFFFF' },
  topBar:     { paddingHorizontal: 24, paddingTop: 16, alignItems: 'flex-end' },
  skipText:   { color: Colors.light.textSecondary, fontSize: 14 },

  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  circleOuter: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
    borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  circleInner: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  title: {
    fontSize: 22, fontWeight: '700', color: '#111827',
    textAlign: 'center', marginBottom: 12, lineHeight: 30,
  },
  subtitle: {
    fontSize: 14, color: '#6B7280',
    textAlign: 'center', lineHeight: 22,
  },

  bottom:     { paddingHorizontal: 24, paddingBottom: 36, alignItems: 'center' },
  pagination: { flexDirection: 'row', marginBottom: 28, alignItems: 'center', gap: 6 },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  dotActive:  { width: 24, height: 4, borderRadius: 2, backgroundColor: TEAL },

  nextBtn: {
    backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', width: '100%', paddingVertical: 16,
    borderRadius: 30, minHeight: 56,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});