import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform,
  Pressable,
  ScrollView, StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { haptics } from '../lib/haptics';
import { READING_MAX_WIDTH, useResponsive } from '../lib/responsive';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius } from '../theme/colors';

type Step = 'input' | 'sent';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email address.'); return; }
    if (!/\S+@\S+\.\S+/.test(trimmed)) { setError('Please enter a valid email address.'); return; }

    setError('');
    setLoading(true);
    haptics.light();

    try {
      const { error: supaErr } = await supabase.auth.resetPasswordForEmail(trimmed);
      if (supaErr) {
        // Always show success to prevent email enumeration
        console.warn('[forgot-pw]', supaErr.message);
      }
      haptics.success();
      setStep('sent');
    } catch (e) {
      console.warn('[forgot-pw] error:', e);
      setStep('sent'); // still show success (anti-enumeration)
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { alignItems: 'center' }]}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={{ width: '100%', maxWidth: contentMaxWidth }}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%', maxWidth: contentMaxWidth }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'input' ? (
            <>
              {/* Icon */}
              <Animated.View entering={FadeInDown.duration(350)} style={styles.iconWrap}>
                <View style={styles.iconCircle}>
                  <Ionicons name="lock-open-outline" size={40} color={colors.primary} />
                </View>
              </Animated.View>

              {/* Title */}
              <Animated.View entering={FadeInDown.duration(350).delay(60)}>
                <Text style={styles.title}>Forgot password?</Text>
                <Text style={styles.subtitle}>
                  Enter the email address linked to your account and we'll send you a reset link.
                </Text>
              </Animated.View>

              {/* Email input */}
              <Animated.View entering={FadeInDown.duration(350).delay(120)} style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Email address</Text>
                <View style={[styles.inputBox, error ? styles.inputBoxError : null]}>
                  <Ionicons name="mail-outline" size={18} color={error ? '#DC2626' : colors.textMuted} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={v => { setEmail(v); setError(''); }}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                  />
                </View>
                {error ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
              </Animated.View>

              {/* Send button */}
              <Animated.View entering={FadeInDown.duration(350).delay(180)}>
                <Pressable
                  style={[styles.sendBtn, loading && { opacity: 0.7 }]}
                  onPress={handleSend}
                  disabled={loading}
                  accessibilityRole="button"
                >
                  {loading ? (
                    <Text style={styles.sendBtnTxt}>Sending…</Text>
                  ) : (
                    <>
                      <Text style={styles.sendBtnTxt}>Send reset link</Text>
                      <Ionicons name="send" size={16} color="#fff" />
                    </>
                  )}
                </Pressable>
              </Animated.View>

              {/* Back to login */}
              <Animated.View entering={FadeInDown.duration(350).delay(220)} style={styles.backToLogin}>
                <Text style={styles.backToLoginTxt}>Remember your password? </Text>
                <Pressable onPress={() => router.back()} accessibilityRole="button">
                  <Text style={styles.backToLoginLink}>Sign in</Text>
                </Pressable>
              </Animated.View>
            </>
          ) : (
            /* ── Success state ── */
            <>
              <Animated.View entering={FadeInDown.duration(400)} style={styles.iconWrap}>
                <View style={[styles.iconCircle, { backgroundColor: '#E8F5F0' }]}>
                  <Ionicons name="mail" size={40} color={colors.primary} />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(80)}>
                <Text style={styles.title}>Check your inbox</Text>
                <Text style={styles.subtitle}>
                  We sent a password reset link to{'\n'}
                  <Text style={{ fontFamily: fonts.sansBold, color: colors.text }}>{email}</Text>
                  {'\n\n'}Click the link in the email to set a new password. It may take a minute to arrive.
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(160)} style={styles.tipsCard}>
                <View style={styles.tipRow}>
                  <Ionicons name="folder-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.tipText}>Check your spam or junk folder if you don't see it</Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.tipText}>The link expires after 24 hours</Text>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.duration(380).delay(200)} style={{ gap: 12 }}>
                <Pressable
                  style={styles.sendBtn}
                  onPress={() => { haptics.tap(); setStep('input'); setEmail(''); }}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh-outline" size={16} color="#fff" />
                  <Text style={styles.sendBtnTxt}>Try a different email</Text>
                </Pressable>

                <Pressable
                  style={styles.outlineBtn}
                  onPress={() => { haptics.tap(); router.replace('/login'); }}
                  accessibilityRole="button"
                >
                  <Text style={styles.outlineBtnTxt}>Back to login</Text>
                </Pressable>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  backBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8, marginTop: 4,
  },

  scroll: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 48,
  },

  iconWrap: { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#E6F4F5',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },

  title: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  inputWrap: { marginBottom: 20 },
  inputLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 50,
  },
  inputBoxError: { borderColor: '#DC2626' },
  input: {
    flex: 1,
    fontFamily: fonts.sansMed,
    fontSize: 15,
    color: colors.text,
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6,
  },
  errorText: {
    fontFamily: fonts.sansMed,
    fontSize: 12,
    color: '#DC2626',
  },

  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 8,
  },
  sendBtnTxt: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#fff',
  },

  outlineBtn: {
    borderRadius: radius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  outlineBtnTxt: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textMuted,
  },

  backToLogin: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  backToLoginTxt: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
  },
  backToLoginLink: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.primary,
  },

  tipsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    marginBottom: 28,
  },
  tipRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  tipText: {
    fontFamily: fonts.sansMed,
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 19,
  },
});
