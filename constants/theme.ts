import { Platform } from 'react-native';



// ─── COLOR TOKENS ──────────────────────────────────────────────
export const colors = {
  // Brand — Teal trust palette
  primary:      '#007D8C',
  primaryLight: '#E6F4F5',
  primaryDark:  '#005C68',

  // Text hierarchy
  text:          '#111827',   // Gray 900 — headings, body
  textSecondary: '#6B7280',   // Gray 500 — supporting text
  textTertiary:  '#9CA3AF',   // Gray 400 — placeholders, hints
  textInverse:   '#FFFFFF',   // On dark/primary surfaces

  // Surfaces
  background:       '#FAFAFA',   // App background
  surface:          '#FFFFFF',   // Cards, modals
  surfaceSecondary: '#F9FAFB',   // Subtle differentiation

  // Borders
  border:      '#E5E7EB',   // Gray 200 — default borders
  borderLight: '#F3F4F6',   // Gray 100 — subtle dividers

  // Status — semantic colors for feedback
  success:      '#10B981',
  successLight: '#D1FAE5',
  warning:      '#F59E0B',
  warningLight: '#FEF3C7',
  error:        '#EF4444',
  errorLight:   '#FEE2E2',
  info:         '#3B82F6',
  infoLight:    '#DBEAFE',

  // Accent palette — for avatars, tags, badges
  pink:        '#EC4899',
  pinkLight:   '#FCE7F3',
  purple:      '#7C3AED',
  purpleLight: '#EDE9FE',
  amber:       '#F59E0B',
  amberLight:  '#FEF3C7',
  rose:        '#F43F5E',
  roseLight:   '#FFE4E6',

  // Overlay
  overlay:      'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',

  // Absolute
  white: '#FFFFFF',
  black: '#000000',
} as const;

// ─── AVATAR PALETTE ──────────────────────────────────────────────
// Predefined bg/text pairs for generated avatars. Cycle via index.
export const avatarPalette = [
  { bg: '#E0F2FE', text: colors.primary },   // Teal
  { bg: '#FCE7F3', text: colors.pink },       // Pink
  { bg: '#FEF3C7', text: colors.amber },      // Amber
  { bg: '#D1FAE5', text: colors.success },    // Green
  { bg: '#EDE9FE', text: colors.purple },     // Purple
  { bg: '#FFE4E6', text: colors.rose },       // Rose
] as const;

// ─── STATUS BADGE COLORS ──────────────────────────────────────────
export const statusColors: Record<string, { bg: string; text: string }> = {
  Confirmed: { bg: colors.successLight, text: colors.success },
  Pending:   { bg: colors.warningLight, text: colors.warning },
  Completed: { bg: '#E0F2FE',          text: colors.primary },
  Cancelled: { bg: colors.errorLight,   text: colors.error },
};

// ─── TYPOGRAPHY ──────────────────────────────────────────────
// System font for optimal perf; major-third scale (1.25 ratio)
export const typography = {
  display:      { fontSize: 32, lineHeight: 40, fontWeight: '800' as const },
  h1:           { fontSize: 28, lineHeight: 36, fontWeight: '800' as const },
  h2:           { fontSize: 24, lineHeight: 32, fontWeight: '800' as const },
  h3:           { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
  h4:           { fontSize: 18, lineHeight: 26, fontWeight: '700' as const },
  body:         { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium:   { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  bodySemibold: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  bodyBold:     { fontSize: 16, lineHeight: 24, fontWeight: '700' as const },
  sm:           { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  smMedium:     { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  smSemibold:   { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  smBold:       { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
  caption:      { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  captionBold:  { fontSize: 12, lineHeight: 16, fontWeight: '700' as const },
  overline:     { fontSize: 10, lineHeight: 14, fontWeight: '600' as const },
  tiny:         { fontSize: 10, lineHeight: 14, fontWeight: '700' as const },
  label:        { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 0.5 },
} as const;

// ─── SPACING (8pt base grid) ──────────────────────────────────
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

// ─── BORDER RADIUS ────────────────────────────────────────────
// Rounded = friendly, approachable — critical for a childcare app
export const radius = {
  sm:   6,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 9999,
  pill: 28,    // Button stadium shape
} as const;

// ─── SHADOWS / ELEVATION ──────────────────────────────────────
export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// ─── ANIMATION ────────────────────────────────────────────────
// Purpose-driven motion: fast = feedback, normal = transitions, slow = delight
export const animation = {
  fast:   150,   // Button press, toggle
  normal: 250,   // Screen transitions, modals
  slow:   400,   // Onboarding, celebrations
  spring: { damping: 15, stiffness: 150 },
} as const;

// ─── LAYOUT CONSTANTS ─────────────────────────────────────────
export const layout = {
  screenPadding:    24,
  cardPadding:      16,
  inputHeight:      56,
  buttonHeight:     56,
  tabBarHeight:     Platform.OS === 'ios' ? 85 : 65,
  tabBarPadBottom:  Platform.OS === 'ios' ? 28 : 8,
  statusBarPad:     Platform.OS === 'ios' ? 12 : 20,
  safeBottomPad:    Platform.OS === 'ios' ? 40 : 24,
  minTouchTarget:   44,
} as const;

// ─── COMBINED EXPORT ──────────────────────────────────────────
export const Theme = {
  colors,
  avatarPalette,
  statusColors,
  typography,
  spacing,
  radius,
  shadow,
  animation,
  layout,
} as const;
