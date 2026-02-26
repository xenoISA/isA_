/**
 * ============================================================================
 * Auth Hook (useAuth.ts) - Clean Auth0 Wrapper
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Auth0 authentication integration only
 * - Token management and access
 * - Authentication state management
 * - Login/logout/signup actions
 * 
 * Architecture Separation:
 * ✅ Auth0 Service: useAuth (this file)
 * ✅ User Service: UserModule + useUser (localhost:8100)
 * ✅ Clean separation: Auth != User Management
 * 
 * Separation of Concerns:
 * ✅ Responsible for:
 *   - Auth0 authentication state
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

import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useMemo } from 'react';
import { logger, LogCategory } from '../utils/logger';
import { getCurrentRelativeUrl, getLogoutReturnToUrl } from '../config/authSessionConfig';

// ================================================================================
// Auth Hook Interface
// ================================================================================

export interface UseAuthReturn {
  // Auth0 State
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
  const { 
    user: auth0User, 
    isLoading: auth0Loading, 
    error: auth0Error, 
    isAuthenticated,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently
  } = useAuth0();

  // ================================================================================
  // Token Management
  // ================================================================================

  const getAccessToken = useCallback(async (): Promise<string> => {
    try {
      logger.debug(LogCategory.USER_AUTH, 'Getting Auth0 access token');
      
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
          scope: 'openid profile email read:users update:users create:users'
        }
      });

      if (!token) {
        throw new Error('No access token received from Auth0');
      }

      logger.debug(LogCategory.USER_AUTH, 'Auth0 access token retrieved successfully');
      return token;
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to get Auth0 access token', { error });
      throw error;
    }
  }, [getAccessTokenSilently]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const accessToken = await getAccessToken();
      
      return {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to create auth headers', { error });
      throw error;
    }
  }, [getAccessToken]);

  // ================================================================================
  // Authentication Actions
  // ================================================================================

  const login = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'Initiating Auth0 login');
    loginWithRedirect({
      appState: {
        returnTo: getCurrentRelativeUrl()
      },
      authorizationParams: {
        screen_hint: 'login'
      }
    });
  }, [loginWithRedirect]);

  const signup = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'Initiating Auth0 signup');
    loginWithRedirect({
      appState: {
        returnTo: getCurrentRelativeUrl()
      },
      authorizationParams: {
        screen_hint: 'signup'
      }
    });
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'Initiating Auth0 logout');
    auth0Logout({
      logoutParams: {
        returnTo: getLogoutReturnToUrl()
      }
    });
  }, [auth0Logout]);

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

      // Handle token expiration
      if (response.status === 401) {
        logger.warn(LogCategory.USER_AUTH, 'Auth token expired, redirecting to login');
        await loginWithRedirect();
        return;
      }

      return response;
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Authenticated request failed', { error, url });
      throw error;
    }
  }, [getAuthHeaders, loginWithRedirect]);

  // ================================================================================
  // Computed Properties
  // ================================================================================

  const computedProperties = useMemo(() => {
    return {
      userEmail: auth0User?.email || null,
      userName: auth0User?.name || null,
      hasValidUser: !!(auth0User?.email && auth0User?.name)
    };
  }, [auth0User]);

  // ================================================================================
  // Return Interface
  // ================================================================================

  return {
    // Auth0 State
    auth0User,
    isAuthenticated,
    isLoading: auth0Loading,
    error: auth0Error,
    
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
  
  // Provide legacy interface for existing components
  return {
    ...auth,
    user: auth.auth0User, // Legacy alias
    creditsRemaining: 0, // Deprecated - use UserModule instead
    currentPlan: 'unknown', // Deprecated - use UserModule instead  
    hasCredits: false, // Deprecated - use UserModule instead
    isPremium: false, // Deprecated - use UserModule instead
    refreshUser: async () => { console.warn('refreshUser is deprecated, use UserModule instead'); },
    initializeUser: async () => { console.warn('initializeUser is deprecated, use UserModule instead'); },
    checkHealth: async () => { console.warn('checkHealth is deprecated, use UserModule instead'); }
  };
};

export default useAuth;
