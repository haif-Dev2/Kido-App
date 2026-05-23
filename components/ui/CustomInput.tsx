import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface CustomInputProps extends TextInputProps {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  containerStyle?: object;
}

export function CustomInput({ label, iconName, isPassword, containerStyle, ...props }: CustomInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(!isPassword);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        {iconName && (
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={20} color={Colors.light.textSecondary} />
          </View>
        )}
        <TextInput
          style={[styles.input, !iconName && styles.inputNoIcon]}
          placeholderTextColor={Colors.light.textSecondary}
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={Colors.light.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151', // Dark grayish blue
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.white,
    height: 56,
  },
  inputContainerFocused: {
    borderColor: Colors.light.primary,
    backgroundColor: '#FAFAFA',
  },
  iconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: Colors.light.text,
  },
  inputNoIcon: {
    paddingLeft: 16,
  },
  rightIconContainer: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
