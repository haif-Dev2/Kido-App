import { create } from 'zustand';

type Role = 'PARENT' | 'BABY_SITTER';

interface RegistrationState {
  /** Role picked on the first registration screen. Passed to Supabase signUp. */
  role: Role | null;
  setRole: (role: Role) => void;
  reset: () => void;
}

export const useRegistrationStore = create<RegistrationState>((set) => ({
  role: null,
  setRole: (role) => set({ role }),
  reset: () => set({ role: null }),
}));
