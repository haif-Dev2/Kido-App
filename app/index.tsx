// app/index.tsx  —  full replacement
// Key fix: uses useEffect + router.replace instead of <Redirect>.
// The <Redirect> component in expo-router triggers a GO_BACK action
// to remove itself from the stack, which fails at the root level and
// produces the "GO_BACK was not handled" error in the terminal.
// useEffect + router.replace avoids this entirely.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../providers/auth-provider';

const ONBOARDING_KEY = '@kido:onboarding_done';
const TEAL = '#0F766E';

export default function IndexRouter() {
  const router = useRouter();
  const { session, profile, loading, isVisitor } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Read the onboarding flag once on mount
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(val => setOnboardingDone(val === 'true'))
      .catch(() => setOnboardingDone(false));
  }, []);

  // Decide where to navigate once all data is ready
  useEffect(() => {
    if (loading || onboardingDone === null) return;

    if (!session) {
      if (isVisitor) {
        router.replace('/(tabs)');
        return;
      }
      // First-ever launch → splash + onboarding
      // Returning user / after logout → straight to login
      router.replace(onboardingDone ? '/login' : '/splash');
      return;
    }

    // Session exists but profile not loaded yet — wait for the next render
    if (!profile) return;

    // Route by role
    if (profile.role === 'BABY_SITTER') {
      router.replace('/(sitter-tabs)');
    } else {
      router.replace('/(tabs)');
    }
  }, [loading, onboardingDone, session, profile, isVisitor]);

  // Always show a spinner — navigation happens in the effect above
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF7' }}>
      <ActivityIndicator size="large" color={TEAL} />
    </View>
  );
}