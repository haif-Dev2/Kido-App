// components/booking/ChildrenCounter.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radius } from "../../theme/colors";

type Props = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  extraChildPercent?: number; // e.g. 25 = +25% per extra
};

export function ChildrenCounter({
  value,
  onChange,
  min = 1,
  max = 6,
  extraChildPercent = 25,
}: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.label}>Children to care for</Text>
          <Text style={styles.hint}>+{extraChildPercent}% per extra child</Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={dec}
            disabled={value <= min}
            style={[styles.btn, value <= min && styles.btnDisabled]}
          >
            <Text style={styles.btnTxt}>−</Text>
          </Pressable>

          <Text style={styles.value}>{value}</Text>

          <Pressable
            onPress={inc}
            disabled={value >= max}
            style={[styles.btn, value >= max && styles.btnDisabled]}
          >
            <Text style={styles.btnTxt}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  info: { flex: 1 },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  hint: {
    fontFamily: fonts.sansMed,
    fontSize: 11,
    color: colors.accent,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btn: {
    // 44×44 — tap-target spec (Apple HIG / Material).
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnTxt: {
    fontFamily: fonts.sansMed,
    fontSize: 20,
    color: colors.text,
    lineHeight: 22,
  },
  value: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.text,
    minWidth: 32,
    textAlign: 'center',
    letterSpacing: -1,
  },
});
