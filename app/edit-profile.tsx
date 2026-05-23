import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/auth-provider';
import { READING_MAX_WIDTH, useResponsive } from '../lib/responsive';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setPhone(profile.phone ?? '');
      setCity((profile as any).city ?? '');
      setBio((profile as any).bio ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required', 'Please enter your first name.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[s.page, { paddingTop: insets.top, alignItems: 'center' }]}>
        {/* Header — full-width white bar with content centered to maxWidth. */}
        <View style={[s.header, { width: '100%', maxWidth: contentMaxWidth }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn} accessibilityRole="button">
            {saving
              ? <ActivityIndicator size="small" color={Colors.light.primary} />
              : <Text style={s.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ width: '100%', maxWidth: contentMaxWidth }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar with camera icon */}
          <View style={s.avatarRow}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarInitials}>
                {(firstName[0] ?? '?').toUpperCase()}{(lastName[0] ?? '').toUpperCase()}
              </Text>
            </View>
            <View style={s.cameraBtn}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </View>

          <Field label="Full Name" value={`${firstName} ${lastName}`.trim()} onChange={(v) => {
            const parts = v.split(' ');
            setFirstName(parts[0] ?? '');
            setLastName(parts.slice(1).join(' ') ?? '');
          }} placeholder="e.g. Sarah Johnson" autoCapitalize="words" />

          {/* Email (read-only) */}
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Email</Text>
            <View style={[s.fieldInput, s.fieldDisabled]}>
              <Text style={s.fieldDisabledText}>{profile?.email ?? '—'}</Text>
            </View>
          </View>

          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="+213 555 012 345"
            keyboardType="phone-pad"
          />
          <Field label="City" value={city} onChange={setCity} placeholder="Algiers, Hydra" autoCapitalize="words" />
          <Field label="Bio" value={bio} onChange={setBio} placeholder="Mom of two. Looking for reliable babysitters..." multiline />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, autoCapitalize, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  multiline?: boolean;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'none'}
        multiline={multiline}
        style={[s.fieldInput, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F6F8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  // Bumped 36→44 to satisfy tap-target spec.
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text },
  saveBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    minWidth: 64, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  avatarRow: { alignItems: 'center', marginBottom: 28, position: 'relative', alignSelf: 'center' },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 26, fontWeight: '700', color: Colors.light.primary },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: -4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },

  fieldWrap: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: Colors.light.text,
  },
  fieldDisabled: { backgroundColor: '#F9FAFB' },
  fieldDisabledText: { fontSize: 15, color: '#9CA3AF' },
  fieldHint: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  saveBlock: {
    backgroundColor: Colors.light.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  saveBlockText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
