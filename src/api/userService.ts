/**
 * ============================================================================
 * User Service (userService.ts) - External User API Service
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Uses BaseApiService for robust network transport
 * - Handles all user-related API operations
 * - Provides clean interfaces for user management
 * - Manages authentication tokens and headers
 * 
 * Architecture Benefits:
 * ✅ Transport: BaseApiService robust HTTP handling
 * ✅ Types: Centralized in userTypes.ts
 * ✅ Error handling: Consistent API error management
 * ✅ Retry logic: Built-in request retry and timeout
 * 
 * vs Old Architecture:
 * Old: Direct fetch calls with manual error handling
 * New: userService(BaseApiService) with centralized error handling
 */

import { BaseApiService } from './BaseApiService';
import { config } from '../config';
import {
  CreateExternalUserData,
  UpdateProfileData,
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
import { logger, LogCategory, createLogger } from '../utils/logger';

const log = createLogger('UserService', LogCategory.API_REQUEST);

// ================================================================================
// UserService Class
// ================================================================================

export class UserService {
  private apiService: BaseApiService;

  constructor(baseUrl?: string, getAuthHeaders?: () => Promise<Record<string, string>>) {
    this.apiService = new BaseApiService(
      baseUrl || config.externalApis.userServiceUrl,
      undefined,
      getAuthHeaders
    );
    logger.info(LogCategory.API_REQUEST, 'UserService initialized', { 
      baseUrl: baseUrl || config.externalApis.userServiceUrl 
    });
  }

  // ================================================================================
  // Authentication Methods
  // ================================================================================

  // Authentication is now handled via constructor getAuthHeaders function

  // ================================================================================
  // User Management Methods
  // ================================================================================

  /**
   * Ensure external user exists (create or get existing)
   */
  async ensureUserExists(userData: CreateExternalUserData): Promise<ExternalUser> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Ensuring external user exists', {
        auth0_id: userData.auth0_id,
        email: userData.email,
        name: userData.name
      });

      // Map auth0_id → user_id for the backend (account_service uses user_id field)
      const payload = {
        user_id: userData.auth0_id,
        email: userData.email,
        name: userData.name,
      };
      const response = await this.apiService.post<ExternalUser>('/api/v1/accounts/ensure', payload);

      if (!response.success) {
        throw new Error(response.error || 'Failed to ensure user exists');
      }

      // Map user_id back to auth0_id for frontend compatibility
      const result = response.data!;
      if (!result.auth0_id && (result as any).user_id) {
        result.auth0_id = (result as any).user_id;
      }

      logger.info(LogCategory.API_REQUEST, 'External user ensured successfully', {
        auth0_id: result.auth0_id,
        email: result.email
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to ensure user exists', { error: errorMessage });
      throw new Error(`User creation failed: ${errorMessage}`);
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<ExternalUser> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Fetching current user');

      const response = await this.apiService.get<ExternalUser>('/api/v1/users/me');

      if (!response.success) {
        throw new Error(response.error || 'Failed to get current user');
      }

      logger.info(LogCategory.API_REQUEST, 'Current user fetched successfully', {
        auth0_id: response.data?.auth0_id,
        credits: response.data?.credits
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to get current user', { error: errorMessage });
      throw new Error(`Get user failed: ${errorMessage}`);
    }
  }

  // ================================================================================
  // Profile Management Methods
  // ================================================================================

  /**
   * Update user profile information
   */
  async updateProfile(data: UpdateProfileData): Promise<ExternalUser> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Updating user profile', {
        fields: Object.keys(data)
      });

      const response = await this.apiService.post<ExternalUser>('/api/v1/users/me/profile', data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update profile');
      }

      logger.info(LogCategory.API_REQUEST, 'Profile updated successfully', {
        auth0_id: response.data?.auth0_id
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to update profile', { error: errorMessage });
      throw new Error(`Profile update failed: ${errorMessage}`);
    }
  }

  // ================================================================================
  // Credits Management Methods
  // ================================================================================

  /**
   * Consume user credits
   */
  async consumeCredits(
    auth0_id: string, 
    consumption: CreditConsumption
  ): Promise<CreditConsumptionResult> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Consuming user credits', {
        auth0_id,
        amount: consumption.amount,
        reason: consumption.reason
      });

      const response = await this.apiService.post<CreditConsumptionResult>(
        `/api/v1/users/${auth0_id}/credits/consume`,
        consumption
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to consume credits');
      }

      logger.info(LogCategory.API_REQUEST, 'Credits consumed successfully', {
        auth0_id,
        remaining: response.data?.remaining_credits
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to consume credits', { 
        error: errorMessage, 
        auth0_id, 
        amount: consumption.amount 
      });
      throw new Error(`Credit consumption failed: ${errorMessage}`);
    }
  }

  // ================================================================================
  // Subscription Management Methods
  // ================================================================================

  /**
   * Get user subscription information
   */
  async getUserSubscription(auth0_id: string): Promise<ExternalSubscription | null> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Fetching user subscription', { auth0_id });

      const response = await this.apiService.get<ExternalSubscription>(
        `/api/v1/users/${auth0_id}/subscription`
      );

      // Handle 404 as no subscription (valid case)
      if (response.statusCode === 404) {
        logger.info(LogCategory.API_REQUEST, 'User has no subscription', { auth0_id });
        return null;
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to get user subscription');
      }

      logger.info(LogCategory.API_REQUEST, 'User subscription fetched successfully', {
        auth0_id,
        planType: response.data?.plan_type,
        status: response.data?.status
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to get user subscription', { 
        error: errorMessage, 
        auth0_id 
      });
      throw new Error(`Get subscription failed: ${errorMessage}`);
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(planType: string): Promise<CheckoutSession> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Creating checkout session', { planType });

      // Build checkout parameters
      const params: CheckoutParams = {
        plan_type: planType,
        success_url: `${window.location.origin}/subscription/success`,
        cancel_url: `${window.location.origin}/subscription/cancel`
      };

      const queryString = new URLSearchParams(params as unknown as Record<string, string>).toString();
      const response = await this.apiService.post<CheckoutSession>(
        `/api/v1/payments/create-checkout?${queryString}`,
        {}
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create checkout session');
      }

      logger.info(LogCategory.API_REQUEST, 'Checkout session created successfully', {
        planType,
        url: response.data?.url?.substring(0, 50) + '...'
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to create checkout session', { 
        error: errorMessage, 
        planType 
      });
      throw new Error(`Checkout creation failed: ${errorMessage}`);
    }
  }

  // ================================================================================
  // Health Check Methods
  // ================================================================================

  /**
   * Check external service health
   */
  async checkServiceHealth(): Promise<HealthCheckResult> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Checking service health');

      const response = await this.apiService.get<HealthCheckResult>('/health');

      if (!response.success) {
        throw new Error(response.error || 'Health check failed');
      }

      logger.info(LogCategory.API_REQUEST, 'Service health check successful', {
        status: response.data?.status
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Service health check failed', { error: errorMessage });
      throw new Error(`Health check failed: ${errorMessage}`);
    }
  }

  // ================================================================================
  // Utility Methods
  // ================================================================================

  /**
   * Cancel all active requests
   */
  cancelAllRequests(): void {
    this.apiService.cancelRequest();
    logger.info(LogCategory.API_REQUEST, 'All user service requests cancelled');
  }
}

