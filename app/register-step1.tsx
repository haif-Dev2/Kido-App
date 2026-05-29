import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, Modal, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { CustomInput } from '../components/ui/CustomInput';
import { CustomButton } from '../components/ui/CustomButton';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useRegistrationStore } from '../store/registration-store';
import { useResponsive } from '../lib/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

type Step = 1 | 2;

const COUNTRIES = [
  { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿', maxLength: 10 },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦', maxLength: 10 },
  { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳', maxLength: 8 },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', maxLength: 10 },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', maxLength: 10 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', maxLength: 11 },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', maxLength: 10 },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', maxLength: 10 },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', maxLength: 9 },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', maxLength: 8 },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', maxLength: 8 },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', maxLength: 11 },
];

export default function RegisterStep1Screen() {
  const router = useRouter();
  const { isPhone } = useResponsive();
  const insets = useSafeAreaInsets();
  const colMaxWidth = isPhone ? undefined : 480;
  const [step, setStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string, country: typeof COUNTRIES[0]) => {
    // Basic validation: only digits and meets length requirements
    const phoneRegex = /^\d+$/;
    if (!phoneRegex.test(phone)) return false;
    // Most countries: local number length is between maxLength - 1 and maxLength
    return phone.length >= Math.max(5, country.maxLength - 2) && phone.length <= country.maxLength;
  };

  const isStep1Valid = 
    firstName.trim().length > 0 && 
    lastName.trim().length > 0 && 
    validateEmail(email) && 
    validatePhone(phone, selectedCountry);

  const isStep2Valid = password && confirmPassword && password === confirmPassword && agreeTerms;

  const passwordStrength = React.useMemo(() => {
    if (!password) return { level: 0, label: '', color: '#D1D5DB' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const levels = [
      { level: 1, label: 'Weak', color: '#EF4444' },
      { level: 2, label: 'Fair', color: '#F59E0B' },
      { level: 3, label: 'Good', color: '#3B82F6' },
      { level: 4, label: 'Strong', color: '#10B981' },
    ];
    return levels[score - 1] || { level: 0, label: 'Too short', color: '#EF4444' };
  }, [password]);

  const animateTransition = (nextStep: Step) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setStep(nextStep), 150);
  };

  const signInWithProvider = async (provider: 'google' | 'apple' | 'facebook') => {
    if (loadingProvider) return; // Prevent multiple simultaneous auth attempts
    setLoadingProvider(provider);
    setErrorMessage('');

    // Safety timeout: reset loading after 60s if the auth flow never returns
    const timeoutId = setTimeout(() => {
      setLoadingProvider(null);
      setErrorMessage('Authentication timed out. Please try again.');
    }, 60000);

    try {
      const redirectUrl = makeRedirectUri({ scheme: 'kido' });
      const scopes = provider === 'facebook' ? 'email,public_profile' : undefined;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          ...(scopes ? { scopes } : {}),
        },
      });

      if (error || !data.url) {
        clearTimeout(timeoutId);
        setLoadingProvider(null);
        setErrorMessage(error?.message || `Could not start ${provider} sign-in.`);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        const url = new URL(result.url);
        // Supabase returns tokens in the hash fragment: #access_token=...&refresh_token=...
        const hashParams = new URLSearchParams(url.hash.replace('#', ''));
        const access_token = hashParams.get('access_token') ?? url.searchParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') ?? url.searchParams.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          clearTimeout(timeoutId);
          router.replace('/(tabs)');
          return;
        }
      }

      // User cancelled or session didn't return tokens
      if (result.type === 'cancel' || result.type === 'dismiss') {
        // Silently reset — user chose to go back
      } else {
        setErrorMessage('Sign-in was not completed. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err?.message || 'Something went wrong with sign-in.');
    } finally {
      clearTimeout(timeoutId);
      setLoadingProvider(null);
    }
  };

  const handleStep1Continue = () => {
    if (!firstName.trim())  { setErrorMessage('Please enter your first name.'); return; }
    if (!lastName.trim())   { setErrorMessage('Please enter your last name.'); return; }
    if (!validateEmail(email)) { setErrorMessage('Please enter a valid email address.'); return; }
    if (!validatePhone(phone, selectedCountry)) { setErrorMessage('Please enter a valid phone number.'); return; }
    setErrorMessage('');
    animateTransition(2);
  };

  const handleSignUp = async () => {
    // Give the user explicit feedback instead of a silent no-op.
    if (!password) { setErrorMessage('Please enter a password.'); return; }
    if (password.length < 6) { setErrorMessage('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setErrorMessage('Passwords don\u2019t match.'); return; }
    if (!agreeTerms) { setErrorMessage('Please accept the Terms of Service.'); return; }

    setIsSubmitting(true);
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const fullPhone = `${selectedCountry.dialCode}${phone}`;
    // Role was captured on the previous screen (app/register.tsx); default to PARENT for safety.
    const role = useRegistrationStore.getState().role ?? 'PARENT';
    console.log('Starting sign up with:', { email: normalizedEmail, fullPhone, role });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: fullPhone,
            role,
          },
        },
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('user already')) {
          setErrorMessage('An account with this email already exists. Please sign in instead.');
        } else if (msg.includes('rate limit') || msg.includes('email rate')) {
          // Rate limit hit — try signing in directly (account may already exist)
          console.log('[signup] rate limit hit, trying direct sign-in...');
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (signInData?.session) {
            router.replace('/(tabs)');
          } else {
            // Go to the app anyway for development
            console.log('[signup] rate limit — navigating to app anyway');
            router.replace('/(tabs)');
          }
        } else {
          setErrorMessage(error.message);
        }
      } else if (data.session) {
        // Immediate session — user is signed in
        console.log('[signup] got session, navigating to app');
        router.replace('/(tabs)');
      } else if (data.user) {
        // Account created but no session (email confirmation is ON)
        // Go directly to the app — don't wait for email confirmation
        console.log('[signup] account created, skipping email confirmation');
        router.replace('/(tabs)');
      } else {
        // Fallback — just go to the app
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Sign up exception:', err);
      // Even on error, navigate to the app for development
      router.replace('/(tabs)');
    }
    finally { setIsSubmitting(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.column, { maxWidth: colMaxWidth }]}>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image source={require('../assets/images/register_hero.jpg')} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          <TouchableOpacity style={styles.backButton} onPress={() => step === 1 ? router.back() : animateTransition(1)}>
            <Ionicons name="chevron-back" size={22} color={Colors.light.text} />
          </TouchableOpacity>

          {/* Pink STEP pill */}
          <View style={styles.stepPillContainer}>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillLabel}>STEP {step}</Text>
              <Text style={styles.stepPillCount}> of 2</Text>
            </View>
          </View>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrackWrapper}>
              <View style={[styles.progressTrack, styles.progressTrackActive]} />
              <View style={[styles.progressTrack, step === 2 && styles.progressTrackActive]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelActive}>Personal Info</Text>
              <Text style={step === 2 ? styles.progressLabelActive : styles.progressLabel}>Security</Text>
            </View>
          </View>

          <Animated.View style={{ opacity: fadeAnim }}>
            {step === 1 ? (
              <>
                {/* Section Header */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="person-outline" size={14} color={Colors.light.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
                </View>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <CustomInput label="FIRST NAME" placeholder="Sarah" iconName="person-outline" value={firstName} onChangeText={setFirstName} />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={styles.col}>
                    <CustomInput label="LAST NAME" placeholder="Johnson" iconName="person-outline" value={lastName} onChangeText={setLastName} />
                  </View>
                </View>

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

                {/* Phone Input */}
                <View style={styles.phoneContainer}>
                  <Text style={styles.label}>PHONE</Text>
                  <View style={styles.phoneRow}>
                    <TouchableOpacity 
                      style={styles.countryCodePicker}
                      onPress={() => setShowCountryPicker(true)}
                    >
                      <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                      <Text style={styles.countryCodeText}>{selectedCountry.dialCode}</Text>
                      <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View style={styles.phoneInputWrapper}>
                      <CustomInput 
                        label="" 
                        placeholder="555 123 456" 
                        keyboardType="phone-pad" 
                        value={phone} 
                        onChangeText={setPhone} 
                        containerStyle={{ marginBottom: 0 }} 
                        maxLength={selectedCountry.maxLength}
                      />
                    </View>
                  </View>
                  {phone.length > 0 && !validatePhone(phone, selectedCountry) && (
                    <Text style={styles.inputErrorText}>Please enter a valid phone number</Text>
                  )}
                </View>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Buttons */}
                <View style={styles.socialContainer}>
                  <View style={styles.socialWrapper}>
                    <CustomButton title="Google" variant="social" iconName="logo-google" iconColor="#DB4437" isLoading={loadingProvider === 'google'} disabled={loadingProvider !== null && loadingProvider !== 'google'} onPress={() => signInWithProvider('google')} />
                  </View>
                  <View style={styles.socialWrapper}>
                    <CustomButton title="Apple" variant="social" iconName="logo-apple" iconColor="#000" isLoading={loadingProvider === 'apple'} disabled={loadingProvider !== null && loadingProvider !== 'apple'} onPress={() => signInWithProvider('apple')} />
                  </View>
                  <View style={styles.socialWrapper}>
                    <CustomButton title="Meta" variant="social" iconName="logo-facebook" iconColor="#1877F2" isLoading={loadingProvider === 'facebook'} disabled={loadingProvider !== null && loadingProvider !== 'facebook'} onPress={() => signInWithProvider('facebook')} />
                  </View>
                </View>

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <CustomButton 
                  title="Continue →" 
                  variant={isStep1Valid ? 'primary' : 'secondary'} 
                  onPress={() => handleStep1Continue()} 
                  disabled={loadingProvider !== null}
                  style={{ marginBottom: 24 }} 
                />
              </>
            ) : (
              <>
                {/* Security Step */}
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#F59E0B" />
                  </View>
                  <Text style={styles.sectionTitle}>SECURE YOUR ACCOUNT</Text>
                </View>

                {/* Greeting card */}
                <View style={styles.greetingCard}>
                  <View style={styles.greetingAvatar}>
                    <Text style={styles.greetingAvatarText}>
                      {firstName ? firstName[0].toUpperCase() : 'A'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.greetingCardTitle}>Hi, {firstName || 'there'}!</Text>
                    <Text style={styles.greetingCardSubtitle}>Let's secure your account</Text>
                  </View>
                </View>

                <CustomInput label="PASSWORD" placeholder="Create a strong password" iconName="lock-closed-outline" isPassword value={password} onChangeText={setPassword} />

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map(i => (
                        <View key={i} style={[styles.strengthBar, { backgroundColor: i <= passwordStrength.level ? passwordStrength.color : '#E5E7EB' }]} />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
                  </View>
                )}

                {/* Password requirements */}
                <View style={styles.reqContainer}>
                  {[
                    { check: password.length >= 8, text: 'At least 8 characters' },
                    { check: /[A-Z]/.test(password), text: 'One uppercase letter' },
                    { check: /[0-9]/.test(password), text: 'One number' },
                    { check: /[^A-Za-z0-9]/.test(password), text: 'One special character' },
                  ].map((req, i) => (
                    <View key={i} style={styles.reqRow}>
                      <Ionicons name={req.check ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={req.check ? '#10B981' : '#D1D5DB'} />
                      <Text style={[styles.reqText, req.check && styles.reqTextDone]}>{req.text}</Text>
                    </View>
                  ))}
                </View>

                <CustomInput label="CONFIRM PASSWORD" placeholder="Repeat your password" iconName="lock-closed-outline" isPassword value={confirmPassword} onChangeText={setConfirmPassword} />

                {confirmPassword && password !== confirmPassword && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>Passwords don&apos;t match</Text>
                  </View>
                )}

                {/* Terms Checkbox */}
                <TouchableOpacity style={styles.termsRow} onPress={() => setAgreeTerms(!agreeTerms)} activeOpacity={0.7}>
                  <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                    {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <CustomButton 
                  title={isSubmitting ? 'Creating Account...' : 'Create Account'} 
                  variant={isStep2Valid ? 'primary' : 'secondary'} 
                  onPress={handleSignUp} 
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  style={{ marginBottom: 16 }} 
                />

                {/* Security Info */}
                <View style={styles.securityInfo}>
                  <View style={styles.securityBadge}>
                    <Ionicons name="lock-closed" size={12} color={Colors.light.textSecondary} />
                    <Text style={styles.securityText}>Encrypted</Text>
                  </View>
                  <Text style={styles.securityDot}>·</Text>
                  <View style={styles.securityBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={Colors.light.textSecondary} />
                    <Text style={styles.securityText}>Safe & Secure</Text>
                  </View>
                  <Text style={styles.securityDot}>·</Text>
                  <View style={styles.securityBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={Colors.light.textSecondary} />
                    <Text style={styles.securityText}>Verified</Text>
                  </View>
                </View>
              </>
            )}
          </Animated.View>

          {/* Bottom Sign In */}
          <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Text style={styles.bottomNavText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.bottomNavLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: colMaxWidth, width: '100%', alignSelf: 'center', paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                    // Trim phone number if it exceeds new max length
                    if (phone.length > item.maxLength) {
                      setPhone(phone.slice(0, item.maxLength));
                    }
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemCode}>{item.dialCode}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { flexGrow: 1 },
  column: { width: '100%', alignSelf: 'center' },
  
  // Hero
  heroSection: { width: '100%', height: 200, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.15)' },
  backButton: {
    position: 'absolute', top: Platform.OS === 'ios' ? 52 : 40, left: 20,
    // 44×44 — tap-target spec.
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },

  // Pink Step Pill
  stepPillContainer: {
    position: 'absolute', bottom: -18, left: 0, right: 0, alignItems: 'center', zIndex: 10,
  },
  stepPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EC4899', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    shadowColor: '#EC4899', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  stepPillLabel: {
    fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 0.8,
  },
  stepPillCount: {
    fontSize: 11, fontWeight: '500', color: '#FFF', letterSpacing: 0.5,
  },

  // Form
  formContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 32, backgroundColor: '#FAFAFA' },
  progressContainer: { marginBottom: 28 },
  progressTrackWrapper: { flexDirection: 'row', height: 4, marginBottom: 8, gap: 4 },
  progressTrack: { flex: 1, backgroundColor: '#E5E7EB', borderRadius: 2 },
  progressTrackActive: { backgroundColor: Colors.light.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabelActive: { fontSize: 10, color: Colors.light.primary, fontWeight: '700' },
  progressLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionIcon: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0F2FE',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#4B5563', letterSpacing: 0.5 },

  row: { flexDirection: 'row' },
  col: { flex: 1 },

  // Phone
  phoneContainer: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, letterSpacing: 0.5 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  countryCodePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 12,
    backgroundColor: '#FFF', height: 56, paddingHorizontal: 14,
  },
  countryFlag: { fontSize: 18 },
  countryCodeText: { fontSize: 14, color: Colors.light.text, fontWeight: '600' },
  phoneInputWrapper: { flex: 1 },

  // Divider
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { paddingHorizontal: 12, color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Social
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  socialWrapper: { flex: 1, marginHorizontal: 4 },

  // Greeting card (step 2)
  greetingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#E6F4F5', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20,
  },
  greetingAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.light.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  greetingAvatarText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  greetingCardTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  greetingCardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Password strength
  strengthContainer: { flexDirection: 'row', alignItems: 'center', marginTop: -8, marginBottom: 16, gap: 8 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700' },

  // Requirements
  reqContainer: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 16, gap: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqText: { fontSize: 12, color: '#9CA3AF' },
  reqTextDone: { color: '#10B981', textDecorationLine: 'line-through' },

  // Error
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 12 },
  errorText: { fontSize: 12, color: '#EF4444', fontWeight: '500' },
  inputErrorText: { fontSize: 12, color: '#EF4444', marginTop: 8, fontWeight: '500', paddingLeft: 4 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  errorBannerText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '500' },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  termsText: { flex: 1, fontSize: 13, color: Colors.light.textSecondary, lineHeight: 20 },
  termsLink: { color: Colors.light.primary, fontWeight: '600' },

  // Security footer
  securityInfo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  securityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  securityText: { color: Colors.light.textSecondary, fontSize: 11 },
  securityDot: { color: '#D1D5DB', marginHorizontal: 10 },

  // Bottom nav
  bottomNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  bottomNavText: { color: Colors.light.textSecondary, fontSize: 14 },
  bottomNavLink: { color: Colors.light.primary, fontSize: 14, fontWeight: '700' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  countryItemFlag: { fontSize: 28, marginRight: 16 },
  countryItemName: { flex: 1, fontSize: 16, color: Colors.light.text, fontWeight: '500' },
  countryItemCode: { fontSize: 16, color: Colors.light.textSecondary, fontWeight: '700' },
});
