import '../global.css';

import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInter,
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts as usePlusJakarta,
} from '@expo-google-fonts/plus-jakarta-sans';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MAX_CONTENT_WIDTH } from '../lib/responsive';
import { AuthProvider } from '../providers/auth-provider';

const isWeb = Platform.OS === 'web';

export default function RootLayout() {
  // Patch the document <head> on web so the app respects the iOS safe-area
  // insets (notch/Dynamic Island), supports Android keyboard resizing, and
  // sets a proper theme color.
  useWebHeadPatch();

  // Load fonts in the background. We do NOT block rendering on them — the
  // app uses fallback system fonts until the custom ones swap in.
  usePlusJakarta({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  useFraunces({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  const appTree = (
    <SafeAreaProvider>
      <AuthProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FAFAF7' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="splash" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="login" options={{ gestureEnabled: false }} />
            <Stack.Screen name="register" />
            <Stack.Screen name="register-step1" />
            <Stack.Screen name="register-otp" />
            <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="sitter/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="booking/new/[sitterId]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="booking/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="video-call/[bookingId]" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="review/new/[bookingId]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="sitter-home" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="(sitter-tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
          </Stack>
        </BottomSheetModalProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {isWeb ? <WebShell>{appTree}</WebShell> : appTree}
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

/**
 * Responsive web wrapper.
 *
 *   < 1024px (phones, small tablets)  → full-width edge-to-edge (no frame).
 *   ≥ 1024px (laptops, desktops)     → app stretches edge-to-edge inside a
 *                                       centered card capped at MAX_CONTENT_WIDTH,
 *                                       on a warm teal backdrop.
 *
 * Phones and tablets keep the mobile UX (edge-to-edge). On desktop the app
 * gets the full available width up to MAX_CONTENT_WIDTH so the responsive
 * grids (1/2/3 columns) actually breathe instead of being crushed inside
 * a 430-px phone frame.
 */
function WebShell({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;

  if (!isDesktop) {
    return <View style={webStyles.fullScreen}>{children}</View>;
  }

  return (
    <View style={webStyles.desktopBg}>
      <View style={webStyles.bgLayer} />
      <View style={webStyles.bgCircle1} />
      <View style={webStyles.bgCircle2} />
      <View style={webStyles.bgCircle3} />

      <View style={[webStyles.appCard, { maxHeight: height - 32 }]}>
        {children}
      </View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  desktopBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D4F4F',
    overflow: 'hidden',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    // Teal gradient via layered semi-transparent views
    backgroundColor: '#0A7373',
    opacity: 0.6,
  },
  bgCircle1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -80,
    left: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -60,
    right: -80,
  },
  bgCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: '40%' as any,
    right: '15%' as any,
  },
  appCard: {
    width: '96%' as any,
    maxWidth: MAX_CONTENT_WIDTH,
    flex: 1,
    backgroundColor: '#FAFAF7',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 48,
    elevation: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginVertical: 16,
  },
});

/**
 * Runs once at mount (web only) to patch the document <head> with the
 * viewport / PWA meta tags that enable:
 *   • `env(safe-area-inset-*)` on iOS via `viewport-fit=cover`.
 *   • Android-keyboard-aware layouts via `interactive-widget=resizes-content`.
 *   • Edge-to-edge status-bar tinting on standalone web apps.
 */
function useWebHeadPatch() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return; // SSR-safe guard

    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMeta(
      'viewport',
      'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
    );
    setMeta('theme-color', '#067A6F');
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('mobile-web-app-capable', 'yes');
    setMeta('format-detection', 'telephone=no');
  }, []);
}