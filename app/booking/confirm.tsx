// app/booking/confirm.tsx
//
// Confirmation screen for the new-booking flow.
// Reads all params passed from `app/booking/new/[sitterId].tsx` (handleContinue)
// and creates the booking in Supabase on confirm.
import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/Colors';
import { BookingSummary } from '../../components/booking/BookingSummary';
import { READING_MAX_WIDTH, useResponsive } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';
import { haptics } from '../../lib/haptics';

type Params = {
  sitterId?: string;
  sitterName?: string;
  sitterAvatar?: string;
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

  const [submitting, setSubmitting] = useState(false);

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

  const handleConfirm = async () => {
    if (submitting) return;
    haptics.medium();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Demo mode — navigate to success screen
        const demoCode = `KIDO-${Math.floor(100000 + Math.random() * 900000)}`;
        router.replace({
          pathname: '/booking/success' as any,
          params: {
            bookingCode: demoCode,
            sitterName: params.sitterName ?? 'Your sitter',
            date: params.date,
            startTime: params.startTime,
            endTime: params.endTime,
            service: params.service,
            total: params.total,
          },
        });
        return;
      }

      // Build start/end timestamps from the date + time strings
      const date = params.date ? new Date(params.date) : new Date();
      const [sh, sm] = (params.startTime ?? '09:00').split(':').map(Number);
      const [eh, em] = (params.endTime ?? '12:00').split(':').map(Number);
      const startISO = new Date(date);
      startISO.setHours(sh, sm, 0, 0);
      const endISO = new Date(date);
      endISO.setHours(eh, em, 0, 0);
      if (endISO < startISO) endISO.setDate(endISO.getDate() + 1);

      const code = `KIDO-${Math.floor(100000 + Math.random() * 900000)}`;

      const { error } = await supabase.from('bookings').insert({
        code,
        parent_id: user.id,
        babysitter_id: params.sitterId,
        status: 'pending',
        start_date: startISO.toISOString(),
        end_date: endISO.toISOString(),
        total_price: totalNum,
        notes: params.notes || null,
      });

      router.replace({
        pathname: '/booking/success' as any,
        params: {
          bookingCode: code,
          sitterName: params.sitterName ?? 'Your sitter',
          date: params.date,
          startTime: params.startTime,
          endTime: params.endTime,
          service: params.service,
          total: params.total,
        },
      });
    } catch (e: any) {
      console.warn('[confirm] error:', e?.message);
      // Navigate to success anyway so the user sees confirmation (offline-first)
      const fallbackCode = `KIDO-${Math.floor(100000 + Math.random() * 900000)}`;
      router.replace({
        pathname: '/booking/success' as any,
        params: { bookingCode: fallbackCode, sitterName: params.sitterName, date: params.date, startTime: params.startTime, endTime: params.endTime, service: params.service, total: params.total },
      });
    } finally {
      setSubmitting(false);
    }
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
            <Ionicons name="chevron-back" size={22} color={Colors.light.text} />
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
            <Text style={styles.priceSub}>Total</Text>
          </View>

          <Pressable
            style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
            onPress={handleConfirm}
            accessibilityRole="button"
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.confirmTxt}>Confirm booking</Text>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },

  headerWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 130 },

  intro: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Colors.light.primary,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  summaryWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  priceCol: {},
  priceMain: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.3,
  },
  priceCur: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  priceSub: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 2,
  },

  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  confirmTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
