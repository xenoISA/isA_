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
import { GATEWAY_CONFIG } from '../config/gatewayConfig';

export interface UseAuthTokenReturn {
  getToken: () => Promise<string>;
  hasToken: () => boolean;
}

export const useAuthToken = (): UseAuthTokenReturn => {
  const getToken = useCallback(async (): Promise<string> => {
    const token = localStorage.getItem(GATEWAY_CONFIG.AUTH.TOKEN_KEY);
    if (!token) {
      throw new Error('No auth token available. Please log in.');
    }
    return token;
  }, []);

  const hasToken = useCallback((): boolean => {
    return !!localStorage.getItem(GATEWAY_CONFIG.AUTH.TOKEN_KEY);
  }, []);

  return { getToken, hasToken };
};

export default useAuthToken;
