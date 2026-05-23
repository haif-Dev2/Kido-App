import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Platform, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { CustomButton } from '../components/ui/CustomButton';
import { useRegistrationStore } from '../store/registration-store';

type Role = 'parent' | 'babysitter' | null;

const TEAL = Colors.light.primary;

export default function RegisterRoleScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const parentScale = useRef(new Animated.Value(1)).current;
  const babysitterScale = useRef(new Animated.Value(1)).current;

  const animatePress = (role: Role) => {
    const anim = role === 'parent' ? parentScale : babysitterScale;
    Animated.sequence([
      Animated.spring(anim, { toValue: 0.97, useNativeDriver: true, speed: 60 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      useRegistrationStore.getState().setRole(selectedRole === 'parent' ? 'PARENT' : 'BABY_SITTER');
      router.push('/register-step1');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.column}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandName}>Kido</Text>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.title}>I am a...</Text>
          <Text style={styles.subtitle}>Choose your role to get started</Text>

          {/* Parent Card */}
          <Animated.View style={{ transform: [{ scale: parentScale }] }}>
            <TouchableOpacity
              style={[
                styles.card,
                selectedRole === 'parent' && styles.cardActive,
              ]}
              activeOpacity={0.88}
              onPress={() => animatePress('parent')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#E6F4F2' }]}>
                <Text style={styles.emoji}>👨‍👩‍👧</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Parent</Text>
                <Text style={styles.cardDesc}>
                  I&apos;m looking for a reliable babysitter for my child
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Babysitter Card */}
          <Animated.View style={{ transform: [{ scale: babysitterScale }] }}>
            <TouchableOpacity
              style={[
                styles.card,
                selectedRole === 'babysitter' && styles.cardActive,
              ]}
              activeOpacity={0.88}
              onPress={() => animatePress('babysitter')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FDE8F3' }]}>
                <Text style={styles.emoji}>👶</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Babysitter</Text>
                <Text style={styles.cardDesc}>
                  I want to offer childcare services to families near me
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <CustomButton
            title="Continue"
            variant={selectedRole ? 'primary' : 'secondary'}
            onPress={handleContinue}
            disabled={!selectedRole}
          />
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <TouchableOpacity
            style={styles.visitorBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)')}
          >
            <Ionicons name="eye-outline" size={17} color="#6B7280" style={{ marginRight: 7 }} />
            <Text style={styles.visitorText}>Browse as Visitor</Text>
          </TouchableOpacity>
          <Text style={styles.visitorNote}>Explore babysitters without signing up</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 12,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: TEAL,
    letterSpacing: 0.2,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 28,
    fontWeight: '500',
  },

  // Cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#EDEEF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardActive: {
    borderColor: TEAL,
    borderWidth: 2,
    shadowColor: TEAL,
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emoji: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    fontWeight: '500',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F1F5',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  visitorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  visitorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  visitorNote: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '500',
  },
});
