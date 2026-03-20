import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BaseApiService } from '../BaseApiService';
import type { ApiResponse } from '../BaseApiService';

// Hoisted mock references — vi.hoisted runs before vi.mock hoisting
const {
  mockRequest,
  mockPost,
  mockInterceptors,
  mockDefaults,
  mockCreate,
  mockIsAxiosError,
} = vi.hoisted(() => {
  const mockRequest = vi.fn();
  const mockPost = vi.fn();
  const mockInterceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  const mockDefaults = { headers: { common: {} as Record<string, string> } };
  const mockCreate = vi.fn().mockReturnValue({
    request: mockRequest,
    post: mockPost,
    interceptors: mockInterceptors,
    defaults: mockDefaults,
  });
  const mockIsAxiosError = vi.fn();
  return { mockRequest, mockPost, mockInterceptors, mockDefaults, mockCreate, mockIsAxiosError };
});

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: mockCreate,
    isAxiosError: mockIsAxiosError,
  },
}));

// Mock config
vi.mock('../../config', () => ({
  config: {
    api: {
      baseUrl: 'http://localhost:3000',
      timeout: 30000,
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
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  LogCategory: {
    API_REQUEST: 'api_request',
  },
}));

describe('BaseApiService', () => {
  let service: BaseApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset common headers between tests
    mockDefaults.headers.common = {};
    // Restore mockCreate to return a fresh-looking instance with shared refs
    mockCreate.mockReturnValue({
      request: mockRequest,
      post: mockPost,
      interceptors: mockInterceptors,
      defaults: mockDefaults,
    });
    service = new BaseApiService();
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('constructor', () => {
    test('uses config defaults when no arguments provided', () => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000',
          timeout: 30000,
        })
      );
    });

    test('uses custom baseUrl and timeout when provided', () => {
      new BaseApiService('http://custom:5000', 5000);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://custom:5000',
          timeout: 5000,
        })
      );
    });

    test('sets default Content-Type and Accept headers', () => {
      const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0];

      expect(lastCall.headers).toEqual(
        expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        })
      );
    });

    test('sets up axios interceptors', () => {
      expect(mockInterceptors.request.use).toHaveBeenCalled();
      expect(mockInterceptors.response.use).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // HTTP convenience methods
  // ============================================================================

  describe('get', () => {
    test('sends a GET request to the endpoint', async () => {
      mockRequest.mockResolvedValue({
        data: { id: 1 },
        status: 200,
        headers: {},
      });

      const result = await service.get('/users/1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1 });
      expect(result.statusCode).toBe(200);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users/1',
          method: 'get',
        })
      );
    });
  });

  describe('post', () => {
    test('sends a POST request with body', async () => {
      mockRequest.mockResolvedValue({
        data: { id: 2, name: 'Alice' },
        status: 201,
        headers: {},
      });

      const result = await service.post('/users', { name: 'Alice' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 2, name: 'Alice' });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users',
          method: 'post',
          data: { name: 'Alice' },
        })
      );
    });
  });

  describe('put', () => {
    test('sends a PUT request with body', async () => {
      mockRequest.mockResolvedValue({
        data: { id: 1, name: 'Bob' },
        status: 200,
        headers: {},
      });

      const result = await service.put('/users/1', { name: 'Bob' });

      expect(result.success).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users/1',
          method: 'put',
          data: { name: 'Bob' },
        })
      );
    });
  });

  describe('delete', () => {
    test('sends a DELETE request', async () => {
      mockRequest.mockResolvedValue({
        data: null,
        status: 204,
        headers: {},
      });

      const result = await service.delete('/users/1');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(204);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users/1',
          method: 'delete',
        })
      );
    });
  });

  describe('patch', () => {
    test('sends a PATCH request with body', async () => {
      mockRequest.mockResolvedValue({
        data: { id: 1, active: false },
        status: 200,
        headers: {},
      });

      const result = await service.patch('/users/1', { active: false });

      expect(result.success).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/users/1',
          method: 'patch',
          data: { active: false },
        })
      );
    });
  });

  // ============================================================================
  // Auth header injection
  // ============================================================================

  describe('setAuthToken', () => {
    test('sets Bearer authorization header by default', () => {
      service.setAuthToken('my-token');

      expect(mockDefaults.headers.common['Authorization']).toBe('Bearer my-token');
    });

    test('supports API-Key auth type', () => {
      service.setAuthToken('key-123', 'API-Key');

      expect(mockDefaults.headers.common['Authorization']).toBe('API-Key key-123');
    });

    test('supports Basic auth type', () => {
      service.setAuthToken('base64creds', 'Basic');

      expect(mockDefaults.headers.common['Authorization']).toBe('Basic base64creds');
    });

    test('auth token is included in subsequent requests', async () => {
      mockRequest.mockResolvedValue({ data: {}, status: 200, headers: {} });

      service.setAuthToken('req-token');
      await service.get('/protected');

      const callConfig = mockRequest.mock.calls[0][0];
      expect(callConfig.headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer req-token',
        })
      );
    });
  });

  describe('clearAuth', () => {
    test('removes authorization header', () => {
      service.setAuthToken('temp-token');
      service.clearAuth();

      expect(mockDefaults.headers.common['Authorization']).toBeUndefined();
    });

    test('auth header is absent after clearing', async () => {
      mockRequest.mockResolvedValue({ data: {}, status: 200, headers: {} });

      service.setAuthToken('temp-token');
      service.clearAuth();
      await service.get('/public');

      const callConfig = mockRequest.mock.calls[0][0];
      expect(callConfig.headers['Authorization']).toBeUndefined();
    });
  });

  // ============================================================================
  // Custom header management
  // ============================================================================

  describe('setHeader', () => {
    test('adds a custom header', () => {
      service.setHeader('X-Custom', 'value-1');

      expect(mockDefaults.headers.common['X-Custom']).toBe('value-1');
    });

    test('custom header is included in subsequent requests', async () => {
      mockRequest.mockResolvedValue({ data: {}, status: 200, headers: {} });

      service.setHeader('X-Request-Id', 'abc-123');
      await service.get('/resource');

      const callConfig = mockRequest.mock.calls[0][0];
      expect(callConfig.headers['X-Request-Id']).toBe('abc-123');
    });
  });

  describe('removeHeader', () => {
    test('removes a previously set custom header', () => {
      service.setHeader('X-Temp', 'remove-me');
      service.removeHeader('X-Temp');

      expect(mockDefaults.headers.common['X-Temp']).toBeUndefined();
    });

    test('header is absent from requests after removal', async () => {
      mockRequest.mockResolvedValue({ data: {}, status: 200, headers: {} });

      service.setHeader('X-Temp', 'remove-me');
      service.removeHeader('X-Temp');
      await service.get('/resource');

      const callConfig = mockRequest.mock.calls[0][0];
      expect(callConfig.headers['X-Temp']).toBeUndefined();
    });
  });

  // ============================================================================
  // Error handling
  // ============================================================================

  describe('error handling', () => {
    test('handles network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      mockRequest.mockRejectedValue(networkError);
      mockIsAxiosError.mockReturnValue(false);

      const result = await service.get('/unreachable', { retries: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    test('handles timeout errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockRequest.mockRejectedValue(timeoutError);
      mockIsAxiosError.mockReturnValue(false);

      const result = await service.get('/slow-endpoint', { retries: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('handles 4xx client errors via axios error', async () => {
      const axiosError = new Error('Request failed with status code 404');
      (axiosError as any).response = { status: 404, data: 'Not Found' };
      mockRequest.mockRejectedValue(axiosError);
      mockIsAxiosError.mockReturnValue(true);

      const result = await service.get('/missing', { retries: 0 });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toContain('404');
    });

    test('handles 5xx server errors via axios error', async () => {
      const axiosError = new Error('Request failed with status code 500');
      (axiosError as any).response = { status: 500, data: 'Internal Server Error' };
      mockRequest.mockRejectedValue(axiosError);
      mockIsAxiosError.mockReturnValue(true);

      const result = await service.get('/broken', { retries: 0 });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    test('returns timestamp on error responses', async () => {
      mockRequest.mockRejectedValue(new Error('fail'));
      mockIsAxiosError.mockReturnValue(false);

      const result = await service.get('/fail', { retries: 0 });

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  // ============================================================================
  // Request cancellation
  // ============================================================================

  describe('cancelRequest', () => {
    test('cancels all requests when no requestId is provided', () => {
      expect(() => service.cancelRequest()).not.toThrow();
    });

    test('cancels a specific request by id when provided', () => {
      expect(() => service.cancelRequest('non-existent-id')).not.toThrow();
    });
  });

  // ============================================================================
  // Response format
  // ============================================================================

  describe('response format', () => {
    test('successful response includes all expected fields', async () => {
      mockRequest.mockResolvedValue({
        data: { items: [] },
        status: 200,
        headers: { 'x-request-id': 'abc' },
      });

      const result = await service.get('/items');

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          data: { items: [] },
          statusCode: 200,
          timestamp: expect.any(String),
        })
      );
      expect(result.headers).toBeDefined();
    });
  });

  // ============================================================================
  // getAuthHeaders callback
  // ============================================================================

  describe('getAuthHeaders callback', () => {
    test('injects auth headers from callback into requests', async () => {
      const authFn = vi.fn().mockResolvedValue({ Authorization: 'Bearer dynamic-token' });
      const authedService = new BaseApiService(undefined, undefined, authFn);

      mockRequest.mockResolvedValue({ data: {}, status: 200, headers: {} });

      await authedService.get('/secure');

      expect(authFn).toHaveBeenCalled();
      const callConfig = mockRequest.mock.calls[0][0];
      expect(callConfig.headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer dynamic-token',
        })
      );
    });

    test('proceeds without auth headers when callback throws', async () => {
      const authFn = vi.fn().mockRejectedValue(new Error('Auth failed'));
      const authedService = new BaseApiService(undefined, undefined, authFn);

      mockRequest.mockResolvedValue({ data: {}, status: 200, headers: {} });

      const result = await authedService.get('/fallback');

      expect(result.success).toBe(true);
      const callConfig = mockRequest.mock.calls[0][0];
      expect(callConfig.headers['Authorization']).toBeUndefined();
    });
  });
});
