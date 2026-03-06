/**
 * ============================================================================
 * User Handler (userHandler.tsx) - User Action Handler Component
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Handle all user-related actions and business logic
 * - Bridge UI components with UserModule
 * - Manage user interaction workflows
 * - Provide clean action interfaces for UI components
 * 
 * Architecture Integration:
 *  UI Components → userHandler → UserModule → useUser → useUserStore
 *  Separates business logic from UI rendering
 *  Centralizes user action handling
 *  Clean interfaces for UI components
 * 
 * Separation of Concerns:
 *  Responsible for:
 *   - User action orchestration
 *   - Business logic workflows
 *   - Error handling and user feedback
 *   - Integration with UserModule
 * 
 *  Not responsible for:
 *   - UI rendering (handled by UI components)
 *   - State management (handled by stores)
 *   - Direct API calls (handled by services)
 *   - Auth token management (handled by useAuth)
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useUserModule } from '../../modules/UserModule';
import { useAuth } from '../../hooks/useAuth';
import { PlanType, CreditConsumption } from '../../types/userTypes';
import { logger, LogCategory } from '../../utils/logger';
import { surfaceLinks } from '../../config/surfaceConfig';

// ================================================================================
// User Handler Interface
// ================================================================================

export interface UserHandlerInterface {
  // User Data
  user: any;
  isLoading: boolean;
  error: string | null;
  
  // Auth Data
  isAuthenticated: boolean;
  authUser: any;
  
  // Credits & Billing
  credits: number;
  totalCredits: number;
  hasCredits: boolean;
  currentPlan: string;
  usagePercentage: number;
  
  // User Actions
  handleLogin: () => void;
  handleSignup: () => void;
  handleLogout: () => void;
  handleRefreshUser: () => Promise<void>;
  
  // Credit Actions
  handleConsumeCredits: (consumption: CreditConsumption) => Promise<void>;
  handleCheckCredits: (amount: number) => boolean;
  
  // Billing Actions
  handleUpgrade: (planType: PlanType) => Promise<void>;
  handleViewPricing: () => void;
  handleManageSubscription: () => void;
  
  // Profile Actions
  handleEditProfile: () => void;
  handleSaveProfile: () => void;
  handleCancelEdit: () => void;
  
  // UI Actions
  handleToggleUserManagement: () => void;
  handleSetManagementTab: (tab: 'profile' | 'subscription' | 'usage' | 'settings') => void;
  
  // Health & Diagnostics
  handleHealthCheck: () => Promise<void>;
  
  // Error Handling
  handleClearErrors: () => void;
  handleError: (error: Error, context: string) => void;
}

// ================================================================================
// User Handler Context
// ================================================================================

const UserHandlerContext = createContext<UserHandlerInterface | null>(null);

// ================================================================================
// User Handler Provider
// ================================================================================

export const UserHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Module integrations
  const userModule = useUserModule();
  const auth = useAuth();

  // ================================================================================
  // User Actions
  // ================================================================================

  const handleLogin = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'UserHandler: Login initiated');
    auth.login();
  }, [auth]);

  const handleSignup = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'UserHandler: Signup initiated');
    auth.signup();
  }, [auth]);

  const handleLogout = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'UserHandler: Logout initiated');
    userModule.logout();
  }, [userModule]);

  const handleRefreshUser = useCallback(async () => {
    try {
      logger.info(LogCategory.USER_AUTH, 'UserHandler: Refreshing user data');
      await userModule.refreshUser();
      logger.info(LogCategory.USER_AUTH, 'UserHandler: User data refreshed successfully');
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'UserHandler: Failed to refresh user', { error });
      throw error;
    }
  }, [userModule]);

  // ================================================================================
  // Credit Actions
  // ================================================================================

  const handleConsumeCredits = useCallback(async (consumption: CreditConsumption) => {
    try {
      logger.info(LogCategory.USER_AUTH, 'UserHandler: Consuming credits', { 
        amount: consumption.amount, 
        reason: consumption.reason 
      });
      
      await userModule.consumeUserCredits(consumption);
      
      logger.info(LogCategory.USER_AUTH, 'UserHandler: Credits consumed successfully');
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'UserHandler: Failed to consume credits', { error });
      throw error;
    }
  }, [userModule]);

  const handleCheckCredits = useCallback((amount: number): boolean => {
    const canConsume = userModule.credits >= amount;
    logger.debug(LogCategory.USER_AUTH, 'UserHandler: Credit check', { 
      amount, 
      available: userModule.credits, 
      canConsume 
    });
    return canConsume;
  }, [userModule.credits]);

  // ================================================================================
  // Billing Actions
  // ================================================================================

  const handleUpgrade = useCallback(async (planType: PlanType) => {
    try {
      logger.info(LogCategory.USER_AUTH, 'UserHandler: Initiating plan upgrade', { planType });
      
      const checkoutUrl = await userModule.createCheckout(planType);
      
      logger.info(LogCategory.USER_AUTH, 'UserHandler: Redirecting to checkout', { planType });
      window.location.href = checkoutUrl;
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'UserHandler: Failed to create checkout', { error, planType });
      throw error;
    }
  }, [userModule]);

  const handleViewPricing = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'UserHandler: Opening pricing page');
    window.open(surfaceLinks.marketingPricing, '_blank');
  }, []);

  const handleManageSubscription = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'UserHandler: Opening subscription management');
    window.open(surfaceLinks.appDashboard, '_blank');
  }, []);

  // ================================================================================
  // Profile Actions (placeholder for future implementation)
  // ================================================================================

  const handleEditProfile = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'UserHandler: Edit profile initiated');
    // TODO: Implement profile editing
  }, []);

  const handleSaveProfile = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'UserHandler: Save profile initiated');
    // TODO: Implement profile saving
  }, []);

  const handleCancelEdit = useCallback(() => {
    logger.info(LogCategory.USER_AUTH, 'UserHandler: Cancel edit initiated');
    // TODO: Implement cancel edit
  }, []);

  // ================================================================================
  // UI Actions (placeholder for future implementation)
  // ================================================================================

  const handleToggleUserManagement = useCallback(() => {
    logger.debug(LogCategory.USER_AUTH, 'UserHandler: Toggle user management');
    // TODO: Integrate with UI state management
  }, []);

  const handleSetManagementTab = useCallback((tab: 'profile' | 'subscription' | 'usage' | 'settings') => {
    logger.debug(LogCategory.USER_AUTH, 'UserHandler: Set management tab', { tab });
    // TODO: Integrate with UI state management
  }, []);

  // ================================================================================
  // Health & Diagnostics
  // ================================================================================

  const handleHealthCheck = useCallback(async () => {
    try {
      logger.info(LogCategory.USER_AUTH, 'UserHandler: Running health check');
      const result = await userModule.checkHealth();
      logger.info(LogCategory.USER_AUTH, 'UserHandler: Health check completed', { result });
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'UserHandler: Health check failed', { error });
      throw error;
    }
  }, [userModule]);

  // ================================================================================
  // Error Handling
  // ================================================================================

  const handleClearErrors = useCallback(() => {
    logger.debug(LogCategory.USER_AUTH, 'UserHandler: Clearing errors');
    // TODO: Integrate with error state management
  }, []);

  const handleError = useCallback((error: Error, context: string) => {
    logger.error(LogCategory.USER_AUTH, `UserHandler: Error in ${context}`, { error });
    // TODO: Implement user-friendly error handling
  }, []);

  // ================================================================================
  // Computed Properties
  // ================================================================================

  const computedProperties = useMemo(() => {
    const totalCredits = userModule.totalCredits || 1; // Avoid division by zero
    const usedCredits = totalCredits - userModule.credits;
    
    return {
      usagePercentage: Math.round((usedCredits / totalCredits) * 100)
    };
  }, [userModule.credits, userModule.totalCredits]);

  // ================================================================================
  // Handler Interface
  // ================================================================================

  const handlerInterface: UserHandlerInterface = useMemo(() => ({
    // User Data
    user: userModule.externalUser,
    isLoading: userModule.isLoading,
    error: userModule.error,
    
    // Auth Data
    isAuthenticated: userModule.isAuthenticated,
    authUser: userModule.authUser,
    
    // Credits & Billing
    credits: userModule.credits,
    totalCredits: userModule.totalCredits,
    hasCredits: userModule.hasCredits,
    currentPlan: userModule.currentPlan,
    usagePercentage: computedProperties.usagePercentage,
    
    // User Actions
    handleLogin,
    handleSignup,
    handleLogout,
    handleRefreshUser,
    
    // Credit Actions
    handleConsumeCredits,
    handleCheckCredits,
    
    // Billing Actions
    handleUpgrade,
    handleViewPricing,
    handleManageSubscription,
    
    // Profile Actions
    handleEditProfile,
    handleSaveProfile,
    handleCancelEdit,
    
    // UI Actions
    handleToggleUserManagement,
    handleSetManagementTab,
    
    // Health & Diagnostics
    handleHealthCheck,
    
    // Error Handling
    handleClearErrors,
    handleError
  }), [
    userModule,
    computedProperties,
    handleLogin,
    handleSignup,
    handleLogout,
    handleRefreshUser,
    handleConsumeCredits,
    handleCheckCredits,
    handleUpgrade,
    handleViewPricing,
    handleManageSubscription,
    handleEditProfile,
    handleSaveProfile,
    handleCancelEdit,
    handleToggleUserManagement,
    handleSetManagementTab,
    handleHealthCheck,
    handleClearErrors,
    handleError
  ]);

  return (
    <UserHandlerContext.Provider value={handlerInterface}>
      {children}
    </UserHandlerContext.Provider>
  );
};

// ================================================================================
// Hook for accessing UserHandler
// ================================================================================

export const useUserHandler = (): UserHandlerInterface => {
  const context = useContext(UserHandlerContext);
  if (!context) {
    throw new Error('useUserHandler must be used within UserHandler provider');
  }
  return context;
};

// ================================================================================
// Utilities
// ================================================================================

export const formatCredits = (credits: number): string => {
  return credits.toLocaleString();
};

export const getCreditColor = (credits: number): string => {
  if (credits === 0) return 'text-red-400';
  if (credits < 100) return 'text-yellow-400';
  return 'text-green-400';
};

export const getPlanDisplayName = (plan: string): string => {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
};

export default UserHandler;
