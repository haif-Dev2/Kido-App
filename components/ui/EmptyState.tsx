import React from 'react';
import { View, Text } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      {Icon ? (
        <View className="w-20 h-20 rounded-full bg-primary-soft items-center justify-center mb-6">
          <Icon size={32} color="#067A6F" strokeWidth={1.6} />
        </View>
      ) : null}
      <Text className="text-title-lg font-display-bold text-text-primary text-center mb-2">
        {title}
      </Text>
      {description ? (
        <Text className="text-body-lg font-body text-text-secondary text-center max-w-[280px]">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-6 w-full max-w-[240px]">
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
