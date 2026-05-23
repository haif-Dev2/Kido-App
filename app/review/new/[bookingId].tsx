import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { X, Star, Heart } from 'lucide-react-native';

import { Button, IconButton } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Chip } from '../../../components/ui/Chip';
import { haptics } from '../../../lib/haptics';
import { MOCK_BOOKINGS } from '../../../lib/mock/bookings';
import { MOCK_SITTERS } from '../../../lib/mock/sitters';
import { supabase } from '../../../lib/supabase';
import { READING_MAX_WIDTH, useResponsive } from '../../../lib/responsive';

const STAR_LABELS = ['', 'Not great', 'Okay', 'Good', 'Great', 'Amazing'];

const QUICK_TAGS = [
  'Punctual', 'Warm with kids', 'Clean', 'Great communication',
  'Creative', 'Calm', 'Kept me updated', 'Went the extra mile',
];

export default function LeaveReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  const booking = useMemo(
    () => MOCK_BOOKINGS.find(b => String(b.id) === String(bookingId)) ?? MOCK_BOOKINGS[0],
    [bookingId],
  );
  const sitter = useMemo(
    () => MOCK_SITTERS.find(s => s.id === booking.sitterId) ?? MOCK_SITTERS[0],
    [booking.sitterId],
  );

  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (t: string) => {
    haptics.tap();
    setTags(cur => cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]);
  };

  const canSubmit = rating > 0;

  const submit = async () => {
    if (!canSubmit) return;
    haptics.success();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('reviews').insert({
          booking_id: String(booking.id),
          parent_id: user.id,
          babysitter_id: String(sitter.id),
          rating,
          comment: comment.trim() || null,
          tags,
        });
        if (error) console.warn('[review] save:', error.message);
      }
    } catch (e) {
      console.warn('[review] error:', e);
    }
    setSubmitted(true);
    setTimeout(() => router.back(), 1800);
  };

  if (submitted) return <ThankYou sitterName={sitter.firstName} />;

  return (
    <View className="flex-1 bg-surface-1 items-center" style={{ paddingTop: insets.top }}>
      {/* Top bar — caps width on tablet+ to align with the body content. */}
      <View
        className="flex-row items-center justify-between px-4 py-3"
        style={{ width: '100%', maxWidth: contentMaxWidth }}
      >
        <IconButton icon={X} label="Close" variant="ghost" size={44} onPress={() => router.back()} />
        <Text className="text-body-sm font-body-bold text-text-secondary">Leave review</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ width: '100%', maxWidth: contentMaxWidth }}
        contentContainerStyle={{ paddingBottom: 160, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sitter card */}
        <Animated.View entering={FadeIn.duration(320)} className="items-center px-5">
          <Avatar uri={sitter.photo} name={`${sitter.firstName} ${sitter.lastName}`} size={88} verified={sitter.identityVerified} />
          <Text className="text-title-lg font-display-bold text-text-primary mt-4">
            How was {sitter.firstName}?
          </Text>
          <Text className="text-body-lg font-body text-text-secondary text-center mt-1 max-w-[280px]">
            Your review helps other families pick the right sitter.
          </Text>
        </Animated.View>

        {/* Stars */}
        <Animated.View entering={FadeInDown.duration(320).delay(80)} className="items-center mt-7">
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <RatingStar key={n} index={n} selected={rating >= n} onPress={() => { haptics.light(); setRating(n); }} />
            ))}
          </View>
          <View style={{ height: 20, marginTop: 10 }}>
            {rating > 0 ? (
              <Animated.Text entering={FadeIn.duration(200)} className="text-body-lg font-body-bold text-primary">
                {STAR_LABELS[rating]}
              </Animated.Text>
            ) : (
              <Text className="text-body-sm font-body text-text-muted">Tap a star to rate</Text>
            )}
          </View>
        </Animated.View>

        {/* Quick tags */}
        {rating >= 4 ? (
          <Animated.View entering={FadeInDown.duration(320)} className="px-5 mt-6">
            <Text className="text-overline text-text-secondary font-body-bold mb-3">WHAT STOOD OUT?</Text>
            <View className="flex-row flex-wrap gap-2">
              {QUICK_TAGS.map(t => (
                <Chip key={t} label={t} selected={tags.includes(t)} onPress={() => toggleTag(t)} />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* Comment */}
        <Animated.View entering={FadeInDown.duration(320).delay(120)} className="px-5 mt-6">
          <Text className="text-overline text-text-secondary font-body-bold mb-2">YOUR STORY (OPTIONAL)</Text>
          <View className="bg-surface-2 border border-border rounded-lg p-3">
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={`Share a sentence about your time with ${sitter.firstName}…`}
              placeholderTextColor="#9E9C92"
              multiline
              numberOfLines={5}
              maxLength={500}
              style={{
                minHeight: 120, textAlignVertical: 'top',
                fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24, color: '#141413',
              }}
              accessibilityLabel="Review comment"
            />
          </View>
          <Text className="text-caption text-text-muted text-right mt-1" style={{ fontVariant: ['tabular-nums'] }}>
            {comment.length}/500
          </Text>
        </Animated.View>
      </ScrollView>

      {/* CTA — outer is full-width (divider line); inner caps content. */}
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: 'rgba(250,250,247,0.96)',
          borderTopWidth: 0.5, borderTopColor: '#EAE7DE',
          alignItems: 'center',
        }}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, paddingHorizontal: 16 }}>
          <Button
            label="Submit review"
            variant="primary"
            size="lg"
            disabled={!canSubmit}
            hapticFeedback="success"
            onPress={() => { Keyboard.dismiss(); submit(); }}
            rightIcon={Heart}
          />
        </View>
      </View>
    </View>
  );
}

function RatingStar({ index, selected, onPress }: { index: number; selected: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={() => {
        scale.value = withSpring(1.25, { damping: 8, stiffness: 320 }, () => {
          scale.value = withSpring(1);
        });
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${index} star${index > 1 ? 's' : ''}`}
      accessibilityState={{ selected }}
      hitSlop={8}
    >
      <Animated.View style={animated}>
        <Star
          size={44}
          color={selected ? '#F5A524' : '#D6D2C5'}
          fill={selected ? '#F5A524' : 'transparent'}
          strokeWidth={1.8}
        />
      </Animated.View>
    </Pressable>
  );
}

function ThankYou({ sitterName }: { sitterName: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-surface-1 px-8">
      <Animated.View
        entering={FadeInDown.duration(420)}
        className="w-24 h-24 rounded-full bg-accent-soft items-center justify-center mb-6"
      >
        <Heart size={36} color="#F97362" fill="#F97362" strokeWidth={2} />
      </Animated.View>
      <Animated.Text entering={FadeInDown.duration(420).delay(80)} className="text-display font-display-bold text-text-primary text-center">
        Thank you
      </Animated.Text>
      <Animated.Text entering={FadeInDown.duration(420).delay(140)} className="text-body-lg font-body text-text-secondary text-center mt-2 max-w-[300px]">
        Your review helps other families find {sitterName} with confidence.
      </Animated.Text>
    </View>
  );
}
