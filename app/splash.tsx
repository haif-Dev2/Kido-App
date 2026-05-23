import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TEAL_DARK = '#0A7373';
const TEAL_MID = '#0E8E8E';
const TEAL_LIGHT = '#11A3A3';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Animate logo in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate loading dots
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const d1 = animateDot(dot1, 0);
    const d2 = animateDot(dot2, 200);
    const d3 = animateDot(dot3, 400);
    d1.start();
    d2.start();
    d3.start();

    // Navigate after delay
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2500);

    return () => {
      clearTimeout(timer);
      d1.stop();
      d2.stop();
      d3.stop();
    };
  }, []);

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[TEAL_DARK, TEAL_MID, TEAL_LIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative circles */}
      <View style={[s.circle, s.circleTopLeft]} />
      <View style={[s.circle, s.circleTopRight]} />
      <View style={[s.circle, s.circleBottomLeft]} />
      <View style={[s.circle, s.circleBottomRight]} />
      <View style={[s.circle, s.circleMidRight]} />

      {/* Logo & branding */}
      <Animated.View
        style={[
          s.logoArea,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={s.iconBox}>
          <Ionicons name="people" size={28} color="#0E8E8E" />
        </View>
        <Text style={s.brandName}>Kido</Text>
        <Text style={s.tagline}>Childcare you can trust</Text>
      </Animated.View>

      {/* Loading dots */}
      <View style={s.dotsRow}>
        <Animated.View style={[s.dot, { opacity: dot1 }]} />
        <Animated.View style={[s.dot, { opacity: dot2 }]} />
        <Animated.View style={[s.dot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Decorative circles
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleTopLeft: {
    width: 250,
    height: 250,
    top: -60,
    left: -80,
  },
  circleTopRight: {
    width: 180,
    height: 180,
    top: 40,
    right: -50,
  },
  circleBottomLeft: {
    width: 200,
    height: 200,
    bottom: -40,
    left: -40,
  },
  circleBottomRight: {
    width: 300,
    height: 300,
    bottom: -80,
    right: -100,
  },
  circleMidRight: {
    width: 120,
    height: 120,
    top: '35%',
    right: -30,
  },

  // Logo area
  logoArea: {
    alignItems: 'center',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },

  // Loading dots
  dotsRow: {
    position: 'absolute',
    bottom: '12%',
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
