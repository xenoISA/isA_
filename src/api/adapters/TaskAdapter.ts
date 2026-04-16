/**
 * TaskAdapter — SDK-aligned adapter for task backend.
 * Wraps gateway API calls to /api/v1/tasks/*.
 */

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:9080';
const BASE = `${GATEWAY}/api/v1/tasks`;

export interface BackendTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface TaskCreatePayload {
  title: string;
  description?: string;
  priority?: BackendTask['priority'];
  dueAt?: string;
  metadata?: Record<string, any>;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  status?: BackendTask['status'];
  priority?: BackendTask['priority'];
  dueAt?: string;
  metadata?: Record<string, any>;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Task API error: ${res.status}`);
  return res.json();
}

export async function getTasks(params?: { status?: string; limit?: number }): Promise<BackendTask[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiFetch(`${qs ? `?${qs}` : ''}`);
}

export async function getTask(id: string): Promise<BackendTask> {
  return apiFetch(`/${id}`);
}

export async function createTask(payload: TaskCreatePayload): Promise<BackendTask> {
  return apiFetch('', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTask(id: string, payload: TaskUpdatePayload): Promise<BackendTask> {
  return apiFetch(`/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/${id}`, { method: 'DELETE' });
}

export async function completeTask(id: string): Promise<BackendTask> {
  return apiFetch(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString() }),
  });
}
