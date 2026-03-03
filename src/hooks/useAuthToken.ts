/**
 * ============================================================================
 * useAuthToken Hook - Auth Token Access
 * ============================================================================
 *
 * Provides access to the stored auth token for API calls.
 * Used by components that need to make authenticated requests
 * (e.g., HIL dialogs resuming execution).
 *
 * Token is stored in localStorage by the AuthProvider after login.
 */

import { useCallback } from 'react';

const AUTH_TOKEN_KEY = 'isa_auth_token';

export interface UseAuthTokenReturn {
  getToken: () => Promise<string>;
  hasToken: () => boolean;
}

export const useAuthToken = (): UseAuthTokenReturn => {
  const getToken = useCallback(async (): Promise<string> => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('No auth token available. Please log in.');
    }
    return token;
  }, []);

  const hasToken = useCallback((): boolean => {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  }, []);

  return { getToken, hasToken };
};

export default useAuthToken;
