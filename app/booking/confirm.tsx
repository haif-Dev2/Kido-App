// app/booking/confirm.tsx
//
// Stub confirmation screen for the new-booking flow.
// Reads all params passed from `app/booking/new/[sitterId].tsx` (handleContinue)
// and lets the user confirm. Replace the placeholder submit logic with your real
// Supabase `bookings` insert when you wire the backend.
import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, radius } from '@/theme/colors';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { READING_MAX_WIDTH, useResponsive } from '../../lib/responsive';

type Params = {
  sitterId?: string;
  date?: string;           // ISO string
  startTime?: string;
  endTime?: string;
  service?: string;
  children?: string;
  notes?: string;
  shareLocation?: string;
  total?: string;
};

export default function BookingConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  const totalNum = Number(params.total) || 0;
  const childrenNum = Number(params.children) || 1;

  const dateLabel = useMemo(() => {
    if (!params.date) return '—';
    const d = new Date(params.date);
    if (Number.isNaN(d.getTime())) return params.date;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [params.date]);

  const summaryRows = useMemo(
    () => [
      {
        label: 'Date · Time',
        value: `${dateLabel} · ${params.startTime ?? '—'}–${params.endTime ?? '—'}`,
      },
      { label: 'Service', value: params.service ?? '—' },
      {
        label: 'Children',
        value: String(childrenNum),
      },
      {
        label: 'Live tracking',
        value: params.shareLocation === 'true' ? 'Enabled' : 'Disabled',
      },
      ...(params.notes
        ? [{ label: 'Notes', value: params.notes }]
        : []),
    ],
    [dateLabel, params.startTime, params.endTime, params.service, childrenNum, params.shareLocation, params.notes],
  );

  const handleConfirm = () => {
    // TODO: replace with Supabase insert into `bookings`
    Alert.alert(
      'Booking confirmed',
      'This is a stub. Wire Supabase here to actually create the booking.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/bookings'),
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { alignItems: 'center' }]}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={[styles.headerWrap, { width: '100%', alignItems: 'center' }]}>
        <View style={[styles.header, { width: '100%', maxWidth: contentMaxWidth }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Confirm booking</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={[styles.scroll, { width: '100%', maxWidth: contentMaxWidth }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.kicker}>FINAL STEP</Text>
          <Text style={styles.title}>Review your booking</Text>
          <Text style={styles.subtitle}>
            Make sure everything below is correct before confirming.
          </Text>
        </View>

        <View style={styles.summaryWrap}>
          <BookingSummary rows={summaryRows} total={totalNum} />
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.bottomBarWrap, { alignItems: 'center' }]}>
        <View style={[styles.bottomBar, { width: '100%', maxWidth: contentMaxWidth }]}>
          <View style={styles.priceCol}>
            <Text style={styles.priceMain}>
              {totalNum.toLocaleString()} <Text style={styles.priceCur}>DZD</Text>
            </Text>
            <Text style={styles.priceSub}>total</Text>
          </View>

          <Pressable style={styles.confirmBtn} onPress={handleConfirm} accessibilityRole="button">
            <Text style={styles.confirmTxt}>Confirm booking</Text>
            <View style={styles.btnArrow}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  headerWrap: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    // 44×44 — tap-target spec.
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.text,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 130 },

  intro: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 12,
  },
  kicker: {
    fontFamily: fonts.sansMed,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.accent,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },

  summaryWrap: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },

  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(250,247,242,0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 16,
    gap: 14,
  },
  priceCol: {
    // column layout inherited from flex defaults
  },
  priceMain: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.5,
  },
  priceCur: {
    fontFamily: fonts.sansMed,
    fontSize: 13,
    color: colors.textMuted,
  },
  priceSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },

  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  confirmTxt: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#fff',
  },
  btnArrow: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
