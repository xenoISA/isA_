import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ProactiveService } from '../ProactiveService';

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    MATE: {
      PROACTIVE: {
        TRIGGERS: 'http://localhost:18789/v1/proactive/triggers',
        TRIGGER: (id: string) => `http://localhost:18789/v1/proactive/triggers/${encodeURIComponent(id)}`,
        TEST: (id: string) => `http://localhost:18789/v1/proactive/triggers/${encodeURIComponent(id)}/test`,
        RUNS: (id: string) => `http://localhost:18789/v1/proactive/triggers/${encodeURIComponent(id)}/runs`,
      },
      AUTONOMOUS_EVENTS: 'http://localhost:18789/v1/autonomous/events',
    },
  },
}));

const MATE = 'http://localhost:18789';

vi.mock('../../stores/authTokenStore', () => ({
  authTokenStore: { getToken: () => 'mock-token' },
}));

vi.mock('../../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  LogCategory: { CHAT_FLOW: 'chat_flow' },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ProactiveService', () => {
  let service: ProactiveService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProactiveService();
  });

  function ok(data: unknown) {
    return { ok: true, json: vi.fn().mockResolvedValue(data), status: 200, statusText: 'OK' };
  }

  function lastCall(): [string, RequestInit] {
    return mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  }

  test('listTriggers hits /v1/proactive/triggers with limit=50 default', async () => {
    mockFetch.mockResolvedValue(ok({ triggers: [], next_cursor: null }));
    await service.listTriggers();
    const [url, init] = lastCall();
    expect(url).toBe(`${MATE}/v1/proactive/triggers?limit=50`);
    expect(init.method).toBe('GET');
  });

  test('listTriggers forwards cursor and limit', async () => {
    mockFetch.mockResolvedValue(ok({ triggers: [], next_cursor: null }));
    await service.listTriggers({ cursor: 'c1', limit: 10 });
    expect(lastCall()[0]).toBe(`${MATE}/v1/proactive/triggers?cursor=c1&limit=10`);
  });

  test('createTrigger POSTs the body', async () => {
    mockFetch.mockResolvedValue(ok({
      id: 't', type: 'cron', name: 'n', condition: {},
      action_prompt: 'p', enabled: true,
      created_at: '2026-04-20T00:00:00Z', next_fire: null, last_result: null,
    }));
    const input = {
      type: 'cron' as const, name: 'n',
      condition: { schedule: '0 9 * * *' }, action_prompt: 'p',
    };
    await service.createTrigger(input);
    const [url, init] = lastCall();
    expect(url).toBe(`${MATE}/v1/proactive/triggers`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(input));
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-token');
  });

  test('getTrigger URL-encodes id', async () => {
    mockFetch.mockResolvedValue(ok({
      id: 'id with spaces', type: 'cron', name: 't', condition: {},
      action_prompt: 'p', enabled: true,
      created_at: '2026-04-20T00:00:00Z', next_fire: null, last_result: null,
    }));
    await service.getTrigger('id with spaces');
    expect(lastCall()[0]).toBe(`${MATE}/v1/proactive/triggers/id%20with%20spaces`);
  });

  test('updateTrigger PATCHes partial body', async () => {
    mockFetch.mockResolvedValue(ok({
      id: 't', type: 'cron', name: 'renamed', condition: {},
      action_prompt: 'p', enabled: false,
      created_at: '2026-04-20T00:00:00Z', next_fire: null, last_result: null,
    }));
    await service.updateTrigger('t', { name: 'renamed', enabled: false });
    const [url, init] = lastCall();
    expect(url).toBe(`${MATE}/v1/proactive/triggers/t`);
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ name: 'renamed', enabled: false }));
  });

  test('deleteTrigger soft by default', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, statusText: 'No Content', json: vi.fn() });
    await service.deleteTrigger('t');
    expect(lastCall()[0]).toBe(`${MATE}/v1/proactive/triggers/t`);
    expect(lastCall()[1].method).toBe('DELETE');
  });

  test('deleteTrigger with hard=true appends query', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, statusText: 'No Content', json: vi.fn() });
    await service.deleteTrigger('t', { hard: true });
    expect(lastCall()[0]).toBe(`${MATE}/v1/proactive/triggers/t?hard=true`);
  });

  test('testTrigger POSTs mock_event to /test', async () => {
    mockFetch.mockResolvedValue(ok({
      would_fire: true, reason: 'match', resolved_prompt: 'p', matched_conditions: {},
    }));
    await service.testTrigger('t', { mock_event: { x: 1 } });
    const [url, init] = lastCall();
    expect(url).toBe(`${MATE}/v1/proactive/triggers/t/test`);
    expect(init.method).toBe('POST');
  });

  test('listRuns hits /runs with limit', async () => {
    mockFetch.mockResolvedValue(ok({ runs: [], next_cursor: null }));
    await service.listRuns('t', { limit: 25 });
    expect(lastCall()[0]).toBe(`${MATE}/v1/proactive/triggers/t/runs?limit=25`);
  });

  test('propagates non-ok responses as errors', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(service.getTrigger('missing')).rejects.toThrow(/404/);
  });
});
