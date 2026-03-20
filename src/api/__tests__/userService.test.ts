import { describe, test, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../userService';
import { BaseApiService } from '../BaseApiService';

// Mock BaseApiService
vi.mock('../BaseApiService', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockCancelRequest = vi.fn();

  return {
    BaseApiService: vi.fn().mockImplementation(() => ({
      get: mockGet,
      post: mockPost,
      cancelRequest: mockCancelRequest,
    })),
    __mockGet: mockGet,
    __mockPost: mockPost,
    __mockCancelRequest: mockCancelRequest,
  };
});

// Mock config
vi.mock('../../config', () => ({
  config: {
    externalApis: {
      userServiceUrl: 'http://localhost:9080/users',
    },
  },
}));

// Mock gatewayConfig
vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_CONFIG: {
    BASE_URL: 'http://localhost:9080',
    API_VERSION: 'v1',
    AUTH: {
      TOKEN_KEY: 'isa_auth_token',
      API_KEY: 'isa_api_key',
      AUTH_HEADER: 'Authorization',
      API_KEY_HEADER: 'X-API-Key',
    },
    TIMEOUT: { DEFAULT: 30000, CHAT_SSE: 300000, UPLOAD: 120000 },
  },
  GATEWAY_SERVICES: { USER: 'users' },
  GATEWAY_ENDPOINTS: {},
  getAuthHeaders: vi.fn().mockReturnValue({ Authorization: 'Bearer test-token' }),
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

