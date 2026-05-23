import { create } from 'zustand';
import { Role } from '../models/types';

/**
 * Lightweight session store that mirrors Supabase session + resolved role.
 * (Role isn't persisted in Supabase auth; in a real app we'd fetch from the
 * users table or read from `user_metadata.role`.)
 */
interface AuthState {
  initialized: boolean;
  user: null | {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    photo?: string;
    role: Role;
  };
  setInitialized: (v: boolean) => void;
  setUser: (u: AuthState['user']) => void;
  /** For demo/dev: pretend to log in with a specific role. Wire to Supabase in prod. */
  mockLoginAs: (role: Role) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  user: null,
  setInitialized: (v) => set({ initialized: v }),
  setUser: (u) => set({ user: u }),
  mockLoginAs: (role) => set({
    user: {
      id: 'demo-' + role.toLowerCase(),
      email: 'sarah.johnson@email.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      photo: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400',
      role,
    },
  }),
  logout: () => set({ user: null }),
}));

/** Map a role to the home route. Sitter/admin flows are scoped for a later wave. */
export function homeRouteForRole(role: Role): string {
  switch (role) {
    case Role.PARENT:      return '/(tabs)';
    case Role.BABY_SITTER: return '/(tabs)'; // TODO: point to sitter dashboard when built
    case Role.ADMIN:       return '/(tabs)'; // TODO: point to admin reports when built
    default:               return '/(tabs)';
  }
}
