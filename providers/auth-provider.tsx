import { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { registerPushToken } from '../lib/notifications';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  role: 'PARENT' | 'BABY_SITTER' | 'ADMIN';
  is_verified: boolean;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True when the user chose "Browse as Visitor" (no account required). */
  isVisitor: boolean;
  /** Call this to enter visitor/guest browsing mode. */
  enterVisitorMode: () => void;
  /** Exit visitor mode and go back to onboarding. */
  exitVisitorMode: () => void;
  /** Re-fetch the profile row (e.g. after editing it). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  isVisitor: false,
  enterVisitorMode: () => {},
  exitVisitorMode: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisitor, setIsVisitor] = useState(false);

  const enterVisitorMode = useCallback(() => setIsVisitor(true), []);
  const exitVisitorMode = useCallback(() => setIsVisitor(false), []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      // Row not found or schema missing — keep profile null; screens must handle it.
      console.warn('[auth] profile fetch error:', error.message);
      setProfile(null);
      return;
    }
    setProfile((data as Profile | null) ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id);
  }, [session?.user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Hard timeout so the app never hangs on a stuck Supabase init / storage read.
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[auth] getSession timed out, continuing as guest');
        setLoading(false);
      }
    }, 2500);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      try {
        if (session?.user?.id) await fetchProfile(session.user.id);
      } catch (e) {
        console.error('[auth] profile fetch error:', e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[auth] getSession error:', err);
      if (mounted) {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      
      if (s?.user?.id) {
        await fetchProfile(s.user.id);
        registerPushToken(); // ← Register push token when user signs in / session is restored
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // When a real session appears, exit visitor mode automatically.
  useEffect(() => {
    if (session) setIsVisitor(false);
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, isVisitor, enterVisitorMode, exitVisitorMode, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);