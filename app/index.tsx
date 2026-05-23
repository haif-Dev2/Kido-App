import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../providers/auth-provider';

export default function IndexRouter() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF7' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  if (!session) return <Redirect href="/splash" />;
  if (profile?.role === 'BABY_SITTER') return <Redirect href="/sitter-home" />;
  return <Redirect href="/(tabs)" />;
}
