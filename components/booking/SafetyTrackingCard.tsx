// components/booking/SafetyTrackingCard.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Switch, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius } from "../../theme/colors";

type Props = {
  enabled: boolean;
  onToggle: (val: boolean) => void;
};

export function SafetyTrackingCard({ enabled, onToggle }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, pulse]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <LinearGradient
      colors={colors.darkGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.head}>
        <View style={styles.iconBox}>
          <Ionicons name="shield-checkmark" size={18} color={colors.success} />
        </View>

        <View style={styles.headText}>
          <Text style={styles.title}>Share location</Text>
          <Text style={styles.sub}>Family can track arrival & route</Text>
        </View>

        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: '#3a3a3a', true: colors.success }}
          thumbColor="#fff"
          ios_backgroundColor="#3a3a3a"
        />
      </View>

      {enabled && (
        <View style={styles.statusBar}>
          <View style={styles.dotWrap}>
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
              ]}
            />
            <View style={styles.dot} />
          </View>
          <Text style={styles.statusTxt}>Live · Active during the booking</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: 18,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: '#fff',
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  dotWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusTxt: {
    fontFamily: fonts.sansMed,
    fontSize: 11,
    color: colors.success,
  },
});
