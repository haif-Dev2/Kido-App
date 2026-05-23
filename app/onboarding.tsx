import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const TEAL = '#007D8C';

const SLIDES = [
  {
    id: 0,
    titlePrefix: 'Find',
    titlePrefixColor: TEAL,
    titleRest: ' Trusted Babysitters\nNearby',
    subtitle: 'Browse verified profiles, check reviews,\nand find the perfect match for your family.',
    icon: 'search',
    iconColor: '#FFFFFF',
    iconBg: TEAL,
    circleBg: '#E6F4F5',
  },
  {
    id: 1,
    titlePrefix: 'Book',
    titlePrefixColor: '#111827',
    titleRest: ' in Minutes',
    subtitle: 'Choose your date, time and preferences.\nGet confirmation instantly from your babysitter.',
    icon: 'calendar-outline',
    iconColor: '#FFFFFF',
    iconBg: '#F9A8D4',
    circleBg: '#FDF2F8',
  },
  {
    id: 2,
    titlePrefix: 'Safe',
    titlePrefixColor: '#111827',
    titleRest: ', Verified & Trusted',
    subtitle: 'All babysitters pass identity verification\nand background review by our admin team.',
    icon: 'shield-checkmark-outline',
    iconColor: '#FFFFFF',
    iconBg: TEAL,
    circleBg: '#E6F4F5',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goToSlide = (newIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIndex(newIndex);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      router.push('/register');
    }
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.column}>
        {/* Skip button */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.push('/(tabs)')} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slide content */}
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
        >
          {/* Icon circle */}
          <View style={[styles.circleOuter, { backgroundColor: currentSlide.circleBg }]}>
            <View style={[styles.circleInner, { backgroundColor: currentSlide.iconBg, shadowColor: currentSlide.iconBg }]}>
              <Ionicons name={currentSlide.icon as any} size={28} color={currentSlide.iconColor} />
            </View>
          </View>

          {/* Title with colored first word */}
          <Text style={styles.title}>
            <Text style={{ color: currentSlide.titlePrefixColor, fontWeight: '800' }}>
              {currentSlide.titlePrefix}
            </Text>
            <Text>{currentSlide.titleRest}</Text>
          </Text>

          <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
        </Animated.View>

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          {/* Pagination dots */}
          <View style={styles.pagination}>
            {SLIDES.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => { if (index !== currentIndex) goToSlide(index); }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${index + 1}`}
              >
                <View style={[styles.dot, currentIndex === index && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Next / Get Started button */}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} accessibilityRole="button">
            <Text style={styles.nextButtonText}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.light.white} style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')} hitSlop={8}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>

          {/* Browse as visitor */}
          <TouchableOpacity style={styles.visitorButton} onPress={() => router.push('/(tabs)')} accessibilityRole="button">
            <Ionicons name="eye-outline" size={16} color={Colors.light.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.visitorText}>Browse as Visitor</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  column: { flex: 1, width: '100%', maxWidth: 500, alignSelf: 'center' },
  topBar: { paddingHorizontal: 24, paddingTop: 16, alignItems: 'flex-end' },
  skipText: { color: Colors.light.textSecondary, fontSize: 14 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  // Circle icon area
  circleOuter: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
    borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  circleInner: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },

  // Title
  title: {
    fontSize: 22, fontWeight: '700', color: '#111827',
    textAlign: 'center', marginBottom: 12, lineHeight: 30,
  },
  subtitle: {
    fontSize: 14, color: '#6B7280',
    textAlign: 'center', lineHeight: 22,
  },

  // Bottom
  bottomSection: { paddingHorizontal: 24, paddingBottom: 36, alignItems: 'center' },

  // Pagination
  pagination: { flexDirection: 'row', marginBottom: 28, alignItems: 'center', gap: 6 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 24, height: 4, borderRadius: 2,
    backgroundColor: TEAL,
  },

  // Next button
  nextButton: {
    backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', width: '100%', paddingVertical: 16, borderRadius: 30, marginBottom: 20,
    minHeight: 56,
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // Login
  loginContainer: { flexDirection: 'row', marginBottom: 20 },
  loginText: { color: '#111827', fontSize: 14, fontWeight: '500' },
  loginLink: { color: TEAL, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  // Visitor
  visitorButton: { flexDirection: 'row', alignItems: 'center' },
  visitorText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
});
