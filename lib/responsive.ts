/**
 * Responsive layout helpers for cross-platform sizing (iOS / Android / Web).
 *
 * Breakpoints follow a mobile-first design ladder:
 *   - xs:  320  → small phones (iPhone SE 1, very narrow Android)
 *   - sm:  375  → iPhone SE 2/3, iPhone 13 mini
 *   - md:  430  → iPhone Pro Max & most modern phones (largest single-column phone)
 *   - lg:  768  → tablets / iPad / large foldables
 *   - xl:  1024 → small laptops & desktop
 *   - 2xl: 1280 → large desktop (content cap)
 *
 * On native, breakpoints still derive from `useWindowDimensions()`, so they
 * reflect the actual device viewport (useful for tablets and foldables).
 */
import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  xs: 320,
  sm: 375,
  md: 430,
  lg: 768,
  xl: 1024,
  '2xl': 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Maximum content width — keeps text/UI readable on huge desktop screens. */
export const MAX_CONTENT_WIDTH = 1280;

/** Reading-friendly column width for centered, single-column screens. */
export const READING_MAX_WIDTH = 720;

/** Horizontal page padding by breakpoint (matches the design grid). */
export function pagePadding(width: number): number {
  if (width >= BREAKPOINTS.xl) return 32;
  if (width >= BREAKPOINTS.lg) return 28;
  if (width >= BREAKPOINTS.md) return 20;
  return 16;
}

export type ResponsiveInfo = {
  width: number;
  height: number;
  /** Currently-active breakpoint label. */
  breakpoint: Breakpoint;
  /** True when the screen is narrower than 375px (small Android, iPhone SE 1). */
  isSmallPhone: boolean;
  /** True for any phone-sized screen (< 768px). */
  isPhone: boolean;
  /** True for tablet-range screens (768px – 1023px). */
  isTablet: boolean;
  /** True for desktop-range screens (≥ 1024px). */
  isDesktop: boolean;
  /** True for very wide screens (≥ 1280px). */
  isWide: boolean;
  /** Page horizontal padding in px for the current width. */
  hPad: number;
};

function bpFor(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl)     return 'xl';
  if (width >= BREAKPOINTS.lg)     return 'lg';
  if (width >= BREAKPOINTS.md)     return 'md';
  if (width >= BREAKPOINTS.sm)     return 'sm';
  return 'xs';
}

/**
 * Hook returning the current viewport size and convenient breakpoint flags.
 * Re-renders on viewport resize (window resize on web, orientation on native).
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const breakpoint = bpFor(width);
  return {
    width,
    height,
    breakpoint,
    isSmallPhone: width < BREAKPOINTS.sm,
    isPhone:      width <  BREAKPOINTS.lg,
    isTablet:     width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isDesktop:    width >= BREAKPOINTS.xl,
    isWide:       width >= BREAKPOINTS['2xl'],
    hPad:         pagePadding(width),
  };
}

/**
 * Pick a value from a breakpoint-keyed object, falling back to the next
 * smaller breakpoint when a key is missing. Mobile-first.
 *
 * @example
 *   const cols = pickBp(width, { xs: 1, lg: 2, xl: 3 });
 */
export function pickBp<T>(width: number, values: Partial<Record<Breakpoint, T>>): T | undefined {
  const order: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const current = bpFor(width);
  const startIdx = order.indexOf(current);
  for (let i = startIdx; i < order.length; i++) {
    const v = values[order[i]];
    if (v !== undefined) return v;
  }
  return undefined;
}

/**
 * Linearly scale a base value (designed for 375px-wide phones) up to a
 * maximum at 1024px and beyond. Useful for fluid typography on web.
 */
export function fluid(min: number, max: number, viewportWidth: number, fromW = 375, toW = 1024): number {
  if (viewportWidth <= fromW) return min;
  if (viewportWidth >= toW)   return max;
  const t = (viewportWidth - fromW) / (toW - fromW);
  return min + (max - min) * t;
}
