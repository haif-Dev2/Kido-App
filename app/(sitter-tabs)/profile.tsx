import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { haptics } from '../../lib/haptics';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/auth-provider';

const PRIMARY = Colors.light.primary;
const PRIMARY_SOFT = '#E1F5EE';

type MenuItem = {
  icon: string;
  label: string;
  onPress?: () => void;
  right?: React.ReactElement;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

export default function SitterProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);

  // Request location permission early so it's ready when the sitter toggles availability
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().catch(() => {});
  }, []);

  // ADD — loads real availability from DB on mount
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('sitter_locations')
          .select('is_available')
          .eq('sitter_id', user.id)
          .maybeSingle();
        setIsAvailable(data?.is_available ?? false);
      } catch {}
    };
    loadAvailability();
  }, []);

  const photoUri = profile?.photo_url
    ?? 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200';

  const sitterName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email.split('@')[0]
    : 'Sitter';

  const handleLogout = () => {
    haptics.warning();
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // Mark sitter as unavailable before logging out
              await supabase.from('sitter_locations')
                .upsert({
                  sitter_id: user.id,
                  latitude: 0,
                  longitude: 0,
                  is_available: false,
                  updated_at: new Date().toISOString(),
                });
              await supabase.from('babysitter_details')
                .update({ is_available: false })
                .eq('profile_id', user.id);
            }
          } catch (e) {
            console.warn('[logout] could not disable availability:', e);
          }
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleAvailabilityToggle = async (value: boolean) => {
    haptics.light();
    setIsAvailable(value);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (value) {
        // Turning ON — get GPS location first
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location required', 'Please allow location access to appear on the map for parents.');
          setIsAvailable(false);
          return;
        }

        let loc = null;
        try {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch {
          // Emulator fallback
          loc = await Location.getLastKnownPositionAsync();
        }

        if (!loc) {
          Alert.alert('Location unavailable', 'Could not get your location. Try again.');
          setIsAvailable(false);
          return;
        }

        // Get neighborhood from babysitter_details
        const { data: bdDetails } = await supabase
          .from('babysitter_details')
          .select('neighborhood')
          .eq('profile_id', user.id)
          .maybeSingle();

        // Save to sitter_locations with better precision and correct neighborhood
        await supabase.from('sitter_locations').upsert({
          sitter_id: user.id,
          latitude: Math.round(loc.coords.latitude * 1000) / 1000,
          longitude: Math.round(loc.coords.longitude * 1000) / 1000,
          neighborhood: bdDetails?.neighborhood ?? 'Algeria',
          is_available: true,
          updated_at: new Date().toISOString(),
        });
      } else {
        // Turning OFF — mark unavailable
        await supabase.from('sitter_locations').upsert({
          sitter_id: user.id,
          latitude: 0,
          longitude: 0,
          is_available: false,
          updated_at: new Date().toISOString(),
        });
      }

      // Also update babysitter_details
      await supabase.from('babysitter_details')
        .update({ is_available: value })
        .eq('profile_id', user.id);

    } catch (e: any) {
      Alert.alert('Error', 'Could not update availability. Try again.');
      setIsAvailable(!value); // revert
    }
  };

  const MENU_SECTIONS: MenuSection[] = [
    {
      title: 'Availability',
      items: [
        {
          icon: 'radio-button-on',
          label: 'Available for bookings',
          right: (
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityToggle}
              trackColor={{ false: '#E5E7EB', true: PRIMARY_SOFT }}
              thumbColor={isAvailable ? PRIMARY : '#9CA3AF'}
            />
          ),
        },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit profile', onPress: () => router.push('/edit-profile') },
        { icon: 'shield-checkmark-outline', label: 'Identity verification', onPress: () => {} },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
        { icon: 'globe-outline', label: 'Language', onPress: () => {} },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
        { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => {} },
        { icon: 'lock-closed-outline', label: 'Privacy Policy', onPress: () => {} },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {/* Profile header */}
        <View style={[s.profileHeader, { paddingTop: insets.top + 20 }]}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            {/* Static avatar display — no longer tappable */}
            <View>
              <Image source={{ uri: photoUri }} style={s.avatar} contentFit="cover" />
            </View>

            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 12 }}>
              {sitterName}
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{profile?.email}</Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 10,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {(profile as any)?.identity_verified && (
                <View style={s.verBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={PRIMARY} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY }}>Verified</Text>
                </View>
              )}
              <View style={[s.verBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isAvailable ? '#10B981' : '#9CA3AF',
                  }}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: isAvailable ? '#16A34A' : '#6B7280',
                  }}
                >
                  {isAvailable ? 'Available' : 'Unavailable'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu sections */}
        <View style={{ paddingHorizontal: 16, gap: 16, marginTop: 16 }}>
          {MENU_SECTIONS.map((section) => (
            <View key={section.title}>
              <Text style={s.sectionLabel}>{section.title}</Text>
              <View style={s.menuCard}>
                {section.items.map((item, i) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[s.menuItem, i > 0 && s.menuItemBorder]}
                    onPress={item.onPress}
                    activeOpacity={item.onPress ? 0.7 : 1}
                    disabled={!item.onPress && !item.right}
                  >
                    <View style={s.menuIconWrap}>
                      <Ionicons name={item.icon as any} size={18} color={PRIMARY} />
                    </View>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    {item.right ?? <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Log Out</Text>
          </TouchableOpacity>

          <Text style={{ textAlign: 'center', fontSize: 12, color: '#D1D5DB', marginTop: 4 }}>
            Kido v4.6.3
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  profileHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: PRIMARY,
  },
  verBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: '#E1F5EE',
    borderWidth: 1,
    borderColor: '#9FE1CB',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E1F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
});