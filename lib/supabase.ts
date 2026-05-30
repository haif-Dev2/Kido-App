// lib/supabase.ts  —  full replacement
// 
// Key fix: LargeSecureStore adapter
// Supabase session JWTs are often > 2048 bytes, which exceeds SecureStore's
// per-key limit on Android. The adapter below splits large values into
// 2000-byte chunks stored under separate keys, then reassembles them on read.
// This eliminates the "Value being stored in SecureStore is larger than 2048
// bytes" warning and ensures sessions persist correctly after app restarts.

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ── LargeSecureStore — splits values > 2000 bytes across multiple keys ────────
const CHUNK_SIZE = 2000; // safely under the 2048-byte SecureStore limit

function chunkString(str: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += CHUNK_SIZE) {
    chunks.push(str.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

const LargeSecureStore = {
  async setItem(key: string, value: string): Promise<void> {
    const chunks = chunkString(value);
    // Store chunk count so we know how many to read back
    await SecureStore.setItemAsync(`${key}_count`, String(chunks.length));
    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk))
    );
  },

  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(`${key}_count`);
    if (!countStr) return null;
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count < 1) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`))
    );
    if (chunks.some(c => c === null)) return null;
    return chunks.join('');
  },

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(`${key}_count`);
    const count = countStr ? parseInt(countStr, 10) : 1;
    await SecureStore.deleteItemAsync(`${key}_count`).catch(() => {});
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(`${key}_${i}`).catch(() => {})
      )
    );
  },
};

// ── Supabase client ───────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:            Platform.OS !== 'web' ? LargeSecureStore : undefined,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});