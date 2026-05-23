// components/booking/SectionHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from "../../theme/colors";

type Props = {
  step: string;        // "01"
  category: string;    // "Schedule"
  title: string;       // "When do you need care?"
  subtitle?: string;
};

export function SectionHeader({ step, category, title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>{step} · {category}</Text>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
