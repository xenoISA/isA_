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
      CONTEXT_WARMUP: 'http://mate.test/v1/context/warmup',
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

const getPost = () => {
  const mod = vi.mocked(BaseApiService);
  return mod.mock.results[0]?.value.post as ReturnType<typeof vi.fn>;
};

describe('MateService.triggerWarmup', () => {
  let service: MateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MateService();
  });

  test('POSTs to the warmup endpoint with an empty body and a validateStatus that allows 404 (#326)', async () => {
    getPost().mockResolvedValueOnce({ success: true, data: {}, statusCode: 200 });

    await service.triggerWarmup();

    expect(getPost()).toHaveBeenCalledTimes(1);
    const [url, body, config] = getPost().mock.calls[0];
    expect(url).toBe('http://mate.test/v1/context/warmup');
    expect(body).toEqual({});
    expect(config?.validateStatus).toBeInstanceOf(Function);
    // Contract: 404 must be treated as a non-error so BaseApiService doesn't log it.
    expect(config.validateStatus(404)).toBe(true);
    expect(config.validateStatus(200)).toBe(true);
    expect(config.validateStatus(500)).toBe(false);
  });

  test('resolves silently when backend returns 404 (older Mate, no endpoint)', async () => {
    // With validateStatus, the mock now resolves rather than throws for 404.
    getPost().mockResolvedValueOnce({ success: true, statusCode: 404, data: null });

    await expect(service.triggerWarmup()).resolves.toBeUndefined();
  });

  test('resolves silently when BaseApiService reports non-success without 404', async () => {
    getPost().mockResolvedValueOnce({ success: false, statusCode: 500, error: 'Internal' });

    await expect(service.triggerWarmup()).resolves.toBeUndefined();
  });

  test('resolves silently when the POST throws (network failure)', async () => {
    getPost().mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(service.triggerWarmup()).resolves.toBeUndefined();
  });
});
