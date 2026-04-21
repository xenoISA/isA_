import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MateService } from '../mateService';
import { BaseApiService } from '../BaseApiService';

vi.mock('../BaseApiService', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  return {
    BaseApiService: vi.fn().mockImplementation(() => ({
      get: mockGet,
      post: mockPost,
    })),
  };
});

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    MATE: {
      BASE: 'http://mate.test',
      HEALTH: 'http://mate.test/health',
      MEMORY_STATS: 'http://mate.test/v1/memory/stats',
      MEMORY: {
        SESSIONS: 'http://mate.test/v1/memory/sessions',
        SESSION_MESSAGES: 'http://mate.test/v1/memory/sessions/{sessionId}/messages',
        KNOWLEDGE: 'http://mate.test/v1/memory/knowledge',
        KNOWLEDGE_ITEM: 'http://mate.test/v1/memory/knowledge/{itemId}',
      },
      SCHEDULER: {
        JOBS: 'http://mate.test/v1/scheduler/jobs',
        JOB: 'http://mate.test/v1/scheduler/jobs/{jobId}',
        JOB_RUN: 'http://mate.test/v1/scheduler/jobs/{jobId}/run',
      },
      TOOLS: 'http://mate.test/v1/tools',
    },
  },
  buildUrlWithParams: (url: string) => url,
}));

vi.mock('../../utils/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  LogCategory: { API_REQUEST: 'api_request' },
}));

const getGet = () => {
  const mod = vi.mocked(BaseApiService);
  return mod.mock.results[0]?.value.get as ReturnType<typeof vi.fn>;
};

describe('MateService.triggerWarmup', () => {
  let service: MateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MateService();
  });

  test('GETs /v1/memory/stats to exercise the memory/context layer (real warmup work)', async () => {
    getGet().mockResolvedValueOnce({ success: true, data: { turns: 0 }, statusCode: 200 });

    await service.triggerWarmup();

    expect(getGet()).toHaveBeenCalledTimes(1);
    expect(getGet()).toHaveBeenCalledWith('http://mate.test/v1/memory/stats');
  });

  test('resolves silently on non-success response', async () => {
    getGet().mockResolvedValueOnce({ success: false, statusCode: 500, error: 'Internal' });

    await expect(service.triggerWarmup()).resolves.toBeUndefined();
  });

  test('resolves silently on network error', async () => {
    getGet().mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(service.triggerWarmup()).resolves.toBeUndefined();
  });

  test('never throws — fire-and-forget contract', async () => {
    getGet().mockRejectedValueOnce(new Error('anything'));

    // Shouldn't reject whatever the underlying call does.
    let threw = false;
    try { await service.triggerWarmup(); } catch { threw = true; }
    expect(threw).toBe(false);
  });
});
