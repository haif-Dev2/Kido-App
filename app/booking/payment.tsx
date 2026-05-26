// app/booking/payment.tsx
// Mock payment screen inserted between confirm and success.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../../theme/colors';
import { haptics } from '../../lib/haptics';
import { READING_MAX_WIDTH, useResponsive } from '../../lib/responsive';

type Method = 'card' | 'cash' | 'ccp';

type Params = {
  sitterId?: string;
  sitterName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  service?: string;
  children?: string;
  notes?: string;
  shareLocation?: string;
  total?: string;
  bookingCode?: string;
};

const METHODS: { id: Method; icon: string; label: string; sub: string }[] = [
  { id: 'card',  icon: 'card-outline',       label: 'Credit / Debit card', sub: 'Visa, Mastercard, CIB' },
  { id: 'cash',  icon: 'cash-outline',        label: 'Pay in cash',         sub: 'Pay the sitter directly' },
  { id: 'ccp',   icon: 'business-outline',    label: 'CCP / Baridi Pay',    sub: 'Algerian postal payment' },
];

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  const total = Number(params.total) || 0;
  const [method, setMethod] = useState<Method>('cash');
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [processing, setProcessing] = useState(false);

  const formatCardNum = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handlePay = async () => {
    haptics.medium();
    setProcessing(true);
    // Simulate payment processing
    await new Promise(res => setTimeout(res, 1800));
    haptics.success();
    setProcessing(false);
    router.replace({
      pathname: '/booking/success' as any,
      params: {
        bookingCode: params.bookingCode ?? `KIDO-${Math.floor(100000 + Math.random() * 900000)}`,
        sitterName: params.sitterName,
        date: params.date,
        startTime: params.startTime,
        endTime: params.endTime,
        service: params.service,
        total: params.total,
      },
    });
  };

  return (
    <View style={[styles.root, { alignItems: 'center' }]}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']} style={[styles.headerWrap, { width: '100%', alignItems: 'center' }]}>
        <View style={[styles.header, { width: '100%', maxWidth: contentMaxWidth }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ width: '100%', maxWidth: contentMaxWidth }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Amount due */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.amountCard}>
          <Text style={styles.amountLabel}>AMOUNT DUE</Text>
          <Text style={styles.amountValue}>{total.toLocaleString()} <Text style={styles.amountCur}>DZD</Text></Text>
          <Text style={styles.amountSitter}>for {params.sitterName ?? 'your sitter'}</Text>
        </Animated.View>

        {/* Method selector */}
        <Animated.View entering={FadeInDown.duration(350).delay(60)}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          <View style={styles.methodList}>
            {METHODS.map(m => (
              <Pressable
                key={m.id}
                style={[styles.methodCard, method === m.id && styles.methodCardActive]}
                onPress={() => { haptics.tap(); setMethod(m.id); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: method === m.id }}
              >
                <View style={[styles.methodIcon, method === m.id && styles.methodIconActive]}>
                  <Ionicons name={m.icon as any} size={20} color={method === m.id ? '#fff' : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, method === m.id && styles.methodLabelActive]}>{m.label}</Text>
                  <Text style={styles.methodSub}>{m.sub}</Text>
                </View>
                <View style={[styles.radioOuter, method === m.id && styles.radioOuterActive]}>
                  {method === m.id && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Card form */}
        {method === 'card' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.cardForm}>
            <Text style={styles.sectionTitle}>Card details</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Card number</Text>
              <View style={styles.fieldBox}>
                <Ionicons name="card-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.fieldInput}
                  value={cardNum}
                  onChangeText={v => setCardNum(formatCardNum(v))}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={19}
                />
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Cardholder name</Text>
              <View style={styles.fieldBox}>
                <TextInput
                  style={styles.fieldInput}
                  value={cardName}
                  onChangeText={setCardName}
                  placeholder="Name on card"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.fieldWrap, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Expiry</Text>
                <View style={styles.fieldBox}>
                  <TextInput
                    style={styles.fieldInput}
                    value={expiry}
                    onChangeText={v => setExpiry(formatExpiry(v))}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
              <View style={[styles.fieldWrap, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>CVV</Text>
                <View style={styles.fieldBox}>
                  <TextInput
                    style={styles.fieldInput}
                    value={cvv}
                    onChangeText={v => setCvv(v.replace(/\D/g, '').slice(0, 3))}
                    placeholder="123"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={3}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* CCP info */}
        {method === 'ccp' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.ccpCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.ccpText}>
              After confirming, you will receive a CCP transfer reference number. Complete the payment at any Algérie Poste branch within 24 hours.
            </Text>
          </Animated.View>
        )}

        {/* Cash info */}
        {method === 'cash' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.ccpCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.ccpText}>
              Pay the sitter in cash at the start of the session. Please have the exact amount ready.
            </Text>
          </Animated.View>
        )}

        {/* Security badge */}
        <Animated.View entering={FadeInDown.duration(300).delay(120)} style={styles.securityBadge}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
          <Text style={styles.securityText}>Your payment is encrypted and secure</Text>
        </Animated.View>

      </ScrollView>

      {/* Pay button */}
      <SafeAreaView edges={['bottom']} style={[styles.bottomWrap, { alignItems: 'center' }]}>
        <Animated.View entering={FadeInUp.duration(350).delay(200)} style={[styles.bottomBar, { width: '100%', maxWidth: contentMaxWidth }]}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{total.toLocaleString()} <Text style={{ fontSize: 13, color: colors.textMuted }}>DZD</Text></Text>
          </View>
          <Pressable
            style={[styles.payBtn, processing && { opacity: 0.7 }]}
            onPress={handlePay}
            disabled={processing}
            accessibilityRole="button"
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={16} color="#fff" />
                <Text style={styles.payBtnTxt}>
                  {method === 'cash' ? 'Confirm booking' : method === 'ccp' ? 'Get reference' : 'Pay now'}
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6F8' },

  headerWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.text },

  scroll: { padding: 20, paddingBottom: 120, gap: 20 },

  amountCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
  },
  amountLabel: { fontFamily: fonts.sansBold, fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, marginBottom: 8 },
  amountValue: { fontFamily: fonts.serifBold, fontSize: 40, color: '#fff', letterSpacing: -1 },
  amountCur: { fontFamily: fonts.sansMed, fontSize: 16, color: 'rgba(255,255,255,0.75)' },
  amountSitter: { fontFamily: fonts.sansMed, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 },

  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  methodList: { gap: 10 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: 14,
  },
  methodCardActive: { borderColor: colors.primary, backgroundColor: '#EBF5F3' },
  methodIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#E8F5F0', alignItems: 'center', justifyContent: 'center',
  },
  methodIconActive: { backgroundColor: colors.primary },
  methodLabel: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.text },
  methodLabelActive: { color: colors.primary },
  methodSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  cardForm: { gap: 14 },
  fieldWrap: {},
  fieldLabel: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  fieldBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, height: 48,
  },
  fieldInput: { flex: 1, fontFamily: fonts.sansMed, fontSize: 15, color: colors.text },

  ccpCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#E8F5F0', borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#B6DDD4',
    padding: 14,
  },
  ccpText: { flex: 1, fontFamily: fonts.sansMed, fontSize: 13, color: '#1A4A3A', lineHeight: 19 },

  securityBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  securityText: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.textMuted },

  bottomWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, gap: 14,
  },
  totalLabel: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase' },
  totalValue: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.primary, letterSpacing: -0.5 },
  payBtn: {
    flex: 1, backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  payBtnTxt: { fontFamily: fonts.sansBold, fontSize: 15, color: '#fff' },
});
