import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '../sessionService';

// Mock @isa/core
const mockCreateSession = vi.fn();
const mockGetSession = vi.fn();
const mockGetUserSessions = vi.fn();
const mockUpdateSession = vi.fn();
const mockEndSession = vi.fn();
const mockGetSessionMessages = vi.fn();
const mockAddMessage = vi.fn();
const mockSetAuthToken = vi.fn();
const mockClearAuth = vi.fn();

vi.mock('@isa/core', () => ({
  SessionService: vi.fn().mockImplementation(() => ({
    createSession: mockCreateSession,
    getSession: mockGetSession,
    getUserSessions: mockGetUserSessions,
    updateSession: mockUpdateSession,
    endSession: mockEndSession,
    getSessionMessages: mockGetSessionMessages,
    addMessage: mockAddMessage,
    setAuthToken: mockSetAuthToken,
    clearAuth: mockClearAuth,
  })),
  BaseApiService: vi.fn().mockImplementation(() => ({})),
}));

// Mock gatewayConfig
vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_CONFIG: {
    BASE_URL: 'http://localhost:9080',
  },
  GATEWAY_ENDPOINTS: {
    SESSIONS: {
      BASE: 'http://localhost:9080/sessions',
      HEALTH: 'http://localhost:9080/sessions/health',
    },
  },
  getAuthHeaders: vi.fn().mockReturnValue({ Authorization: 'Bearer test-token' }),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
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

