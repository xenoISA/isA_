/**
 * ============================================================================
 * useAuthToken Hook - Auth Token Access
 * ============================================================================
 *
 * Provides access to the auth token from the in-memory store.
 * Used by components that need to make authenticated requests
 * (e.g., HIL dialogs resuming execution).
 *
 * Token is stored in memory by the AuthProvider after login.
 * On page reload, a silent refresh via HttpOnly cookie restores it.
 */

import { useCallback } from 'react';
import { authTokenStore } from '../stores/authTokenStore';

export interface UseAuthTokenReturn {
  getToken: () => Promise<string>;
  hasToken: () => boolean;
}

export const useAuthToken = (): UseAuthTokenReturn => {
  const getToken = useCallback(async (): Promise<string> => {
    const token = authTokenStore.getToken();
    if (!token) {
      throw new Error('No auth token available. Please log in.');
    }
    return token;
  }, []);

  const hasToken = useCallback((): boolean => {
    return authTokenStore.hasToken();
  }, []);

  return { getToken, hasToken };
};

export default useAuthToken;
