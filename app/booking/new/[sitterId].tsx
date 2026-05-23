// app/booking/new/[sitterId].tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, radius } from '@/theme/colors';
import { BookingHero } from '@/components/booking/BookingHero';
import { SectionHeader } from '@/components/booking/SectionHeader';
import { DayStripPicker } from '@/components/booking/DayStripPicker';
import { TimeSelector } from '@/components/booking/TimeSelector';
import {
  ServiceSelector,
  ServiceType,
  DEFAULT_SERVICES,
} from '@/components/booking/ServiceSelector';
import { ChildrenCounter } from '@/components/booking/ChildrenCounter';
import { NotesInput } from '@/components/booking/NotesInput';
import { SafetyTrackingCard } from '@/components/booking/SafetyTrackingCard';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { READING_MAX_WIDTH, useResponsive } from '../../../lib/responsive';

export default function BookingScreen() {
  const router = useRouter();
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;
  const { sitterId, sitterName, sitterAvatar, hourlyRate } = useLocalSearchParams<{
    sitterId: string;
    sitterName?: string;
    sitterAvatar?: string;
    hourlyRate?: string;
  }>();

  // ---- State ----
  const [selectedDate, setSelectedDate] = useState(new Date());
  const startTime = '09:00';
  const [endTime, setEndTime] = useState('12:00');
  const [service, setService] = useState<ServiceType>('babysitting');
  const [children, setChildren] = useState(1);
  const [notes, setNotes] = useState('');
  const [shareLocation, setShareLocation] = useState(true);

  // ---- Pricing ----
  const selectedService = DEFAULT_SERVICES.find((s) => s.id === service)!;
  const baseRate = Number(hourlyRate) || selectedService.rate;

  const hours = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin < startMin) endMin += 24 * 60;
    return Math.round((endMin - startMin) / 60);
  }, [startTime, endTime]);

  const total = useMemo(() => {
    const base = baseRate * hours;
    const multiplier = 1 + (children - 1) * 0.25;
    return Math.round(base * multiplier);
  }, [baseRate, hours, children]);

  // ---- Helpers ----
  const handleSetHours = (h: number) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const endMin = sh * 60 + sm + h * 60;
    const eh = Math.floor((endMin / 60) % 24);
    const em = endMin % 60;
    setEndTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
  };

  const handleContinue = () => {
    router.push({
      pathname: '/booking/confirm',
      params: {
        sitterId,
        date: selectedDate.toISOString(),
        startTime,
        endTime,
        service,
        children: String(children),
        notes,
        shareLocation: String(shareLocation),
        total: String(total),
      },
    });
  };

  // ---- Summary rows ----
  const summaryRows = [
    {
      label: 'Date · Time',
      value: `${selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })} · ${startTime}–${endTime}`,
    },
    { label: 'Service', value: `${selectedService.name} · ${hours}h` },
    { label: 'Children', value: `${children}${children > 1 ? ` (+${(children - 1) * 25}%)` : ''}` },
    { label: 'Base rate', value: `${baseRate * hours} DZD` },
    ...(children > 1
      ? [
          {
            label: 'Extra child',
            value: `+ ${total - baseRate * hours} DZD`,
          },
        ]
      : []),
  ];

  return (
    <View style={[styles.root, { alignItems: 'center' }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={[styles.scroll, { width: '100%', maxWidth: contentMaxWidth }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView edges={['top']}>
          <BookingHero
            sitterName={sitterName || 'Amina Khelifi'}
            sitterAvatar={sitterAvatar}
            rating={4.9}
            reviews={48}
            distanceKm={0.8}
            currentStep={1}
            onBack={() => router.back()}
          />
        </SafeAreaView>

        <View style={styles.body}>
          {/* 01 - Date */}
          <View style={styles.section}>
            <SectionHeader step="01" category="Schedule" title="When do you need care?" />
            <View style={styles.dayStripWrap}>
              <DayStripPicker
                selectedDate={selectedDate}
                onChange={setSelectedDate}
              />
            </View>
          </View>

          {/* 02 - Time */}
          <View style={styles.section}>
            <SectionHeader step="02" category="Hours" title="What time?" />
            <TimeSelector
              startTime={startTime}
              endTime={endTime}
              hourlyRate={baseRate}
              onSetHours={handleSetHours}
            />
          </View>

          {/* 03 - Service */}
          <View style={styles.section}>
            <SectionHeader step="03" category="Service" title="What do you need?" />
            <ServiceSelector selected={service} onChange={setService} />
          </View>

          {/* 04 - Children */}
          <View style={styles.section}>
            <SectionHeader step="04" category="Family" title="How many children?" />
            <ChildrenCounter value={children} onChange={setChildren} />
          </View>

          {/* 05 - Notes */}
          <View style={styles.section}>
            <SectionHeader
              step="05"
              category="Notes"
              title="Anything specific?"
              subtitle="Allergies, routines, special requests"
            />
            <NotesInput value={notes} onChange={setNotes} />
          </View>

          {/* 06 - Safety */}
          <View style={styles.section}>
            <SectionHeader
              step="06"
              category="Safety"
              title="Live tracking"
              subtitle="Family can see sitter's location in real-time"
            />
            <SafetyTrackingCard
              enabled={shareLocation}
              onToggle={setShareLocation}
            />
          </View>

          {/* Summary */}
          <View style={styles.section}>
            <BookingSummary rows={summaryRows} total={total} />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar — full-width divider, centered content column on tablet+. */}
      <SafeAreaView edges={['bottom']} style={[styles.bottomBarWrap, { alignItems: 'center' }]}>
        <View style={[styles.bottomBar, { width: '100%', maxWidth: contentMaxWidth }]}>
          <View>
            <Text style={styles.priceMain}>
              {total.toLocaleString()} <Text style={styles.priceCur}>DZD</Text>
            </Text>
            <Text style={styles.priceSub}>
              {hours} hrs · {children} {children === 1 ? 'kid' : 'kids'}
            </Text>
          </View>

          <Pressable style={styles.continueBtn} onPress={handleContinue} accessibilityRole="button">
            <Text style={styles.continueTxt}>Continue</Text>
            <View style={styles.btnArrow}>
              <Ionicons name="arrow-forward" size={11} color="#fff" />
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 130 },
  body: { paddingHorizontal: 22, paddingTop: 24 },
  section: { marginBottom: 28 },
  dayStripWrap: { marginHorizontal: -22 },

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
  continueBtn: {
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
  continueTxt: {
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
