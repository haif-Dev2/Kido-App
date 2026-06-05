import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushToken(): Promise<void> {
  try {
    // Ask permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return; // user denied

    // Get the Expo push token
    let tokenData;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '291c7299-9916-4044-bb8c-e034b6787bf1', // your EAS project ID from app.json
      });
    } catch {
      return; // Firebase not configured — skip silently
    }

    const token = tokenData.data;
    const platform = Platform.OS; // 'android' or 'ios'

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save token to Supabase — upsert so no duplicates
    await supabase.from('push_tokens').upsert(
      { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id, token' }
    );
  } catch (e) {
    console.warn('[push] registerPushToken error:', e);
  }
}