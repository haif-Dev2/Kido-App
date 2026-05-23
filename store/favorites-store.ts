import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kido.favorites.v1';

interface FavoritesState {
  /** Set of favorited sitter IDs. */
  ids: Set<number>;
  /** Whether the initial AsyncStorage hydration has completed. */
  hydrated: boolean;

  /** Re-hydrate from AsyncStorage. Idempotent. */
  hydrate: () => Promise<void>;

  /** Toggle favorite status for a sitter id. Persists asynchronously. */
  toggle: (id: number) => void;

  /** Test if a sitter is favorited. */
  has: (id: number) => boolean;

  /** Clear all favorites (also wipes AsyncStorage). */
  clear: () => void;
}

let hydratePromise: Promise<void> | null = null;

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set<number>(),
  hydrated: false,

  hydrate: () => {
    // De-dupe concurrent hydration calls.
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            set({ ids: new Set(parsed.filter((n): n is number => typeof n === 'number')) });
          }
        }
      } catch (e) {
        console.warn('[favorites] hydrate error:', e);
      } finally {
        set({ hydrated: true });
      }
    })();
    return hydratePromise;
  },

  toggle: (id) => {
    const next = new Set(get().ids);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ ids: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
      .catch(e => console.warn('[favorites] save error:', e));
  },

  has: (id) => get().ids.has(id),

  clear: () => {
    set({ ids: new Set() });
    AsyncStorage.removeItem(STORAGE_KEY)
      .catch(e => console.warn('[favorites] clear error:', e));
  },
}));
