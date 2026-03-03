/**
 * ============================================================================
 * Auth Hook (useAuth.ts) - Gateway Auth Wrapper
 * ============================================================================
 *
 * Core Responsibilities:
 * - Authentication state via AuthProvider (gateway-based)
 * - Token management and access
 * - Login/logout/signup actions
 * - Auth headers creation
 *
 * Separation of Concerns:
 * ✅ Responsible for:
 *   - Authentication state
 *   - Access token retrieval
 *   - Login/logout actions
 *   - Auth headers creation
 *
 * ❌ Not responsible for:
 *   - External user data (handled by UserModule)
 *   - Credit management (handled by UserModule)
 *   - Subscription management (handled by UserModule)
 *   - User service API calls (handled by userService)
 */

import { useCallback, useMemo } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { logger, LogCategory } from '../utils/logger';

// ================================================================================
// Auth Hook Interface
// ================================================================================

export interface UseAuthReturn {
  // Auth State
  authUser: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: any;

  // Token Management
  getAccessToken: () => Promise<string>;
  getAuthHeaders: () => Promise<Record<string, string>>;

  // Authentication Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;

  // Utilities
  makeAuthenticatedRequest: (url: string, options?: RequestInit) => Promise<Response | undefined>;

  // Computed Properties
  userEmail: string | null;
  userName: string | null;
  hasValidUser: boolean;
}

// ================================================================================
// Auth Hook Implementation
// ================================================================================

export const useAuth = (): UseAuthReturn => {
  const auth = useAuthContext();

  // ================================================================================
  // Token Management
  // ================================================================================

  const getAccessToken = useCallback(async (): Promise<string> => {
    const token = auth.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    return token;
  }, [auth]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    return auth.getAuthHeadersAsync();
  }, [auth]);

  // ================================================================================
  // Authentication Actions
  // ================================================================================

  const login = useCallback(async (email: string, password: string) => {
    logger.info(LogCategory.USER_AUTH, 'Initiating login');
    return auth.login(email, password);
  }, [auth]);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    logger.info(LogCategory.USER_AUTH, 'Initiating signup');
    return auth.signup(email, password, name);
  }, [auth]);

  const logout = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'Initiating logout');
    auth.logout();
  }, [auth]);

  // ================================================================================
  // Utility Functions
  // ================================================================================

  const makeAuthenticatedRequest = useCallback(async (url: string, options: RequestInit = {}): Promise<Response | undefined> => {
    try {
      logger.debug(LogCategory.USER_AUTH, 'Making authenticated request', { url });

      const headers = await getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers }
      });

      if (response.status === 401) {
        logger.warn(LogCategory.USER_AUTH, 'Auth token expired or invalid');
        auth.logout();
        return;
      }

      return response;
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Authenticated request failed', { error, url });
      throw error;
    }
  }, [getAuthHeaders, auth]);

  // ================================================================================
  // Computed Properties
  // ================================================================================

  const computedProperties = useMemo(() => {
    return {
      userEmail: auth.authUser?.email || null,
      userName: auth.authUser?.name || null,
      hasValidUser: !!(auth.authUser?.email && auth.authUser?.name)
    };
  }, [auth.authUser]);

  // ================================================================================
  // Return Interface
  // ================================================================================

  return {
    // Auth State
    authUser: auth.authUser,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,

    // Token Management
    getAccessToken,
    getAuthHeaders,

    // Authentication Actions
    login,
    signup,
    logout,

    // Utilities
    makeAuthenticatedRequest,

    // Computed Properties
    userEmail: computedProperties.userEmail,
    userName: computedProperties.userName,
    hasValidUser: computedProperties.hasValidUser
  };
};

export default useAuth;
