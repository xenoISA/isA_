/**
 * ============================================================================
 * User Module (UserModule.tsx) - User Business Logic Orchestrator
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Orchestrate gateway authentication with external user management
 * - Bridge AuthProvider with useUserStore state management
 * - Handle user initialization and synchronization flows
 * - Provide clean business logic interfaces for UI components
 * - Manage user subscription and billing workflows
 * 
 * Architecture Integration:
 *  Auth Layer: AuthProvider (gateway JWT) � UserModule � useUserStore (External)
 *  Business Logic: Complex user flows handled here, not in UI
 *  Service Integration: Uses new userService class instead of deprecated functions
 *  State Coordination: Synchronizes auth state with external user state
 * 
 * Separation of Concerns:
 *  Responsible for:
 *   - User authentication flow coordination
 *   - External user data synchronization
 *   - Subscription and billing business logic
 *   - User action orchestration
 *   - Error handling and recovery
 * 
 * L Not responsible for:
 *   - UI rendering (handled by UI components)
 *   - Direct API calls (handled by userService)
 *   - Raw state management (handled by useUserStore)
 *   - Token management (handled by AuthProvider)
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { useUserStore } from '../stores/useUserStore';
import { UserService } from '../api/userService';
import { logger, LogCategory, createLogger } from '../utils/logger';
const log = createLogger('UserModule');
import { PlanType, CreateExternalUserData, UpdateProfileData, CreditConsumption } from '../types/userTypes';
import { useUser } from '../hooks/useUser';
import '../utils/creditMonitor'; // 🎯 初始化信用监控系统

// ================================================================================
// UserModule Interface
// ================================================================================

export interface UserModuleInterface {
  // Auth State
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // User Data
  authUser: any;
  externalUser: any;
  subscription: any;
  
  // Credits & Billing
  credits: number;
  totalCredits: number;
  hasCredits: boolean;
  currentPlan: string;
  
  // Actions
  login: () => void;
  signup: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  consumeUserCredits: (consumption: CreditConsumption) => Promise<void>;
  createCheckout: (planType: PlanType) => Promise<string>;
  
  // Utils
  getAccessToken: () => Promise<string>;
  checkHealth: () => Promise<any>;
}

// ================================================================================
// Pricing Configuration
// ================================================================================

export const PRICING_PLANS = [
  {
    id: 'free' as PlanType,
    name: 'Free',
    price: 0,
    credits: 1000,
    features: ['1,000 AI credits/month', 'Basic AI models', 'Email support'],
    stripePriceId: ''
  },
  {
    id: 'pro' as PlanType,
    name: 'Pro', 
    price: 29,
    credits: 10000,
    features: ['10,000 AI credits/month', 'Advanced AI models', 'Priority support', 'API access'],
    stripePriceId: 'price_1RbchvL7y127fTKemRuw8Elz',
    popular: true
  },
  {
    id: 'enterprise' as PlanType,
    name: 'Enterprise',
    price: 99,
    credits: 50000,
    features: ['50,000 AI credits/month', 'All AI models', 'Dedicated support', 'Custom training'],
    stripePriceId: 'price_1RbciEL7y127fTKexyDAX9JA'
  }
] as const;

// ================================================================================
// UserModule Context
// ================================================================================

const UserModuleContext = React.createContext<UserModuleInterface | null>(null);

// ================================================================================
// UserModule Provider Component
// ================================================================================

export const UserModule: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Gateway Auth Integration
  const {
    authUser,
    isLoading: authLoading,
    error: authError,
    isAuthenticated,
    login: gatewayLogin,
    logout: gatewayLogout,
    getAccessToken: getStoredToken,
    getAuthHeadersAsync,
  } = useAuthContext();

  // User Hook Integration (正确的架构：通过useUser访问store)
  const userHook = useUser();

  // Computed user values from useUser hook
  const credits = userHook.credits;
  const totalCredits = userHook.totalCredits;
  const hasCredits = userHook.hasCredits;
  const currentPlan = userHook.currentPlan;
  const externalUser = userHook.externalUser;
  const subscription = userHook.subscription;

  // Create authenticated userService instance
  const userService = useMemo(() => {
    const getAuthHeaders = async () => {
      if (!isAuthenticated) {
        throw new Error('Not authenticated');
      }
      return getAuthHeadersAsync();
    };

    return new UserService(undefined, getAuthHeaders);
  }, [isAuthenticated, getAuthHeadersAsync]);

  // ================================================================================
  // Authentication Methods
  // ================================================================================

  const getAccessToken = useCallback(async (): Promise<string> => {
    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error('No access token available');
      }
      return token;
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to get access token', { error });
      throw error;
    }
  }, [getStoredToken]);

  // Login/signup are now form-based via LoginScreen; these are no-ops
  const login = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'Login requested — handled by LoginScreen');
  }, []);

  const signup = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'Signup requested — handled by LoginScreen');
  }, []);

  // ================================================================================
  // User Synchronization Logic
  // ================================================================================

  const initializeUser = useCallback(async (): Promise<void> => {
    // 🔒 防护：检查认证状态
    if (!authUser?.sub || !authUser?.email || !authUser?.name || !isAuthenticated) {
      const missingData = {
        sub: !authUser?.sub,
        email: !authUser?.email,
        name: !authUser?.name,
        authenticated: !isAuthenticated
      };
      throw new Error(`User initialization blocked - missing: ${Object.entries(missingData).filter(([, missing]) => missing).map(([key]) => key).join(', ')}`);
    }

    const startTime = Date.now();
    const userData: CreateExternalUserData = {
      auth0_id: authUser.sub,
      email: authUser.email,
      name: authUser.name
    };

    try {
      log.info('Initializing user', {
        auth0_id: authUser.sub,
        email: authUser.email,
        timestamp: new Date().toISOString()
      });

      logger.info(LogCategory.USER_AUTH, 'Starting user initialization', userData);

      // 🔄 Step 1: 确保外部用户存在
      log.info('Calling userService.ensureUserExists...');
      const userResult = await userService.ensureUserExists(userData);
      
      // 📊 Step 2: 验证返回的用户数据
      if (!userResult || !userResult.auth0_id) {
        throw new Error('Invalid user data returned from service');
      }

      log.info('User ensured successfully', {
        auth0_id: userResult.auth0_id,
        credits: userResult.credits,
        totalCredits: userResult.credits_total,
        plan: userResult.plan,
        executionTime: Date.now() - startTime + 'ms'
      });
        
      // 💾 Step 3: 保存用户数据到store
      log.info('Saving user data to store...');
      const userStore = useUserStore.getState();
      userStore.setExternalUser(userResult);
      
      logger.info(LogCategory.USER_AUTH, 'User initialization completed successfully', { 
        auth0_id: userResult.auth0_id,
        credits: userResult.credits,
        executionTime: Date.now() - startTime
      });
        
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('User initialization failed', {
        error: errorMessage,
        auth0_id: authUser.sub,
        executionTime: Date.now() - startTime + 'ms'
      });
      
      logger.error(LogCategory.USER_AUTH, 'User initialization failed', { 
        error: errorMessage,
        auth0_id: authUser.sub 
      });
      
      throw error; // 重新抛出错误供调用者处理
    }
  }, [authUser?.sub, authUser?.email, authUser?.name, isAuthenticated, userService]);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      log.info('Skipping user refresh - not authenticated');
      return;
    }

    try {
      log.info('Starting user refresh process...');
      log.debug('Auth status', {
        isAuthenticated,
        hasAuth0User: !!authUser,
        authUserSub: authUser?.sub
      });
      
      // Get access token with detailed logging
      log.debug('Getting access token...');
      const token = await getAccessToken();
      log.debug('Token obtained', {
        hasToken: !!token,
        tokenLength: token?.length
      });
      
      // Call fetchCurrentUser with token
      log.info('Calling fetchCurrentUser...');
      try {
        await userHook.fetchCurrentUser(token);
        log.info('User data refreshed successfully');
      } catch (error) {
        // If user doesn't exist (404), try to initialize user first
        if (error instanceof Error && error.message.includes('404')) {
          log.info('User not found (404), attempting to initialize user...');

          if (authUser?.sub && authUser?.email && authUser?.name) {
            log.info('Initializing user via ensureUserExists...');
            await initializeUser();
            log.info('User initialized, retrying fetchCurrentUser...');
            await userHook.fetchCurrentUser(token);
            log.info('User data refreshed successfully after initialization');
          } else {
            throw new Error('Cannot initialize user: missing auth user data');
          }
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      log.error('Failed to refresh user', error);

      // Enhanced error reporting
      if (error instanceof Error) {
        log.error('Error details', {
          message: error.message,
          name: error.name
        });

        // Check for specific error types
        if (error.message.includes('404')) {
          log.error('404 Error - API endpoint not found or user not exists');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          log.error('Auth Error - Token invalid or expired');
        } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
          log.error('Network Error - Service might be down');
        }
      }
      
      logger.error(LogCategory.USER_AUTH, 'Failed to refresh user', { error });
      throw error;
    }
  }, [isAuthenticated, userHook, getAccessToken, authUser, initializeUser]);

  const logout = useCallback(() => {
    userHook.clearUser();
    gatewayLogout();
  }, [userHook, gatewayLogout]);

  // ================================================================================
  // Business Logic Methods
  // ================================================================================

  const consumeUserCredits = useCallback(async (consumption: CreditConsumption) => {
    const eu = externalUser as Record<string, any> | null;
    const userId = eu?.auth0_id || eu?.sub || eu?.user_id || eu?.id;
    if (!userId || !isAuthenticated) {
      throw new Error('User not authenticated or user ID missing');
    }

    try {
      const token = await getAccessToken();
      await userHook.consumeCredits(userId, consumption, token);
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to consume credits', { error, consumption });
      throw error;
    }
  }, [externalUser, isAuthenticated, userHook, getAccessToken]);

  const updateProfile = useCallback(async (data: UpdateProfileData) => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    try {
      const token = await getAccessToken();
      await userHook.updateProfile(data, token);
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to update profile', { error });
      throw error;
    }
  }, [isAuthenticated, userHook, getAccessToken]);

  const createCheckout = useCallback(async (planType: PlanType): Promise<string> => {
    const eu = externalUser as Record<string, any> | null;
    const userId = eu?.auth0_id || eu?.sub || eu?.user_id || eu?.id;
    if (!isAuthenticated || !userId) {
      throw new Error('User not authenticated or user ID missing');
    }

    try {
      const plan = PRICING_PLANS.find(p => p.id === planType);
      if (!plan) {
        throw new Error(`Invalid plan type: ${planType}`);
      }
      
      // Use userHook's createCheckout method instead of direct service call
      const token = await getAccessToken();
      return await userHook.createCheckout(planType, token);
      
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to create checkout', { error, planType });
      throw error;
    }
  }, [isAuthenticated, externalUser, userHook, getAccessToken]);

  const checkHealth = useCallback(async () => {
    try {
      return await userService.checkServiceHealth();
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Health check failed', { error });
      throw error;
    }
  }, [userService]);

  // ================================================================================
  // Effects
  // ================================================================================

  // 🆕 优雅的用户初始化状态管理
  const [initializationStatus, setInitializationStatus] = React.useState<'idle' | 'initializing' | 'initialized' | 'error'>('idle');
  const initializationRef = React.useRef<string | null>(null); // 追踪当前初始化的用户ID
  
  // 统一的用户初始化Effect - 避免重复初始化
  useEffect(() => {
    const currentUserId = authUser?.sub;
    const hasRequiredData = authUser?.sub && authUser?.email && authUser?.name;
    
    log.debug('Auth state changed', {
      authLoading,
      isAuthenticated,
      hasRequiredData,
      currentUserId,
      initializationStatus,
      previousUserId: initializationRef.current
    });

    // 🔄 情况1：正在加载 - 等待
    if (authLoading) {
      log.debug('Auth still loading, waiting...');
      return;
    }

    // 🚪 情况2：未认证 - 清理状态
    if (!isAuthenticated) {
      log.info('User not authenticated, clearing state');
      if (initializationStatus !== 'idle') {
        setInitializationStatus('idle');
        initializationRef.current = null;
        userHook.clearUser();
      }
      return;
    }

    // ✅ 情况3：已认证但缺少数据 - 等待完整数据
    if (!hasRequiredData) {
      log.debug('Authenticated but missing required user data, waiting...');
      return;
    }

    // 🎯 情况4：完整认证数据可用
    const shouldInitialize = (
      initializationStatus === 'idle' || 
      initializationRef.current !== currentUserId
    ) && initializationStatus !== 'initializing';

    if (shouldInitialize) {
      log.info('Starting user initialization', {
        userId: currentUserId,
        previousStatus: initializationStatus
      });
      
      setInitializationStatus('initializing');
      initializationRef.current = currentUserId || null;
      
      initializeUser()
        .then(() => {
          log.info('User initialization completed successfully');
          setInitializationStatus('initialized');
        })
        .catch((error) => {
          log.error('User initialization failed', error);
          setInitializationStatus('error');
        });
    }
  }, [
    authLoading, 
    isAuthenticated, 
    authUser?.sub, 
    authUser?.email, 
    authUser?.name,
    initializationStatus,
    initializeUser,
    userHook
  ]);

  // ================================================================================
  // Computed Values
  // ================================================================================

  const moduleInterface: UserModuleInterface = useMemo(() => ({
    // Auth State
    isAuthenticated,
    isLoading: authLoading || userHook.isLoading,
    error: authError || userHook.userError || userHook.creditsError || userHook.subscriptionError || null,
    
    // User Data
    authUser,
    externalUser,
    subscription,
    
    // Credits & Billing
    credits,
    totalCredits,
    hasCredits,
    currentPlan,
    
    // Actions
    login,
    signup,
    logout,
    refreshUser,
    updateProfile,
    consumeUserCredits,
    createCheckout,
    
    // Utils
    getAccessToken,
    checkHealth
  }), [
    isAuthenticated,
    authLoading,
    userHook.isLoading,
    authError,
    userHook.userError,
    userHook.creditsError,
    userHook.subscriptionError,
    authUser,
    externalUser,
    subscription,
    credits,
    totalCredits,
    hasCredits,
    currentPlan,
    login,
    signup,
    logout,
    refreshUser,
    updateProfile,
    consumeUserCredits,
    createCheckout,
    getAccessToken,
    checkHealth
  ]);

  return (
    <UserModuleContext.Provider value={moduleInterface}>
      {children}
    </UserModuleContext.Provider>
  );
};

// ================================================================================
// Hook for accessing UserModule
// ================================================================================

export const useUserModule = (): UserModuleInterface => {
  const context = React.useContext(UserModuleContext);
  if (!context) {
    throw new Error('useUserModule must be used within UserModule provider');
  }
  return context;
};

// ================================================================================
// Utilities
// ================================================================================

export const getPlanById = (planId: string) => {
  return PRICING_PLANS.find(plan => plan.id === planId) || PRICING_PLANS[0];
};

export const canUpgradeTo = (currentPlan: string, targetPlan: string): boolean => {
  const currentIndex = PRICING_PLANS.findIndex(p => p.id === currentPlan);
  const targetIndex = PRICING_PLANS.findIndex(p => p.id === targetPlan);
  return targetIndex > currentIndex;
};

export const formatCredits = (credits: number): string => {
  return credits.toLocaleString();
};

export default UserModule;
