import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notificationService';
import { BaseApiService } from '../BaseApiService';

// Mock BaseApiService
vi.mock('../BaseApiService', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPatch = vi.fn();
  const mockDelete = vi.fn();
  const mockCancelRequest = vi.fn();
  const mockCreateSSEConnection = vi.fn();

  return {
    BaseApiService: vi.fn().mockImplementation(() => ({
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      delete: mockDelete,
      cancelRequest: mockCancelRequest,
      createSSEConnection: mockCreateSSEConnection,
    })),
    __mockGet: mockGet,
    __mockPost: mockPost,
    __mockPatch: mockPatch,
    __mockDelete: mockDelete,
    __mockCancelRequest: mockCancelRequest,
    __mockCreateSSEConnection: mockCreateSSEConnection,
  };
});

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
  GATEWAY_SERVICES: { NOTIFICATION: 'notification' },
  GATEWAY_ENDPOINTS: {
    NOTIFICATION: {
      BASE: 'http://localhost:9080/notification',
      LIST: 'http://localhost:9080/notification/api/v1/notifications',
      GET: 'http://localhost:9080/notification/api/v1/notifications/{notificationId}',
      MARK_READ: 'http://localhost:9080/notification/api/v1/notifications/mark-read',
      DISMISS: 'http://localhost:9080/notification/api/v1/notifications/dismiss',
      COUNT: 'http://localhost:9080/notification/api/v1/notifications/count',
      PREFERENCES: 'http://localhost:9080/notification/api/v1/notifications/preferences',
      SUBSCRIBE: 'http://localhost:9080/notification/api/v1/notifications/subscribe',
      HEALTH: 'http://localhost:9080/notification/health',
    },
  },
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
    mockPatch: instance?.patch as ReturnType<typeof vi.fn>,
    mockDelete: instance?.delete as ReturnType<typeof vi.fn>,
    mockCancelRequest: instance?.cancelRequest as ReturnType<typeof vi.fn>,
    mockCreateSSEConnection: instance?.createSSEConnection as ReturnType<typeof vi.fn>,
  };
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('constructor', () => {
    test('initializes with default gateway endpoint', () => {
      expect(BaseApiService).toHaveBeenCalledWith(
        'http://localhost:9080/notification',
        undefined,
        undefined
      );
    });

    test('accepts custom baseUrl and auth headers function', () => {
      const customAuth = async () => ({ Authorization: 'Bearer custom' });
      new NotificationService('http://custom:8206', customAuth);
      expect(BaseApiService).toHaveBeenCalledWith(
        'http://custom:8206',
        undefined,
        customAuth
      );
    });
  });

  // ============================================================================
  // getNotifications
  // ============================================================================

  describe('getNotifications', () => {
    test('fetches notifications with default options', async () => {
      const mockResponse = {
        success: true,
        data: {
          notifications: [
            { id: '1', title: 'Test', message: 'Hello', type: 'info', status: 'unread' },
          ],
          total: 1,
          has_more: false,
        },
      };
      getMocks().mockGet.mockResolvedValue(mockResponse);

      const result = await service.getNotifications();

      expect(getMocks().mockGet).toHaveBeenCalledWith(
        '/api/v1/notifications',
        expect.objectContaining({})
      );
      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    test('passes query parameters for filtering', async () => {
      getMocks().mockGet.mockResolvedValue({
        success: true,
        data: { notifications: [], total: 0, has_more: false },
      });

      await service.getNotifications({
        status: 'unread',
        type: 'warning',
        limit: 10,
        offset: 5,
      });

      expect(getMocks().mockGet).toHaveBeenCalledWith(
        '/api/v1/notifications?status=unread&type=warning&limit=10&offset=5',
        expect.objectContaining({})
      );
    });

    test('throws on API failure', async () => {
      getMocks().mockGet.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      await expect(service.getNotifications()).rejects.toThrow(
        'Failed to get notifications: Unauthorized'
      );
    });
  });

  // ============================================================================
  // getNotification
  // ============================================================================

  describe('getNotification', () => {
    test('fetches a single notification by ID', async () => {
      const notification = {
        id: 'n1',
        title: 'Alert',
        message: 'Test',
        type: 'info',
        status: 'unread',
      };
      getMocks().mockGet.mockResolvedValue({ success: true, data: notification });

      const result = await service.getNotification('n1');

      expect(getMocks().mockGet).toHaveBeenCalledWith('/api/v1/notifications/n1');
      expect(result.id).toBe('n1');
    });

    test('throws on API failure', async () => {
      getMocks().mockGet.mockResolvedValue({ success: false, error: 'Not found' });

      await expect(service.getNotification('bad-id')).rejects.toThrow(
        'Failed to get notification: Not found'
      );
    });
  });

  // ============================================================================
  // getUnreadCount
  // ============================================================================

  describe('getUnreadCount', () => {
    test('fetches notification counts', async () => {
      const countData = { total: 10, unread: 3, by_type: { info: 2, warning: 1 } };
      getMocks().mockGet.mockResolvedValue({ success: true, data: countData });

      const result = await service.getUnreadCount();

      expect(getMocks().mockGet).toHaveBeenCalledWith('/api/v1/notifications/count');
      expect(result.unread).toBe(3);
    });
  });

  // ============================================================================
  // markAsRead
  // ============================================================================

  describe('markAsRead', () => {
    test('marks specified notifications as read', async () => {
      getMocks().mockPost.mockResolvedValue({
        success: true,
        data: { success: true, updated_count: 2 },
      });

      const result = await service.markAsRead(['n1', 'n2']);

      expect(getMocks().mockPost).toHaveBeenCalledWith(
        '/api/v1/notifications/mark-read',
        { notification_ids: ['n1', 'n2'] }
      );
      expect(result.updated_count).toBe(2);
    });

    test('throws on API failure', async () => {
      getMocks().mockPost.mockResolvedValue({ success: false, error: 'Server error' });

      await expect(service.markAsRead(['n1'])).rejects.toThrow(
        'Failed to mark notifications as read: Server error'
      );
    });
  });

  // ============================================================================
  // markAllAsRead
  // ============================================================================

  describe('markAllAsRead', () => {
    test('marks all notifications as read', async () => {
      getMocks().mockPost.mockResolvedValue({
        success: true,
        data: { success: true, updated_count: 5 },
      });

      const result = await service.markAllAsRead();

      expect(getMocks().mockPost).toHaveBeenCalledWith(
        '/api/v1/notifications/mark-read',
        { notification_ids: ['*'] }
      );
      expect(result.updated_count).toBe(5);
    });
  });

  // ============================================================================
  // dismiss
  // ============================================================================

  describe('dismiss', () => {
    test('dismisses specified notifications', async () => {
      getMocks().mockPost.mockResolvedValue({
        success: true,
        data: { success: true, updated_count: 1 },
      });

      const result = await service.dismiss(['n3']);

      expect(getMocks().mockPost).toHaveBeenCalledWith(
        '/api/v1/notifications/dismiss',
        { notification_ids: ['n3'] }
      );
      expect(result.updated_count).toBe(1);
    });
  });

  // ============================================================================
  // getPreferences
  // ============================================================================

  describe('getPreferences', () => {
    test('fetches notification preferences', async () => {
      const prefs = {
        email_enabled: true,
        push_enabled: false,
        in_app_enabled: true,
        type_preferences: { info: true, warning: true, success: true, error: true, assistant: true },
      };
      getMocks().mockGet.mockResolvedValue({ success: true, data: prefs });

      const result = await service.getPreferences();

      expect(getMocks().mockGet).toHaveBeenCalledWith('/api/v1/notifications/preferences');
      expect(result.email_enabled).toBe(true);
    });
  });

  // ============================================================================
  // updatePreferences
  // ============================================================================

  describe('updatePreferences', () => {
    test('updates notification preferences', async () => {
      const updatedPrefs = { email_enabled: false, push_enabled: true, in_app_enabled: true, type_preferences: {} };
      getMocks().mockPatch.mockResolvedValue({ success: true, data: updatedPrefs });

      const result = await service.updatePreferences({ email_enabled: false });

      expect(getMocks().mockPatch).toHaveBeenCalledWith(
        '/api/v1/notifications/preferences',
        { email_enabled: false }
      );
      expect(result.email_enabled).toBe(false);
    });
  });

  // ============================================================================
  // healthCheck
  // ============================================================================

  describe('healthCheck', () => {
    test('returns healthy status on success', async () => {
      getMocks().mockGet.mockResolvedValue({
        success: true,
        data: { status: 'healthy' },
      });

      const result = await service.healthCheck();

      expect(getMocks().mockGet).toHaveBeenCalledWith('/health');
      expect(result.status).toBe('healthy');
      expect(result.service).toBe('NotificationService');
    });

    test('returns unhealthy status on failure', async () => {
      getMocks().mockGet.mockRejectedValue(new Error('Connection refused'));

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.service).toBe('NotificationService');
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
