
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Pressable, Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { haptics } from '../../lib/haptics';
import { READING_MAX_WIDTH, useResponsive } from '../../lib/responsive';
import { colors, fonts, radius } from '../../theme/colors';

type Params = {
  bookingCode?: string;
  sitterName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  total?: string;
  service?: string;
};

export default function BookingSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  // Checkmark pop animation
  const checkScale = useSharedValue(0);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  // Confetti dots
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1.value, transform: [{ scale: dot1.value }] }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2.value, transform: [{ scale: dot2.value }] }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3.value, transform: [{ scale: dot3.value }] }));

  useEffect(() => {
    haptics.success();
    checkScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 260 }));
    dot1.value = withDelay(400, withSequence(withSpring(1), withDelay(800, withTiming(0))));
    dot2.value = withDelay(500, withSequence(withSpring(1), withDelay(700, withTiming(0))));
    dot3.value = withDelay(600, withSequence(withSpring(1), withDelay(600, withTiming(0))));
  }, []);

  const handleShare = async () => {
    haptics.light();
    try {
      await Share.share({
        message: `My babysitting session is booked! 🎉\nSitter: ${params.sitterName}\nDate: ${params.date} · ${params.startTime}–${params.endTime}\nBooking: ${params.bookingCode}`,
      });
    } catch {}
  };

  const dateLabel = (() => {
    if (!params.date) return '—';
    try {
      const d = new Date(params.date);
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } catch { return params.date; }
  })();

  return (
    <View style={[styles.root, { alignItems: 'center' }]}>
      <LinearGradient
        colors={['#E8F5F0', '#FAF7F2', '#FAF7F2']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: contentMaxWidth }}>
        <View style={styles.inner}>

          {/* ── Hero checkmark ── */}
          <View style={styles.heroArea}>
            {/* Confetti dots */}
            <Animated.View style={[styles.confettiDot, styles.dot1, dot1Style]} />
            <Animated.View style={[styles.confettiDot, styles.dot2, dot2Style]} />
            <Animated.View style={[styles.confettiDot, styles.dot3, dot3Style]} />

            <Animated.View style={[styles.checkCircle, checkStyle]}>
              <LinearGradient
                colors={[colors.primary, '#0F6E56']}
                style={styles.checkGradient}
              >
                <Ionicons name="checkmark" size={52} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* ── Title ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.titleArea}>
            <Text style={styles.titleMain}>Booking confirmed!</Text>
            <Text style={styles.titleSub}>
              {params.sitterName ?? 'Your sitter'} will be notified immediately.
            </Text>
          </Animated.View>

          {/* ── Booking code pill ── */}
          <Animated.View entering={FadeIn.duration(350).delay(450)} style={styles.codePill}>
            <Text style={styles.codeLabel}>BOOKING CODE</Text>
            <Text style={styles.codeValue}>{params.bookingCode ?? '——'}</Text>
          </Animated.View>

          {/* ── Detail card ── */}
          <Animated.View entering={FadeInDown.duration(380).delay(520)} style={styles.detailCard}>
            <DetailRow icon="person-circle-outline" label="Sitter" value={params.sitterName ?? '—'} />
            <View style={styles.divider} />
            <DetailRow icon="calendar-outline" label="Date" value={dateLabel} />
            <View style={styles.divider} />
            <DetailRow
              icon="time-outline"
              label="Time"
              value={`${params.startTime ?? '—'} – ${params.endTime ?? '—'}`}
            />
            {params.service ? (
              <>
                <View style={styles.divider} />
                <DetailRow icon="heart-circle-outline" label="Service" value={params.service} />
              </>
            ) : null}
            <View style={styles.divider} />
            <DetailRow icon="card-outline" label="Total" value={`${params.total ?? '0'} DZD`} highlight />
          </Animated.View>

          {/* ── What happens next ── */}
          <Animated.View entering={FadeInDown.duration(360).delay(600)} style={styles.nextCard}>
            <Text style={styles.nextTitle}>What happens next?</Text>
            <NextStep icon="notifications-outline" text="The sitter gets an instant notification" />
            <NextStep icon="chatbubble-outline" text="She can message you if she has questions" />
            <NextStep icon="shield-checkmark-outline" text="You'll get a reminder 1 hour before" />
          </Animated.View>

          {/* ── Actions ── */}
          <Animated.View entering={FadeInUp.duration(360).delay(680)} style={styles.actions}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => { haptics.tap(); router.replace('/(tabs)/bookings'); }}
              accessibilityRole="button"
            >
              <Ionicons name="calendar" size={18} color="#fff" />
              <Text style={styles.primaryBtnTxt}>View my bookings</Text>
            </Pressable>

            <View style={styles.secondaryRow}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={handleShare}
                accessibilityRole="button"
              >
                <Ionicons name="share-outline" size={16} color={colors.primary} />
                <Text style={styles.secondaryBtnTxt}>Share</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryBtn}
                onPress={() => { haptics.tap(); router.replace('/(tabs)/search'); }}
                accessibilityRole="button"
              >
                <Ionicons name="search-outline" size={16} color={colors.primary} />
                <Text style={styles.secondaryBtnTxt}>Browse sitters</Text>
              </Pressable>
            </View>
          </Animated.View>

        </View>
      </SafeAreaView>
    </View>
  );
}

/* ── Sub-components ── */

function DetailRow({
  icon, label, value, highlight = false,
}: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>{value}</Text>
      </View>
    </View>
  );
}

function NextStep({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.nextStep}>
      <View style={styles.nextIcon}>
        <Ionicons name={icon as any} size={15} color={colors.primary} />
      </View>
      <Text style={styles.nextText}>{text}</Text>
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF7F2' },
  inner: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Hero
  heroArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 24,
    height: 160,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  checkGradient: {
    flex: 1,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dot1: { backgroundColor: colors.accent, top: 20, right: 60 },
  dot2: { backgroundColor: '#3DD68C', top: 40, left: 50 },
  dot3: { backgroundColor: '#5A8FFF', bottom: 30, right: 40 },

  // Title
  titleArea: { alignItems: 'center', marginBottom: 20 },
  titleMain: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    color: colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  titleSub: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },

  // Code pill
  codePill: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.xxl,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  codeLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  codeValue: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: '#fff',
    letterSpacing: 2,
  },

  // Detail card
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  detailIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E8F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: fonts.sansMed,
    fontSize: 14,
    color: colors.text,
  },
  detailValueHighlight: {
    fontFamily: fonts.serifBold,
    fontSize: 16,
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginLeft: 62,
  },

  // Next steps
  nextCard: {
    backgroundColor: '#F0FAF5',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#C8EDD9',
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  nextTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(10,88,71,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontFamily: fonts.sansMed,
    fontSize: 13,
    color: '#1A4A3A',
    flex: 1,
  },

  // Actions
  actions: { gap: 10 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryBtnTxt: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#fff',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  secondaryBtnTxt: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.primary,
  },
});
