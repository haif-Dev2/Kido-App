// components/booking/BookingHero.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Image, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius } from "../../theme/colors";

type Props = {
  sitterName: string;
  sitterAvatar?: string;        // optional URL
  rating: number;
  reviews: number;
  distanceKm: number;
  isOnline?: boolean;
  currentStep: number;          // 1, 2, or 3
  totalSteps?: number;
  onBack: () => void;
};

export function BookingHero({
  sitterName,
  sitterAvatar,
  rating,
  reviews,
  distanceKm,
  isOnline = true,
  currentStep,
  totalSteps = 3,
  onBack,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const initials = sitterName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <LinearGradient
      colors={colors.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>

        <View style={styles.stepsWrap}>
          <Text style={styles.stepNum}>
            {String(currentStep).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
          </Text>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.step,
                i + 1 < currentStep && styles.stepDone,
                i + 1 === currentStep && styles.stepActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Sitter card */}
      <View style={styles.sitterCard}>
        <View style={styles.avatarWrap}>
          {sitterAvatar ? (
            <Image source={{ uri: sitterAvatar }} style={styles.avatarImg} />
          ) : (
            <LinearGradient
              colors={['#F5C893', '#D4923A']}
              style={styles.avatarFallback}
            >
              <Text style={styles.avatarTxt}>{initials}</Text>
            </LinearGradient>
          )}
          {isOnline && <View style={styles.statusDot} />}
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{sitterName}</Text>
          <View style={styles.metaRow}>
            <View style={styles.rating}>
              <Ionicons name="star" size={11} color="#F5C893" />
              <Text style={styles.metaTxt}> {rating} · {reviews}</Text>
            </View>
            <View style={styles.dotSep} />
            <Text style={styles.metaTxt}>{distanceKm} km</Text>
          </View>
        </View>

        {isOnline && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDotWrap}>
              <Animated.View
                style={[
                  styles.liveRing,
                  {
                    transform: [
                      {
                        scale: pulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.8],
                        }),
                      },
                    ],
                    opacity: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 0],
                    }),
                  },
                ]}
              />
              <View style={styles.liveDot} />
            </View>
            <Text style={styles.liveTxt}>LIVE</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    // 44×44 — tap-target spec (Apple HIG / Material).
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepNum: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginRight: 4,
  },
  step: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 18,
  },
  stepDone: { backgroundColor: 'rgba(255,255,255,0.95)' },
  stepActive: { backgroundColor: colors.accent, width: 26 },

  sitterCard: {
    marginTop: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.xl,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: { position: 'relative' },
  avatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarTxt: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    color: '#5A3A0F',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  info: { flex: 1 },
  name: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  rating: { flexDirection: 'row', alignItems: 'center' },
  metaTxt: {
    fontFamily: fonts.sansMed,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  dotSep: {
    width: 2,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveDotWrap: {
    width: 6,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveTxt: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.success,
    letterSpacing: 0.3,
  },
});
