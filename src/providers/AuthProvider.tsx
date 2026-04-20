/**
 * ============================================================================
 * Auth Provider - Gateway-based authentication
 * ============================================================================
 *
 * Custom gateway auth flow using JWT tokens and HttpOnly refresh cookies.
 * Uses localStorage JWT tokens managed by gatewayConfig.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GATEWAY_ENDPOINTS, GATEWAY_CONFIG } from '../config/gatewayConfig';
import { getAuthHeaders, saveAuthToken, clearAuth } from '../config/gatewayConfig';
import { authTokenStore } from '../stores/authTokenStore';
import { isHttpOnlyCookieMode, clearAuthCookies, getCredentialsMode } from '../utils/authCookieHelper';
import { logger, LogCategory } from '../utils/logger';

// ================================================================================
// Types
// ================================================================================

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  [key: string]: any;
}

export interface AuthContextValue {
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  verify: (code: string) => Promise<void>;
  logout: () => void;
  getAccessToken: () => string | null;
  getAuthHeadersAsync: () => Promise<Record<string, string>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ================================================================================
// Provider
// ================================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = authUser !== null;

  // On mount: attempt silent refresh via HttpOnly refresh-token cookie.
  // Falls back to in-memory token if already set (e.g. hot reload).
  // Also cleans up any legacy localStorage tokens from pre-migration.
  useEffect(() => {
    // Clean up legacy localStorage tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GATEWAY_CONFIG.AUTH.TOKEN_KEY);
      localStorage.removeItem(GATEWAY_CONFIG.AUTH.API_KEY);
    }

    let cancelled = false;
    (async () => {
      try {
        // Dev fast-path: if we have a token in localStorage, verify it directly
        // instead of calling /refresh (which requires an HttpOnly cookie not set in dev)
        const devToken = typeof window !== 'undefined' ? localStorage.getItem('isa_dev_token') : null;
        if (devToken) {
          // Decode JWT payload locally to restore user without network call
          let jwtUser: any = null;
          try {
            const payload = JSON.parse(atob(devToken.split('.')[1]));
            // Check expiry
            if (payload.exp && payload.exp * 1000 > Date.now()) {
              jwtUser = payload;
            } else {
              localStorage.removeItem('isa_dev_token');
              logger.info(LogCategory.USER_AUTH, 'Dev token expired, removed');
            }
          } catch {
            localStorage.removeItem('isa_dev_token');
          }

          if (jwtUser) {
            // Restore session from JWT payload — no network call needed
            saveAuthToken(devToken);
            setAuthUser({
              sub: jwtUser.user_id || jwtUser.sub || '',
              email: jwtUser.email || '',
              name: jwtUser.name || jwtUser.email || '',
            });
            logger.info(LogCategory.USER_AUTH, 'Restored session from dev JWT (local decode)');
            setIsLoading(false);

            // Optionally verify in background (non-blocking)
            fetch(GATEWAY_ENDPOINTS.AUTH.VERIFY_TOKEN, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${devToken}` },
              credentials: 'include',
            }).then(res => {
              if (res.status === 401) {
                // Token truly invalid — force re-login
                localStorage.removeItem('isa_dev_token');
                clearAuth();
                setAuthUser(null);
                logger.warn(LogCategory.USER_AUTH, 'Dev token rejected by server (401), forcing re-login');
              }
            }).catch(() => {
              // Network error — keep the session, service is down
            });

            return;
          }
        }

        // Try silent refresh — the HttpOnly cookie is sent automatically
        const res = await fetch(GATEWAY_ENDPOINTS.AUTH.BASE + '/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          const tokenValue = data.token || data.access_token;
          if (tokenValue) {
            saveAuthToken(tokenValue);
            const user = data.user || {};
            setAuthUser({
              ...user,
              sub: data.user_id || user.sub || data.sub || '',
              email: user.email || data.email || '',
              name: user.name || data.name || data.email || '',
            });
            logger.info(LogCategory.USER_AUTH, 'Restored session via silent refresh');
          }
        } else {
          // If refresh fails, try verifying any existing in-memory token (hot reload case)
          const existingToken = authTokenStore.getToken();
          if (existingToken) {
            const verifyRes = await fetch(GATEWAY_ENDPOINTS.AUTH.VERIFY_TOKEN, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${existingToken}` },
              credentials: 'include',
            });

            if (cancelled) return;

            if (verifyRes.ok) {
              const data = await verifyRes.json();
              const user = data.user || {};
              setAuthUser({
                ...user,
                sub: data.user_id || user.sub || data.sub || '',
                email: user.email || data.email || '',
                name: user.name || data.name || data.email || '',
              });
              logger.info(LogCategory.USER_AUTH, 'Restored session from in-memory token');
            } else {
              clearAuth();
              logger.info(LogCategory.USER_AUTH, 'In-memory token invalid, cleared');
            }
          }
        }
      } catch (err) {
        logger.warn(LogCategory.USER_AUTH, 'Session restore failed', { error: err });
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(GATEWAY_ENDPOINTS.AUTH.BASE + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Login failed (${res.status})`);
      }

      const data = await res.json();
      const tokenValue = data.token || data.access_token;
      // In cookie mode the gateway sets the auth cookie via Set-Cookie header.
      // We still cache the token in memory as a fallback for Bearer header auth
      // and for non-cookie environments (development).
      if (tokenValue) {
        saveAuthToken(tokenValue);
      } else if (!isHttpOnlyCookieMode()) {
        throw new Error('Server did not return an auth token');
      }
      const user = data.user || {};
      setAuthUser({
        ...user,
        sub: data.user_id || user.sub || data.sub || '',
        email: user.email || data.email || email,
        name: user.name || data.name || email,
      });
      logger.info(LogCategory.USER_AUTH, 'Login successful');
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      setError(msg);
      logger.error(LogCategory.USER_AUTH, 'Login failed', { error: msg });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(GATEWAY_ENDPOINTS.AUTH.BASE + '/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name: name || email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Signup failed (${res.status})`);
      }

      const data = await res.json();
      // Some flows require email verification before issuing a token
      if (data.token || data.access_token) {
        saveAuthToken(data.token || data.access_token);
        const user = data.user || {};
        setAuthUser({
          ...user,
          sub: data.user_id || user.sub || data.sub || '',
          email: user.email || data.email || email,
          name: user.name || data.name || name || email,
        });
      }
      logger.info(LogCategory.USER_AUTH, 'Signup successful');
    } catch (err: any) {
      const msg = err.message || 'Signup failed';
      setError(msg);
      logger.error(LogCategory.USER_AUTH, 'Signup failed', { error: msg });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verify = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(GATEWAY_ENDPOINTS.AUTH.BASE + '/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Verification failed (${res.status})`);
      }

      const data = await res.json();
      if (data.token || data.access_token) {
        saveAuthToken(data.token || data.access_token);
        const user = data.user || {};
        setAuthUser({
          ...user,
          sub: data.user_id || user.sub || data.sub || '',
          email: user.email || data.email || '',
          name: user.name || data.name || data.email || '',
        });
      }
      logger.info(LogCategory.USER_AUTH, 'Verification successful');
    } catch (err: any) {
      const msg = err.message || 'Verification failed';
      setError(msg);
      logger.error(LogCategory.USER_AUTH, 'Verification failed', { error: msg });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget gateway logout so the server can clear the HttpOnly cookie
    fetch(GATEWAY_ENDPOINTS.AUTH.BASE + '/logout', {
      method: 'POST',
      credentials: getCredentialsMode(),
    }).catch(() => {
      // Best-effort — don't block client-side logout on network errors
    });
    clearAuth();
    clearAuthCookies();
    setAuthUser(null);
    setError(null);
    logger.info(LogCategory.USER_AUTH, 'User logged out');
  }, []);

  const getAccessToken = useCallback((): string | null => {
    return authTokenStore.getToken();
  }, []);

  const getAuthHeadersAsync = useCallback(async (): Promise<Record<string, string>> => {
    return {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    };
  }, []);

  const value: AuthContextValue = {
    authUser,
    isAuthenticated,
    isLoading,
    error,
    login,
    signup,
    verify,
    logout,
    getAccessToken,
    getAuthHeadersAsync,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ================================================================================
// Hook
// ================================================================================

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
};

export default AuthProvider;
