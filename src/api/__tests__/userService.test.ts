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
      userServiceUrl: 'http://localhost:8000',
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

// Get mock references from the constructed instance
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
    test('initializes with default config URL', () => {
      expect(BaseApiService).toHaveBeenCalledWith(
        'http://localhost:8000',
        undefined,
        undefined
      );
    });

    test('accepts custom baseUrl and auth headers function', () => {
      const customAuth = async () => ({ Authorization: 'Bearer custom' });
      new UserService('http://custom:9000', customAuth);
      expect(BaseApiService).toHaveBeenCalledWith(
        'http://custom:9000',
        undefined,
        customAuth
      );
    });
  });

  // ============================================================================
  // ensureUserExists
  // ============================================================================

  describe('ensureUserExists', () => {
    const validUserData = {
      auth0_id: 'auth0|123',
      email: 'alice@example.com',
      name: 'Alice',
    };

    const mockUser = {
      auth0_id: 'auth0|123',
      email: 'alice@example.com',
      name: 'Alice',
      credits: 100,
      credits_total: 100,
      plan: 'free',
      is_active: true,
    };

    test('creates or retrieves user with valid data', async () => {
      getMocks().mockPost.mockResolvedValue({ success: true, data: mockUser });

      const result = await service.ensureUserExists(validUserData);

      expect(getMocks().mockPost).toHaveBeenCalledWith('/api/v1/users/ensure', validUserData);
      expect(result.auth0_id).toBe('auth0|123');
      expect(result.email).toBe('alice@example.com');
      expect(result.credits).toBe(100);
    });

    test('throws on API failure', async () => {
      getMocks().mockPost.mockResolvedValue({
        success: false,
        error: 'Invalid user data',
      });

      await expect(service.ensureUserExists(validUserData)).rejects.toThrow(
        'User creation failed: Invalid user data'
      );
    });

    test('wraps network errors with context', async () => {
      getMocks().mockPost.mockRejectedValue(new Error('Network timeout'));

      await expect(service.ensureUserExists(validUserData)).rejects.toThrow(
        'User creation failed: Network timeout'
      );
    });
  });

  // ============================================================================
  // getCurrentUser
  // ============================================================================

  describe('getCurrentUser', () => {
    const mockUser = {
      auth0_id: 'auth0|456',
      email: 'bob@example.com',
      name: 'Bob',
      credits: 50,
      credits_total: 200,
      plan: 'pro',
      is_active: true,
    };

    test('returns current user profile', async () => {
      getMocks().mockGet.mockResolvedValue({ success: true, data: mockUser });

      const result = await service.getCurrentUser();

      expect(getMocks().mockGet).toHaveBeenCalledWith('/api/v1/users/me');
      expect(result.auth0_id).toBe('auth0|456');
      expect(result.credits).toBe(50);
      expect(result.plan).toBe('pro');
    });

    test('throws on 401 unauthorized', async () => {
      getMocks().mockGet.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      await expect(service.getCurrentUser()).rejects.toThrow(
        'Get user failed: Unauthorized'
      );
    });
  });

  // ============================================================================
  // consumeCredits
  // ============================================================================

  describe('consumeCredits', () => {
    test('consumes credits with valid userId and amount', async () => {
      getMocks().mockPost.mockResolvedValue({
        success: true,
        data: { success: true, remaining_credits: 90 },
      });

      const result = await service.consumeCredits('auth0|123', {
        amount: 10,
        reason: 'chat_message',
      });

      expect(getMocks().mockPost).toHaveBeenCalledWith(
        '/api/v1/users/auth0|123/credits/consume',
        { amount: 10, reason: 'chat_message' }
      );
      expect(result.remaining_credits).toBe(90);
    });

    test('throws on insufficient credits', async () => {
      getMocks().mockPost.mockResolvedValue({
        success: false,
        error: 'Insufficient credits',
      });

      await expect(
        service.consumeCredits('auth0|123', { amount: 999, reason: 'test' })
      ).rejects.toThrow('Credit consumption failed: Insufficient credits');
    });

    test('wraps network errors with context', async () => {
      getMocks().mockPost.mockRejectedValue(new Error('Service unavailable'));

      await expect(
        service.consumeCredits('auth0|123', { amount: 5, reason: 'test' })
      ).rejects.toThrow('Credit consumption failed: Service unavailable');
    });
  });

  // ============================================================================
  // getUserSubscription
  // ============================================================================

  describe('getUserSubscription', () => {
    const mockSubscription = {
      id: 1,
      auth0_id: 'auth0|123',
      plan_type: 'pro' as const,
      status: 'active' as const,
      stripe_subscription_id: 'sub_abc',
      current_period_start: '2026-01-01',
      current_period_end: '2026-02-01',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    test('returns subscription data', async () => {
      getMocks().mockGet.mockResolvedValue({ success: true, data: mockSubscription });

      const result = await service.getUserSubscription('auth0|123');

      expect(getMocks().mockGet).toHaveBeenCalledWith('/api/v1/users/auth0|123/subscription');
      expect(result?.plan_type).toBe('pro');
      expect(result?.status).toBe('active');
    });

    test('returns null when user has no subscription (404)', async () => {
      getMocks().mockGet.mockResolvedValue({
        success: false,
        statusCode: 404,
        error: 'Not found',
      });

      const result = await service.getUserSubscription('auth0|123');

      expect(result).toBeNull();
    });

    test('throws on non-404 API failure', async () => {
      getMocks().mockGet.mockResolvedValue({
        success: false,
        error: 'Forbidden',
      });

      await expect(service.getUserSubscription('auth0|123')).rejects.toThrow(
        'Get subscription failed: Forbidden'
      );
    });
  });

  // ============================================================================
  // createCheckoutSession
  // ============================================================================

  describe('createCheckoutSession', () => {
    test('sends correct Stripe checkout payload', async () => {
      // Mock window.location for URL construction
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, 'window', {
        value: { location: { origin: 'http://localhost:3000' } },
        writable: true,
        configurable: true,
      });

      getMocks().mockPost.mockResolvedValue({
        success: true,
        data: { url: 'https://checkout.stripe.com/session/abc123' },
      });

      const result = await service.createCheckoutSession('pro');

      // Verify the endpoint includes query params with plan_type and URLs
      const callArgs = getMocks().mockPost.mock.calls[0];
      expect(callArgs[0]).toContain('/api/v1/payments/create-checkout?');
      expect(callArgs[0]).toContain('plan_type=pro');
      expect(callArgs[0]).toContain('success_url=');
      expect(callArgs[0]).toContain('cancel_url=');
      expect(callArgs[1]).toEqual({});
      expect(result.url).toContain('stripe.com');

      // Restore window
      if (originalWindow === undefined) {
        // @ts-expect-error - cleaning up mock
        delete globalThis.window;
      } else {
        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
          configurable: true,
        });
      }
    });

    test('throws on checkout failure', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: { location: { origin: 'http://localhost:3000' } },
        writable: true,
        configurable: true,
      });

      getMocks().mockPost.mockResolvedValue({
        success: false,
        error: 'Invalid plan type',
      });

      await expect(service.createCheckoutSession('invalid')).rejects.toThrow(
        'Checkout creation failed: Invalid plan type'
      );

      // @ts-expect-error - cleaning up mock
      delete globalThis.window;
    });
  });

  // ============================================================================
  // checkServiceHealth
  // ============================================================================

  describe('checkServiceHealth', () => {
    test('returns healthy status on success', async () => {
      getMocks().mockGet.mockResolvedValue({
        success: true,
        data: { status: 'healthy', timestamp: '2026-03-13T00:00:00Z' },
      });

      const result = await service.checkServiceHealth();

      expect(getMocks().mockGet).toHaveBeenCalledWith('/health');
      expect(result.status).toBe('healthy');
    });

    test('throws on health check failure', async () => {
      getMocks().mockGet.mockResolvedValue({
        success: false,
        error: 'Service unavailable',
      });

      await expect(service.checkServiceHealth()).rejects.toThrow(
        'Health check failed: Service unavailable'
      );
    });

    test('wraps network errors on health check', async () => {
      getMocks().mockGet.mockRejectedValue(new Error('Connection refused'));

      await expect(service.checkServiceHealth()).rejects.toThrow(
        'Health check failed: Connection refused'
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

  // ============================================================================
  // Deprecated Legacy Functions
  // ============================================================================

  describe('deprecated legacy functions', () => {
    test('ensureExternalUserExists throws deprecation error', async () => {
      // Import the deprecated function
      const { ensureExternalUserExists } = await import('../userService');

      await expect(
        ensureExternalUserExists(
          { auth0_id: 'auth0|1', email: 'a@b.com', name: 'A' },
          'token'
        )
      ).rejects.toThrow('deprecated');
    });

    test('getCurrentExternalUser throws deprecation error', async () => {
      const { getCurrentExternalUser } = await import('../userService');

      await expect(getCurrentExternalUser('token')).rejects.toThrow('deprecated');
    });

    test('consumeCredits legacy function delegates to UserService', async () => {
      const { consumeCredits: legacyConsumeCredits } = await import('../userService');

      // The default userService instance will use the mocked BaseApiService
      getMocks().mockPost.mockResolvedValue({
        success: true,
        data: { success: true, remaining_credits: 80 },
      });

      const result = await legacyConsumeCredits('auth0|1', 20, 'test', 'token');
      expect(result.remaining_credits).toBe(80);
    });

    test('checkExternalServiceHealth legacy function delegates to UserService', async () => {
      const { checkExternalServiceHealth } = await import('../userService');

      getMocks().mockGet.mockResolvedValue({
        success: true,
        data: { status: 'healthy', timestamp: '2026-03-13T00:00:00Z' },
      });

      const result = await checkExternalServiceHealth('token');
      expect(result.status).toBe('healthy');
    });
  });

  // ============================================================================
  // Error Propagation (401/403/404)
  // ============================================================================

  describe('error propagation', () => {
    test('propagates 403 forbidden errors', async () => {
      getMocks().mockGet.mockResolvedValue({
        success: false,
        error: 'Forbidden: insufficient permissions',
      });

      await expect(service.getCurrentUser()).rejects.toThrow(
        'Get user failed: Forbidden: insufficient permissions'
      );
    });

    test('propagates generic error when no message provided', async () => {
      getMocks().mockPost.mockResolvedValue({
        success: false,
      });

      await expect(
        service.ensureUserExists({ auth0_id: 'x', email: 'x', name: 'x' })
      ).rejects.toThrow('User creation failed: Failed to ensure user exists');
    });

    test('handles non-Error thrown values', async () => {
      getMocks().mockGet.mockRejectedValue('string error');

      await expect(service.getCurrentUser()).rejects.toThrow(
        'Get user failed: string error'
      );
    });

    test('consumeCredits uses default error message when error field is empty', async () => {
      getMocks().mockPost.mockResolvedValue({ success: false });

      await expect(
        service.consumeCredits('auth0|x', { amount: 1, reason: 'test' })
      ).rejects.toThrow('Credit consumption failed: Failed to consume credits');
    });

    test('checkServiceHealth uses default error message when error field is empty', async () => {
      getMocks().mockGet.mockResolvedValue({ success: false });

      await expect(service.checkServiceHealth()).rejects.toThrow(
        'Health check failed: Health check failed'
      );
    });

    test('getUserSubscription uses default error message when error field is empty', async () => {
      getMocks().mockGet.mockResolvedValue({ success: false, statusCode: 500 });

      await expect(service.getUserSubscription('auth0|x')).rejects.toThrow(
        'Get subscription failed: Failed to get user subscription'
      );
    });

    test('createCheckoutSession wraps network errors', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: { location: { origin: 'http://localhost:3000' } },
        writable: true,
        configurable: true,
      });

      getMocks().mockPost.mockRejectedValue(new Error('Gateway timeout'));

      await expect(service.createCheckoutSession('pro')).rejects.toThrow(
        'Checkout creation failed: Gateway timeout'
      );

      // @ts-expect-error - cleaning up mock
      delete globalThis.window;
    });

    test('getUserSubscription wraps network errors', async () => {
      getMocks().mockGet.mockRejectedValue(new Error('DNS resolution failed'));

      await expect(service.getUserSubscription('auth0|x')).rejects.toThrow(
        'Get subscription failed: DNS resolution failed'
      );
    });
  });
});
