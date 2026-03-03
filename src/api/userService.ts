/**
 * ============================================================================
 * User Service (userService.ts) - Using @isa/core SDK
 * ============================================================================
 * 
 * Migrated from custom implementation to @isa/core UserService
 * 
 * Architecture Benefits:
 * ✅ SDK: @isa/core UserService with standardized API
 * ✅ Transport: @isa/transport HTTP with robust handling
 * ✅ Types: SDK-provided type safety
 * ✅ Error handling: Built-in SDK error management
 */

import { AccountService, WalletService } from '@isa/core';
import { HttpClient } from '@isa/transport';
import { getAuthHeaders } from '../config/gatewayConfig';
import { logger, LogCategory } from '../utils/logger';
import { getGatewayUrl } from '../config/runtimeEnv';

// Re-export types from original userTypes for compatibility
export type {
  CreateExternalUserData,
  ExternalUser,
  ExternalSubscription,
  ExternalUsageRecord,
  CreditConsumption,
  CreditConsumptionResult,
  CheckoutSession,
  CheckoutParams,
  HealthCheckResult,
  UserServiceCallbacks
} from '../types/userTypes';

// ================================================================================
// UserService Wrapper
// ================================================================================

export class UserService {
  private accountService: AccountService;
  private walletService: WalletService;

  constructor(baseUrl?: string, getAuthHeadersFn?: () => Promise<Record<string, string>>) {
    const serviceUrl = baseUrl || getGatewayUrl();

    // Initialize core services with base URL
    this.accountService = new AccountService(serviceUrl);
    this.walletService = new WalletService(serviceUrl);
    
    // Set up auth for wallet service if auth provider is available
    if (getAuthHeadersFn) {
      // WalletService will need auth headers for API calls
      // For now, we'll handle auth in the individual method calls
    }

    logger.info(LogCategory.API_REQUEST, 'UserService initialized with @isa/core SDK', { 
      baseUrl: baseUrl || getGatewayUrl()
    });
  }

  // ================================================================================
  // User Management Methods - Delegate to Core Service
  // ================================================================================

