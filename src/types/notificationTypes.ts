/**
 * ============================================================================
 * Notification Types (notificationTypes.ts) - Notification-related type definitions
 * ============================================================================
 *
 * Core Responsibilities:
 * - Define notification data structures
 * - Define notification API request/response types
 * - Define notification preference types
 *
 * Separation of Concerns:
 * ✅ Responsible for:
 *   - Notification data interfaces
 *   - Notification CRUD operation types
 *   - Notification subscription/preference types
 *   - API request/response types
 *
 * ❌ Not responsible for:
 *   - UI rendering logic (handled by NotificationToolbar.tsx)
 *   - Transport layer (handled by BaseApiService)
 *   - Chat types (handled by chatTypes.ts)
 */

// ================================================================================
// Core Notification Types
// ================================================================================

export type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'assistant';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationStatus = 'unread' | 'read' | 'dismissed' | 'archived';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  created_at: string;
  updated_at: string;
  read_at?: string;
  dismissed_at?: string;
  metadata?: Record<string, unknown>;
  actionable?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  url?: string;
  type: 'link' | 'api_call' | 'dismiss';
}

// ================================================================================
// API Request Types
// ================================================================================

export interface GetNotificationsOptions {
  status?: NotificationStatus;
  type?: NotificationType;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
}

export interface MarkNotificationReadRequest {
  notification_ids: string[];
}

export interface DismissNotificationRequest {
  notification_ids: string[];
}

// ================================================================================
// API Response Types
// ================================================================================

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  has_more: boolean;
}

export interface NotificationCountResponse {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
}

export interface NotificationUpdateResponse {
  success: boolean;
  updated_count: number;
}

// ================================================================================
// Subscription/Preference Types
// ================================================================================

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  type_preferences: Record<NotificationType, boolean>;
}
