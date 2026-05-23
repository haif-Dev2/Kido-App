/**
 * Kido Design Tokens
 *
 * Single source of truth for brand and semantic values.
 * NativeWind classes in `tailwind.config.js` mirror these tokens for ergonomic styling.
 * Use these constants for values that can't be expressed in Tailwind (shadows, animations, etc).
 */

import type { ViewStyle } from 'react-native';

/* ──────────────────────────────── palette ──────────────────────────────── */

export const palette = {
  teal: {
    50: '#E8F5F3', 100: '#C6E6E0', 200: '#8FCDC1',
    500: '#067A6F', 600: '#045E55', 700: '#034840',
  },
  coral: {
    50: '#FFF1EE', 100: '#FFD9D0',
    500: '#F97362', 600: '#E05A4A',
  },
  saffron: { 50: '#FEF6E7', 500: '#F5A524' },
  success: { 50: '#ECFDF5', 500: '#10B981', 600: '#059669' },
  warning: { 50: '#FFFBEB', 500: '#F59E0B' },
  danger:  { 50: '#FEF2F2', 500: '#EF4444', 600: '#DC2626' },
  ink: {
    50:  '#FAFAF7', 100: '#F5F4EF', 200: '#EAE7DE',
    300: '#D6D2C5', 400: '#9E9C92', 500: '#6B6A62',
    700: '#2E2E2B', 900: '#141413',
  },
} as const;

/* ──────────────────────────────── semantic ──────────────────────────────── */

type SemanticScheme = {
  primary: string; primaryPressed: string; onPrimary: string;
  accent: string; onAccent: string;
  surface1: string; surface2: string; surface3: string; surface4: string;
  border: string; divider: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  success: string; warning: string; danger: string;
  overlay: string;
};

export const semantic: { light: SemanticScheme; dark: SemanticScheme } = {
  light: {
    primary:         palette.teal[500],
    primaryPressed:  palette.teal[600],
    onPrimary:       palette.ink[50],
    accent:          palette.coral[500],
    onAccent:        palette.ink[50],

    surface1: palette.ink[50],    // page
    surface2: '#FFFFFF',           // card
    surface3: palette.ink[100],    // chip raised
    surface4: palette.teal[50],    // highlight tinted

    border:   palette.ink[200],
    divider:  palette.ink[100],

    textPrimary:   palette.ink[900],
    textSecondary: palette.ink[500],
    textMuted:     palette.ink[400],

    success: palette.success[500],
    warning: palette.warning[500],
    danger:  palette.danger[500],

    overlay: 'rgba(20,20,19,0.55)',
  },
  dark: {
    primary:         palette.teal[200],
    primaryPressed:  palette.teal[100],
    onPrimary:       palette.ink[900],
    accent:          palette.coral[500],
    onAccent:        palette.ink[900],

    surface1: '#0F0F0E',
    surface2: '#17171B',
    surface3: '#1D1D20',
    surface4: '#242428',

    border:   '#2E2E33',
    divider:  '#1F1F22',

    textPrimary:   '#F5F4EF',
    textSecondary: '#9E9C92',
    textMuted:     '#6B6A62',

    success: palette.success[500],
    warning: palette.warning[500],
    danger:  palette.danger[500],

    overlay: 'rgba(0,0,0,0.60)',
  },
} as const;

export type SemanticTheme = SemanticScheme;

/* ──────────────────────────────── scale ──────────────────────────────── */

export const radius = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20,
  6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

/* ──────────────────────────────── elevation ──────────────────────────────── */
/** iOS shadow props + Android elevation, paired so platforms look alike. */

export const elevation: Record<'none' | 'card' | 'raised' | 'sheet', ViewStyle> = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  card: {
    shadowColor: '#141413',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  raised: {
    shadowColor: '#141413',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  sheet: {
    shadowColor: '#141413',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 12,
  },
};

/* ──────────────────────────────── motion ──────────────────────────────── */

export const motion = {
  duration: { fast: 150, base: 220, slow: 380, celebratory: 620 },
  /** Use with `Easing.bezier(...)` from react-native or Reanimated */
  easing: {
    standard:   [0.2, 0, 0, 1] as const,
    emphasized: [0.2, 0, 0.1, 1] as const,
  },
  spring: {
    gentle: { damping: 22, stiffness: 180, mass: 1 },
    snappy: { damping: 18, stiffness: 260, mass: 1 },
  },
} as const;

/* ──────────────────────────────── typography (non-nativewind use) ──────────────────────────────── */

export const typography = {
  'display-xl': { fontSize: 40, lineHeight: 48, letterSpacing: -0.6, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  display:      { fontSize: 30, lineHeight: 38, letterSpacing: -0.4, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  'title-lg':   { fontSize: 22, lineHeight: 28, letterSpacing: -0.2, fontFamily: 'PlusJakartaSans_700Bold' },
  title:        { fontSize: 18, lineHeight: 24, letterSpacing: -0.1, fontFamily: 'PlusJakartaSans_700Bold' },
  'body-lg':    { fontSize: 16, lineHeight: 24, fontFamily: 'Inter_500Medium' },
  body:         { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_500Medium' },
  'body-sm':    { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  caption:      { fontSize: 12, lineHeight: 16, letterSpacing: 0.2, fontFamily: 'Inter_600SemiBold' },
  overline:     { fontSize: 11, lineHeight: 14, letterSpacing: 0.8, fontFamily: 'Inter_700Bold' },
} as const;

export type TypographyVariant = keyof typeof typography;
