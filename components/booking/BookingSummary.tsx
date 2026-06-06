import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';

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
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {!!tag && (
          <View style={styles.tag}>
            <Text style={styles.tagTxt}>{tag}</Text>
          </View>
        )}
      </View>

      <View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  tag: {
    backgroundColor: Colors.light.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.primary,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLast: { borderBottomWidth: 0 },
  lbl: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  val: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  totalValWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalVal: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
  },
  totalCur: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 4,
  },
});
