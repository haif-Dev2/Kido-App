import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// In-memory fallback for SSR (server-side rendering) where window is not defined
const memoryStorage: Record<string, string> = {};
const ssrSafeStorage = {
  getItem: (key: string) => memoryStorage[key] ?? null,
  setItem: (key: string, value: string) => { memoryStorage[key] = value; },
  removeItem: (key: string) => { delete memoryStorage[key]; },
};

// Check if we're in an SSR context (no window available)
const isSSR = typeof window === 'undefined';

// Use memory storage for SSR, SecureStore on mobile (encrypted), AsyncStorage on web
const storage = isSSR
  ? ssrSafeStorage
  : Platform.OS === 'web'
    ? AsyncStorage
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
