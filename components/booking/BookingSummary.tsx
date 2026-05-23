// components/booking/BookingSummary.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius } from "../../theme/colors";

export type SummaryRow = {
  label: string;
  value: string;
};

type Props = {
  rows: SummaryRow[];
  total: number;
  currency?: string;
  tag?: string;            // e.g. "INSTANT"
  title?: string;
};

export function BookingSummary({
  rows,
  total,
  currency = 'DZD',
  tag = 'INSTANT',
  title = 'Booking summary',
}: Props) {
  return (
    <LinearGradient
      colors={colors.darkGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {!!tag && (
          <View style={styles.tag}>
            <Text style={styles.tagTxt}>{tag}</Text>
          </View>
        )}
      </View>

      <View style={styles.rows}>
        {rows.map((r, i) => (
          <View
            key={i}
            style={[styles.row, i === rows.length - 1 && styles.rowLast]}
          >
            <Text style={styles.lbl}>{r.label}</Text>
            <Text style={styles.val}>{r.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLbl}>Total</Text>
        <View style={styles.totalValWrap}>
          <Text style={styles.totalVal}>{total.toLocaleString()}</Text>
          <Text style={styles.totalCur}> {currency}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xxl,
    paddingHorizontal: 22,
    paddingVertical: 20,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: '#fff',
  },
  tag: {
    backgroundColor: 'rgba(212,146,58,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  tagTxt: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.4,
  },
  rows: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },
  rowLast: { borderBottomWidth: 0 },
  lbl: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  val: {
    fontFamily: fonts.sansMed,
    fontSize: 12,
    color: '#fff',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLbl: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  totalValWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalVal: {
    fontFamily: fonts.serif,
    fontSize: 30,
    color: '#fff',
    letterSpacing: -1,
  },
  totalCur: {
    fontFamily: fonts.sansMed,
    fontSize: 13,
    color: colors.accent,
    marginLeft: 4,
  },
});