// Get mock references
const getMocks = () => {
  const mod = vi.mocked(BaseApiService);
  const instance = mod.mock.results[0]?.value;
  return {
    mockGet: instance?.get as ReturnType<typeof vi.fn>,
    mockPost: instance?.post as ReturnType<typeof vi.fn>,
    mockCancelRequest: instance?.cancelRequest as ReturnType<typeof vi.fn>,
  };
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService();
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('constructor', () => {
    test('initializes with default config url', () => {
      expect(BaseApiService).toHaveBeenCalledWith(
        'http://localhost:9080/users',
        undefined,
        undefined
      );
    });

    test('accepts custom baseUrl and auth headers function', () => {
      const customAuth = async () => ({ Authorization: 'Bearer custom' });
      new UserService('http://custom:8080', customAuth);
      expect(BaseApiService).toHaveBeenCalledWith(
        'http://custom:8080',
        undefined,
        customAuth
      );
    });
  });

  // ============================================================================
  // ensureUserExists
  // ============================================================================

  describe('ensureUserExists', () => {
    const userData = {
      auth0_id: 'auth0|123',
      email: 'alice@example.com',
      name: 'Alice',
    };

    test('calls post with correct endpoint and payload', async () => {
      const mockUser = { auth0_id: 'auth0|123', email: 'alice@example.com', name: 'Alice', credits: 100 };
      getMocks().mockPost.mockResolvedValue({ success: true, data: mockUser });

      const result = await service.ensureUserExists(userData);

      expect(getMocks().mockPost).toHaveBeenCalledWith('/api/v1/users/ensure', userData);
      expect(result).toEqual(mockUser);
    });

    test('throws on API failure', async () => {
      getMocks().mockPost.mockResolvedValue({ success: false, error: 'Conflict' });

      await expect(service.ensureUserExists(userData)).rejects.toThrow(
        'User creation failed: Conflict'
      );
    });

    test('throws on network error', async () => {
      getMocks().mockPost.mockRejectedValue(new Error('Network error'));

      await expect(service.ensureUserExists(userData)).rejects.toThrow(
        'User creation failed: Network error'
      );
    });
  });

  // ============================================================================
  // getCurrentUser
  // ============================================================================

  describe('getCurrentUser', () => {
    test('calls get with correct endpoint', async () => {
      const mockUser = { auth0_id: 'auth0|123', email: 'alice@example.com', credits: 50 };
      getMocks().mockGet.mockResolvedValue({ success: true, data: mockUser });

      const result = await service.getCurrentUser();

      expect(getMocks().mockGet).toHaveBeenCalledWith('/api/v1/users/me');
      expect(result).toEqual(mockUser);
    });

    test('throws on API failure', async () => {
      getMocks().mockGet.mockResolvedValue({ success: false, error: 'Unauthorized' });

      await expect(service.getCurrentUser()).rejects.toThrow(
        'Get user failed: Unauthorized'
      );
    });

    test('throws on network error', async () => {
      getMocks().mockGet.mockRejectedValue(new Error('Connection refused'));

      await expect(service.getCurrentUser()).rejects.toThrow(
        'Get user failed: Connection refused'
      );
    });
  });

  // ============================================================================
  // consumeCredits
  // ============================================================================

  describe('consumeCredits', () => {
    const auth0Id = 'auth0|456';
    const consumption = { amount: 10, reason: 'chat_message' };

    test('calls post with userId and consumption data', async () => {
      const mockResult = { success: true, remaining_credits: 90 };
      getMocks().mockPost.mockResolvedValue({ success: true, data: mockResult });

      const result = await service.consumeCredits(auth0Id, consumption);

      expect(getMocks().mockPost).toHaveBeenCalledWith(
        '/api/v1/users/auth0|456/credits/consume',
        consumption
      );
      expect(result).toEqual(mockResult);
    });

    test('throws on API failure', async () => {
      getMocks().mockPost.mockResolvedValue({ success: false, error: 'Insufficient credits' });

      await expect(service.consumeCredits(auth0Id, consumption)).rejects.toThrow(
        'Credit consumption failed: Insufficient credits'
      );
    });

    test('throws on network error', async () => {
      getMocks().mockPost.mockRejectedValue(new Error('Timeout'));

      await expect(service.consumeCredits(auth0Id, consumption)).rejects.toThrow(
        'Credit consumption failed: Timeout'
      );
    });
  });

  // ============================================================================
  // getUserSubscription
  // ============================================================================

  describe('getUserSubscription', () => {
    const auth0Id = 'auth0|789';

    test('calls get with userId', async () => {
      const mockSub = { plan_type: 'pro', status: 'active' };
      getMocks().mockGet.mockResolvedValue({ success: true, data: mockSub });

      const result = await service.getUserSubscription(auth0Id);

      expect(getMocks().mockGet).toHaveBeenCalledWith('/api/v1/users/auth0|789/subscription');
      expect(result).toEqual(mockSub);
    });

    test('returns null when subscription not found (404)', async () => {
      getMocks().mockGet.mockResolvedValue({ success: false, statusCode: 404 });

      const result = await service.getUserSubscription(auth0Id);

      expect(result).toBeNull();
    });

    test('throws on API failure', async () => {
      getMocks().mockGet.mockResolvedValue({ success: false, error: 'Server error' });

      await expect(service.getUserSubscription(auth0Id)).rejects.toThrow(
        'Get subscription failed: Server error'
      );
    });

    test('throws on network error', async () => {
      getMocks().mockGet.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.getUserSubscription(auth0Id)).rejects.toThrow(
        'Get subscription failed: ECONNREFUSED'
      );
    });
  });

  // ============================================================================
  // createCheckoutSession
  // ============================================================================

  describe('createCheckoutSession', () => {
    beforeEach(() => {
      // Mock window.location for checkout URL construction
      Object.defineProperty(globalThis, 'window', {
        value: { location: { origin: 'http://localhost:3000' } },
        writable: true,
        configurable: true,
      });
    });

    test('calls post with planType as query parameter', async () => {
      const mockSession = { url: 'https://checkout.stripe.com/session_123' };
      getMocks().mockPost.mockResolvedValue({ success: true, data: mockSession });

      const result = await service.createCheckoutSession('pro');

      expect(getMocks().mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/payments/create-checkout?'),
        {}
      );
      // Verify query params contain plan_type
      const calledUrl = getMocks().mockPost.mock.calls[0][0] as string;
      expect(calledUrl).toContain('plan_type=pro');
      expect(calledUrl).toContain('success_url=');
      expect(calledUrl).toContain('cancel_url=');
      expect(result).toEqual(mockSession);
    });

    test('throws on API failure', async () => {
      getMocks().mockPost.mockResolvedValue({ success: false, error: 'Invalid plan' });

      await expect(service.createCheckoutSession('invalid')).rejects.toThrow(
        'Checkout creation failed: Invalid plan'
      );
    });

    test('throws on network error', async () => {
      getMocks().mockPost.mockRejectedValue(new Error('Service unavailable'));

      await expect(service.createCheckoutSession('pro')).rejects.toThrow(
        'Checkout creation failed: Service unavailable'
      );
    });
  });

  // ============================================================================
  // checkServiceHealth
  // ============================================================================

  describe('checkServiceHealth', () => {
    test('calls get on health endpoint', async () => {
      const mockHealth = { status: 'healthy' };
      getMocks().mockGet.mockResolvedValue({ success: true, data: mockHealth });

      const result = await service.checkServiceHealth();

      expect(getMocks().mockGet).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockHealth);
    });

    test('throws on API failure', async () => {
      getMocks().mockGet.mockResolvedValue({ success: false, error: 'Health check failed' });

      await expect(service.checkServiceHealth()).rejects.toThrow(
        'Health check failed: Health check failed'
      );
    });

    test('throws on network error', async () => {
      getMocks().mockGet.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(service.checkServiceHealth()).rejects.toThrow(
        'Health check failed: ETIMEDOUT'
      );
    });
  });

  // ============================================================================
  // cancelAllRequests
  // ============================================================================

  describe('cancelAllRequests', () => {
    test('delegates to apiService.cancelRequest', () => {
      service.cancelAllRequests();
      expect(getMocks().mockCancelRequest).toHaveBeenCalled();
    });
  });
});
