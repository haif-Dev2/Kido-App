import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { haptics } from '../../lib/haptics';
import { cn } from './cn';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  tone?: 'neutral' | 'success' | 'warning' | 'accent' | 'primary';
  size?: 'sm' | 'md';
}

const toneClassesUnselected: Record<NonNullable<ChipProps['tone']>, string> = {
  neutral: 'bg-surface-2 border-border',
  success: 'bg-success-soft border-success-soft',
  warning: 'bg-warning-soft border-warning-soft',
  accent:  'bg-accent-soft border-accent-soft',
  primary: 'bg-primary-soft border-primary-soft',
};
const toneTextUnselected: Record<NonNullable<ChipProps['tone']>, string> = {
  neutral: 'text-text-primary',
  success: 'text-success',
  warning: 'text-warning',
  accent:  'text-accent',
  primary: 'text-primary',
};
const toneIconColor: Record<NonNullable<ChipProps['tone']>, string> = {
  neutral: '#141413', success: '#10B981', warning: '#F59E0B', accent: '#F97362', primary: '#067A6F',
};

export function Chip({ label, selected, onPress, icon: Icon, tone = 'neutral', size = 'md' }: ChipProps) {
  const clickable = !!onPress;
  // Slightly more vertical padding on the clickable variant so it gets close
  // to the 36–40px range; combined with the global 44px min-tap-target rule
  // injected via CSS, web users always get a comfortable hit area.
  const sizeClass = size === 'sm'
    ? (clickable ? 'px-3 py-1.5 gap-1' : 'px-3 py-1 gap-1')
    : (clickable ? 'px-4 py-2.5 gap-1.5' : 'px-4 py-2 gap-1.5');
  const textSize = size === 'sm' ? 'text-caption' : 'text-body-sm';
  const iconSize = size === 'sm' ? 12 : 14;

  const body = (
    <>
      {Icon && <Icon size={iconSize} color={selected ? '#FFFFFF' : toneIconColor[tone]} />}
      <Text
        className={cn(
          textSize,
          'font-body-bold',
          selected ? 'text-white' : toneTextUnselected[tone],
        )}
      >
        {label}
      </Text>
    </>
  );

  const className = cn(
    'flex-row items-center rounded-pill border',
    sizeClass,
    selected ? 'bg-primary border-primary' : toneClassesUnselected[tone],
  );

  if (!clickable) {
    return <View className={className}>{body}</View>;
  }

  return (
    <Pressable
      onPress={() => { haptics.tap(); onPress?.(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={className}
    >
      {body}
    </Pressable>
  );
}
