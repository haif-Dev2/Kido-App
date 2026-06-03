// app/chat/[sitterId].tsx
// Real-looking chat screen between parent and sitter (bidirectional).
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../../lib/haptics';
import { MOCK_SITTERS } from '../../lib/mock/sitters';
import { READING_MAX_WIDTH, useResponsive } from '../../lib/responsive';
import { colors, fonts, radius } from '../../theme/colors';

type Message = {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
};

const now = new Date();
const fmt = (offset: number) => {
  const d = new Date(now.getTime() - offset * 60000);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const INITIAL_MESSAGES: Message[] = [
  { id: '1', text: 'Hello! I saw your booking request for tomorrow. I can confirm I am available 😊', fromMe: false, time: fmt(32) },
  { id: '2', text: 'Great! My two kids are 3 and 5 years old. Any questions about their routine?', fromMe: true, time: fmt(30), status: 'read' },
  { id: '3', text: 'Perfect ages! Do they have any allergies I should know about?', fromMe: false, time: fmt(28) },
  { id: '4', text: 'Yes, my youngest is allergic to peanuts. I will leave an EpiPen at home just in case 🙏', fromMe: true, time: fmt(25), status: 'read' },
  { id: '5', text: 'Understood, I will be very careful. I have first aid training so no worries!', fromMe: false, time: fmt(22) },
  { id: '6', text: 'That is reassuring, thank you! See you tomorrow at 9am then?', fromMe: true, time: fmt(10), status: 'delivered' },
  { id: '7', text: 'Perfect, see you at 9! 👋', fromMe: false, time: fmt(8) },
];

const QUICK_REPLIES = [
  'Thank you! 😊',
  'What time exactly?',
  'Sounds good!',
  'I have a question',
];

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPhone } = useResponsive();
  const contentMaxWidth = isPhone ? undefined : READING_MAX_WIDTH;

  const { sitterId, sitterName, sitterAvatar, bookingId } = useLocalSearchParams<{
    sitterId: string;
    sitterName?: string;
    sitterAvatar?: string;
    bookingId?: string;
  }>();

  // Works for both directions: sitterId can be a mock sitter id OR a parent UUID
  const mockSitter = MOCK_SITTERS.find(s => String(s.id) === String(sitterId));
  const displayName = sitterName ?? (mockSitter ? `${mockSitter.firstName} ${mockSitter.lastName}` : 'Parent');
  const avatarUri = sitterAvatar || mockSitter?.photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100';

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    haptics.light();
    const newMsg: Message = {
      id: String(Date.now()),
      text: trimmed,
      fromMe: true,
      time: fmt(0),
      status: 'sent',
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    // Simulate reply
    setTimeout(() => {
      const replies = [
        'Of course! Let me check.',
        'That works perfectly for me.',
        'Great, see you then! 😊',
        'Sure, no problem at all.',
        'Thanks for letting me know!',
      ];
      const reply: Message = {
        id: String(Date.now() + 1),
        text: replies[Math.floor(Math.random() * replies.length)],
        fromMe: false,
        time: fmt(0),
      };
      setMessages(prev => [...prev, reply]);
      haptics.tap();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1800);
  }, []);

  return (
    <View style={[styles.root, { alignItems: 'center' }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={[styles.headerWrap, { width: '100%', alignItems: 'center' }]}>
        <View style={[styles.header, { width: '100%', maxWidth: contentMaxWidth }]}>
          <Pressable
            style={styles.backBtn}
            onPress={() => { haptics.tap(); router.back(); }}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.headerName}>{displayName}</Text>
              <Text style={styles.headerStatus}>🟢 Online now</Text>
            </View>
          </View>

          {/* Audio call */}
          <Pressable
            style={styles.callBtn}
            onPress={() => {
              haptics.light();
              const phone = mockSitter?.phone;
              if (!phone) {
                Alert.alert('Not available', 'No phone number on file.');
                return;
              }
              Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() =>
                Alert.alert('Cannot call', 'Your device could not open the phone app.')
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Call"
            hitSlop={8}
          >
            <Ionicons name="call-outline" size={20} color={colors.primary} />
          </Pressable>

          {/* Video call */}
          <Pressable
            style={[styles.callBtn, { marginLeft: 8 }]}
            onPress={() => {
              haptics.light();
              router.push({
                pathname: '/video-call/[bookingId]' as any,
                params: { bookingId: bookingId ?? sitterId },
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="Video call"
            hitSlop={8}
          >
            <Ionicons name="videocam-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%', maxWidth: contentMaxWidth }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.messageList, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => (
            <Animated.View entering={index >= INITIAL_MESSAGES.length - 1 ? FadeInUp.duration(250) : undefined}>
              <MessageBubble message={item} />
            </Animated.View>
          )}
          ListHeaderComponent={<DayDivider label="Today" />}
        />

        {/* Quick replies */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.quickRepliesWrap}>
          <FlatList
            horizontal
            data={QUICK_REPLIES}
            keyExtractor={item => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickReplies}
            renderItem={({ item }) => (
              <Pressable
                style={styles.quickChip}
                onPress={() => sendMessage(item)}
                accessibilityRole="button"
              >
                <Text style={styles.quickChipTxt}>{item}</Text>
              </Pressable>
            )}
          />
        </Animated.View>

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
          ]}
        >
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <Pressable
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── Sub-components ── */

function MessageBubble({ message }: { message: Message }) {
  const { fromMe, text, time, status } = message;
  return (
    <View style={[styles.bubbleRow, fromMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
      <View style={[styles.bubble, fromMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {text}
        </Text>
      </View>
      <View style={[styles.bubbleMeta, fromMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
        <Text style={styles.bubbleTime}>{time}</Text>
        {fromMe && status && (
          <Ionicons
            name={status === 'read' ? 'checkmark-done' : status === 'delivered' ? 'checkmark-done-outline' : 'checkmark-outline'}
            size={12}
            color={status === 'read' ? colors.primary : colors.textMuted}
          />
        )}
      </View>
    </View>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <View style={styles.dayDivider}>
      <View style={styles.dayLine} />
      <Text style={styles.dayLabel}>{label}</Text>
      <View style={styles.dayLine} />
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F3EE' },

  headerWrap: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2, borderColor: colors.card,
  },
  headerName: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.text,
  },
  headerStatus: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: '#22C55E',
    marginTop: 1,
  },
  callBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F5F0',
    borderRadius: 20,
  },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  bubbleRow: {
    marginVertical: 3,
  },
  bubbleRowMe: { alignItems: 'flex-end' },
  bubbleRowThem: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  bubbleTextMe: {
    fontFamily: fonts.sansMed,
    color: '#fff',
  },
  bubbleTextThem: {
    fontFamily: fonts.sansMed,
    color: colors.text,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    marginHorizontal: 4,
  },
  bubbleTime: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
  },

  dayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dayLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },

  // Quick replies
  quickRepliesWrap: {
    backgroundColor: '#F5F3EE',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  quickReplies: {
    paddingHorizontal: 14,
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipTxt: {
    fontFamily: fonts.sansMed,
    fontSize: 13,
    color: colors.text,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F3EE',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.sansMed,
    fontSize: 14,
    color: colors.text,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: colors.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
});