import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface CustomButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'social';
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  isLoading?: boolean;
}

export function CustomButton({ 
  title, 
  variant = 'primary', 
  iconName, 
  iconColor,
  isLoading = false,
  style, 
  disabled,
  ...props 
}: CustomButtonProps) {
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return Colors.light.primary;
      case 'secondary': return '#D1D5DB'; // Gray background for inactive state
      case 'outline': return Colors.light.white;
      case 'social': return Colors.light.white;
      default: return Colors.light.primary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary': return Colors.light.white;
      case 'secondary': return Colors.light.white;
      case 'outline': return Colors.light.text;
      case 'social': return Colors.light.text;
      default: return Colors.light.white;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        (variant === 'outline' || variant === 'social') && styles.outlineBorder,
        variant === 'social' && styles.socialButton,
        (disabled || isLoading) && styles.disabledButton,
        style,
      ]}
      activeOpacity={0.8}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} style={styles.loader} />
      ) : (
        <>
          {iconName && (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={20} color={iconColor || getTextColor()} />
            </View>
          )}
          <Text style={[styles.text, { color: getTextColor() }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    // 56px height already exceeds the 44px tap-target minimum on phones,
    // and reads well on tablet+desktop too — no need to scale per breakpoint.
    height: 56,
    minHeight: 44,
    borderRadius: 28, // Stadium shape
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  socialButton: {
    paddingHorizontal: 20,
  },
  outlineBorder: {
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  disabledButton: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconContainer: {
    marginRight: 8,
  },
  loader: {
    marginHorizontal: 8,
  },
});
