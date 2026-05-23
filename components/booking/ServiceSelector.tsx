// components/booking/ServiceSelector.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from "../../theme/colors";

export type ServiceType = 'babysitting' | 'overnight' | 'tutoring';

export type Service = {
  id: ServiceType;
  name: string;
  sub: string;
  rate: number;
  iconBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

export const DEFAULT_SERVICES: Service[] = [
  {
    id: 'babysitting',
    name: 'Babysitting',
    sub: 'Day care up to 8h',
    rate: 250,
    iconBg: colors.iconDay,
    icon: 'happy-outline',
    iconColor: colors.accent,
  },
  {
    id: 'overnight',
    name: 'Overnight',
    sub: 'Evening + night',
    rate: 300,
    iconBg: colors.iconNight,
    icon: 'moon-outline',
    iconColor: '#5A3A8F',
  },
  {
    id: 'tutoring',
    name: 'Tutoring',
    sub: 'Homework help',
    rate: 350,
    iconBg: colors.iconTutor,
    icon: 'book-outline',
    iconColor: colors.primary,
  },
];

type Props = {
  services?: Service[];
  selected: ServiceType;
  onChange: (id: ServiceType) => void;
};

export function ServiceSelector({
  services = DEFAULT_SERVICES,
  selected,
  onChange,
}: Props) {
  return (
    <View style={styles.grid}>
      {services.map((s) => {
        const active = s.id === selected;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            style={[styles.card, active && styles.cardActive]}
          >
            <View style={[styles.check, active && styles.checkActive]}>
              {active && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>

            <View
              style={[
                styles.iconBox,
                { backgroundColor: active ? 'rgba(255,255,255,0.15)' : s.iconBg },
              ]}
            >
              <Ionicons
                name={s.icon}
                size={18}
                color={active ? '#fff' : s.iconColor}
              />
            </View>

            <Text style={[styles.name, active && styles.nameActive]}>
              {s.name}
            </Text>
            <Text style={[styles.sub, active && styles.subActive]}>
              {s.sub}
            </Text>
            <Text style={[styles.price, active && styles.priceActive]}>
              {s.rate} DZD/hr
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    minHeight: 130,
    position: 'relative',
  },
  cardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 3,
  },
  nameActive: { color: '#fff' },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14,
    marginBottom: 8,
    flex: 1,
  },
  subActive: { color: 'rgba(255,255,255,0.65)' },
  price: {
    fontFamily: fonts.serifBold,
    fontSize: 13,
    color: colors.primary,
  },
  priceActive: { color: '#F5C893' },
});
