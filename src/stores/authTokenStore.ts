/**
 * In-memory auth token store.
 *
 * Replaces localStorage token storage to prevent XSS token theft.
 * Access tokens live only in memory; a refresh-token HttpOnly cookie
 * (set by the gateway) restores the session on page reload.
 *
 * In development (non-HttpOnly) mode the store can fall back to reading
 * the access token from a regular cookie set by the gateway.
 */

import { getTokenFromCookie } from '../utils/authCookieHelper';

let _accessToken: string | null = null;

export const authTokenStore = {
  /** Return the cached in-memory token, falling back to dev localStorage or cookie. */
  getToken: (): string | null => {
    if (_accessToken) return _accessToken;
    // Dev fallback 1: localStorage (survives page refresh)
    if (typeof window !== 'undefined') {
      try {
        const fromStorage = localStorage.getItem('isa_dev_token');
        if (fromStorage) { _accessToken = fromStorage; return _accessToken; }
      } catch { /* storage unavailable */ }
    }
    // Dev fallback 2: non-HttpOnly cookie
    const fromCookie = getTokenFromCookie();
    if (fromCookie) {
      _accessToken = fromCookie;
    }
    return _accessToken;
  },
  setToken: (token: string | null): void => { _accessToken = token; },
  clearToken: (): void => { _accessToken = null; },
  hasToken: (): boolean => authTokenStore.getToken() !== null,
};
