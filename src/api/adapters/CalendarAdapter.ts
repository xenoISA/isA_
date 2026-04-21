/**
 * CalendarAdapter — bridges CalendarService backend to the frontend via gateway.
 */
const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:9080';
const BASE = `${GATEWAY}/api/v1/calendar`;

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  provider?: string;
  reminders?: number[];
  metadata?: Record<string, any>;
}

export interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'apple' | 'local';
  connected: boolean;
  lastSynced?: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  return res.json();
}

export async function getEvents(userId: string, start: string, end: string): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    user_id: userId,
    start_date: start,
    end_date: end,
  });
  return apiFetch(`/events?${params.toString()}`);
}

export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return getEvents(userId, start, end);
}

export async function createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  return apiFetch('/events', { method: 'POST', body: JSON.stringify(event) });
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch(`/events/${id}`, { method: 'DELETE' });
}

export async function getProviders(): Promise<CalendarProvider[]> {
  return apiFetch('/providers');
}

export async function connectProvider(type: CalendarProvider['type']): Promise<{ authUrl: string }> {
  return apiFetch(`/providers/${type}/connect`, { method: 'POST' });
}

export async function disconnectProvider(type: CalendarProvider['type']): Promise<void> {
  await apiFetch(`/providers/${type}/disconnect`, { method: 'POST' });
}

export async function syncProvider(type: CalendarProvider['type']): Promise<void> {
  await apiFetch(`/providers/${type}/sync`, { method: 'POST' });
}