// ================================================================================
// Default Instance Export
// ================================================================================

// Pre-configured user service instance
export const userService = new UserService();

export default userService;

// ================================================================================
// Legacy Function Exports (for backward compatibility)
// ================================================================================

/**
 * @deprecated Use UserService class instead
 */
export const ensureExternalUserExists = async (
  userData: CreateExternalUserData,
  accessToken: string
): Promise<ExternalUser> => {
  log.warn('ensureExternalUserExists is deprecated, use UserService class');
  throw new Error('This function is deprecated, please use UserService class with proper authentication');
};

/**
 * @deprecated Use UserService class instead
 */
export const getCurrentExternalUser = async (accessToken: string): Promise<ExternalUser> => {
  log.warn('getCurrentExternalUser is deprecated, use UserService class');
  throw new Error('This function is deprecated, please use UserService class with proper authentication');
};

/**
 * @deprecated Use UserService class instead
 */
export const consumeCredits = async (
  auth0_id: string,
  amount: number,
  reason: string,
  accessToken: string
): Promise<CreditConsumptionResult> => {
  log.warn('consumeCredits is deprecated, use UserService class');
  // Authentication handled in UserService constructor
  return userService.consumeCredits(auth0_id, { amount, reason });
};

/**
 * @deprecated Use UserService class instead
 */
export const getUserExternalSubscription = async (
  auth0_id: string,
  accessToken: string
): Promise<ExternalSubscription | null> => {
  log.warn('getUserExternalSubscription is deprecated, use UserService class');
  // Authentication handled in UserService constructor
  return userService.getUserSubscription(auth0_id);
};

/**
 * @deprecated Use UserService class instead
 */
export const createExternalCheckoutSession = async (
  planType: string,
  accessToken: string
): Promise<CheckoutSession> => {
  log.warn('createExternalCheckoutSession is deprecated, use UserService class');
  // Authentication handled in UserService constructor
  return userService.createCheckoutSession(planType);
};

/**
 * @deprecated Use UserService class instead
 */
export const checkExternalServiceHealth = async (
  accessToken?: string
): Promise<HealthCheckResult> => {
  log.warn('checkExternalServiceHealth is deprecated, use UserService class');
  if (accessToken) {
    // Authentication handled in UserService constructor
  }
  return userService.checkServiceHealth();
};