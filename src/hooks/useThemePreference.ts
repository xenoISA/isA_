/**
 * ============================================================================
 * useThemePreference Hook - Theme preference management
 * ============================================================================
 *
 * Integrates @isa/theme dark/light token sets with:
 * - Three-way preference: 'light', 'dark', 'system'
 * - localStorage persistence (key: 'theme')
 * - System preference detection via matchMedia
 * - Toggles 'dark' class on <html> for Tailwind dark mode
 * - Sets data-theme attribute for CSS variable overrides
 * - Exposes resolved theme tokens from @isa/theme
 *
 * Related: #195
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { lightTheme, darkTheme } from '@isa/theme';
import type { Theme as ThemeTokens } from '@isa/theme';
import { createLogger } from '../utils/logger';

const log = createLogger('useThemePreference');

const STORAGE_KEY = 'theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface UseThemePreferenceReturn {
  /** The user's stored preference ('light' | 'dark' | 'system') */
  preference: ThemePreference;
  /** The resolved theme after evaluating system preference ('light' | 'dark') */
  resolvedTheme: ResolvedTheme;
  /** Set the theme preference */
  setPreference: (pref: ThemePreference) => void;
  /** Toggle between light and dark (skips system) */
  toggle: () => void;
  /** Whether the hook has finished initializing */
  isReady: boolean;
  /** Convenience: true when resolved theme is dark */
  isDark: boolean;
  /** Convenience: true when resolved theme is light */
  isLight: boolean;
  /** The active @isa/theme token set for the resolved theme */
  tokens: ThemeTokens;
}

/**
 * Read the system color-scheme preference.
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Read stored preference from localStorage. Returns null when absent or invalid.
 */
function readStoredPreference(): ThemePreference | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // SSR or storage unavailable
  }
  return null;
}

/**
 * Persist preference to localStorage.
 */
function writeStoredPreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch (err) {
    log.warn('Failed to persist theme preference:', err);
  }
}

/**
 * Resolve a preference to a concrete theme.
 */
function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return getSystemTheme();
  return pref;
}

/**
 * Apply the resolved theme to the DOM:
 * - Adds/removes 'dark' class on <html> (Tailwind darkMode: 'class')
 * - Sets/removes data-theme attribute (CSS variable overrides)
 * - Sets color-scheme meta for native browser widgets
 */
function applyThemeToDOM(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.removeAttribute('data-theme');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}

export function useThemePreference(): UseThemePreferenceReturn {
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('dark');
  const [isReady, setIsReady] = useState(false);

  // Resolve once we know both preference and system theme
  const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  // Initialize from storage + system
  useEffect(() => {
    const stored = readStoredPreference();
    const system = getSystemTheme();
    setSystemTheme(system);

    const initial = stored ?? 'system';
    setPreferenceState(initial);

    const resolved = initial === 'system' ? system : initial;
    applyThemeToDOM(resolved);
    setIsReady(true);

    log.info(`Theme initialized: preference=${initial}, resolved=${resolved}`);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      const newSystem: ResolvedTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystem);
      log.info(`System theme changed to ${newSystem}`);
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Apply theme to DOM whenever resolved theme changes
  useEffect(() => {
    if (isReady) {
      applyThemeToDOM(resolvedTheme);
    }
  }, [resolvedTheme, isReady]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    writeStoredPreference(pref);
    const resolved = resolveTheme(pref);
    applyThemeToDOM(resolved);
    log.info(`Theme preference set to ${pref} (resolved: ${resolved})`);
  }, []);

  const toggle = useCallback(() => {
    const next: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setPreference(next);
  }, [resolvedTheme, setPreference]);

  const tokens: ThemeTokens = useMemo(
    () => (resolvedTheme === 'dark' ? darkTheme : lightTheme),
    [resolvedTheme],
  );

  return {
    preference,
    resolvedTheme,
    setPreference,
    toggle,
    isReady,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    tokens,
  };
}
