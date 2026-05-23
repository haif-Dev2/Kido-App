import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { cn } from './cn';

/**
 * Shimmering placeholder. Respects reduced motion (static fill).
 */
export function Skeleton({ className, style }: { className?: string; style?: any }) {
  const o = useSharedValue(0.6);
  useEffect(() => {
    o.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [o]);

  const animated = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      className={cn('bg-surface-3 rounded-md', className)}
      style={[style, animated]}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    />
  );
}
