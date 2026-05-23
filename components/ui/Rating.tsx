import React from 'react';
import { View, Text } from 'react-native';
import { Star } from 'lucide-react-native';
import { cn } from './cn';

interface RatingProps {
  value: number;         // 0–5
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const starSize = { sm: 12, md: 14, lg: 18 } as const;

export function Rating({ value, count, size = 'md', showValue = true, className }: RatingProps) {
  const filled = Math.round(value);
  const sz = starSize[size];

  return (
    <View
      className={cn('flex-row items-center gap-1', className)}
      accessibilityLabel={`Rated ${value.toFixed(1)} out of 5${count ? `, ${count} reviews` : ''}`}
    >
      <View className="flex-row gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={sz}
            color="#F5A524"
            fill={i < filled ? '#F5A524' : 'transparent'}
            strokeWidth={1.8}
          />
        ))}
      </View>
      {showValue && (
        <Text className="text-body-sm font-body-bold text-text-primary ml-1" style={{ fontVariant: ['tabular-nums'] }}>
          {value.toFixed(1)}
        </Text>
      )}
      {typeof count === 'number' && (
        <Text className="text-body-sm font-body text-text-secondary" style={{ fontVariant: ['tabular-nums'] }}>
          ({count})
        </Text>
      )}
    </View>
  );
}
