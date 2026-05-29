import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * A slim banner shown at the top of tabs when the user is in visitor/guest mode.
 * Tapping "Sign up" navigates to the registration screen.
 */
export function VisitorBanner() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Ionicons name="eye-outline" size={14} color="#0F766E" style={{ marginRight: 6 }} />
      <Text style={s.text}>You&apos;re browsing as a visitor.</Text>
      <TouchableOpacity onPress={() => router.push('/register')} hitSlop={8}>
        <Text style={s.link}> Sign up free</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4F1',
    borderBottomWidth: 1,
    borderBottomColor: '#B2DDD7',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '500',
  },
  link: {
    fontSize: 12,
    color: '#0A5C52',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
