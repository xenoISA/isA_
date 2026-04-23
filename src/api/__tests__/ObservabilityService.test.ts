import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ObservabilityService } from '../ObservabilityService';

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    MATE: {
      BASE: 'http://localhost:18789',
      OBSERVABILITY: {
        METRICS: 'http://localhost:18789/v1/observability/metrics',
        AUDIT: 'http://localhost:18789/v1/observability/audit',
      },
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

describe('ObservabilityService', () => {
  let service: ObservabilityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ObservabilityService();
  });

  function ok(data: unknown) {
    return { ok: true, json: vi.fn().mockResolvedValue(data), status: 200, statusText: 'OK' };
  }

  function lastCall(): [string, RequestInit] {
    return mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  }

  test('getMetrics hits /v1/observability/metrics with no query for empty filter', async () => {
    mockFetch.mockResolvedValue(ok({
      nodes_executed: 0, tool_calls: 0, model_calls: 0,
      tokens_used: { input: 0, output: 0 }, cost_usd: 0,
      window_start: null, window_end: null,
    }));
    await service.getMetrics();
    expect(lastCall()[0]).toBe(`${MATE}/v1/observability/metrics`);
  });

  test('getMetrics serializes Date filters to ISO8601', async () => {
    mockFetch.mockResolvedValue(ok({
      nodes_executed: 0, tool_calls: 0, model_calls: 0,
      tokens_used: { input: 0, output: 0 }, cost_usd: 0,
      window_start: null, window_end: null,
    }));
    const since = new Date('2026-04-01T00:00:00Z');
    await service.getMetrics({ since, agent_id: 'a', session_id: 's' });
    const [url] = lastCall();
    expect(url).toContain('since=2026-04-01T00%3A00%3A00.000Z');
    expect(url).toContain('agent_id=a');
    expect(url).toContain('session_id=s');
  });

  test('getAudit defaults limit to 100', async () => {
    mockFetch.mockResolvedValue(ok({ entries: [], total: 0, next_cursor: null }));
    await service.getAudit();
    expect(lastCall()[0]).toBe(`${MATE}/v1/observability/audit?limit=100`);
  });

  test('getAudit forwards filters and cursor', async () => {
    mockFetch.mockResolvedValue(ok({ entries: [], total: 0, next_cursor: null }));
    await service.getAudit({
      action: 'tool_call',
      session_id: 's1',
      limit: 25,
      cursor: '50',
    });
    const [url] = lastCall();
    expect(url).toContain('action=tool_call');
    expect(url).toContain('session_id=s1');
    expect(url).toContain('limit=25');
    expect(url).toContain('cursor=50');
  });

  test('non-ok response throws with status text', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Server' });
    await expect(service.getAudit()).rejects.toThrow(/500/);
  });
});
