import React from 'react';
import { View, type ViewProps, type ViewStyle, type StyleProp, useWindowDimensions } from 'react-native';
import { BREAKPOINTS, MAX_CONTENT_WIDTH, READING_MAX_WIDTH } from '../../lib/responsive';

interface ResponsivePageProps extends ViewProps {
  /**
   * Maximum width of the centered content column.
   *   - 'app'     → MAX_CONTENT_WIDTH (1280) — full app surface (default)
   *   - 'reading' → READING_MAX_WIDTH (720) — single-column reading screens
   *   - number    → custom px max-width
   */
  maxWidth?: 'app' | 'reading' | number;
  /** Background color for the outer (off-content) area. */
  backgroundColor?: string;
  /** Apply horizontal padding to the *outer* wrapper (rare; default 0). */
  outerPadding?: number;
  /** Inner content style overrides. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Children render inside the centered, max-width column. */
  children?: React.ReactNode;
}

/**
 * Centers a screen's content within the active viewport while letting it
 * stretch edge-to-edge on phones. Place this at the root of a screen — it
 * preserves `flex: 1` semantics and forwards style props.
 *
 * Behavior:
 *   - < 768px : children render full-width (no centering, no max-width)
 *   - ≥ 768px : children render centered with the requested max-width
 *
 * This is purely cosmetic/layout; it never changes the children's flex
 * behavior. Existing screens can be wrapped without breaking.
 */
export function ResponsivePage({
  maxWidth = 'app',
  backgroundColor,
  outerPadding,
  contentStyle,
  children,
  style,
  ...rest
}: ResponsivePageProps) {
  const { width } = useWindowDimensions();
  const cap =
    maxWidth === 'app'     ? MAX_CONTENT_WIDTH
  : maxWidth === 'reading' ? READING_MAX_WIDTH
  : maxWidth;

  // Phones / tablet portrait → no centering needed, render edge-to-edge.
  if (width < BREAKPOINTS.lg) {
    return (
      <View style={[{ flex: 1, backgroundColor }, style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        { flex: 1, backgroundColor, alignItems: 'center', paddingHorizontal: outerPadding ?? 0 },
        style,
      ]}
      {...rest}
    >
      <View style={[{ flex: 1, width: '100%', maxWidth: cap }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}
