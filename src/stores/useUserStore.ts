/**
 * ============================================================================
 * User Store (useUserStore.ts) - User State Management
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Centralized user state management with Zustand
 * - External user data storage and synchronization
 * - Subscription and billing state management
 * - Credits tracking and consumption state
 * - Error state management for user operations
 * 
 * Architecture Integration:
 * - Used by useUser hook for state bridge
 * - Integrated with UserModule for business logic
 * - Connected to userService for API operations
 * - Clean separation from authentication (handled by useAuth)
 * 
 * Separation of Concerns:
 * ✅ Responsible for:
 *   - User data state storage and mutations
 *   - Subscription state management
 *   - Credits state tracking
 *   - Loading and error states
 *   - State persistence and hydration
 * 
 * ❌ Not responsible for:
 *   - API calls (handled by userService)
 *   - Business logic (handled by UserModule)
 *   - UI rendering (handled by components)
 *   - Authentication (handled by useAuth)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  ExternalUser, 
  ExternalSubscription,
  CreditConsumption 
} from '../types/userTypes';
import { logger, LogCategory, createLogger } from '../utils/logger';

const log = createLogger('UserStore', LogCategory.USER_AUTH);

// ================================================================================
// Store State Interface
// ================================================================================

export interface UserStore {
  // User Data
  externalUser: ExternalUser | null;
  subscription: ExternalSubscription | null;
  
  // Loading States
  isLoading: boolean;
  
  // Error States
  userError: string | null;
  creditsError: string | null;
  subscriptionError: string | null;
  
  // Actions - User Management
  setExternalUser: (user: ExternalUser | null) => void;
  setSubscription: (subscription: ExternalSubscription | null) => void;
  clearUserState: () => void;
  
  // Actions - Loading States
  setLoading: (loading: boolean) => void;
  
  // Actions - Error Management
  setUserError: (error: string | null) => void;
  setCreditsError: (error: string | null) => void;
  setSubscriptionError: (error: string | null) => void;
  clearErrors: () => void;
  
  // Actions - Credits Management
  updateCredits: (credits: number, source?: 'api' | 'billing' | 'manual') => void;
  consumeCreditsOptimistic: (consumption: CreditConsumption) => void;
  revertCreditsOptimistic: () => void;
}

// ================================================================================
// Initial State
// ================================================================================

const initialState = {
  // User Data
  externalUser: null,
  subscription: null,
  
  // Loading States
  isLoading: false,
  
  // Error States
  userError: null,
  creditsError: null,
  subscriptionError: null,
};

// ================================================================================
// Store Implementation
// ================================================================================

export const useUserStore = create<UserStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // ================================================================================
    // User Management Actions
    // ================================================================================
    
    setExternalUser: (user: ExternalUser | null) => {
      logger.info(LogCategory.USER_AUTH, 'Setting external user', { 
        auth0_id: user?.auth0_id,
        email: user?.email,
        credits: user?.credits 
      });
      
      set({ 
        externalUser: user,
        userError: null // Clear error on successful user set
      });
    },
    
    setSubscription: (subscription: ExternalSubscription | null) => {
      logger.info(LogCategory.USER_AUTH, 'Setting user subscription', { 
        subscriptionId: subscription?.id,
        planType: subscription?.plan_type,
        status: subscription?.status 
      });
      
      set({ 
        subscription,
        subscriptionError: null // Clear error on successful subscription set
      });
    },
    
    clearUserState: () => {
      logger.info(LogCategory.USER_AUTH, 'Clearing all user state');
      set(initialState);
    },
    
    // ================================================================================
    // Loading State Actions
    // ================================================================================
    
    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },
    
    // ================================================================================
    // Error Management Actions
    // ================================================================================
    
    setUserError: (error: string | null) => {
      if (error) {
        logger.error(LogCategory.USER_AUTH, 'User error set', { error });
      }
      set({ userError: error });
    },
    
    setCreditsError: (error: string | null) => {
      if (error) {
        logger.error(LogCategory.USER_AUTH, 'Credits error set', { error });
      }
      set({ creditsError: error });
    },
    
    setSubscriptionError: (error: string | null) => {
      if (error) {
        logger.error(LogCategory.USER_AUTH, 'Subscription error set', { error });
      }
      set({ subscriptionError: error });
    },
    
    clearErrors: () => {
      logger.info(LogCategory.USER_AUTH, 'Clearing all user errors');
      set({ 
        userError: null,
        creditsError: null,
        subscriptionError: null 
      });
    },
    
    // ================================================================================
    // Credits Management Actions
    // ================================================================================
    
    // 🆕 智能信用更新机制
    updateCredits: (newCredits: number, source?: 'api' | 'billing' | 'manual') => {
      const currentUser = get().externalUser;
      if (!currentUser) {
        log.warn('Cannot update credits - no current user');
        return;
      }
      
      const oldCredits = currentUser.credits;
      const difference = newCredits - oldCredits;
      const timestamp = new Date().toISOString();
      
      // 🔍 数据验证
      if (newCredits < 0) {
        log.warn('Invalid credits value - cannot be negative', { newCredits });
        return;
      }
      
      // 🛡️ 防御性检查：确保用户数据完整
      if (!currentUser.auth0_id) {
        log.error('Critical error - currentUser missing auth0_id', {
          hasAuth0Id: !!currentUser.auth0_id,
          userKeys: Object.keys(currentUser),
          newCredits,
          source
        });
        return; // 阻止继续执行，避免错误传播
      }
      
      log.info('Updating user credits', {
        auth0_id: currentUser.auth0_id,
        transition: `${oldCredits} → ${newCredits}`,
        difference: difference > 0 ? `+${difference}` : `${difference}`,
        source: source || 'unknown',
        timestamp,
        totalCredits: currentUser.credits_total
      });
        
      logger.info(LogCategory.USER_AUTH, 'Smart credit update', { 
        auth0_id: currentUser.auth0_id,
        oldCredits,
        newCredits,
        difference,
        source
      });
        
      set({ 
        externalUser: { 
          ...currentUser, 
          credits: newCredits,
          // 🔧 修复：确保credits_total保持不变（除非是API源的完整用户数据更新）
          credits_total: currentUser.credits_total // 保持总积分不变
        },
        creditsError: null // 清除之前的错误
      });
      
      // 📢 发出信用更新通知（供其他组件监听）
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userCreditsUpdated', {
          detail: {
            auth0_id: currentUser.auth0_id,
            oldCredits,
            newCredits,
            difference,
            source,
            timestamp
          }
        }));
      }
    },
    
    consumeCreditsOptimistic: (consumption: CreditConsumption) => {
      const currentUser = get().externalUser;
      if (currentUser) {
        const newCredits = Math.max(0, currentUser.credits - consumption.amount);
        
        logger.info(LogCategory.USER_AUTH, 'Optimistic credits consumption', { 
          auth0_id: currentUser.auth0_id,
          consumption: consumption.amount,
          reason: consumption.reason,
          oldCredits: currentUser.credits,
          newCredits 
        });
        
        set({ 
          externalUser: { 
            ...currentUser, 
            credits: newCredits 
          }
        });
      }
    },
    
    revertCreditsOptimistic: () => {
      // This would need to store original credits value
      // For now, just log the revert attempt
      logger.warn(LogCategory.USER_AUTH, 'Credits optimistic revert requested - implement if needed');
    },
  }))
);

// ================================================================================
// Store Selectors (Optional convenience selectors)
// ================================================================================

// User selectors
export const selectExternalUser = (state: UserStore) => state.externalUser;
export const selectSubscription = (state: UserStore) => state.subscription;
export const selectIsLoading = (state: UserStore) => state.isLoading;

// Credits selectors
export const selectCredits = (state: UserStore) => state.externalUser?.credits || 0;
export const selectTotalCredits = (state: UserStore) => state.externalUser?.credits_total || 0;
export const selectHasCredits = (state: UserStore) => (state.externalUser?.credits || 0) > 0;
export const selectCurrentPlan = (state: UserStore) => state.externalUser?.plan || 'free';

// Error selectors
export const selectUserError = (state: UserStore) => state.userError;
export const selectCreditsError = (state: UserStore) => state.creditsError;
export const selectSubscriptionError = (state: UserStore) => state.subscriptionError;
export const selectHasErrors = (state: UserStore) => 
  !!(state.userError || state.creditsError || state.subscriptionError);

// ================================================================================
// Store Event Subscriptions (Optional)
// ================================================================================

// Subscribe to user changes for logging
useUserStore.subscribe(
  (state) => state.externalUser,
  (user, previousUser) => {
    if (user && !previousUser) {
      logger.info(LogCategory.USER_AUTH, 'User logged in', { auth0_id: user.auth0_id });
    } else if (!user && previousUser) {
      logger.info(LogCategory.USER_AUTH, 'User logged out', { auth0_id: previousUser.auth0_id });
    } else if (user && previousUser && user.credits !== previousUser.credits) {
      logger.info(LogCategory.USER_AUTH, 'User credits changed', { 
        auth0_id: user.auth0_id,
        oldCredits: previousUser.credits,
        newCredits: user.credits,
        change: user.credits - previousUser.credits
      });
    }
  }
);

export default useUserStore;