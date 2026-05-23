import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { MOCK_BOOKINGS } from '../../lib/mock/bookings';
import { supabase } from '../../lib/supabase';
import { BREAKPOINTS } from '../../lib/responsive';

export default function TabLayout() {
  const [pendingCount, setPendingCount] = useState(
    MOCK_BOOKINGS.filter(b => b.status === 'PENDING').length,
  );
  const { width } = useWindowDimensions();

  // Make the tab bar slightly taller on tablets / desktop so each item meets
  // the 48px tap-target spec (Material) and the labels feel proportional to
  // the larger surface area.
  const isCompact = width < BREAKPOINTS.lg;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', user.id)
        .eq('status', 'PENDING')
        .then(({ count }) => { if (count !== null) setPendingCount(count); });
    });
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: true,
        tabBarLabelStyle: [s.label, isCompact ? null : s.labelLg],
        tabBarStyle: [s.bar, isCompact ? null : s.barLg],
        // Use vertical padding to grow each item to ≥ 48px on every viewport.
        tabBarItemStyle: { paddingTop: isCompact ? 6 : 8, paddingBottom: 0 },
        // Extra hit area on web — Pressable inside Tabs adds a 44px min via global.css.
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
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={isCompact ? 22 : 24} color={color} />
          ),
          tabBarAccessibilityLabel: 'Search tab',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={isCompact ? 22 : 24} color={color} />
              {pendingCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
          ),
          tabBarAccessibilityLabel: `Bookings tab, ${pendingCount} pending`,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={isCompact ? 22 : 24} color={color} />
          ),
          tabBarAccessibilityLabel: 'Favorites tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={isCompact ? 22 : 24} color={color} />
          ),
          tabBarAccessibilityLabel: 'Profile tab',
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
    // Add iOS bottom safe-area padding (home indicator). On the web, the
    // env(safe-area-inset-bottom) already comes from the body padding, so we
    // keep the bar height tight and let the body handle it.
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  // Slightly taller bar on tablets/desktop. Bigger labels/icons feel right
  // on big surfaces, and the extra height keeps each tab ≥ 48px tall.
  barLg: {
    height: Platform.OS === 'ios' ? 92 : 76,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  labelLg: {
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -6, right: -10,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EC4899',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
