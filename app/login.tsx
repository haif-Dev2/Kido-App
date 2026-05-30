import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomButton } from '../components/ui/CustomButton';
import { CustomInput } from '../components/ui/CustomInput';
import { Colors } from '../constants/Colors';
import { useResponsive } from '../lib/responsive';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/auth-provider';

WebBrowser.maybeCompleteAuthSession();

const TRUST_ITEMS = [
  { icon: 'shield-checkmark', title: 'Verified sitters', desc: 'Identity & background checked' },
  { icon: 'flash', title: 'Book in minutes', desc: 'Instant confirmation' },
  { icon: 'star', title: 'Trusted community', desc: 'Real reviews from parents' },
] as const;

export default function LoginScreen() {
  const router = useRouter();
  const { enterVisitorMode } = useAuth();
  const params = useLocalSearchParams<{ justSignedUp?: string; email?: string }>();
  const justSignedUp = params.justSignedUp === '1';
  const { isPhone } = useResponsive();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);

  const validateEmail = (emailStr: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);

  const friendlyAuthError = (rawMessage: string): { message: string; emailNotConfirmed: boolean } => {
    const msg = rawMessage.toLowerCase();
    if (msg.includes('email not confirmed') || msg.includes('not confirmed'))
      return { message: 'Please confirm your email address first. Check your inbox for the confirmation link.', emailNotConfirmed: true };
    if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials'))
      return { message: 'Email or password is incorrect. Please try again.', emailNotConfirmed: false };
    if (msg.includes('rate limit') || msg.includes('too many'))
      return { message: 'Too many attempts. Please wait a moment and try again.', emailNotConfirmed: false };
    if (msg.includes('user not found'))
      return { message: 'No account found with this email. Please sign up first.', emailNotConfirmed: false };
    return { message: rawMessage || 'Sign in failed. Please try again.', emailNotConfirmed: false };
  };

  const handleSignIn = async () => {
    if (!validateEmail(email)) { setSignInError('Please enter a valid email address.'); return; }
    if (password.length === 0) { setSignInError('Please enter your password.'); return; }
    setSignInError('');
    setNeedsConfirmation(false);
    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        const friendly = friendlyAuthError(error.message);
        setSignInError(friendly.message);
        setNeedsConfirmation(friendly.emailNotConfirmed);
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setSignInError(err?.message || 'An unexpected error occurred. Check your connection.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!validateEmail(email)) { setSignInError('Please enter a valid email address to resend the confirmation.'); return; }
    setIsResendingConfirmation(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
      if (error) Alert.alert('Error', error.message);
      else Alert.alert('Email sent', 'A new confirmation email has been sent. Please check your inbox.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resend confirmation email.');
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) { Alert.alert('Error', 'Please enter your email address.'); return; }
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: makeRedirectUri({ scheme: 'kido', path: 'reset-password' }),
    });
    setIsResetting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your email', 'We have sent a password reset link to your email address.');
      setShowResetModal(false);
      setResetEmail('');
    }
  };

  const signInWithProvider = async (provider: 'google' | 'apple' | 'facebook') => {
    setLoadingProvider(provider);
    try {
      const redirectUrl = makeRedirectUri({ scheme: 'kido' });
      const scopes = provider === 'facebook' ? 'email,public_profile' : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true, ...(scopes ? { scopes } : {}) },
      });
      if (error || !data.url) { console.error('Supabase OAuth Error:', error); setLoadingProvider(null); return; }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success') {
        const url = new URL(result.url);
        const hashParams = new URLSearchParams(url.hash.replace('#', ''));
        const access_token = hashParams.get('access_token') ?? url.searchParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') ?? url.searchParams.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          router.replace('/(tabs)');
        } else {
          Alert.alert('Sign in failed', 'Could not complete sign in. Please try again.');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred during sign in.');
    } finally {
      setLoadingProvider(null);
    }
  };

  /* ── Shared reset-password modal ── */
  const resetModal = (
    <Modal visible={showResetModal} animationType="slide" transparent={true}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.modalContent, { maxWidth: 480, width: '100%', alignSelf: 'center' }]}>
          <View style={styles.dragHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowResetModal(false)}>
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </Text>
          <View style={{ width: '100%', marginBottom: 16 }}>
            <CustomInput
              label="EMAIL ADDRESS"
              placeholder="your@email.com"
              iconName="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              value={resetEmail}
              onChangeText={setResetEmail}
              containerStyle={{ marginBottom: 0 }}
            />
            {resetEmail.length > 0 && !validateEmail(resetEmail) && (
              <Text style={styles.inputErrorText}>Please enter a valid email address</Text>
            )}
          </View>
          <CustomButton
            title="Send Reset Link"
            variant={validateEmail(resetEmail) ? 'primary' : 'secondary'}
            disabled={!validateEmail(resetEmail)}
            onPress={handleResetPassword}
            isLoading={isResetting}
            style={{ marginTop: 8 }}
          />
          <TouchableOpacity style={styles.backToSignInBtn} onPress={() => setShowResetModal(false)}>
            <Text style={styles.backToSignInText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  /* ── Shared form fields ── */
  const formFields = (
    <>
      <View style={{ marginBottom: 16 }}>
        <CustomInput
          label="EMAIL"
          placeholder="your@email.com"
          iconName="mail-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          containerStyle={{ marginBottom: 0 }}
        />
        {email.length > 0 && !validateEmail(email) && (
          <Text style={styles.inputErrorText}>Please enter a valid email address</Text>
        )}
      </View>

      <CustomInput
        label="PASSWORD"
        placeholder="Enter your password"
        iconName="lock-closed-outline"
        isPassword
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.forgotPasswordContainer} onPress={() => router.push('/forgot-password' as any)}>
        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
      </TouchableOpacity>

      {justSignedUp ? (
        <View style={styles.infoBanner}>
          <Ionicons name="mail-outline" size={18} color={Colors.light.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerText}>
              Account created! Please check your email and click the confirmation link before signing in.
            </Text>
            <TouchableOpacity onPress={handleResendConfirmation} disabled={isResendingConfirmation} style={{ marginTop: 6 }}>
              <Text style={styles.resendLinkText}>
                {isResendingConfirmation ? 'Sending…' : "Didn’t get it? Resend email"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {signInError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#EF4444" />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorBannerText}>{signInError}</Text>
            {needsConfirmation && (
              <TouchableOpacity onPress={handleResendConfirmation} disabled={isResendingConfirmation} style={{ marginTop: 6 }}>
                <Text style={styles.resendLinkText}>
                  {isResendingConfirmation ? 'Sending…' : 'Resend confirmation email'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}

      <CustomButton
        title={isSigningIn ? 'Signing In...' : 'Sign In'}
        variant={validateEmail(email) && password.length > 0 ? 'primary' : 'secondary'}
        onPress={handleSignIn}
        disabled={isSigningIn}
        isLoading={isSigningIn}
        style={styles.signInBtn}
      />

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialContainer}>
        <View style={styles.socialWrapper}>
          <CustomButton title="Google" variant="social" iconName="logo-google" iconColor="#DB4437"
            isLoading={loadingProvider === 'google'} disabled={loadingProvider !== null && loadingProvider !== 'google'}
            onPress={() => signInWithProvider('google')} />
        </View>
        <View style={styles.socialWrapper}>
          <CustomButton title="Apple" variant="social" iconName="logo-apple" iconColor="#000"
            isLoading={loadingProvider === 'apple'} disabled={loadingProvider !== null && loadingProvider !== 'apple'}
            onPress={() => signInWithProvider('apple')} />
        </View>
        <View style={styles.socialWrapper}>
          <CustomButton title="Meta" variant="social" iconName="logo-facebook" iconColor="#1877F2"
            isLoading={loadingProvider === 'facebook'} disabled={loadingProvider !== null && loadingProvider !== 'facebook'}
            onPress={() => signInWithProvider('facebook')} />
        </View>
      </View>
    </>
  );

  /* ── Main Layout ── */
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]} bounces={false}>
        <View style={[styles.column, { maxWidth: 480 }]}>
          {/* Header Hero Section */}
          <View style={styles.heroSection}>
            <Image
              source={require('../assets/images/login_hero.jpg')}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay} />
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Sign in to find trusted babysitters for your family</Text>

            {formFields}

            <View style={styles.securityContainer}>
              <View style={styles.securityBadge}>
                <Ionicons name="lock-closed-outline" size={14} color={Colors.light.textSecondary} />
                <Text style={styles.securityText}>Secure</Text>
              </View>
              <Text style={styles.securityDot}>•</Text>
              <View style={styles.securityBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color={Colors.light.textSecondary} />
                <Text style={styles.securityText}>Protected</Text>
              </View>
              <Text style={styles.securityDot}>•</Text>
              <View style={styles.securityBadge}>
                <Ionicons name="checkmark-circle-outline" size={14} color={Colors.light.textSecondary} />
                <Text style={styles.securityText}>Verified</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation with improved spacing */}
      <View style={[styles.bottomNav, { 
        paddingBottom: Math.max(insets.bottom + 16, 36) 
      }]}>

        {/* Sign Up row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16 }}>
          <Text style={styles.bottomNavText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.bottomNavLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16, paddingHorizontal: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#EBEBEB' }} />
          <Text style={{ fontSize: 11, color: '#C4C4C4', fontWeight: '500', marginHorizontal: 10 }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#EBEBEB' }} />
        </View>

        {/* Browse as Visitor */}
        <TouchableOpacity
          onPress={() => { enterVisitorMode(); router.replace('/(tabs)'); }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 4 }}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={15} color="#9CA3AF" style={{ marginRight: 6 }} />
          <Text style={{ color: '#9CA3AF', fontSize: 13, fontWeight: '500' }}>Browse as a Visitor</Text>
        </TouchableOpacity>

      </View>

      {resetModal}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.white },
  column: { width: '100%', alignSelf: 'center' },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  heroSection: { width: '100%', height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },

  formContainer: {
    flex: 1, backgroundColor: Colors.light.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -40, paddingHorizontal: 24, paddingTop: 40,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.light.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.light.textSecondary, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  forgotPasswordContainer: { alignItems: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { color: Colors.light.primary, fontSize: 14, fontWeight: '600' },
  inputErrorText: { fontSize: 12, color: '#EF4444', marginTop: 8, fontWeight: '500', paddingLeft: 4 },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.light.primaryLight, borderRadius: 12, padding: 12, marginBottom: 12,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: Colors.light.primary, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '500' },
  resendLinkText: { fontSize: 13, color: Colors.light.primary, fontWeight: '700', textDecorationLine: 'underline' },
  signInBtn: { marginBottom: 32 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.light.border },
  dividerText: { paddingHorizontal: 16, color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  socialWrapper: { flex: 1, marginHorizontal: 4 },
  securityContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  securityBadge: { flexDirection: 'row', alignItems: 'center' },
  securityText: { color: Colors.light.textSecondary, fontSize: 12, marginLeft: 4 },
  securityDot: { color: '#D1D5DB', marginHorizontal: 12, fontSize: 12 },

  bottomNav: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 0,
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: Colors.light.white,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    gap: 0,
  },

  bottomNavText: { color: Colors.light.textSecondary, fontSize: 14 },
  bottomNavLink: { color: Colors.light.primary, fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.light.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  dragHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  modalSubtitle: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 24, lineHeight: 20 },
  backToSignInBtn: { alignItems: 'center', marginTop: 20 },
  backToSignInText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
});