/**
 * ============================================================================
 * User Hook (useUser.ts) - User State Management Hook
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Bridge between business logic and user state store
 * - Provide clean interface for user data operations
 * - Handle user state changes and side effects
 * - Abstract store implementation details from business logic
 * 
 * Architecture Integration:
 * - Modules -> useUser -> useUserStore (State)
 * - Components -> useUser -> useUserStore (State)
 * - Clean separation: Business logic doesn't know about store internals
 * - Hook handles all state synchronization and side effects
 * 
 * Separation of Concerns:
 * ✅ Responsible for:
 *   - User state access and mutations
 *   - External API integration via userService
 *   - State synchronization and validation
 *   - Error handling and recovery
 *   - Business logic abstractions
 * 
 * ❌ Not responsible for:
 *   - UI rendering (handled by components)
 *   - Raw state storage (handled by useUserStore)
 *   - HTTP transport (handled by userService)
 *   - Authentication logic (handled by useAuth)
 */

import React, { useCallback } from 'react';
import { useUserStore } from '../stores/useUserStore';
import { UserService } from '../api/userService';
import { logger, LogCategory, createLogger } from '../utils/logger';

const log = createLogger('useUser');
import {
  ExternalUser,
  CreateExternalUserData,
  UpdateProfileData,
  CreditConsumption,
  PlanType,
  ExternalSubscription
} from '../types/userTypes';

// ================================================================================
// Hook Interface
// ================================================================================

export interface UseUserReturn {
  // User State
  externalUser: ExternalUser | null;
  subscription: ExternalSubscription | null;
  isLoading: boolean;
  userError: string | null;
  creditsError: string | null;
  subscriptionError: string | null;
  
  // Computed Values
  credits: number;
  totalCredits: number;
  hasCredits: boolean;
  currentPlan: string;
  usagePercentage: number;
  creditInsights: {
    remaining: number;
    total: number;
    used: number;
    usageRatio: number;
    isLowBalance: boolean;
    isNearEmpty: boolean;
    isEmpty: boolean;
  };
  
  // User Actions
  ensureUser: (userData: CreateExternalUserData, accessToken: string) => Promise<void>;
  fetchCurrentUser: (accessToken: string) => Promise<void>;
  updateProfile: (data: UpdateProfileData, accessToken: string) => Promise<void>;
  clearUser: () => void;
  
  // Credits Actions
  consumeCredits: (auth0_id: string, consumption: CreditConsumption, accessToken: string) => Promise<void>;
  
  // Subscription Actions
  fetchSubscription: (auth0_id: string, accessToken: string) => Promise<void>;
  createCheckout: (planType: PlanType, accessToken: string) => Promise<string>;
}

// ================================================================================
// Main Hook Implementation
// ================================================================================

