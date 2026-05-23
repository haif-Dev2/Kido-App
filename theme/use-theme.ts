import { useColorScheme } from 'react-native';
import { semantic, type SemanticTheme } from './tokens';

/**
 * Returns semantic colors for the active color scheme.
 * Prefer NativeWind `dark:` variants for styling;
 * use this hook for values that need to be passed as props (e.g. StatusBar, icon colors).
 */
export function useTheme(): { scheme: 'light' | 'dark'; colors: SemanticTheme } {
  const scheme = useColorScheme() ?? 'light';
  return { scheme, colors: semantic[scheme] };
}
