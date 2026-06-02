import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { BREAKPOINTS } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/auth-provider';

export default function SitterTabLayout() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);
  const { width } = useWindowDimensions();
  const isCompact = width < BREAKPOINTS.lg;

  const rawBottom = Platform.OS === 'ios'
    ? Math.max(insets.bottom, 28)
    : Math.max(insets.bottom, 10);
  const bottomPad = Math.round(rawBottom * 1.2);
  const barHeight = (isCompact ? 56 : 64) + bottomPad;

  useEffect(() => {
    if (!session) { setPendingCount(0); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setPendingCount(0); return; }
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('babysitter_id', user.id)
        .eq('status', 'PENDING')
        .then(({ count }) => setPendingCount(count ?? 0));
    });
  }, [session]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: true,
        tabBarLabelStyle: [s.label, isCompact ? null : s.labelLg],
        tabBarStyle: [s.bar, isCompact ? null : s.barLg, { paddingBottom: bottomPad, height: barHeight }],
        tabBarItemStyle: { paddingTop: isCompact ? 6 : 8, paddingBottom: 0 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={isCompact ? 22 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={isCompact ? 22 : 24} color={color} />
              {pendingCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={isCompact ? 22 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={isCompact ? 22 : 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  barLg: { paddingTop: 10 },
  label: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  labelLg: { fontSize: 13, marginTop: 4 },
  badge: {
    position: 'absolute', top: -6, right: -10,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EC4899',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});