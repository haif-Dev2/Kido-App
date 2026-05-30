import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { READING_MAX_WIDTH, useResponsive } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/auth-provider';
import { useFavoritesStore } from '../../store/favorites-store';

type Tone = 'primary' | 'accent' | 'warning' | 'purple' | 'neutral';

const toneBg: Record<Tone, string> = {
  primary: Colors.light.primaryLight,
  accent:  '#FDE7EC',
  warning: '#FEF3C7',
  purple:  '#EDE9FE',
  neutral: '#F3F4F6',
};
const toneFg: Record<Tone, string> = {
  primary: Colors.light.primary,
  accent:  '#EC4899',
  warning: '#F59E0B',
  purple:  '#6366F1',
  neutral: '#6B7280',
};

interface Item {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: Tone;
  hint?: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, isVisitor } = useAuth();
  const { isPhone } = useResponsive();
  const favCount = useFavoritesStore(s => s.ids.size);

  const [bookingsCount, setBookingsCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', user.id)
        .then(({ count }) => { if (count !== null) setBookingsCount(count); });

      supabase
        .from('reviews')
        .select('rating')
        .eq('parent_id', user.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
            setAvgRating(Math.round(avg * 10) / 10);
          }
        });
    });
  }, []);

  // ── Visitor Profile ──────────────────────────────────────────────
  if (isVisitor) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Guest avatar + CTA */}
          <View style={{
            backgroundColor: Colors.light.primary, 
            paddingTop: 32, 
            paddingBottom: 40,
            alignItems: 'center', 
            paddingHorizontal: 24,
          }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Ionicons name="person-outline" size={36} color="#FFFFFF" />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
              Visiteur
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              Créez un compte pour accéder à toutes les fonctionnalités
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/register')}
              style={{
                backgroundColor: '#FFFFFF', borderRadius: 24,
                paddingHorizontal: 28, paddingVertical: 12, marginBottom: 10, 
                width: '100%', alignItems: 'center',
              }}
            >
              <Text style={{ color: Colors.light.primary, fontWeight: '700', fontSize: 15 }}>
                S'inscrire gratuitement
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              style={{
                borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 24,
                paddingHorizontal: 28, paddingVertical: 12, width: '100%', alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          {/* Info sections */}
          {[
            { icon: 'information-circle-outline', label: 'À propos de Kido', onPress: () => {} },
            { icon: 'cash-outline', label: 'Tarifs', onPress: () => {} },
            { icon: 'help-circle-outline', label: 'Comment ça marche', onPress: () => {} },
            { icon: 'document-text-outline', label: 'Conditions d\'utilisation', onPress: () => {} },
            { icon: 'shield-checkmark-outline', label: 'Politique de confidentialité', onPress: () => {} },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 10,
                borderRadius: 14, padding: 16,
                borderWidth: 1, borderColor: '#F0F0F0',
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: '#E6F4F5', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name={item.icon as any} size={18} color={Colors.light.primary} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }
  // ── End visitor profile ──────────────────────────────────────────

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email.split('@')[0]
    : '…';
  const displayEmail = profile?.email ?? '';
  const photoUri = profile?.photo_url
    ?? 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400';

  const comingSoon = (feature: string) =>
    Alert.alert(`${feature}`, `${feature} will be available in the next release.`, [{ text: 'OK' }]);

  const openNotifications = () => router.push('/notifications');

  const pickLanguage = () =>
    Alert.alert(
      'Language',
      'Select your preferred language:',
      [
        { text: '🇬🇧 English', onPress: () => Alert.alert('Language updated', 'Language set to English.') },
        { text: '🇫🇷 Français', onPress: () => Alert.alert('Langue mise à jour', 'Langue réglée sur Français.') },
        { text: '🇩🇿 العربية', onPress: () => Alert.alert('تم تحديث اللغة', 'تم تعيين اللغة على العربية.') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );

  const account: Item[] = [
    { icon: 'person-outline', label: 'Edit Profile',    tone: 'primary', onPress: () => router.push('/edit-profile') },
    { icon: 'card-outline',   label: 'Payment Methods', tone: 'primary', onPress: () => comingSoon('Payment Methods') },
    { icon: 'heart-outline',  label: 'Favorites',       tone: 'accent',  onPress: () => router.push('/(tabs)/favorites' as any) },
  ];
  const preferences: Item[] = [
    { icon: 'notifications-outline', label: 'Notifications',       tone: 'warning', onPress: openNotifications },
    { icon: 'shield-outline',        label: 'Privacy & Security',  tone: 'primary', onPress: () => comingSoon('Privacy & Security') },
    { icon: 'globe-outline',         label: 'Language',            tone: 'purple',  hint: '🇬🇧 English', onPress: pickLanguage },
    { icon: 'settings-outline',      label: 'App Settings',        tone: 'neutral', onPress: () => comingSoon('App Settings') },
  ];
  const support: Item[] = [
    { icon: 'help-circle-outline',   label: 'Help & Support',      tone: 'primary', onPress: () => comingSoon('Help & Support') },
  ];

  const onLogout = () => {
    Alert.alert(
      'Log out of Kido?',
      'You can sign back in any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out', style: 'destructive',
          onPress: async () => { await supabase.auth.signOut(); router.replace('/login'); },
        },
      ],
    );
  };

  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  return (
    <View style={[s.page, { paddingTop: insets.top, alignItems: 'center' }]}>
      <ScrollView
        style={{ width: '100%', maxWidth: contentMaxWidth }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity hero — teal gradient with subtle decorative circles */}
        <View style={s.heroWrap}>
          <LinearGradient
            colors={[Colors.light.primary, '#005C68']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.heroCover}
          >
            <View style={s.heroCircle1} />
            <View style={s.heroCircle2} />
          </LinearGradient>

          <View style={s.heroBody}>
            <View>
              <Image
                source={{ uri: photoUri }}
                style={s.identityAvatar}
                contentFit="cover"
                transition={200}
              />
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            </View>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.email}>{displayEmail}</Text>

            {/* Stats grid */}
            <View style={s.statGrid}>
              <ProfileStat icon="calendar" tint={Colors.light.primary}
                value={String(bookingsCount)} label="Bookings" />
              <View style={s.statDivider} />
              <ProfileStat icon="star" tint="#F5A524"
                value={avgRating > 0 ? avgRating.toFixed(1) : '–'} label="Rating" />
              <View style={s.statDivider} />
              <ProfileStat icon="heart" tint="#EC4899"
                value={String(favCount)} label="Favorites" />
            </View>
          </View>
        </View>

        <Section title="ACCOUNT" items={account} />
        <Section title="PREFERENCES" items={preferences} />
        <Section title="SUPPORT" items={support} />

        <TouchableOpacity style={s.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>Kido v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function ProfileStat({
  icon, tint, value, label,
}: { icon: keyof typeof Ionicons.glyphMap; tint: string; value: string; label: string }) {
  return (
    <View style={s.statCell}>
      <View style={[s.statIconBox, { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon} size={14} color={tint} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={s.sectionLabel}>{title}</Text>
      <View style={s.sectionCard}>
        {items.map((it, idx) => (
          <Row key={it.label} item={it} last={idx === items.length - 1} />
        ))}
      </View>
    </View>
  );
}

function Row({ item, last }: { item: Item; last: boolean }) {
  return (
    <TouchableOpacity
      style={[s.row, !last && s.rowSep]}
      onPress={item.onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[s.rowIcon, { backgroundColor: toneBg[item.tone] }]}>
        <Ionicons name={item.icon} size={18} color={toneFg[item.tone]} />
      </View>
      <Text style={s.rowLabel}>{item.label}</Text>
      {item.hint ? <Text style={s.rowHint}>{item.hint}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color="#C1C7D0" style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F6F8' },

  heroWrap: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 22, backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  heroCover: { height: 100, position: 'relative', overflow: 'hidden' },
  heroCircle1: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -40, right: -40,
  },
  heroCircle2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: -20, left: 20,
  },
  heroBody: {
    alignItems: 'center', paddingHorizontal: 18, paddingBottom: 18,
    marginTop: -42,
  },
  identityAvatar: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 4, borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.light.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  name: { fontSize: 22, fontWeight: '800', color: Colors.light.text, marginTop: 10 },
  email: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  statGrid: {
    flexDirection: 'row', alignItems: 'stretch',
    marginTop: 16, width: '100%',
    backgroundColor: '#FAFAF7',
    borderRadius: 14, padding: 4,
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
  statDivider: { width: 1, backgroundColor: '#EAE7DE', marginVertical: 8 },
  statIconBox: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.light.text, marginTop: 2 },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.8, marginLeft: 24, marginBottom: 8, marginTop: 6,
  },
  sectionCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    borderWidth: 1, borderColor: '#F3F4F6',
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  rowSep: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.light.text, fontWeight: '600' },
  rowHint: { fontSize: 13, color: '#6B7280' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 14,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCE7E7',
    marginHorizontal: 16, marginTop: 20,
  },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },

  version: { textAlign: 'center', color: '#C1C7D0', fontSize: 11, marginTop: 14 },
});