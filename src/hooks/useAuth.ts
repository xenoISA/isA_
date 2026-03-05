/**
 * ============================================================================
 * Auth Hook (useAuth.ts) - Gateway Auth Wrapper
 * ============================================================================
 *
 * Migrated from Auth0 to gateway-based authentication.
 * Wraps useAuthContext from AuthProvider for backwards compatibility.
 *
 * Architecture:
 * - Gateway auth via AuthProvider (JWT tokens in localStorage)
 * - Login/signup handled by LoginScreen (form-based)
 * - This hook provides the same interface as the old Auth0 version
 */

import { useCallback, useMemo } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { logger, LogCategory } from '../utils/logger';

// ================================================================================
// Auth Hook Interface
// ================================================================================

export interface UseAuthReturn {
  // Auth State
  auth0User: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: any;

  // Token Management
  getAccessToken: () => Promise<string>;
  getAuthHeaders: () => Promise<Record<string, string>>;

  // Authentication Actions
  login: () => void;
  signup: () => void;
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
  const ctx = useAuthContext();

  // ================================================================================
  // Token Management
  // ================================================================================

  const getAccessToken = useCallback(async (): Promise<string> => {
    const token = ctx.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    return token;
  }, [ctx]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    return ctx.getAuthHeadersAsync();
  }, [ctx]);

  // ================================================================================
  // Authentication Actions (login/signup are now form-based via LoginScreen)
  // ================================================================================

  const login = useCallback(() => {
    logger.warn(LogCategory.USER_AUTH, 'login() is a no-op — use LoginScreen form for authentication');
  }, []);

  const signup = useCallback(() => {
    logger.warn(LogCategory.USER_AUTH, 'signup() is a no-op — use LoginScreen form for registration');
  }, []);

  const logout = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'Initiating logout');
    ctx.logout();
  }, [ctx]);

  // ================================================================================
  // Utility Functions
  // ================================================================================

  const makeAuthenticatedRequest = useCallback(async (url: string, options: RequestInit = {}): Promise<Response | undefined> => {
    try {
      logger.debug(LogCategory.USER_AUTH, 'Making authenticated request', { url });

      const headers = await getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: { ...headers, ...options.headers }
      });

      if (response.status === 401) {
        logger.warn(LogCategory.USER_AUTH, 'Auth token expired or invalid');
        ctx.logout();
        return;
      }

      return response;
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Authenticated request failed', { error, url });
      throw error;
    }
  }, [getAuthHeaders, ctx]);

  // ================================================================================
  // Computed Properties
  // ================================================================================

  const computedProperties = useMemo(() => {
    return {
      userEmail: ctx.authUser?.email || null,
      userName: ctx.authUser?.name || null,
      hasValidUser: !!(ctx.authUser?.email && ctx.authUser?.name)
    };
  }, [ctx.authUser]);

  // ================================================================================
  // Return Interface
  // ================================================================================

  return {
    // Auth State (auth0User name kept for backwards compatibility)
    auth0User: ctx.authUser,
    isAuthenticated: ctx.isAuthenticated,
    isLoading: ctx.isLoading,
    error: ctx.error,

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

// ================================================================================
// Backward Compatibility Exports
// ================================================================================

/**
 * @deprecated Use useAuth() instead for cleaner interface
 */
export const useAuthLegacy = () => {
  const auth = useAuth();

  return {
    ...auth,
    user: auth.auth0User,
    creditsRemaining: 0,
    currentPlan: 'unknown',
    hasCredits: false,
    isPremium: false,
    refreshUser: async () => { console.warn('refreshUser is deprecated, use UserModule instead'); },
    initializeUser: async () => { console.warn('initializeUser is deprecated, use UserModule instead'); },
    checkHealth: async () => { console.warn('checkHealth is deprecated, use UserModule instead'); }
  };
};

export default useAuth;
