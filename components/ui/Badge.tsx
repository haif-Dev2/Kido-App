import React from 'react';
import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { cn } from './cn';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';

const tones: Record<Tone, { bg: string; text: string; icon: string }> = {
  neutral: { bg: 'bg-surface-3',     text: 'text-text-primary',   icon: '#141413' },
  primary: { bg: 'bg-primary-soft',  text: 'text-primary',        icon: '#067A6F' },
  success: { bg: 'bg-success-soft',  text: 'text-success',        icon: '#059669' },
  warning: { bg: 'bg-warning-soft',  text: 'text-warning',        icon: '#F59E0B' },
  danger:  { bg: 'bg-danger-soft',   text: 'text-danger',         icon: '#DC2626' },
  accent:  { bg: 'bg-accent-soft',   text: 'text-accent',         icon: '#F97362' },
};

export function Badge({
  label,
  tone = 'neutral',
  icon: Icon,
  className,
}: {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <View className={cn('flex-row items-center gap-1 px-2.5 py-1 rounded-pill', t.bg, className)}>
      {Icon && <Icon size={12} color={t.icon} strokeWidth={2.4} />}
      <Text className={cn('text-caption font-body-bold', t.text)}>{label}</Text>
    </View>
  );
}
