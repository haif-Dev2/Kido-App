// theme/colors.ts — design tokens for the booking redesign
export const colors = {
  // Brand
  primary: '#0A5847',      // deep teal
  primaryLight: '#0F6E56',
  accent: '#D4923A',       // warm amber
  accentLight: '#FFF5E5',
  accentBorder: '#F5E1B8',

  // Surfaces
  bg: '#FAF7F2',           // cream page bg
  card: '#FFFFFF',
  border: '#ECE6D8',
  borderSoft: '#F5F0E5',

  // Text
  text: '#1A1A1A',
  textMuted: '#888888',
  textLight: '#BBBBBB',

  // Semantic
  success: '#3DD68C',
  successBg: 'rgba(61, 214, 140, 0.15)',
  successBorder: 'rgba(61, 214, 140, 0.3)',

  // Service icon backgrounds
  iconDay: '#FFF5E5',
  iconNight: '#E8E0F5',
  iconTutor: '#E1F5EE',

  // Dark surfaces
  dark: '#1A1A1A',
  darkSoft: '#2C2C2A',

  // Gradients
  heroGradient: ['#0A5847', '#0F6E56', '#156B53'] as const,
  amberGradient: ['#FFF5E5', '#FBEDD3'] as const,
  darkGradient: ['#1A1A1A', '#2C2C2A'] as const,
};

export const fonts = {
  serif: 'Fraunces_500Medium',
  serifBold: 'Fraunces_600SemiBold',
  sans: 'Inter_400Regular',
  sansMed: 'Inter_500Medium',
  sansBold: 'Inter_600SemiBold',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 20,
  xxl: 24,
};