export const useUser = (): UseUserReturn => {
  // Store state access
  const {
    externalUser,
    subscription,
    isLoading,
    userError,
    creditsError,  
    subscriptionError,
    setExternalUser,
    setSubscription,
    setLoading,
    setUserError,
    setCreditsError,
    setSubscriptionError,
    updateProfile: storeUpdateProfile,
    clearUserState
  } = useUserStore();

  // ================================================================================
  // 💎 Computed Values - 优雅的信用状态计算
  // ================================================================================

  const credits = externalUser?.credits ?? 0;
  const totalCredits = externalUser?.credits_total ?? 0;
  const hasCredits = credits > 0;
  const currentPlan = externalUser?.plan || 'free';
  const usagePercentage = totalCredits > 0 ? Math.round(((totalCredits - credits) / totalCredits) * 100) : 0;
  
  // 🔍 Advanced credit insights
  const creditInsights = React.useMemo(() => {
    const remaining = credits;
    const total = totalCredits;
    const used = total - remaining;
    const usageRatio = total > 0 ? used / total : 0;
    
    log.debug('Credit insights computed', {
      remaining,
      total,
      used,
      usagePercentage: Math.round(usageRatio * 100),
      planType: currentPlan,
      timestamp: new Date().toISOString()
    });
    
    return {
      remaining,
      total,
      used,
      usageRatio,
      isLowBalance: remaining < (total * 0.1), // 低于10%余额
      isNearEmpty: remaining < 10, // 少于10个积分
      isEmpty: remaining === 0
    };
  }, [credits, totalCredits, currentPlan]);

  // ================================================================================
  // User Management Actions
  // ================================================================================

  const ensureUser = useCallback(async (userData: CreateExternalUserData, accessToken: string) => {
    try {
      setLoading(true);
      setUserError(null);
      
      logger.info(LogCategory.USER_AUTH, 'Ensuring external user exists', { email: userData.email });
      
      /** @deprecated UserModule now handles user initialization */
      throw new Error('ensureUser is deprecated — UserModule handles user initialization automatically');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to ensure user';
      logger.error(LogCategory.USER_AUTH, 'Failed to ensure user', { error });
      setUserError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUserError]);

  const fetchCurrentUser = useCallback(async (accessToken: string) => {
    const startTime = Date.now();
    
    try {
      setLoading(true);
      setUserError(null);
      
      log.info('Fetching current user data with auth token...');
      logger.info(LogCategory.USER_AUTH, 'Fetching current user');
      
      // 🔑 创建带认证的userService实例
      const authenticatedUserService = new UserService(
        undefined, // 使用默认URL
        async () => ({
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        })
      );
      
      log.debug('Using authenticated userService with token:', {
        tokenLength: accessToken?.length,
        tokenStart: accessToken?.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
      
      // 🔄 使用认证的userService获取最新用户数据
      const user = await authenticatedUserService.getCurrentUser();
      
      if (user) {
        // 🎯 比较并更新用户数据
        const previousCredits = externalUser?.credits ?? -1;
        const newCredits = user.credits;
        
        log.info('User data fetched successfully', {
          auth0_id: user.auth0_id,
          creditsChange: {
            from: previousCredits,
            to: newCredits,
            diff: previousCredits >= 0 ? newCredits - previousCredits : 'initial'
          },
          plan: user.plan,
          executionTime: Date.now() - startTime + 'ms'
        });
        
        setExternalUser(user);
        logger.info(LogCategory.USER_AUTH, 'Current user fetched successfully', { 
          auth0_id: user.auth0_id,
          credits: user.credits
        });
      } else {
        log.warn('No current user data returned from service');
        logger.warn(LogCategory.USER_AUTH, 'No current user found');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
      log.error('Failed to fetch current user', {
        error: errorMessage,
        executionTime: Date.now() - startTime + 'ms',
        hasAccessToken: !!accessToken,
        tokenLength: accessToken?.length
      });
      logger.error(LogCategory.USER_AUTH, 'Failed to fetch current user', { error });
      setUserError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUserError, setExternalUser, externalUser?.credits]);

  const clearUser = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'Clearing user state');
    clearUserState();
  }, [clearUserState]);

  const updateProfile = useCallback(async (data: UpdateProfileData, accessToken: string) => {
    try {
      setLoading(true);
      setUserError(null);

      logger.info(LogCategory.USER_AUTH, 'Updating user profile', { fields: Object.keys(data) });

      const authenticatedUserService = new UserService(
        undefined,
        async () => ({
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        })
      );

      const updatedUser = await authenticatedUserService.updateProfile(data);

      // Update store with the server response
      setExternalUser(updatedUser);

      logger.info(LogCategory.USER_AUTH, 'Profile updated successfully', {
        auth0_id: updatedUser.auth0_id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      logger.error(LogCategory.USER_AUTH, 'Failed to update profile', { error });
      setUserError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUserError, setExternalUser]);

  // ================================================================================
  // Credits Management Actions
  // ================================================================================

  const consumeCredits = useCallback(async (auth0_id: string, consumption: CreditConsumption, accessToken: string) => {
    try {
      setCreditsError(null);
      
      logger.info(LogCategory.USER_AUTH, 'Consuming user credits', { auth0_id, amount: consumption.amount });
      
      // 🔑 使用认证的userService
      const authenticatedUserService = new UserService(
        undefined,
        async () => ({
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        })
      );
      
      const consumptionResult = await authenticatedUserService.consumeCredits(auth0_id, consumption.amount, consumption.reason);
      
      // Update user with remaining credits from result
      if (externalUser) {
        const updatedExternalUser = { ...externalUser, credits: consumptionResult.remaining_credits };
        setExternalUser(updatedExternalUser);
        logger.info(LogCategory.USER_AUTH, 'Credits consumed successfully', { 
          auth0_id, 
          remainingCredits: consumptionResult.remaining_credits 
        });
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to consume credits';
      logger.error(LogCategory.USER_AUTH, 'Failed to consume credits', { error, auth0_id });
      setCreditsError(errorMessage);
      throw error;
    }
  }, [setCreditsError, setExternalUser, externalUser]);

  // ================================================================================
  // Subscription Management Actions
  // ================================================================================

  const fetchSubscription = useCallback(async (auth0_id: string, accessToken: string) => {
    try {
      setSubscriptionError(null);
      
      logger.info(LogCategory.USER_AUTH, 'Fetching user subscription', { auth0_id });
      
      // 🔑 使用认证的userService
      const authenticatedUserService = new UserService(
        undefined,
        async () => ({
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        })
      );
      
      const subscription = await authenticatedUserService.getUserSubscription(auth0_id);
      
      setSubscription(subscription);
      logger.info(LogCategory.USER_AUTH, 'Subscription fetched successfully', { 
        auth0_id, 
        plan: subscription?.plan_type 
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch subscription';
      logger.error(LogCategory.USER_AUTH, 'Failed to fetch subscription', { error, auth0_id });
      setSubscriptionError(errorMessage);
      // Don't throw - subscription is optional
    }
  }, [setSubscriptionError, setSubscription]);

  const createCheckout = useCallback(async (planType: PlanType, accessToken: string): Promise<string> => {
    try {
      setSubscriptionError(null);
      
      logger.info(LogCategory.USER_AUTH, 'Creating checkout session', { planType });
      
      // 🔑 使用认证的userService
      const authenticatedUserService = new UserService(
        undefined,
        async () => ({
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        })
      );
      
      const checkoutSession = await authenticatedUserService.createCheckoutSession(planType);
      
      logger.info(LogCategory.USER_AUTH, 'Checkout session created successfully', { planType });
      return checkoutSession.url;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout';
      logger.error(LogCategory.USER_AUTH, 'Failed to create checkout', { error, planType });
      setSubscriptionError(errorMessage);
      throw error;
    }
  }, [setSubscriptionError]);

  // ================================================================================
  // Return Hook Interface
  // ================================================================================

  return {
    // User State
    externalUser,
    subscription,
    isLoading,
    userError,
    creditsError,
    subscriptionError,
    
    // Computed Values
    credits,
    totalCredits,
    hasCredits,
    currentPlan,
    usagePercentage,
    creditInsights,
    
    // User Actions
    ensureUser,
    fetchCurrentUser,
    updateProfile,
    clearUser,
    
    // Credits Actions
    consumeCredits,
    
    // Subscription Actions
    fetchSubscription,
    createCheckout
  };
};