import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { BaseApiService, ApiResponse } from '../BaseApiService';

// ============================================================================
// Mocks
// ============================================================================

// Mock axios
vi.mock('axios', async () => {
  const mockRequestFn = vi.fn();
  const mockPostFn = vi.fn();
  const mockInterceptorsRequest = { use: vi.fn() };
  const mockInterceptorsResponse = { use: vi.fn() };

  const mockCreate = vi.fn().mockReturnValue({
    request: mockRequestFn,
    post: mockPostFn,
    interceptors: {
      request: mockInterceptorsRequest,
      response: mockInterceptorsResponse,
    },
    defaults: {
      headers: { common: {} },
    },
  });

  return {
    default: {
      create: mockCreate,
      isAxiosError: (err: any) => err?.isAxiosError === true,
    },
    __mockRequest: mockRequestFn,
    __mockPost: mockPostFn,
    __mockCreate: mockCreate,
  };
});

// Mock config
vi.mock('../../config', () => ({
  config: {
    api: {
      baseUrl: 'http://localhost:3000',
      timeout: 5000,
    },
    externalApis: {
      userServiceUrl: 'http://localhost:3001',
      aiServiceUrl: 'http://localhost:3002',
      imageServiceUrl: 'http://localhost:3003',
      contentServiceUrl: 'http://localhost:3004',
    },
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  LogCategory: {
    API_REQUEST: 'api_request',
  },
}));

// ============================================================================
// Helpers
// ============================================================================

function getAxiosMocks() {
  const mod = vi.mocked(axios);
  const instance = mod.create.mock.results[0]?.value;
  return {
    mockRequest: instance?.request as ReturnType<typeof vi.fn>,
    mockPost: instance?.post as ReturnType<typeof vi.fn>,
    mockCreate: mod.create as ReturnType<typeof vi.fn>,
  };
}

function makeAxiosResponse(data: any, status = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config: { metadata: { startTime: Date.now() } },
  };
}

function makeAxiosError(message: string, status?: number): any {
  const error: any = new Error(message);
  error.isAxiosError = true;
  error.message = message;
  if (status) {
    error.response = { status, statusText: `Error ${status}`, data: {} };
  }
  return error;
}

// ============================================================================
// Tests
// ============================================================================

