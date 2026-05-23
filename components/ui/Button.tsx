import React from 'react';
import { Pressable, Text, ActivityIndicator, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { haptics } from '../../lib/haptics';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'soft';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  className?: string;
  hapticFeedback?: 'tap' | 'light' | 'medium' | 'success' | 'none';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const base = 'flex-row items-center justify-center rounded-xl';
// Heights bumped so even the smallest size (sm) hits the 44px tap-target
// minimum (Apple HIG / Material). md and lg already exceed that.
const sizes: Record<Size, string> = {
  sm: 'h-11 px-4 gap-2', // 44px
  md: 'h-12 px-5 gap-2', // 48px
  lg: 'h-14 px-6 gap-3', // 56px
};
const labelSizes: Record<Size, string> = {
  sm: 'text-body font-body-bold',
  md: 'text-body-lg font-body-bold',
  lg: 'text-body-lg font-body-bold',
};
const iconSizes: Record<Size, number> = { sm: 16, md: 18, lg: 20 };

const variantClasses: Record<Variant, { bg: string; text: string; disabled: string }> = {
  primary:     { bg: 'bg-primary active:bg-primary-pressed',              text: 'text-white',         disabled: 'bg-ink-200' },
  secondary:   { bg: 'bg-surface-2 border border-border active:bg-surface-3', text: 'text-text-primary', disabled: 'bg-surface-3 border-border' },
  ghost:       { bg: 'bg-transparent active:bg-surface-3',                text: 'text-text-primary',  disabled: 'bg-transparent' },
  destructive: { bg: 'bg-danger active:bg-danger-pressed',                text: 'text-white',         disabled: 'bg-ink-200' },
  soft:        { bg: 'bg-primary-soft active:bg-primary-mid',             text: 'text-primary',       disabled: 'bg-surface-3' },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className,
  hapticFeedback = 'tap',
  onPress,
  ...rest
}: ButtonProps) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const v = variantClasses[variant];
  const textClass = cn(labelSizes[size], v.text);
  const iconColor = variant === 'primary' || variant === 'destructive' ? '#FFFFFF'
                  : variant === 'soft'    ? '#067A6F'
                  : '#141413';

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withTiming(0.97, { duration: 120 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 260 }); }}
      onPress={(e) => {
        if (isDisabled) return;
        if (hapticFeedback !== 'none') haptics[hapticFeedback]();
        onPress?.(e);
      }}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={cn(base, sizes[size], isDisabled ? v.disabled : v.bg, className)}
      style={animatedStyle}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <>
          {LeftIcon  && <LeftIcon  size={iconSizes[size]} color={iconColor} />}
          <Text className={textClass} numberOfLines={1}>{label}</Text>
          {RightIcon && <RightIcon size={iconSizes[size]} color={iconColor} />}
        </>
      )}
    </AnimatedPressable>
  );
}

/**
 * Icon-only circular button with consistent tap target.
 *
 * The `size` prop is the *minimum* visual size; any value below the 44px
 * tap-target spec is silently clamped up so the button always remains
 * easy to hit on touch devices.
 */
export function IconButton({
  icon: Icon,
  onPress,
  label,
  variant = 'ghost',
  size = 44,
  className,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  label: string; // for a11y
  variant?: 'ghost' | 'soft' | 'glass';
  size?: number;
  className?: string;
}) {
  // Enforce 44×44 minimum regardless of caller-provided size.
  const tapSize = Math.max(44, size);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const variantClass = {
    ghost: 'bg-surface-3 active:bg-surface-4',
    soft:  'bg-primary-soft active:bg-primary-mid',
    glass: 'bg-white/80 active:bg-white',
  }[variant];
  const iconColor = variant === 'soft' ? '#067A6F' : '#141413';

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withTiming(0.92, { duration: 120 }); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      onPress={() => { haptics.tap(); onPress?.(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{ width: tapSize, height: tapSize, borderRadius: tapSize / 2 }, animatedStyle]}
      className={cn('items-center justify-center', variantClass, className)}
    >
      <View><Icon size={Math.max(18, tapSize * 0.45)} color={iconColor} /></View>
    </AnimatedPressable>
  );
}
