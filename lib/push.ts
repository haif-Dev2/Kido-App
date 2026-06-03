import { supabase } from './supabase';

export async function sendPushToUser(
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: { user_id: userId, title, message, data: data ?? {} },
    });
  } catch (e) {
    console.warn('[push] sendPushToUser error:', e);
  }
}