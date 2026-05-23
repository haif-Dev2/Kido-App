import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { MapPin, ShieldCheck, Clock, Heart } from 'lucide-react-native';
import type { MockSitter } from '../../lib/mock/sitters';
import { Avatar } from '../ui/Avatar';
import { Rating } from '../ui/Rating';
import { Badge } from '../ui/Badge';
import { haptics } from '../../lib/haptics';
import { elevation } from '../../theme/tokens';
import { cn } from '../ui/cn';

interface SitterCardProps {
  sitter: MockSitter;
  onPress?: () => void;
  onFavorite?: () => void;
  favorited?: boolean;
  /** Compact row for lists, expanded tile for featured rail. */
  variant?: 'row' | 'tile';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SitterCard({ sitter, onPress, onFavorite, favorited, variant = 'row' }: SitterCardProps) {
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const heartAnim = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));

  const handleFavorite = () => {
    haptics.light();
    heartScale.value = withSpring(1.25, { damping: 8, stiffness: 320 }, () => {
      heartScale.value = withSpring(1);
    });
    onFavorite?.();
  };

  if (variant === 'tile') {
    return (
      <AnimatedPressable
        onPressIn={() => { scale.value = withTiming(0.98, { duration: 120 }); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => { haptics.tap(); onPress?.(); }}
        accessibilityRole="button"
        accessibilityLabel={`${sitter.firstName} ${sitter.lastName}, ${sitter.experience}, ${sitter.hourlyRate} dinars per hour`}
        className="w-[180px] bg-surface-2 rounded-lg p-4 border border-border"
        style={[elevation.card, animated]}
      >
        <View className="items-center">
          <Avatar uri={sitter.photo} name={`${sitter.firstName} ${sitter.lastName}`} size={64} verified={sitter.identityVerified} />
          <Text className="text-title font-display-bold text-text-primary mt-3 text-center" numberOfLines={1}>
            {sitter.firstName} {sitter.lastName}
          </Text>
          <View className="flex-row items-center mt-1">
            <MapPin size={11} color="#9E9C92" strokeWidth={2} />
            <Text className="text-caption font-body text-text-muted ml-0.5">{sitter.distanceKm}km away</Text>
          </View>
        </View>

        <View className="items-center mt-3 gap-2">
          <Rating value={sitter.averageRating} count={sitter.reviewsCount} size="sm" />
          {sitter.identityVerified ? <Badge label="Verified" tone="success" icon={ShieldCheck} /> : null}
        </View>

        <View className="flex-row items-baseline justify-center mt-3">
          <Text className="text-title-lg font-display-bold text-primary" style={{ fontVariant: ['tabular-nums'] }}>
            {sitter.hourlyRate}
          </Text>
          <Text className="text-caption text-text-secondary ml-1">DZD/hr</Text>
        </View>
      </AnimatedPressable>
    );
  }

  /* row variant */
  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withTiming(0.99, { duration: 120 }); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={() => { haptics.tap(); onPress?.(); }}
      accessibilityRole="button"
      accessibilityLabel={`${sitter.firstName} ${sitter.lastName}, rated ${sitter.averageRating}`}
      className="bg-surface-2 rounded-lg overflow-hidden border border-border"
      style={[elevation.card, animated]}
    >
      {/* Left teal accent stripe for verified sitters */}
      <View className="flex-row">
        {sitter.identityVerified ? <View className="w-1 bg-primary" /> : <View className="w-1 bg-surface-3" />}
        <View className="flex-1 p-4">
          <View className="flex-row items-start gap-3">
            <Avatar uri={sitter.photo} name={`${sitter.firstName} ${sitter.lastName}`} size={56} verified={sitter.identityVerified} online={sitter.availableNow} />
            <View className="flex-1">
              <Text className="text-title font-display-bold text-text-primary" numberOfLines={1}>
                {sitter.firstName} {sitter.lastName}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <MapPin size={12} color="#9E9C92" strokeWidth={2} />
                <Text className="text-body-sm font-body text-text-secondary ml-1" numberOfLines={1}>
                  {sitter.neighborhood} · {sitter.distanceKm}km
                </Text>
              </View>
              <View className="mt-1.5">
                <Rating value={sitter.averageRating} count={sitter.reviewsCount} size="sm" />
              </View>
            </View>
            <View className="items-end">
              <View className="flex-row items-baseline">
                <Text className="text-title-lg font-display-bold text-primary" style={{ fontVariant: ['tabular-nums'] }}>
                  {sitter.hourlyRate}
                </Text>
              </View>
              <Text className="text-caption text-text-secondary">DZD/hr</Text>
              {onFavorite ? (
                <Pressable onPress={handleFavorite} hitSlop={12} className="mt-2" accessibilityRole="button" accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}>
                  <Animated.View style={heartAnim}>
                    <Heart size={20} color={favorited ? '#F97362' : '#9E9C92'} fill={favorited ? '#F97362' : 'transparent'} strokeWidth={2} />
                  </Animated.View>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Trust row */}
          <View className="flex-row flex-wrap gap-1.5 mt-3">
            <Badge label={sitter.experience} tone="neutral" />
            {sitter.identityVerified ? <Badge label="Verified" tone="success" icon={ShieldCheck} /> : null}
            {sitter.govIdVerified ? <Badge label="Gov. ID" tone="neutral" /> : null}
            {sitter.responseMinutes <= 10 ? <Badge label={`Replies in ${sitter.responseMinutes}m`} tone="primary" icon={Clock} /> : null}
            {sitter.availableNow ? (
              <View className={cn('flex-row items-center gap-1 px-2 py-1')}>
                <View className="w-1.5 h-1.5 rounded-full bg-success" />
                <Text className="text-caption font-body-bold text-success">Available now</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}
