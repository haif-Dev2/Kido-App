import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  KeyboardAvoidingView, Platform, TextInput, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { CustomButton } from '../components/ui/CustomButton';
import { supabase } from '../lib/supabase';
import { useResponsive } from '../lib/responsive';

export default function RegisterOTPScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const { isPhone } = useResponsive();
  const colMaxWidth = isPhone ? undefined : 480;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-advance to next input
    if (text !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && code[index] === '') {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const verifyOTP = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      Alert.alert('Incomplete code', 'Please enter all 6 digits.');
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: String(phone),
        token: fullCode,
        type: 'phone_change', // Required when verifying a phone number added via updateUser
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token')) {
          Alert.alert('Invalid code', 'The code is incorrect or has expired. Please request a new one.');
        } else {
          Alert.alert('Verification Failed', error.message);
        }
      } else {
        // Phone successfully verified — replace so user can't go back to OTP screen.
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'An unexpected error occurred.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    if (timer > 0) return;

    setIsResending(true);
    try {
      // Re-trigger the phone change OTP
      const { error } = await supabase.auth.updateUser({ phone: String(phone) });

      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes('sms') || m.includes('provider') || m.includes('not enabled') || m.includes('not configured')) {
          Alert.alert(
            'SMS not configured',
            'SMS verification is not yet enabled on the server. Please configure an SMS provider (Twilio, MessageBird, etc.) in Supabase → Authentication → Providers → Phone.'
          );
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        setTimer(60);
        Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = code.every(digit => digit !== '');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <KeyboardAvoidingView 
        style={[styles.column, { maxWidth: colMaxWidth }]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBg}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={Colors.light.primary} />
            </View>
          </View>

          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>
            We&apos;ve sent a 6-digit verification code to
            <Text style={styles.phoneText}> {phone}</Text>
          </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.codeInput,
                  digit !== '' && styles.codeInputActive
                ]}
                maxLength={1}
                keyboardType="number-pad"
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
              />
            ))}
          </View>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
            {timer > 0 ? (
              <Text style={styles.timerText}>Resend in {timer}s</Text>
            ) : (
              <TouchableOpacity onPress={resendCode} disabled={isResending}>
                <Text style={styles.resendLink}>
                  {isResending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.spacer} />

          <CustomButton
            title={isVerifying ? 'Verifying...' : 'Verify Phone Number'}
            variant={isComplete ? 'primary' : 'secondary'}
            onPress={verifyOTP}
            disabled={!isComplete || isVerifying}
            isLoading={isVerifying}
            style={styles.verifyBtn}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.white,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    // 44×44 — tap-target spec.
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
  },
  phoneText: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 32,
  },
  codeInput: {
    // Use flex so 6 boxes always fit within the column, even at 320px.
    // The 60px height keeps each input large enough to tap (HIG 44+).
    flex: 1,
    minWidth: 0,
    maxWidth: 56,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  codeInputActive: {
    borderColor: Colors.light.primary,
    backgroundColor: '#F0FDFA',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  spacer: {
    flex: 1,
  },
  verifyBtn: {
    marginBottom: Platform.OS === 'ios' ? 16 : 24,
  },
});
