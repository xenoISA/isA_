import { useEffect, useCallback } from 'react';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

/**
 * Bridge hook for desktop auth via OS keychain.
 * In Electron: persists refresh token in the OS keychain (Keychain/DPAPI/Secret Service).
 * In browser: no-ops (auth handled by HttpOnly cookies).
 */
export function useDesktopAuth() {
  const saveToken = useCallback(async (token: string): Promise<boolean> => {
    if (!isElectron || !electronAPI) return false;
    return electronAPI.invoke('auth:save-token', token);
  }, []);

  const loadToken = useCallback(async (): Promise<string | null> => {
    if (!isElectron || !electronAPI) return null;
    return electronAPI.invoke('auth:load-token');
  }, []);

  const clearToken = useCallback(async (): Promise<boolean> => {
    if (!isElectron || !electronAPI) return false;
    return electronAPI.invoke('auth:clear-token');
  }, []);

  return { isElectron, saveToken, loadToken, clearToken };
}

/**
 * Restore session from keychain on app startup.
 * Call this once in the app root — it will attempt to load a stored
 * refresh token and restore the auth session.
 */
export function useDesktopSessionRestore(
  onTokenLoaded: (token: string) => void,
) {
  useEffect(() => {
    if (!isElectron || !electronAPI) return;

    electronAPI.invoke('auth:load-token').then((token: string | null) => {
      if (token) {
        onTokenLoaded(token);
      }
    });
  }, [onTokenLoaded]);
}
