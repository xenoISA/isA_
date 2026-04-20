import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PersistenceService } from '../PersistenceService';

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    MATE: {
      PERSISTENCE: {
        CHECKPOINTS: 'http://localhost:18789/v1/persistence/checkpoints',
        CHECKPOINT: (id: string) => `http://localhost:18789/v1/persistence/checkpoints/${encodeURIComponent(id)}`,
        RESTORE: 'http://localhost:18789/v1/persistence/restore',
        KNOWLEDGE: 'http://localhost:18789/v1/persistence/knowledge',
        KNOWLEDGE_SEARCH: 'http://localhost:18789/v1/persistence/knowledge/search',
        GRAPH_NODE: (id: string) => `http://localhost:18789/v1/persistence/graph/${encodeURIComponent(id)}`,
      },
    },
  },
}));

vi.mock('../../stores/authTokenStore', () => ({
  authTokenStore: { getToken: () => 'mock-token' },
}));

vi.mock('../../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  LogCategory: { CHAT_FLOW: 'chat_flow' },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const MATE = 'http://localhost:18789';

describe('PersistenceService', () => {
  let service: PersistenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PersistenceService();
  });

  function ok(data: unknown) {
    return { ok: true, json: vi.fn().mockResolvedValue(data), status: 200, statusText: 'OK' };
  }
  function lastCall(): [string, RequestInit] {
    return mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  }

  test('listCheckpoints forwards session_id', async () => {
    mockFetch.mockResolvedValue(ok({ checkpoints: [], next_cursor: null }));
    await service.listCheckpoints('s1');
    expect(lastCall()[0]).toBe(`${MATE}/v1/persistence/checkpoints?session_id=s1`);
  });

  test('getCheckpoint URL-encodes composite id', async () => {
    mockFetch.mockResolvedValue(ok({
      id: 's1:cp', session_id: 's1',
      created_at: '2026-04-20T00:00:00Z', state: {}, metadata: {},
    }));
    await service.getCheckpoint('s1:cp');
    expect(lastCall()[0]).toBe(`${MATE}/v1/persistence/checkpoints/s1%3Acp`);
  });

  test('restore omits new_session_id when absent', async () => {
    mockFetch.mockResolvedValue(ok({
      restored_session_id: 's1', from_checkpoint_id: 's1:cp', status: 'restored',
    }));
    await service.restore('s1:cp');
    const [, init] = lastCall();
    expect(init.body).toBe(JSON.stringify({ checkpoint_id: 's1:cp' }));
  });

  test('restore includes new_session_id when provided', async () => {
    mockFetch.mockResolvedValue(ok({
      restored_session_id: 's2', from_checkpoint_id: 's1:cp', status: 'restored',
    }));
    await service.restore('s1:cp', 's2');
    const [, init] = lastCall();
    expect(init.body).toBe(JSON.stringify({
      checkpoint_id: 's1:cp', new_session_id: 's2',
    }));
  });

  test('searchKnowledge rejects empty query locally', async () => {
    await expect(service.searchKnowledge('')).rejects.toThrow(RangeError);
    await expect(service.searchKnowledge('   ')).rejects.toThrow(RangeError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('searchKnowledge default limit is 10', async () => {
    mockFetch.mockResolvedValue(ok({ query: 'hello', hits: [] }));
    await service.searchKnowledge('hello');
    expect(lastCall()[0]).toContain('q=hello');
    expect(lastCall()[0]).toContain('limit=10');
  });

  test('getGraphNode rejects out-of-range depth locally', async () => {
    await expect(service.getGraphNode('n1', { depth: 0 })).rejects.toThrow(RangeError);
    await expect(service.getGraphNode('n1', { depth: 4 })).rejects.toThrow(RangeError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('getGraphNode default depth=1', async () => {
    mockFetch.mockResolvedValue(ok({
      node: { id: 'n1', labels: [], properties: {} },
      neighbors: [], relationships: [],
    }));
    await service.getGraphNode('n1');
    expect(lastCall()[0]).toBe(`${MATE}/v1/persistence/graph/n1?depth=1`);
  });

  test('non-ok responses throw', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(service.getCheckpoint('s1:missing')).rejects.toThrow(/404/);
  });
});
