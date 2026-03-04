/**
 * ============================================================================
 * User Module (UserModule.tsx) - User Business Logic Orchestrator
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Orchestrate Auth0 authentication with external user management
 * - Bridge useAuth hook with useUserStore state management
 * - Handle user initialization and synchronization flows
 * - Provide clean business logic interfaces for UI components
 * - Manage user subscription and billing workflows
 * 
 * Architecture Integration:
 *  Auth Layer: useAuth (Auth0) � UserModule � useUserStore (External)
 *  Business Logic: Complex user flows handled here, not in UI
 *  Service Integration: Uses new userService class instead of deprecated functions
 *  State Coordination: Synchronizes Auth0 state with external user state
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
 *   - Auth0 token management (handled by useAuth)
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { useUserStore } from '../stores/useUserStore';
import { UserService } from '../api/userService';
import { logger, LogCategory } from '../utils/logger';
import { PlanType, CreateExternalUserData, CreditConsumption } from '../types/userTypes';
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
  auth0User: any;
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
  // Gateway Auth Integration (migrated from Auth0)
  const {
    authUser: auth0User,
    isLoading: auth0Loading,
    error: auth0Error,
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
    if (!auth0User?.sub || !auth0User?.email || !auth0User?.name || !isAuthenticated) {
      const missingData = {
        sub: !auth0User?.sub,
        email: !auth0User?.email,
        name: !auth0User?.name,
        authenticated: !isAuthenticated
      };
      throw new Error(`User initialization blocked - missing: ${Object.entries(missingData).filter(([, missing]) => missing).map(([key]) => key).join(', ')}`);
    }

    const startTime = Date.now();
    const userData: CreateExternalUserData = {
      auth0_id: auth0User.sub,
      email: auth0User.email,
      name: auth0User.name
    };

    try {
      console.log('👤 UserModule: 🚀 Initializing user', {
        auth0_id: auth0User.sub,
        email: auth0User.email,
        timestamp: new Date().toISOString()
      });

      logger.info(LogCategory.USER_AUTH, 'Starting user initialization', userData);

      // 🔄 Step 1: 确保外部用户存在
      console.log('👤 UserModule: 📡 Calling userService.ensureUserExists...');
      const userResult = await userService.ensureUserExists(userData);
      
      // 📊 Step 2: 验证返回的用户数据
      if (!userResult || !userResult.auth0_id) {
        throw new Error('Invalid user data returned from service');
      }

      console.log('👤 UserModule: ✅ User ensured successfully', { 
        auth0_id: userResult.auth0_id, 
        credits: userResult.credits,
        totalCredits: userResult.credits_total,
        plan: userResult.plan,
        executionTime: Date.now() - startTime + 'ms'
      });
        
      // 💾 Step 3: 保存用户数据到store
      console.log('👤 UserModule: 💾 Saving user data to store...');
      const userStore = useUserStore.getState();
      userStore.setExternalUser(userResult);
      
      logger.info(LogCategory.USER_AUTH, 'User initialization completed successfully', { 
        auth0_id: userResult.auth0_id,
        credits: userResult.credits,
        executionTime: Date.now() - startTime
      });
        
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('👤 UserModule: ❌ User initialization failed', {
        error: errorMessage,
        auth0_id: auth0User.sub,
        executionTime: Date.now() - startTime + 'ms'
      });
      
      logger.error(LogCategory.USER_AUTH, 'User initialization failed', { 
        error: errorMessage,
        auth0_id: auth0User.sub 
      });
      
      throw error; // 重新抛出错误供调用者处理
    }
  }, [auth0User?.sub, auth0User?.email, auth0User?.name, isAuthenticated, userService]);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('👤 UserModule: Skipping user refresh - not authenticated');
      return;
    }

    try {
      console.log('👤 UserModule: Starting user refresh process...');
      console.log('👤 UserModule: Auth status:', { 
        isAuthenticated, 
        hasAuth0User: !!auth0User,
        auth0UserSub: auth0User?.sub 
      });
      
      // Get access token with detailed logging
      console.log('👤 UserModule: Getting access token...');
      const token = await getAccessToken();
      console.log('👤 UserModule: Token obtained:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenStart: token?.substring(0, 30) + '...'
      });
      
      // Call fetchCurrentUser with token
      console.log('👤 UserModule: Calling fetchCurrentUser...');
      try {
        await userHook.fetchCurrentUser(token);
        console.log('👤 UserModule: User data refreshed successfully');
      } catch (error) {
        // If user doesn't exist (404), try to initialize user first
        if (error instanceof Error && error.message.includes('404')) {
          console.log('👤 UserModule: User not found (404), attempting to initialize user...');
          
          if (auth0User?.sub && auth0User?.email && auth0User?.name) {
            console.log('👤 UserModule: Initializing user via ensureUserExists...');
            await initializeUser();
            console.log('👤 UserModule: User initialized, retrying fetchCurrentUser...');
            await userHook.fetchCurrentUser(token);
            console.log('👤 UserModule: User data refreshed successfully after initialization');
          } else {
            throw new Error('Cannot initialize user: missing auth user data');
          }
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error('👤 UserModule: Failed to refresh user', error);
      
      // Enhanced error reporting
      if (error instanceof Error) {
        console.error('👤 UserModule: Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        // Check for specific error types
        if (error.message.includes('404')) {
          console.error('👤 UserModule: 404 Error - API endpoint not found or user not exists');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          console.error('👤 UserModule: Auth Error - Token invalid or expired');
        } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
          console.error('👤 UserModule: Network Error - Service might be down');
        }
      }
      
      logger.error(LogCategory.USER_AUTH, 'Failed to refresh user', { error });
      throw error;
    }
  }, [isAuthenticated, userHook.fetchCurrentUser, getAccessToken, auth0User, initializeUser]);

  const logout = useCallback(() => {
    userHook.clearUser();
    gatewayLogout();
  }, [userHook.clearUser, gatewayLogout]);

  // ================================================================================
  // Business Logic Methods
  // ================================================================================

  const consumeUserCredits = useCallback(async (consumption: CreditConsumption) => {
    if (!externalUser?.auth0_id || !isAuthenticated) {
      throw new Error('User not authenticated or auth0_id missing');
    }

    try {
      // Use userHook's consumeCredits method instead of direct service call
      const token = await getAccessToken();
      await userHook.consumeCredits(externalUser.auth0_id, consumption, token);
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to consume credits', { error, consumption });
      throw error;
    }
  }, [externalUser?.auth0_id, isAuthenticated, userHook.consumeCredits, getAccessToken]);

  const createCheckout = useCallback(async (planType: PlanType): Promise<string> => {
    if (!isAuthenticated || !externalUser?.auth0_id) {
      throw new Error('User not authenticated or auth0_id missing');
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
  }, [isAuthenticated, externalUser?.auth0_id, userHook.createCheckout, getAccessToken]);

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
    const currentUserId = auth0User?.sub;
    const hasRequiredData = auth0User?.sub && auth0User?.email && auth0User?.name;
    
    console.log('👤 UserModule: Auth state changed', {
      auth0Loading,
      isAuthenticated,
      hasRequiredData,
      currentUserId,
      initializationStatus,
      previousUserId: initializationRef.current
    });

    // 🔄 情况1：正在加载 - 等待
    if (auth0Loading) {
      console.log('👤 UserModule: Auth0 still loading, waiting...');
      return;
    }

    // 🚪 情况2：未认证 - 清理状态
    if (!isAuthenticated) {
      console.log('👤 UserModule: User not authenticated, clearing state');
      if (initializationStatus !== 'idle') {
        setInitializationStatus('idle');
        initializationRef.current = null;
        userHook.clearUser();
      }
      return;
    }

    // ✅ 情况3：已认证但缺少数据 - 等待完整数据
    if (!hasRequiredData) {
      console.log('👤 UserModule: Authenticated but missing required user data, waiting...');
      return;
    }

    // 🎯 情况4：完整认证数据可用
    const shouldInitialize = (
      initializationStatus === 'idle' || 
      initializationRef.current !== currentUserId
    ) && initializationStatus !== 'initializing';

    if (shouldInitialize) {
      console.log('👤 UserModule: Starting user initialization', {
        userId: currentUserId,
        previousStatus: initializationStatus
      });
      
      setInitializationStatus('initializing');
      initializationRef.current = currentUserId || null;
      
      initializeUser()
        .then(() => {
          console.log('👤 UserModule: User initialization completed successfully');
          setInitializationStatus('initialized');
        })
        .catch((error) => {
          console.error('👤 UserModule: User initialization failed', error);
          setInitializationStatus('error');
        });
    }
  }, [
    auth0Loading, 
    isAuthenticated, 
    auth0User?.sub, 
    auth0User?.email, 
    auth0User?.name,
    initializationStatus,
    initializeUser, 
    userHook.clearUser
  ]);

  // ================================================================================
  // Computed Values
  // ================================================================================

  const moduleInterface: UserModuleInterface = useMemo(() => ({
    // Auth State
    isAuthenticated,
    isLoading: auth0Loading || userHook.isLoading,
    error: auth0Error?.message || userHook.userError || userHook.creditsError || userHook.subscriptionError || null,
    
    // User Data
    auth0User,
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
    consumeUserCredits,
    createCheckout,
    
    // Utils
    getAccessToken,
    checkHealth
  }), [
    isAuthenticated,
    auth0Loading,
    userHook.isLoading,
    auth0Error,
    userHook.userError,
    userHook.creditsError,
    userHook.subscriptionError,
    auth0User,
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
