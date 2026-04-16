/**
 * ============================================================================
 * Notification Service (notificationService.ts) - Notification API Client
 * ============================================================================
 *
 * Core Responsibilities:
 * - Uses BaseApiService for robust network transport
 * - Handles all notification-related API operations
 * - Provides clean interfaces for notification management
 * - Supports listing, marking as read, dismissing notifications
 *
 * Architecture Benefits:
 * ✅ Transport: BaseApiService robust HTTP handling
 * ✅ Types: Centralized in notificationTypes.ts
 * ✅ Error handling: Consistent API error management
 * ✅ Retry logic: Built-in request retry and timeout
 *
 * API Endpoints (via Gateway):
 * - GET    /api/v1/notifications           - List notifications
 * - GET    /api/v1/notifications/:id        - Get single notification
 * - GET    /api/v1/notifications/count      - Get unread count
 * - POST   /api/v1/notifications/mark-read  - Mark as read
 * - POST   /api/v1/notifications/dismiss    - Dismiss notifications
 * - GET    /api/v1/notifications/preferences - Get preferences
 * - PATCH  /api/v1/notifications/preferences - Update preferences
 * - GET    /health                           - Health check
 */

import { BaseApiService } from './BaseApiService';
import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { logger, LogCategory, createLogger } from '../utils/logger';

// Re-export the SDK-aligned adapter for new consumers (#161)
export * as NotificationAdapter from './adapters/NotificationAdapter';
export type { NotificationSendRequest, NotificationPreferences as SDKNotificationPreferences } from './adapters/NotificationAdapter';

import type {
  Notification,
  NotificationListResponse,
  NotificationCountResponse,
  NotificationUpdateResponse,
  NotificationPreferences,
  GetNotificationsOptions,
} from '../types/notificationTypes';

const log = createLogger('NotificationService', LogCategory.API_REQUEST);

// ================================================================================
// NotificationService Class
// ================================================================================

export class NotificationService {
  private apiService: BaseApiService;

  constructor(baseUrl?: string, getAuthHeaders?: () => Promise<Record<string, string>>) {
    this.apiService = new BaseApiService(
      baseUrl || GATEWAY_ENDPOINTS.NOTIFICATION.BASE,
      undefined,
      getAuthHeaders
    );
    logger.info(LogCategory.API_REQUEST, 'NotificationService initialized', {
      baseUrl: baseUrl || GATEWAY_ENDPOINTS.NOTIFICATION.BASE,
    });
  }

  // ================================================================================
  // Notification List & Detail Methods
  // ================================================================================

  /**
   * Get notifications with optional filtering
   */
  async getNotifications(options?: GetNotificationsOptions): Promise<NotificationListResponse> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Fetching notifications', { options });

      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.type) params.set('type', options.type);
      if (options?.priority) params.set('priority', options.priority);
      if (options?.limit !== undefined) params.set('limit', String(options.limit));
      if (options?.offset !== undefined) params.set('offset', String(options.offset));

      const queryString = params.toString();
      const endpoint = `/api/v1/notifications${queryString ? `?${queryString}` : ''}`;

      const response = await this.apiService.get<NotificationListResponse>(endpoint, {});

      if (!response.success) {
        throw new Error(response.error || 'Failed to get notifications');
      }

      logger.info(LogCategory.API_REQUEST, 'Notifications fetched successfully', {
        count: response.data?.notifications?.length,
        total: response.data?.total,
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to get notifications', { error: errorMessage });
      throw new Error(`Failed to get notifications: ${errorMessage}`);
    }
  }

  /**
   * Get a single notification by ID
   */
  async getNotification(notificationId: string): Promise<Notification> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Fetching notification', { notificationId });

      const response = await this.apiService.get<Notification>(
        `/api/v1/notifications/${notificationId}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to get notification');
      }

      logger.info(LogCategory.API_REQUEST, 'Notification fetched successfully', {
        id: response.data?.id,
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to get notification', { error: errorMessage });
      throw new Error(`Failed to get notification: ${errorMessage}`);
    }
  }

  // ================================================================================
  // Notification Count Methods
  // ================================================================================

  /**
   * Get unread notification count and breakdown
   */
  async getUnreadCount(): Promise<NotificationCountResponse> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Fetching notification count');

      const response = await this.apiService.get<NotificationCountResponse>(
        '/api/v1/notifications/count'
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to get notification count');
      }

      logger.info(LogCategory.API_REQUEST, 'Notification count fetched', {
        unread: response.data?.unread,
        total: response.data?.total,
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to get notification count', {
        error: errorMessage,
      });
      throw new Error(`Failed to get notification count: ${errorMessage}`);
    }
  }

  // ================================================================================
  // Notification Action Methods
  // ================================================================================

  /**
   * Mark specific notifications as read
   */
  async markAsRead(notificationIds: string[]): Promise<NotificationUpdateResponse> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Marking notifications as read', {
        count: notificationIds.length,
      });

      const response = await this.apiService.post<NotificationUpdateResponse>(
        '/api/v1/notifications/mark-read',
        { notification_ids: notificationIds }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notifications as read');
      }

      logger.info(LogCategory.API_REQUEST, 'Notifications marked as read', {
        updated: response.data?.updated_count,
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to mark notifications as read', {
        error: errorMessage,
      });
      throw new Error(`Failed to mark notifications as read: ${errorMessage}`);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<NotificationUpdateResponse> {
    return this.markAsRead(['*']);
  }

  /**
   * Dismiss specific notifications
   */
  async dismiss(notificationIds: string[]): Promise<NotificationUpdateResponse> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Dismissing notifications', {
        count: notificationIds.length,
      });

      const response = await this.apiService.post<NotificationUpdateResponse>(
        '/api/v1/notifications/dismiss',
        { notification_ids: notificationIds }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to dismiss notifications');
      }

      logger.info(LogCategory.API_REQUEST, 'Notifications dismissed', {
        updated: response.data?.updated_count,
      });

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to dismiss notifications', {
        error: errorMessage,
      });
      throw new Error(`Failed to dismiss notifications: ${errorMessage}`);
    }
  }

  // ================================================================================
  // Preference Methods
  // ================================================================================

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Fetching notification preferences');

      const response = await this.apiService.get<NotificationPreferences>(
        '/api/v1/notifications/preferences'
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to get notification preferences');
      }

      logger.info(LogCategory.API_REQUEST, 'Notification preferences fetched');

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to get notification preferences', {
        error: errorMessage,
      });
      throw new Error(`Failed to get notification preferences: ${errorMessage}`);
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Updating notification preferences');

      const response = await this.apiService.patch<NotificationPreferences>(
        '/api/v1/notifications/preferences',
        updates
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update notification preferences');
      }

      logger.info(LogCategory.API_REQUEST, 'Notification preferences updated');

      return response.data!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LogCategory.API_REQUEST, 'Failed to update notification preferences', {
        error: errorMessage,
      });
      throw new Error(`Failed to update notification preferences: ${errorMessage}`);
    }
  }

  // ================================================================================
  // Health Check
  // ================================================================================

  /**
   * Check notification service health
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Performing notification service health check');

      const response = await this.apiService.get<{ status: string }>('/health');

      if (!response.success) {
        throw new Error(response.error || 'Health check failed');
      }

      return {
        status: response.data?.status || 'healthy',
        timestamp: new Date().toISOString(),
        service: 'NotificationService',
      };
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'NotificationService',
      };
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
    logger.info(LogCategory.API_REQUEST, 'All notification service requests cancelled');
  }
}

// ================================================================================
// Default Instance Export
// ================================================================================

export const notificationService = new NotificationService();

export default notificationService;
