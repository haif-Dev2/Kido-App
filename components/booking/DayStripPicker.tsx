// components/booking/DayStripPicker.tsx
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radius } from "../../theme/colors";

type DayItem = {
  date: Date;
  isToday: boolean;
  availability: 'free' | 'low' | 'now' | 'full';
  availabilityLabel: string;
};

type Props = {
  selectedDate: Date;
  onChange: (date: Date) => void;
  daysToShow?: number;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getNextDays(count: number): DayItem[] {
  const days: DayItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push({
      date,
      isToday: i === 0,
      availability: i === 0 ? 'now' : i === 3 ? 'low' : 'free',
      availabilityLabel: i === 0 ? 'Now' : i === 3 ? '2 left' : 'Free',
    });
  }
  return days;
}

export function DayStripPicker({ selectedDate, onChange, daysToShow = 7 }: Props) {
  const days = getNextDays(daysToShow);
  const selectedKey = selectedDate.toDateString();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((d) => {
        const isActive = d.date.toDateString() === selectedKey;
        const dayName = d.isToday ? 'Today' : DAY_NAMES[d.date.getDay()];
        const dayNum = String(d.date.getDate()).padStart(2, '0');

        return (
          <Pressable
            key={d.date.toISOString()}
            onPress={() => onChange(d.date)}
            style={[
              styles.pill,
              d.isToday && !isActive && styles.pillToday,
              isActive && styles.pillActive,
            ]}
          >
            {d.isToday && !isActive && <View style={styles.todayAccent} />}
            <Text style={[styles.dayName, isActive && styles.textOnActive]}>
              {dayName}
            </Text>
            <Text style={[styles.dayNum, isActive && styles.numOnActive]}>
              {dayNum}
            </Text>
            <Text
              style={[
                styles.avail,
                d.isToday && styles.availToday,
                d.availability === 'low' && styles.availLow,
                isActive && styles.availOnActive,
              ]}
            >
              {d.availabilityLabel}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingVertical: 4,
    gap: 9,
  },
  pill: {
    minWidth: 62,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  pillToday: {
    borderColor: colors.accent,
  },
  todayAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  dayName: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dayNum: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.text,
    marginVertical: 3,
    letterSpacing: -0.5,
  },
  avail: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    color: colors.success,
  },
  availToday: { color: colors.accent },
  availLow: { color: colors.textMuted },
  textOnActive: { color: 'rgba(255,255,255,0.65)' },
  numOnActive: { color: '#fff' },
  availOnActive: { color: '#F5C893' },
});
