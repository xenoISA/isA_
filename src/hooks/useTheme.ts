/**
 * ============================================================================
 * Theme Hook (useTheme.ts) - Backward-compatible re-export
 * ============================================================================
 *
 * Delegates to useThemePreference. Existing consumers that import useTheme
 * continue to work without changes.
 *
 * Prefer useThemePreference or useThemeContext for new code.
 */

import { useThemePreference } from './useThemePreference';
import type { ResolvedTheme } from './useThemePreference';

export type Theme = ResolvedTheme;

export const useTheme = () => {
  const {
    resolvedTheme,
    isReady,
    toggle,
    setPreference,
    isDark,
    isLight,
  } = useThemePreference();

  return {
    theme: resolvedTheme,
    isLoading: !isReady,
    toggleTheme: toggle,
    setTheme: (t: Theme) => setPreference(t),
    isDark,
    isLight,
  };
};
