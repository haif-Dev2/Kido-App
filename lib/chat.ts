// lib/chat.ts — chat helpers backed by Supabase + realtime.
//
// A "partnerKey" is the stable identifier for the other side of the chat.
// • While sitters are mock data → use `sitter-<id>` (e.g. "sitter-5").
// • Later, when sitters are real accounts → use the sitter user's UUID.
//
// This keeps today's UI working AND lets the data survive the migration later.

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type ChatMessage = {
  id: number;
  sender_id: string;        // uuid of the sender
  partner_key: string;      // "sitter-<id>" or uuid of the other user
  text: string;
  read_at: string | null;
  created_at: string;
};

/** Build the partner key for a mock sitter id. */
export function sitterPartnerKey(sitterId: number | string): string {
  return `sitter-${sitterId}`;
}

/**
 * Fetch the messages exchanged between the current user and `partnerKey`,
 * ordered oldest → newest (ready to render in a reversed FlatList).
 */
export async function fetchConversation(partnerKey: string): Promise<ChatMessage[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];

  // Two directions:
  //  • I sent → partner_key = partnerKey
  //  • Partner sent → sender's partner_key equals my uuid AND partner_key = partnerKey
  //    (i.e. they addressed their message to me)
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      [
        `and(sender_id.eq.${userId},partner_key.eq.${partnerKey})`,
        `and(sender_id.eq.${partnerKey.replace(/^sitter-/, '')},partner_key.eq.${userId})`,
      ].join(','),
    )
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    console.warn('[chat] fetchConversation error:', error.message);
    return [];
  }
  return (data ?? []) as ChatMessage[];
}

/** Send a text message to the partner. Returns the inserted row. */
export async function sendMessage(partnerKey: string, text: string): Promise<ChatMessage | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: userId,
      partner_key: partnerKey,
      text: trimmed.slice(0, 2000),
    })
    .select()
    .single();

  if (error) {
    console.warn('[chat] sendMessage error:', error.message);
    return null;
  }
  return data as ChatMessage;
}

/** Mark unread messages in this conversation as read. */
export async function markAsRead(partnerKey: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;

  // A message is "to me" when its partner_key matches my uuid (the sender addressed
  // it to my uuid). If the partnerKey is "sitter-N" we can't really mark replies
  // from a mock sitter as read (no such row exists), so this is a no-op for mocks.
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
    .eq('partner_key', userId);
  if (error) console.warn('[chat] markAsRead error:', error.message);
}

/**
 * Subscribe to new messages in this conversation in realtime.
 * Returns the channel so caller can `.unsubscribe()` in cleanup.
 */
export function subscribeToConversation(
  partnerKey: string,
  onInsert: (msg: ChatMessage) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`chat:${partnerKey}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const msg = payload.new as ChatMessage;
        // Only forward messages relevant to this conversation
        const relevant =
          msg.partner_key === partnerKey ||
          msg.sender_id === partnerKey.replace(/^sitter-/, '') ||
          // Message from the other real user addressed to me for this partner
          (partnerKey.startsWith('sitter-')
            ? msg.partner_key.startsWith('sitter-') && msg.partner_key === partnerKey
            : false);
        if (relevant) onInsert(msg);
      },
    )
    .subscribe();
  return channel;
}
