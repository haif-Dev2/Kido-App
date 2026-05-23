import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, type TextInputProps } from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { cn } from './cn';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  secureToggle?: boolean;
  className?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconPress,
  secureToggle,
  secureTextEntry,
  className,
  containerClassName,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [secureShown, setSecureShown] = useState(false);
  const isSecure = secureToggle ? !secureShown : secureTextEntry;

  const borderClass = error
    ? 'border-danger'
    : focused
      ? 'border-primary'
      : 'border-border';

  return (
    <View className={cn('gap-2', containerClassName)}>
      {label ? (
        <Text className="text-overline text-text-secondary font-body-bold" accessibilityRole="text">
          {label}
        </Text>
      ) : null}

      <View
        className={cn(
          'flex-row items-center rounded-md border bg-surface-2 h-14 px-4 gap-3',
          borderClass,
          focused && 'bg-surface-2',
        )}
      >
        {LeftIcon && <LeftIcon size={20} color="#9E9C92" />}
        <TextInput
          className={cn('flex-1 text-body-lg font-body text-text-primary', className)}
          placeholderTextColor="#9E9C92"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isSecure}
          accessibilityLabel={label}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            hitSlop={8}
            onPress={() => setSecureShown(s => !s)}
            accessibilityRole="button"
            accessibilityLabel={secureShown ? 'Hide password' : 'Show password'}
          >
            {secureShown ? <EyeOff size={20} color="#9E9C92" /> : <Eye size={20} color="#9E9C92" />}
          </Pressable>
        ) : RightIcon ? (
          <Pressable hitSlop={8} onPress={onRightIconPress} accessibilityRole="button">
            <RightIcon size={20} color="#9E9C92" />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text className="text-body-sm text-danger font-body" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
