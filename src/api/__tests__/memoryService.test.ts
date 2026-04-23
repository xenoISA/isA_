import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  filterMemories,
  memoryService,
  normalizeMemory,
} from '../memoryService';

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_CONFIG: {
    BASE_URL: 'http://gateway.test',
  },
}));

vi.mock('../../stores/authTokenStore', () => ({
  authTokenStore: { getToken: () => 'mock-token' },
}));

vi.mock('../../utils/authCookieHelper', () => ({
  getCredentialsMode: () => 'include',
}));

describe('memoryService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  test('normalizes memory-service records into UI memories', () => {
    expect(normalizeMemory({
      id: 'mem-1',
      memory_type: 'semantic',
      definition: 'A design system is a reusable visual language.',
      created_at: '2026-04-23T08:00:00.000Z',
    })).toMatchObject({
      id: 'mem-1',
      type: 'semantic',
      content: 'A design system is a reusable visual language.',
      created_at: '2026-04-23T08:00:00.000Z',
    });
  });

  test('filters memories by content and type', () => {
    const memories = [
      normalizeMemory({ id: 'fact-1', memory_type: 'factual', content: 'Likes black coffee' }),
      normalizeMemory({ id: 'work-1', memory_type: 'working', content: 'Draft launch plan' }),
    ];

    expect(filterMemories(memories, '')).toHaveLength(2);
    expect(filterMemories(memories, 'coffee')).toEqual([memories[0]]);
    expect(filterMemories(memories, 'working')).toEqual([memories[1]]);
  });

  test('lists memories through the gateway memory API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        memories: [{ id: 'mem-1', memory_type: 'factual', content: 'Likes tea' }],
      }),
    } as Response);

    const memories = await memoryService.listMemories({ userId: 'usr-1' });

    expect(memories).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      'http://gateway.test/api/v1/memories?user_id=usr-1&limit=100',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: { Authorization: 'Bearer mock-token' },
      }),
    );
  });

  test('updates memory content by type and id', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await memoryService.updateMemory({
      userId: 'usr-1',
      memoryId: 'mem-1',
      type: 'factual',
      content: 'Likes green tea',
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://gateway.test/api/v1/memories/factual/mem-1?user_id=usr-1',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'Likes green tea' }),
      }),
    );
  });

  test('deletes memory by type and id', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await memoryService.deleteMemory({
      userId: 'usr-1',
      memoryId: 'mem-1',
      type: 'working',
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://gateway.test/api/v1/memories/working/mem-1?user_id=usr-1',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
      }),
    );
  });
});
