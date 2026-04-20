import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AutonomousService } from '../AutonomousService';
import { ReactiveService } from '../ReactiveService';

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    MATE: {
      AUTONOMOUS: {
        JOBS: 'http://localhost:18789/v1/autonomous/background-jobs',
        JOB: (id: string) => `http://localhost:18789/v1/autonomous/background-jobs/${encodeURIComponent(id)}`,
      },
      REACTIVE: {
        WEBHOOKS: 'http://localhost:18789/v1/reactive/webhooks',
        WEBHOOK: (id: string) => `http://localhost:18789/v1/reactive/webhooks/${encodeURIComponent(id)}`,
        SUBSCRIBE: 'http://localhost:18789/v1/reactive/events/subscribe',
        SUBSCRIPTIONS: 'http://localhost:18789/v1/reactive/events/subscriptions',
        SUBSCRIPTION: (id: string) => `http://localhost:18789/v1/reactive/events/subscriptions/${encodeURIComponent(id)}`,
      },
    },
  },
}));

vi.mock('../../stores/authTokenStore', () => ({
  authTokenStore: { getToken: () => 'mock-token' },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const MATE = 'http://localhost:18789';

function ok(data: unknown) {
  return { ok: true, json: vi.fn().mockResolvedValue(data), status: 200, statusText: 'OK' };
}
function noContent() {
  return { ok: true, status: 204, statusText: 'No Content', json: vi.fn() };
}
function lastCall(): [string, RequestInit] {
  return mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
}

describe('AutonomousService', () => {
  let service: AutonomousService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AutonomousService();
  });

  test('enqueueJob rejects empty prompt locally', async () => {
    await expect(service.enqueueJob({ prompt: '' })).rejects.toThrow(RangeError);
    await expect(service.enqueueJob({ prompt: '  ' })).rejects.toThrow(RangeError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('enqueueJob POSTs body to JOBS endpoint', async () => {
    mockFetch.mockResolvedValue(ok({
      id: 'job_1', user_id: 'u1', prompt: 'x',
      schedule: null, idempotency_key: null, status: 'queued',
      created_at: 't', updated_at: 't',
      started_at: null, completed_at: null,
      result: {}, error: null, duration_ms: null, metadata: {},
    }));
    await service.enqueueJob({ prompt: 'x' });
    const [url, init] = lastCall();
    expect(url).toBe(`${MATE}/v1/autonomous/background-jobs`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-token');
  });

  test('listJobs forwards status filter', async () => {
    mockFetch.mockResolvedValue(ok({ jobs: [], next_cursor: null }));
    await service.listJobs({ status: 'running', limit: 25 });
    expect(lastCall()[0]).toContain('status=running');
    expect(lastCall()[0]).toContain('limit=25');
  });

  test('cancelJob DELETEs to job endpoint', async () => {
    mockFetch.mockResolvedValue(ok({
      id: 'job_1', user_id: 'u1', prompt: 'x',
      schedule: null, idempotency_key: null, status: 'cancelled',
      created_at: 't', updated_at: 't',
      started_at: null, completed_at: 't',
      result: {}, error: null, duration_ms: null, metadata: {},
    }));
    await service.cancelJob('job_1');
    const [url, init] = lastCall();
    expect(url).toBe(`${MATE}/v1/autonomous/background-jobs/job_1`);
    expect(init.method).toBe('DELETE');
  });

  test('non-ok throws with status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(service.getJob('missing')).rejects.toThrow(/404/);
  });
});

describe('ReactiveService', () => {
  let service: ReactiveService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReactiveService();
  });

  test('registerWebhook rejects path without slash', async () => {
    await expect(
      service.registerWebhook({ path: 'no-slash', secret: 'supersecretvalue1234', action_prompt: 'x' }),
    ).rejects.toThrow(RangeError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('registerWebhook rejects short secret', async () => {
    await expect(
      service.registerWebhook({ path: '/x', secret: 'tooshort', action_prompt: 'x' }),
    ).rejects.toThrow(RangeError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('registerWebhook POSTs body on valid input', async () => {
    mockFetch.mockResolvedValue(ok({
      id: 'wh_1', user_id: 'u1', path: '/x',
      action_prompt: 'Triage', filter: null, enabled: true, created_at: 't',
    }));
    const input = { path: '/x', secret: 'supersecretvalue1234', action_prompt: 'Triage' };
    await service.registerWebhook(input);
    const [url, init] = lastCall();
    expect(url).toBe(`${MATE}/v1/reactive/webhooks`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(input));
  });

  test('subscribe rejects empty channel locally', async () => {
    await expect(service.subscribe({ channel: '' })).rejects.toThrow(RangeError);
    await expect(service.subscribe({ channel: '  ' })).rejects.toThrow(RangeError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('subscribe POSTs body', async () => {
    mockFetch.mockResolvedValue(ok({
      id: 'sub_1', user_id: 'u1', channel: 'trades',
      filter: { symbol: 'BTC' }, delivery_url: null, created_at: 't',
    }));
    await service.subscribe({ channel: 'trades', filter: { symbol: 'BTC' } });
    expect(lastCall()[0]).toBe(`${MATE}/v1/reactive/events/subscribe`);
    expect(lastCall()[1].method).toBe('POST');
  });

  test('deleteWebhook accepts 204', async () => {
    mockFetch.mockResolvedValue(noContent());
    await service.deleteWebhook('wh_1');
    expect(lastCall()[0]).toBe(`${MATE}/v1/reactive/webhooks/wh_1`);
    expect(lastCall()[1].method).toBe('DELETE');
  });

  test('unsubscribe accepts 204', async () => {
    mockFetch.mockResolvedValue(noContent());
    await service.unsubscribe('sub_1');
    expect(lastCall()[0]).toBe(`${MATE}/v1/reactive/events/subscriptions/sub_1`);
  });
});