  /**
   * Ensure external user exists (create or get existing)
   */
  async ensureUserExists(userData: any): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Ensuring external user exists', {
        auth0_id: userData.auth0_id,
        email: userData.email,
        name: userData.name
      });

      // Use core service's account creation/retrieval
      const result = await this.accountService.ensureAccount({
        auth0_id: userData.auth0_id,
        email: userData.email,
        name: userData.name,
        subscription_plan: userData.subscription_plan
      });

      logger.info(LogCategory.API_REQUEST, 'User ensured successfully', { 
        userId: result.user_id 
      });

      // Get user's credits balance from WalletService
      let creditsBalance;
      try {
        // Set auth headers for wallet service
        const authHeaders = getAuthHeaders();
        if (authHeaders.Authorization) {
          const token = authHeaders.Authorization.replace('Bearer ', '');
          this.walletService.setAuthToken(token);
        }
        
        creditsBalance = await this.walletService.getUserCreditsBalance(result.user_id);
        logger.info(LogCategory.API_REQUEST, 'Credits balance retrieved', { 
          userId: result.user_id, 
          balance: creditsBalance.balance 
        });
      } catch (error) {
        logger.warn(LogCategory.API_REQUEST, 'Failed to get credits balance, using defaults', { error });
        // Use default values if wallet service fails
        creditsBalance = {
          balance: 1000,
          available_balance: 1000,
          locked_balance: 0
        };
      }

      // Map core service response to expected format (including credits)
      return {
        id: result.user_id,
        auth0_id: result.auth0_id,
        email: result.email,
        name: result.name,
        // Frontend expects these specific field names
        credits: creditsBalance.available_balance || 1000,
        credits_remaining: creditsBalance.available_balance || 1000,
        credits_total: creditsBalance.balance || 1000,
        subscription_status: result.subscription_status || 'active',
        is_active: ((result as any).account_status || (result as any).status || 'active') === 'active',
        preferences: result.preferences || {},
        created_at: result.created_at,
        updated_at: result.updated_at
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to ensure user exists', { error });
      throw error;
    }
  }

  /**
   * Get user by auth_id (auth0_id field in backend API)
   */
  async getUserByAuthId(authId: string): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting user by auth ID', { authId });

      // For now, we'll try to get by email since we don't have getUserByExternalId
      // This would need to be enhanced in the AccountService
      throw new Error('getUserByAuthId not yet implemented - use ensureUserExists instead');

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get user by auth ID', { error });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: any): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Updating user', { userId, updates });

      const result = await this.accountService.updateProfile(userId, updates);

      return {
        id: result.user_id,
        email: result.email,
        name: result.name,
        updated_at: result.updated_at
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to update user', { error });
      throw error;
    }
  }

  /**
   * Get user subscription info
   */
  async getUserSubscription(userId: string): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting user subscription', { userId });

      // Get user profile which includes subscription info
      const profile = await this.accountService.getProfile(userId);
      
      return {
        subscription_status: profile.subscription_status,
        user_id: profile.user_id
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get user subscription', { error });
      throw error;
    }
  }

  /**
   * Record credit consumption (consume credits from wallet)
   */
  async recordCreditConsumption(consumptionData: any): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Recording credit consumption', consumptionData);

      // Use WalletService to consume credits
      const consumeResult = await this.walletService.consumeUserCredits(
        consumptionData.user_id,
        {
          amount: consumptionData.credits_consumed || consumptionData.amount,
          description: consumptionData.reason || 'AI API consumption',
          usage_record_id: Date.now()
        }
      );

      logger.info(LogCategory.API_REQUEST, 'Credit consumption recorded via WalletService', {
        userId: consumptionData.user_id,
        transactionId: consumeResult.transaction_id,
        success: consumeResult.success
      });

      return {
        success: consumeResult.success,
        consumption_id: consumeResult.transaction_id,
        credits_consumed: consumptionData.credits_consumed || consumptionData.amount,
        remaining_credits: consumeResult.balance || 0 // Current balance after consumption
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to record credit consumption', { error });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Performing health check');

      // Health check - just return a basic status
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'UserService'
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Health check failed', { error });
      throw error;
    }
  }

  // ================================================================================
  // Compatibility Methods
  // ================================================================================

  /**
   * Legacy method compatibility - redirect to core service
   */
  async createCheckoutSession(params: any): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Creating checkout session', params);
      
      // This would typically be handled by PaymentService in the core
      // For now, we'll throw an error suggesting to use the PaymentService directly
      throw new Error('Checkout functionality moved to @isa/core PaymentService');

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to create checkout session', { error });
      throw error;
    }
  }

  /**
   * Get current user (compatibility method)
   */
  async getCurrentUser(): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting current user');
      
      // This would need authentication context to determine current user
      // For now, return null or throw error
      throw new Error('getCurrentUser requires authentication context - use getUser(userId) instead');

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get current user', { error });
      throw error;
    }
  }

  /**
   * Consume credits (compatibility method)
   */
  async consumeCredits(userId: string, amount: number, description?: string): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Consuming credits', { userId, amount, description });
      
      return await this.recordCreditConsumption({
        user_id: userId,
        amount,
        description: description || 'Credit consumption',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to consume credits', { error });
      throw error;
    }
  }

  /**
   * Check service health (compatibility method)
   */
  async checkServiceHealth(): Promise<any> {
    return this.healthCheck();
  }
}

// ================================================================================
// Export Functions and Default Instance
// ================================================================================

/**
 * Create UserService with authentication
 */
export const createUserService = (baseUrl?: string, getAuthHeadersFn?: () => Promise<Record<string, string>>): UserService => {
  return new UserService(baseUrl, getAuthHeadersFn);
};

// Create default instance
export const userService = createUserService();

// For backwards compatibility, also export as default
export default UserService;
