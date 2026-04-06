/**
 * ============================================================================
 * Notification Types - SDK re-exports + app-specific types
 * ============================================================================
 *
 * SDK types imported via NotificationTypes namespace from @isa/core.
 * App-specific types (preferences, UI-facing) remain here for backward compat.
 */

import { NotificationTypes } from '@isa/core';

// ================================================================================
// Re-export SDK Enums
// ================================================================================

export const NotificationType = NotificationTypes.NotificationType;
export type NotificationType = NotificationTypes.NotificationType;

export const NotificationPriority = NotificationTypes.NotificationPriority;
export type NotificationPriority = NotificationTypes.NotificationPriority;

export const NotificationStatus = NotificationTypes.NotificationStatus;
export type NotificationStatus = NotificationTypes.NotificationStatus;

export const TemplateStatus = NotificationTypes.TemplateStatus;
export type TemplateStatus = NotificationTypes.TemplateStatus;

export const RecipientType = NotificationTypes.RecipientType;
export type RecipientType = NotificationTypes.RecipientType;

export const PushPlatform = NotificationTypes.PushPlatform;
export type PushPlatform = NotificationTypes.PushPlatform;

// ================================================================================
// Re-export SDK Types
// ================================================================================

export type SDKNotification = NotificationTypes.Notification;
export type InAppNotification = NotificationTypes.InAppNotification;
export type NotificationTemplate = NotificationTypes.NotificationTemplate;
export type NotificationBatch = NotificationTypes.NotificationBatch;
export type PushSubscription = NotificationTypes.PushSubscription;
export type SendNotificationRequest = NotificationTypes.SendNotificationRequest;
export type SendBatchRequest = NotificationTypes.SendBatchRequest;
export type CreateTemplateRequest = NotificationTypes.CreateTemplateRequest;
export type UpdateTemplateRequest = NotificationTypes.UpdateTemplateRequest;
export type RegisterPushSubscriptionRequest = NotificationTypes.RegisterPushSubscriptionRequest;
export type NotificationResponse = NotificationTypes.NotificationResponse;
export type TemplateResponse = NotificationTypes.TemplateResponse;
export type BatchResponse = NotificationTypes.BatchResponse;
export type NotificationStatsResponse = NotificationTypes.NotificationStatsResponse;

// ================================================================================
// App-Specific Types (backward compatibility for existing UI consumers)
// ================================================================================

export type AppNotificationType = 'info' | 'warning' | 'success' | 'error' | 'assistant';
export type AppNotificationStatus = 'unread' | 'read' | 'dismissed' | 'archived';
export type AppNotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  priority: AppNotificationPriority;
  status: AppNotificationStatus;
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
// API Request/Response Types (app-level)
// ================================================================================

export interface GetNotificationsOptions {
  status?: AppNotificationStatus;
  type?: AppNotificationType;
  priority?: AppNotificationPriority;
  limit?: number;
  offset?: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  has_more: boolean;
}

export interface NotificationCountResponse {
  total: number;
  unread: number;
  by_type: Record<AppNotificationType, number>;
}

export interface NotificationUpdateResponse {
  success: boolean;
  updated_count: number;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  type_preferences: Record<AppNotificationType, boolean>;
}