// Mock global fetch for healthCheck
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionService();
  });

  // ============================================================================
  // createSession
  // ============================================================================

  describe('createSession', () => {
    test('creates a session with required user_id', async () => {
      const mockSession = {
        session_id: 'sess-1',
        user_id: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        metadata: {},
      };
      mockCreateSession.mockResolvedValue(mockSession);

      const result = await service.createSession({ user_id: 'user-1' });

      expect(mockCreateSession).toHaveBeenCalledWith({
        user_id: 'user-1',
        title: expect.stringContaining('Session'),
        conversation_data: {},
        metadata: {},
      });
      expect(result.session_id).toBe('sess-1');
      expect(result.user_id).toBe('user-1');
    });

    test('passes name as title and context as conversation_data', async () => {
      mockCreateSession.mockResolvedValue({
        session_id: 'sess-2',
        user_id: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        metadata: {},
      });

      await service.createSession({
        user_id: 'user-1',
        name: 'My Session',
        context: { topic: 'test' },
      });

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Session',
          conversation_data: { topic: 'test' },
        })
      );
    });

    test('throws when user_id is missing', async () => {
      await expect(
        service.createSession({ user_id: '' })
      ).rejects.toThrow('user_id is required to create a session');
    });

    test('throws when core SDK rejects', async () => {
      mockCreateSession.mockRejectedValue(new Error('SDK error'));

      await expect(
        service.createSession({ user_id: 'user-1' })
      ).rejects.toThrow('SDK error');
    });
  });

  // ============================================================================
  // getSession
  // ============================================================================

  describe('getSession', () => {
    test('retrieves a session by ID', async () => {
      const mockSession = {
        session_id: 'sess-1',
        user_id: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        status: 'active',
        metadata: { topic: 'chat' },
      };
      mockGetSession.mockResolvedValue(mockSession);

      const result = await service.getSession('sess-1');

      expect(mockGetSession).toHaveBeenCalledWith('sess-1');
      expect(result.session_id).toBe('sess-1');
      expect(result.status).toBe('active');
    });

    test('throws when session not found', async () => {
      mockGetSession.mockRejectedValue(new Error('Not found'));

      await expect(service.getSession('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ============================================================================
  // getUserSessions
  // ============================================================================

  describe('getUserSessions', () => {
    test('retrieves sessions for a user with default pagination', async () => {
      const mockResponse = {
        sessions: [{ session_id: 'sess-1' }],
        total: 1,
        page: 1,
        page_size: 20,
      };
      mockGetUserSessions.mockResolvedValue(mockResponse);

      const result = await service.getUserSessions('user-1');

      expect(mockGetUserSessions).toHaveBeenCalledWith('user-1', {
        page: 1,
        pageSize: 20,
      });
      expect(result.sessions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    test('calculates page from offset and limit', async () => {
      mockGetUserSessions.mockResolvedValue({
        sessions: [],
        total: 50,
        page: 3,
        page_size: 10,
      });

      await service.getUserSessions('user-1', { limit: 10, offset: 20 });

      expect(mockGetUserSessions).toHaveBeenCalledWith('user-1', {
        page: 3,
        pageSize: 10,
      });
    });

    test('computes has_more correctly', async () => {
      mockGetUserSessions.mockResolvedValue({
        sessions: [{ session_id: 'sess-1' }],
        total: 50,
        page: 1,
        page_size: 10,
      });

      const result = await service.getUserSessions('user-1', { limit: 10 });

      expect(result.has_more).toBe(true);
    });
  });

  // ============================================================================
  // updateSession
  // ============================================================================

  describe('updateSession', () => {
    test('updates session with metadata, title, and tags', async () => {
      const mockSession = {
        session_id: 'sess-1',
        user_id: 'user-1',
        updated_at: '2026-01-02T00:00:00Z',
        metadata: { title: 'New Title', tags: ['tag1'] },
      };
      mockUpdateSession.mockResolvedValue(mockSession);

      const result = await service.updateSession('sess-1', {
        title: 'New Title',
        tags: ['tag1'],
        context: { key: 'value' },
      });

      expect(mockUpdateSession).toHaveBeenCalledWith('sess-1', {
        metadata: { title: 'New Title', tags: ['tag1'] },
        conversation_data: { key: 'value' },
      });
      expect(result.session_id).toBe('sess-1');
    });

    test('throws when update fails', async () => {
      mockUpdateSession.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.updateSession('sess-1', {})
      ).rejects.toThrow('Update failed');
    });
  });

  // ============================================================================
  // deleteSession
  // ============================================================================

  describe('deleteSession', () => {
    test('ends the session and returns success', async () => {
      mockEndSession.mockResolvedValue(undefined);

      const result = await service.deleteSession('sess-1');

      expect(mockEndSession).toHaveBeenCalledWith('sess-1');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Session ended successfully');
    });

    test('throws when delete fails', async () => {
      mockEndSession.mockRejectedValue(new Error('Delete error'));

      await expect(service.deleteSession('sess-1')).rejects.toThrow('Delete error');
    });
  });

  // ============================================================================
  // searchSessions
  // ============================================================================

  describe('searchSessions', () => {
    test('returns empty when no user_id provided', async () => {
      const result = await service.searchSessions({});

      expect(result.sessions).toEqual([]);
      expect(result.total).toBe(0);
    });

    test('fetches user sessions and filters by query', async () => {
      mockGetUserSessions.mockResolvedValue({
        sessions: [
          { session_id: 's1', title: 'AI Chat', metadata: {} },
          { session_id: 's2', title: 'Bug Report', metadata: {} },
        ],
        total: 2,
        page: 1,
        page_size: 50,
      });

      const result = await service.searchSessions({
        user_id: 'user-1',
        query: 'ai',
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    test('returns all sessions when no query filter', async () => {
      mockGetUserSessions.mockResolvedValue({
        sessions: [{ session_id: 's1', title: 'Chat' }],
        total: 1,
        page: 1,
        page_size: 50,
      });

      const result = await service.searchSessions({ user_id: 'user-1' });

      expect(result.sessions).toHaveLength(1);
    });
  });

  // ============================================================================
  // exportSession
  // ============================================================================

  describe('exportSession', () => {
    test('exports session in JSON format', async () => {
      mockGetSession.mockResolvedValue({
        session_id: 'sess-1',
        user_id: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        metadata: {},
      });
      mockGetSessionMessages.mockResolvedValue({
        messages: [{ content: 'Hello' }],
      });

      const result = await service.exportSession('sess-1', 'json');

      expect(result.format).toBe('json');
      expect(typeof result.data).toBe('string');
      expect(result.filename).toContain('session_sess-1_');
      expect(result.filename).toMatch(/\.json$/);
    });

    test('exports session in non-JSON format as object', async () => {
      mockGetSession.mockResolvedValue({
        session_id: 'sess-1',
        user_id: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        metadata: {},
      });
      mockGetSessionMessages.mockResolvedValue({ messages: [] });

      const result = await service.exportSession('sess-1', 'csv');

      expect(result.format).toBe('csv');
      expect(typeof result.data).toBe('object');
    });

    test('throws when session retrieval fails', async () => {
      mockGetSession.mockRejectedValue(new Error('Not found'));

      await expect(service.exportSession('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ============================================================================
  // healthCheck
  // ============================================================================

  describe('healthCheck', () => {
    test('returns healthy status on success', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('SessionService');
      expect(result.timestamp).toBeDefined();
    });

    test('returns unhealthy status on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.service).toBe('SessionService');
    });

    test('returns unhealthy status on non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.service).toBe('SessionService');
    });
  });
});
