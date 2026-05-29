import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** What action triggered the prompt (e.g. "book a babysitter"). */
  action?: string;
}

/**
 * Bottom-sheet modal shown when a visitor tries to perform an action
 * that requires an account (booking, messaging, favorites, etc.).
 */
export function LoginPromptModal({ visible, onClose, action = 'use this feature' }: Props) {
  const router = useRouter();

  const goLogin = () => {
    onClose();
    router.push('/login');
  };

  const goRegister = () => {
    onClose();
    router.push('/register');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>

      <View style={s.sheet}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Icon */}
        <View style={s.iconCircle}>
          <Ionicons name="lock-closed" size={28} color="#0F766E" />
        </View>

        <Text style={s.title}>Sign in required</Text>
        <Text style={s.subtitle}>
          You need an account to {action}.{'\n'}
          Join Kido — it&apos;s free and takes less than a minute.
        </Text>

        <TouchableOpacity style={s.primaryBtn} onPress={goRegister} activeOpacity={0.85}>
          <Ionicons name="person-add-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={s.primaryBtnText}>Create a free account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondaryBtn} onPress={goLogin} activeOpacity={0.85}>
          <Text style={s.secondaryBtnText}>I already have an account</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} hitSlop={12} style={{ marginTop: 4 }}>
          <Text style={s.dismiss}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const TEAL = '#0F766E';

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    borderRadius: 30,
    paddingVertical: 15,
    width: '100%',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 30,
    paddingVertical: 14,
    width: '100%',
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtnText: {
    color: TEAL,
    fontSize: 15,
    fontWeight: '600',
  },
  dismiss: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
});