describe('BaseApiService', () => {
  let service: BaseApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    service = new BaseApiService('http://localhost:3000', 5000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================

  describe('constructor', () => {
    test('creates axios instance with provided baseUrl and timeout', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000',
          timeout: 5000,
        })
      );
    });

    test('sets default Content-Type and Accept headers', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })
      );
    });

    test('falls back to config defaults when no arguments provided', () => {
      vi.clearAllMocks();
      new BaseApiService();
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000',
          timeout: 5000,
        })
      );
    });
  });

  // ==========================================================================
  // HTTP Methods — get, post, put, delete, patch
  // ==========================================================================

  describe('get()', () => {
    test('sends GET request and returns success response', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockResolvedValue(makeAxiosResponse({ id: 1, name: 'Test' }));

      const result = await service.get('/users/1');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users/1',
          method: 'get',
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'Test' });
      expect(result.statusCode).toBe(200);
    });
  });

  describe('post()', () => {
    test('sends POST request with body', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockResolvedValue(makeAxiosResponse({ id: 2 }, 201));

      const result = await service.post('/users', { name: 'Alice' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users',
          method: 'post',
          data: { name: 'Alice' },
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 2 });
    });
  });

  describe('put()', () => {
    test('sends PUT request with body', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockResolvedValue(makeAxiosResponse({ updated: true }));

      const result = await service.put('/users/1', { name: 'Bob' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users/1',
          method: 'put',
          data: { name: 'Bob' },
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('delete()', () => {
    test('sends DELETE request', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockResolvedValue(makeAxiosResponse({ deleted: true }));

      const result = await service.delete('/users/1');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users/1',
          method: 'delete',
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('patch()', () => {
    test('sends PATCH request with body', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockResolvedValue(makeAxiosResponse({ patched: true }));

      const result = await service.patch('/users/1', { status: 'active' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users/1',
          method: 'patch',
          data: { status: 'active' },
        })
      );
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Response Format
  // ==========================================================================

  describe('response format', () => {
    test('includes timestamp in ISO format', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockResolvedValue(makeAxiosResponse({ ok: true }));

      const result = await service.get('/test');

      expect(result.timestamp).toBeDefined();
      expect(() => new Date(result.timestamp!)).not.toThrow();
    });

    test('includes response headers', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockResolvedValue(makeAxiosResponse({ ok: true }));

      const result = await service.get('/test');

      expect(result.headers).toBeDefined();
      expect(result.headers?.['content-type']).toBe('application/json');
    });
  });

  // ==========================================================================
  // Auth Token Management
  // ==========================================================================

  describe('setAuthToken()', () => {
    test('sets Bearer token by default', () => {
      service.setAuthToken('my-jwt-token');
      // Verify the token is applied by making a request
      const { mockRequest } = getAxiosMocks();
      const instance = vi.mocked(axios).create.mock.results[0]?.value;
      expect(instance.defaults.headers.common['Authorization']).toBe('Bearer my-jwt-token');
    });

    test('sets API-Key type token', () => {
      service.setAuthToken('key-123', 'API-Key');
      const instance = vi.mocked(axios).create.mock.results[0]?.value;
      expect(instance.defaults.headers.common['Authorization']).toBe('API-Key key-123');
    });

    test('sets Basic auth token', () => {
      service.setAuthToken('base64creds', 'Basic');
      const instance = vi.mocked(axios).create.mock.results[0]?.value;
      expect(instance.defaults.headers.common['Authorization']).toBe('Basic base64creds');
    });
  });

  describe('clearAuth()', () => {
    test('removes Authorization header after clearing', () => {
      service.setAuthToken('my-token');
      service.clearAuth();
      const instance = vi.mocked(axios).create.mock.results[0]?.value;
      expect(instance.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('setHeader() / removeHeader()', () => {
    test('sets a custom header on the axios instance', () => {
      service.setHeader('X-Custom', 'value');
      const instance = vi.mocked(axios).create.mock.results[0]?.value;
      expect(instance.defaults.headers.common['X-Custom']).toBe('value');
    });

    test('removes a custom header from the axios instance', () => {
      service.setHeader('X-Custom', 'value');
      service.removeHeader('X-Custom');
      const instance = vi.mocked(axios).create.mock.results[0]?.value;
      expect(instance.defaults.headers.common['X-Custom']).toBeUndefined();
    });
  });

  // ==========================================================================
  // Auth Headers Callback
  // ==========================================================================

  describe('getAuthHeaders callback', () => {
    test('injects auth headers from callback into requests', async () => {
      const getAuthHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer dynamic-token' });
      vi.clearAllMocks();
      const authService = new BaseApiService('http://localhost:3000', 5000, getAuthHeaders);

      const instance = vi.mocked(axios).create.mock.results[0]?.value;
      instance.request.mockResolvedValue(makeAxiosResponse({ ok: true }));

      await authService.get('/protected');

      expect(getAuthHeaders).toHaveBeenCalled();
      expect(instance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer dynamic-token',
          }),
        })
      );
    });

    test('continues request when auth headers callback fails', async () => {
      const getAuthHeaders = vi.fn().mockRejectedValue(new Error('Auth provider down'));
      vi.clearAllMocks();
      const authService = new BaseApiService('http://localhost:3000', 5000, getAuthHeaders);

      const instance = vi.mocked(axios).create.mock.results[0]?.value;
      instance.request.mockResolvedValue(makeAxiosResponse({ ok: true }));

      const result = await authService.get('/protected');

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Retry Logic with Exponential Backoff
  // ==========================================================================

  describe('retry logic', () => {
    test('retries on failure and succeeds on second attempt', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(makeAxiosResponse({ recovered: true }));

      const promise = service.get('/flaky', { retries: 2 });

      // Advance past the 1s delay (2^0 * 1000)
      await vi.advanceTimersByTimeAsync(1500);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ recovered: true });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    test('fails after exhausting all retries', async () => {
      const { mockRequest } = getAxiosMocks();
      const networkError = makeAxiosError('Network error');
      mockRequest.mockRejectedValue(networkError);

      const promise = service.get('/always-fails', { retries: 1 });

      // Advance past the retry delay
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('uses exponential backoff delays', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce(makeAxiosResponse({ ok: true }));

      const promise = service.get('/backoff', { retries: 3 });

      // First retry delay: 2^0 * 1000 = 1000ms
      await vi.advanceTimersByTimeAsync(1100);
      // Second retry delay: 2^1 * 1000 = 2000ms
      await vi.advanceTimersByTimeAsync(2100);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Request Cancellation
  // ==========================================================================

  describe('cancelRequest()', () => {
    test('cancels all requests when no requestId provided', () => {
      // cancelRequest without ID should not throw
      expect(() => service.cancelRequest()).not.toThrow();
    });

    test('cancels a specific request by requestId', () => {
      // cancelRequest with non-existing ID should not throw
      expect(() => service.cancelRequest('non-existing-id')).not.toThrow();
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('error handling', () => {
    test('handles Axios network error (no response)', async () => {
      const { mockRequest } = getAxiosMocks();
      const error = makeAxiosError('Network Error');
      mockRequest.mockRejectedValue(error);

      const promise = service.get('/network-fail', { retries: 0 });
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
      expect(result.statusCode).toBe(0);
    });

    test('handles 401 Unauthorized error', async () => {
      const { mockRequest } = getAxiosMocks();
      const error = makeAxiosError('Unauthorized', 401);
      mockRequest.mockRejectedValue(error);

      const promise = service.get('/protected', { retries: 0 });
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    test('handles 403 Forbidden error', async () => {
      const { mockRequest } = getAxiosMocks();
      const error = makeAxiosError('Forbidden', 403);
      mockRequest.mockRejectedValue(error);

      const result = await service.get('/admin-only', { retries: 0 });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    test('handles 404 Not Found error', async () => {
      const { mockRequest } = getAxiosMocks();
      const error = makeAxiosError('Not Found', 404);
      mockRequest.mockRejectedValue(error);

      const result = await service.get('/missing', { retries: 0 });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
    });

    test('handles 500 Internal Server Error', async () => {
      const { mockRequest } = getAxiosMocks();
      const error = makeAxiosError('Internal Server Error', 500);
      mockRequest.mockRejectedValue(error);

      const result = await service.get('/server-error', { retries: 0 });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    test('handles non-Axios generic errors', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockRejectedValue(new Error('Some generic error'));

      const result = await service.get('/generic-fail', { retries: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Some generic error');
    });

    test('handles non-Error thrown values', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockRejectedValue('string error');

      const result = await service.get('/weird-fail', { retries: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  // ==========================================================================
  // File Upload
  // ==========================================================================

  describe('uploadFile()', () => {
    test('uploads a single file via axios', async () => {
      const { mockPost } = getAxiosMocks();
      mockPost.mockResolvedValue(makeAxiosResponse({ fileId: 'abc' }));

      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await service.uploadFile('/upload', mockFile);

      expect(mockPost).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        expect.objectContaining({
          timeout: expect.any(Number),
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fileId: 'abc' });
    });

    test('uploads multiple files via axios', async () => {
      const { mockPost } = getAxiosMocks();
      mockPost.mockResolvedValue(makeAxiosResponse({ files: ['a', 'b'] }));

      const files = [
        new File(['file1'], 'one.txt', { type: 'text/plain' }),
        new File(['file2'], 'two.txt', { type: 'text/plain' }),
      ];
      const result = await service.uploadFile('/upload', files);

      expect(result.success).toBe(true);
      // Verify FormData was passed (first arg after endpoint)
      const formData = mockPost.mock.calls[0][1];
      expect(formData).toBeInstanceOf(FormData);
    });

    test('appends additional data to upload FormData', async () => {
      const { mockPost } = getAxiosMocks();
      mockPost.mockResolvedValue(makeAxiosResponse({ ok: true }));

      const mockFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      await service.uploadFile('/upload', mockFile, { category: 'docs', userId: '42' });

      const formData = mockPost.mock.calls[0][1] as FormData;
      expect(formData.get('category')).toBe('docs');
      expect(formData.get('userId')).toBe('42');
    });

    test('handles upload error gracefully', async () => {
      const { mockPost } = getAxiosMocks();
      const error = makeAxiosError('Upload failed', 413);
      mockPost.mockRejectedValue(error);

      const mockFile = new File(['big'], 'huge.bin', { type: 'application/octet-stream' });
      const result = await service.uploadFile('/upload', mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    test('removes Content-Type header for multipart upload', async () => {
      const { mockPost } = getAxiosMocks();
      mockPost.mockResolvedValue(makeAxiosResponse({ ok: true }));

      const mockFile = new File(['x'], 'f.txt', { type: 'text/plain' });
      await service.uploadFile('/upload', mockFile);

      const configArg = mockPost.mock.calls[0][2];
      expect(configArg.headers['Content-Type']).toBeUndefined();
    });
  });

  // ==========================================================================
  // SSE Connection
  // ==========================================================================

  describe('createSSEConnection()', () => {
    let originalEventSource: typeof EventSource;

    beforeEach(() => {
      originalEventSource = globalThis.EventSource;
      // Mock EventSource
      globalThis.EventSource = vi.fn().mockImplementation((url: string) => ({
        url,
        onmessage: null,
        onerror: null,
        onopen: null,
        close: vi.fn(),
        readyState: 0,
      })) as any;
    });

    afterEach(() => {
      globalThis.EventSource = originalEventSource;
    });

    test('creates EventSource with correctly built URL', () => {
      service.createSSEConnection('/events/stream');

      expect(globalThis.EventSource).toHaveBeenCalledWith('http://localhost:3000/events/stream');
    });

    test('attaches onMessage callback', () => {
      const onMessage = vi.fn();
      const es = service.createSSEConnection('/events', { onMessage });

      expect(es.onmessage).toBe(onMessage);
    });

    test('attaches onError callback', () => {
      const onError = vi.fn();
      const es = service.createSSEConnection('/events', { onError });

      expect(es.onerror).toBe(onError);
    });

    test('attaches onOpen callback', () => {
      const onOpen = vi.fn();
      const es = service.createSSEConnection('/events', { onOpen });

      expect(es.onopen).toBe(onOpen);
    });

    test('sets up retry logic when maxRetries and retryInterval provided', () => {
      const onError = vi.fn();
      const es = service.createSSEConnection('/events', {
        onError,
        maxRetries: 3,
        retryInterval: 1000,
      });

      // When retry config is present, onerror is overridden with retry logic
      expect(es.onerror).toBeDefined();
      expect(es.onerror).not.toBe(onError); // It wraps the original
    });
  });

  // ==========================================================================
  // Request with custom config
  // ==========================================================================

  describe('request() with custom config', () => {
    test('passes custom timeout to axios', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockResolvedValue(makeAxiosResponse({ ok: true }));

      await service.get('/slow', { timeout: 30000 });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30000 })
      );
    });

    test('passes custom headers to axios', async () => {
      const { mockRequest } = getAxiosMocks();
      mockRequest.mockResolvedValue(makeAxiosResponse({ ok: true }));

      await service.get('/custom', { headers: { 'X-Request-Id': 'abc' } });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Request-Id': 'abc' }),
        })
      );
    });
  });
});
