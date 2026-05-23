// components/booking/TimeSelector.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from "../../theme/colors";

type Props = {
  startTime: string;       // "09:00"
  endTime: string;         // "12:00"
  hourlyRate: number;      // 250
  onPickStart?: () => void;
  onPickEnd?: () => void;
  onSetHours: (hours: number) => void;
};

const QUICK_HOURS = [1, 2, 3, 4, 6, 8];

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin < startMin) endMin += 24 * 60; // overnight
  return Math.round((endMin - startMin) / 60);
}

export function TimeSelector({
  startTime,
  endTime,
  hourlyRate,
  onPickStart,
  onPickEnd,
  onSetHours,
}: Props) {
  const hours = calcHours(startTime, endTime);
  const total = hours * hourlyRate;

  return (
    <View style={styles.card}>
      {/* Start / End Row */}
      <View style={styles.timeRow}>
        <Pressable style={styles.timeCol} onPress={onPickStart}>
          <View style={[styles.iconBox, styles.iconSun]}>
            <Ionicons name="sunny" size={16} color={colors.accent} />
          </View>
          <Text style={styles.timeLbl}>Start</Text>
          <Text style={styles.timeVal}>{startTime}</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerArrow}>
            <Ionicons name="arrow-forward" size={12} color={colors.accent} />
          </View>
        </View>

        <Pressable style={styles.timeCol} onPress={onPickEnd}>
          <View style={[styles.iconBox, styles.iconMoon]}>
            <Ionicons name="moon" size={14} color="#5A3A8F" />
          </View>
          <Text style={styles.timeLbl}>End</Text>
          <Text style={styles.timeVal}>{endTime}</Text>
        </Pressable>
      </View>

      {/* Duration Bar (amber) */}
      <View style={styles.durationBar}>
        <View style={styles.durLeft}>
          <View style={styles.clockIcon}>
            <Ionicons name="time-outline" size={12} color="#fff" />
          </View>
          <Text style={styles.durTxt}>
            <Text style={styles.durStrong}>{hours} hours</Text>
            {' · '}{hourlyRate} DZD/hr
          </Text>
        </View>
        <Text style={styles.durStrong}>= {total} DZD</Text>
      </View>

      {/* Quick set */}
      <Text style={styles.quickLbl}>Quick set</Text>
      <View style={styles.hourPills}>
        {QUICK_HOURS.map((h) => {
          const active = h === hours;
          return (
            <Pressable
              key={h}
              onPress={() => onSetHours(h)}
              style={[styles.hpill, active && styles.hpillActive]}
            >
              <Text style={[styles.hpillTxt, active && styles.hpillTxtActive]}>
                {h}h
              </Text>
            </Pressable>
          );
        })}
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
    padding: 18,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timeCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconSun: { backgroundColor: colors.iconDay },
  iconMoon: { backgroundColor: colors.iconNight },
  timeLbl: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  timeVal: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.text,
    letterSpacing: -1,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 18,
    position: 'relative',
  },
  dividerArrow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -11 }, { translateY: -11 }],
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBar: {
    marginTop: 14,
    backgroundColor: colors.accentLight,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  durLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durTxt: {
    fontFamily: fonts.sansMed,
    fontSize: 12,
    color: '#5A3A0F',
  },
  durStrong: {
    fontFamily: fonts.serifBold,
    fontSize: 12,
    color: '#5A3A0F',
  },
  quickLbl: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
  },
  hourPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hpill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40, // close to the 44 minimum (CSS fills the rest on web)
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  hpillActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  hpillTxt: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.textMuted,
  },
  hpillTxtActive: { color: '#fff' },
});
