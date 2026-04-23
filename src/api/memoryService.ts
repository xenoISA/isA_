import { GATEWAY_CONFIG } from '../config/gatewayConfig';
import { authTokenStore } from '../stores/authTokenStore';
import { getCredentialsMode } from '../utils/authCookieHelper';

export type MemoryType = 'factual' | 'episodic' | 'semantic' | 'procedural' | 'working';

export interface UserMemory {
  id: string;
  type: MemoryType;
  content: string;
  created_at?: string;
  updated_at?: string;
  importance_score?: number;
  confidence?: number;
  tags?: string[];
  raw: Record<string, unknown>;
}

export interface ListMemoriesParams {
  userId: string;
  type?: MemoryType;
  query?: string;
  limit?: number;
}

export interface UpdateMemoryParams {
  userId: string;
  memoryId: string;
  type: MemoryType;
  content: string;
}

export interface DeleteMemoryParams {
  userId: string;
  memoryId: string;
  type: MemoryType;
}

export const MEMORY_TYPES: MemoryType[] = ['factual', 'episodic', 'semantic', 'procedural', 'working'];

function getAuthHeaders(): Record<string, string> {
  const token = authTokenStore.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function memoryBaseUrl(): string {
  return `${GATEWAY_CONFIG.BASE_URL.replace(/\/+$/, '')}/api/v1/memories`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isString(value: string | undefined): value is string {
  return typeof value === 'string';
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeType(value: unknown): MemoryType {
  const candidate = asString(value);
  return MEMORY_TYPES.includes(candidate as MemoryType)
    ? candidate as MemoryType
    : 'factual';
}

function fallbackContent(record: Record<string, unknown>, type: MemoryType): string {
  const explicit = asString(record.content);
  if (explicit) return explicit;

  if (type === 'factual') {
    const subject = asString(record.subject);
    const predicate = asString(record.predicate);
    const objectValue = asString(record.object_value);
    return [subject, predicate, objectValue].filter(Boolean).join(' ');
  }

  if (type === 'semantic') {
    return asString(record.definition) ?? asString(record.concept_type) ?? '';
  }

  if (type === 'procedural') {
    const steps = Array.isArray(record.steps)
      ? record.steps.map((step) => {
        const item = asRecord(step);
        return asString(item.description) ?? asString(item.content);
      }).filter(isString)
      : [];
    return steps.length > 0 ? steps.join('\n') : asString(record.skill_type) ?? '';
  }

  if (type === 'episodic') {
    return asString(record.event_type) ?? asString(record.location) ?? '';
  }

  const taskContext = asRecord(record.task_context);
  return asString(record.task_id) ?? asString(taskContext.summary) ?? '';
}

export function normalizeMemory(rawMemory: unknown): UserMemory {
  const record = asRecord(rawMemory);
  const type = normalizeType(record.memory_type ?? record.type);
  const id = asString(record.id) ?? asString(record.memory_id) ?? `${type}-${Date.now()}`;

  return {
    id,
    type,
    content: fallbackContent(record, type),
    created_at: asString(record.created_at),
    updated_at: asString(record.updated_at),
    importance_score: asNumber(record.importance_score),
    confidence: asNumber(record.confidence),
    tags: Array.isArray(record.tags) ? record.tags.map(asString).filter(isString) : [],
    raw: record,
  };
}

export function filterMemories(memories: UserMemory[], query: string): UserMemory[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return memories;

  return memories.filter((memory) => {
    return memory.content.toLowerCase().includes(normalized)
      || memory.type.toLowerCase().includes(normalized)
      || memory.tags?.some((tag) => tag.toLowerCase().includes(normalized));
  });
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export class MemoryService {
  async listMemories({ userId, type, query, limit = 100 }: ListMemoriesParams): Promise<UserMemory[]> {
    const params = new URLSearchParams({
      user_id: userId,
      limit: String(limit),
    });

    if (type) params.set('memory_type', type);

    const response = await fetch(`${memoryBaseUrl()}?${params.toString()}`, {
      method: 'GET',
      credentials: getCredentialsMode(),
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to list memories (${response.status})`);
    }

    const parsed = await parseJsonResponse(response);
    const data = asRecord(parsed);
    const rawMemories = Array.isArray(parsed)
      ? parsed
      : Array.isArray(data.memories) ? data.memories : [];
    return filterMemories(rawMemories.map(normalizeMemory), query ?? '');
  }

  async updateMemory({ userId, memoryId, type, content }: UpdateMemoryParams): Promise<void> {
    const params = new URLSearchParams({ user_id: userId });
    const response = await fetch(`${memoryBaseUrl()}/${encodeURIComponent(type)}/${encodeURIComponent(memoryId)}?${params.toString()}`, {
      method: 'PUT',
      credentials: getCredentialsMode(),
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update memory (${response.status})`);
    }
  }

  async deleteMemory({ userId, memoryId, type }: DeleteMemoryParams): Promise<void> {
    const params = new URLSearchParams({ user_id: userId });
    const response = await fetch(`${memoryBaseUrl()}/${encodeURIComponent(type)}/${encodeURIComponent(memoryId)}?${params.toString()}`, {
      method: 'DELETE',
      credentials: getCredentialsMode(),
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete memory (${response.status})`);
    }
  }
}

export const memoryService = new MemoryService();
