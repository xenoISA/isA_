/**
 * NotificationAdapter — SDK-aligned adapter for notification backend.
 * Matches @isa/core notification contracts while maintaining backward compatibility.
 */

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:9080';
const BASE = `${GATEWAY}/api/v1/notifications`;

// SDK-aligned types (matches @isa/core/services/notification/contracts.ts)
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'calendar' | 'channel';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  body: string;
  read: boolean;
  dismissed: boolean;
  route?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string;
}

export interface NotificationSendRequest {
  type: Notification['type'];
  priority?: Notification['priority'];
  title: string;
  body: string;
  route?: string;
  metadata?: Record<string, any>;
  targetUserId?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  channels: {
    push: boolean;
    email: boolean;
    inApp: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Notification API error: ${res.status}`);
  return res.json();
}

// ---------- CRUD ----------

export async function getNotifications(params?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
  const query = new URLSearchParams();
  if (params?.unreadOnly) query.set('unread_only', 'true');
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiFetch(`${qs ? `?${qs}` : ''}`);
}

export async function getUnreadCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>('/unread-count');
  return data.count;
}

export async function markAsRead(id: string): Promise<void> {
  await apiFetch(`/${id}/read`, { method: 'POST' });
}

export async function markAllAsRead(): Promise<void> {
  await apiFetch('/read-all', { method: 'POST' });
}

export async function dismiss(id: string): Promise<void> {
  await apiFetch(`/${id}/dismiss`, { method: 'POST' });
}

export async function send(request: NotificationSendRequest): Promise<Notification> {
  return apiFetch('', { method: 'POST', body: JSON.stringify(request) });
}

// ---------- Push ----------

export async function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  await apiFetch('/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) });
}

export async function unsubscribePush(): Promise<void> {
  await apiFetch('/push/unsubscribe', { method: 'POST' });
}

// ---------- Preferences ----------

export async function getPreferences(): Promise<NotificationPreferences> {
  return apiFetch('/preferences');
}

export async function updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  return apiFetch('/preferences', { method: 'PATCH', body: JSON.stringify(prefs) });
}
