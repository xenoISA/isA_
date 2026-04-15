/**
 * ============================================================================
 * ThemeProvider - React context for theme preference
 * ============================================================================
 *
 * Wraps useThemePreference in a context so any component can access
 * theme state without prop-drilling.
 *
 * Usage:
 *   import { useThemeContext } from '@/providers/ThemeProvider';
 *   const { resolvedTheme, setPreference, toggle, tokens } = useThemeContext();
 *
 * Related: #195
 */

'use client';

import React, { createContext, useContext } from 'react';
import {
  useThemePreference,
  type UseThemePreferenceReturn,
} from '../hooks/useThemePreference';

const ThemeContext = createContext<UseThemePreferenceReturn | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeState = useThemePreference();

  return (
    <ThemeContext.Provider value={themeState}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Access the theme context. Throws if used outside ThemeProvider.
 */
export function useThemeContext(): UseThemePreferenceReturn {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within a <ThemeProvider>');
  }
  return ctx;
}
