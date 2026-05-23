// components/booking/NotesInput.tsx
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radius } from "../../theme/colors";

type Props = {
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
};

const QUICK_TEMPLATES = [
  { label: '+ Allergies', text: 'Allergies: ' },
  { label: '+ Bedtime', text: 'Bedtime at ' },
  { label: '+ Meals', text: 'Meals: ' },
];

export function NotesInput({ value, onChange, maxLength = 500 }: Props) {
  const insertTemplate = (text: string) => {
    const next = value ? `${value}\n${text}` : text;
    if (next.length <= maxLength) onChange(next);
  };

  return (
    <View style={styles.card}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="e.g. Peanut allergy. Bedtime at 8pm. Loves drawing..."
        placeholderTextColor={colors.textLight}
        multiline
        maxLength={maxLength}
        style={styles.textarea}
        textAlignVertical="top"
      />

      <View style={styles.foot}>
        <View style={styles.chips}>
          {QUICK_TEMPLATES.map((t) => (
            <Pressable
              key={t.label}
              onPress={() => insertTemplate(t.text)}
              style={styles.chip}
            >
              <Text style={styles.chipTxt}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.count}>
          {value.length} / {maxLength}
        </Text>
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
    padding: 16,
  },
  textarea: {
    minHeight: 90,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.text,
    lineHeight: 21,
    padding: 0,
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    borderStyle: 'dashed',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.borderSoft,
    borderRadius: 8,
  },
  chipTxt: {
    fontFamily: fonts.sansMed,
    fontSize: 10,
    color: colors.textMuted,
  },
  count: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textLight,
  },
});
