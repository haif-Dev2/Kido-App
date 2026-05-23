import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Thin wrapper over expo-haptics that no-ops on web and swallows errors
 * (older Android without vibrate permission throws).
 */
export const haptics = {
  tap: () => fire(() => Haptics.selectionAsync()),
  light: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

function fire(fn: () => Promise<unknown>) {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
}
