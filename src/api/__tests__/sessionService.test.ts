import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SessionService, createAuthenticatedSessionService } from '../sessionService';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock @isa/core — we mock the CoreSessionService instance methods
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
const mockGetAuthHeaders = vi.fn().mockReturnValue({ Authorization: 'Bearer local-token' });

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_CONFIG: {
    BASE_URL: 'http://localhost:9080',
    API_VERSION: 'v1',
    AUTH: { TOKEN_KEY: 'isa_auth_token' },
    TIMEOUT: { DEFAULT: 30000 },
  },
  GATEWAY_ENDPOINTS: {
    SESSIONS: {
      BASE: 'http://localhost:9080/sessions',
      LIST: 'http://localhost:9080/sessions/api/v1/sessions',
      HEALTH: 'http://localhost:9080/sessions/health',
    },
  },
  getAuthHeaders: (...args: unknown[]) => mockGetAuthHeaders(...args),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  LogCategory: { API_REQUEST: 'api_request' },
}));

// Mock global fetch for healthCheck
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush microtasks so the constructor's async initAuth() settles */
const flushAuth = () => new Promise<void>((r) => setTimeout(r, 0));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetAuthHeaders.mockReturnValue({ Authorization: 'Bearer local-token' });
    service = new SessionService();
    await flushAuth();
  });

  // ==========================================================================
  // Constructor & Auth
  // ==========================================================================

  describe('constructor / auth', () => {
    test('sets auth token from localStorage fallback', async () => {
      // The beforeEach already constructed a service with no async fn,
      // so it should have fallen back to getAuthHeaders() (localStorage).
      expect(mockSetAuthToken).toHaveBeenCalledWith('local-token');
    });

    test('sets auth token from async function when provided', async () => {
      vi.clearAllMocks();
      const asyncAuth = vi.fn().mockResolvedValue({ Authorization: 'Bearer async-token' });
      const svc = new SessionService(asyncAuth);
      await flushAuth();

      expect(asyncAuth).toHaveBeenCalled();
      expect(mockSetAuthToken).toHaveBeenCalledWith('async-token');
    });

    test('falls back to localStorage when async auth function throws', async () => {
      vi.clearAllMocks();
      const failingAuth = vi.fn().mockRejectedValue(new Error('token expired'));
      const svc = new SessionService(failingAuth);
      await flushAuth();

      // Should have fallen back to getAuthHeaders
      expect(mockSetAuthToken).toHaveBeenCalledWith('local-token');
    });
  });

  // ==========================================================================
  // refreshAuth
  // ==========================================================================

  describe('refreshAuth', () => {
    test('clears auth when no token available', async () => {
      mockGetAuthHeaders.mockReturnValue({});
      const svc = new SessionService();
      await flushAuth();
      vi.clearAllMocks();

      await svc.refreshAuth();
      expect(mockClearAuth).toHaveBeenCalled();
    });

    test('uses async auth function when available', async () => {
      const asyncAuth = vi.fn().mockResolvedValue({ Authorization: 'Bearer refreshed' });
      const svc = new SessionService(asyncAuth);
      await flushAuth();
      vi.clearAllMocks();

      await svc.refreshAuth();
      expect(mockSetAuthToken).toHaveBeenCalledWith('refreshed');
    });
  });

  // ==========================================================================
  // createSession
  // ==========================================================================

  describe('createSession', () => {
    test('creates a session with required fields', async () => {
      const coreSession = {
        session_id: 's1',
        user_id: 'u1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        metadata: {},
      };
      mockCreateSession.mockResolvedValue(coreSession);

      const result = await service.createSession({ user_id: 'u1', name: 'Test Session' });

      expect(mockCreateSession).toHaveBeenCalledWith({
        user_id: 'u1',
        title: 'Test Session',
        conversation_data: {},
        metadata: {},
      });
      expect(result.session_id).toBe('s1');
      expect(result.user_id).toBe('u1');
    });

    test('throws when user_id is missing', async () => {
      await expect(
        service.createSession({ user_id: '' })
      ).rejects.toThrow('user_id is required');
    });

    test('generates default title when name not provided', async () => {
      mockCreateSession.mockResolvedValue({
        session_id: 's2',
        user_id: 'u1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        metadata: {},
      });

      await service.createSession({ user_id: 'u1' });

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('Session') })
      );
    });
  });

  // ==========================================================================
  // getSession
  // ==========================================================================

  describe('getSession', () => {
    test('returns session by ID', async () => {
      const coreSession = {
        session_id: 's1',
        user_id: 'u1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        status: 'active',
        metadata: { foo: 'bar' },
      };
      mockGetSession.mockResolvedValue(coreSession);

      const result = await service.getSession('s1');

      expect(mockGetSession).toHaveBeenCalledWith('s1');
      expect(result.session_id).toBe('s1');
      expect(result.status).toBe('active');
      expect(result.metadata).toEqual({ foo: 'bar' });
    });

    test('throws when core SDK rejects', async () => {
      mockGetSession.mockRejectedValue(new Error('Not found'));

      await expect(service.getSession('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ==========================================================================
  // getUserSessions
  // ==========================================================================

  describe('getUserSessions', () => {
    test('returns sessions list with pagination', async () => {
      mockGetUserSessions.mockResolvedValue({
        sessions: [{ session_id: 's1' }, { session_id: 's2' }],
        total: 5,
        page: 1,
        page_size: 2,
      });

      const result = await service.getUserSessions('u1', { limit: 2 });

      expect(mockGetUserSessions).toHaveBeenCalledWith('u1', { page: 1, pageSize: 2 });
      expect(result.sessions).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.has_more).toBe(true);
    });

    test('calculates has_more=false when all results fit', async () => {
      mockGetUserSessions.mockResolvedValue({
        sessions: [{ session_id: 's1' }],
        total: 1,
        page: 1,
        page_size: 20,
      });

      const result = await service.getUserSessions('u1');

      expect(result.has_more).toBe(false);
    });
  });

  // ==========================================================================
  // updateSession
  // ==========================================================================

  describe('updateSession', () => {
    test('forwards title, tags, metadata, and context', async () => {
      mockUpdateSession.mockResolvedValue({
        session_id: 's1',
        user_id: 'u1',
        updated_at: '2026-01-02',
        metadata: { title: 'New Title' },
      });

      const result = await service.updateSession('s1', {
        title: 'New Title',
        tags: ['a', 'b'],
        metadata: { extra: true },
        context: { key: 'val' },
      });

      expect(mockUpdateSession).toHaveBeenCalledWith('s1', {
        metadata: { extra: true, title: 'New Title', tags: ['a', 'b'] },
        conversation_data: { key: 'val' },
      });
      expect(result.session_id).toBe('s1');
    });
  });

  // ==========================================================================
  // deleteSession
  // ==========================================================================

  describe('deleteSession', () => {
    test('ends session via core SDK', async () => {
      mockEndSession.mockResolvedValue(undefined);

      const result = await service.deleteSession('s1');

      expect(mockEndSession).toHaveBeenCalledWith('s1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    test('throws when core SDK rejects', async () => {
      mockEndSession.mockRejectedValue(new Error('Session not found'));

      await expect(service.deleteSession('bad')).rejects.toThrow('Session not found');
    });
  });

  // ==========================================================================
  // getSessionMessages
  // ==========================================================================

  describe('getSessionMessages', () => {
    test('returns messages with pagination', async () => {
      mockGetSessionMessages.mockResolvedValue({
        messages: [{ message_id: 'm1', content: 'Hello' }],
        total: 10,
        page: 1,
        page_size: 20,
      });

      const result = await service.getSessionMessages('s1');

      expect(mockGetSessionMessages).toHaveBeenCalledWith('s1', { page: 1, pageSize: 20 });
      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(10);
    });
  });

  // ==========================================================================
  // addSessionMessage
  // ==========================================================================

  describe('addSessionMessage', () => {
    test('adds a message with defaults', async () => {
      mockAddMessage.mockResolvedValue({
        message_id: 'm1',
        content: 'Hi',
        role: 'user',
        created_at: '2026-01-01',
        metadata: {},
      });

      const result = await service.addSessionMessage('s1', { content: 'Hi' });

      expect(mockAddMessage).toHaveBeenCalledWith('s1', {
        role: 'user',
        content: 'Hi',
        message_type: 'chat',
        metadata: {},
        tokens_used: 0,
        cost_usd: 0,
      });
      expect(result.message_id).toBe('m1');
      expect(result.session_id).toBe('s1');
      expect(result.role).toBe('user');
    });

    test('passes custom role and metadata', async () => {
      mockAddMessage.mockResolvedValue({
        message_id: 'm2',
        content: 'Response',
        role: 'assistant',
        created_at: '2026-01-01',
        metadata: { model: 'gpt-4' },
      });

      const result = await service.addSessionMessage('s1', {
        content: 'Response',
        role: 'assistant',
        message_type: 'completion',
        metadata: { model: 'gpt-4' },
        tokens_used: 150,
        cost_usd: 0.003,
      });

      expect(mockAddMessage).toHaveBeenCalledWith('s1', {
        role: 'assistant',
        content: 'Response',
        message_type: 'completion',
        metadata: { model: 'gpt-4' },
        tokens_used: 150,
        cost_usd: 0.003,
      });
      expect(result.role).toBe('assistant');
    });
  });

  // ==========================================================================
  // searchSessions
  // ==========================================================================

  describe('searchSessions', () => {
    test('returns empty when no user_id', async () => {
      const result = await service.searchSessions({});

      expect(result.sessions).toEqual([]);
      expect(result.total).toBe(0);
    });

    test('filters sessions by query string', async () => {
      mockGetUserSessions.mockResolvedValue({
        sessions: [
          { session_id: 's1', title: 'Debug Chat', metadata: {} },
          { session_id: 's2', title: 'Planning', metadata: { name: 'Sprint review' } },
          { session_id: 's3', title: 'Other', metadata: { topic: 'debugging tips' } },
        ],
        total: 3,
        page: 1,
        page_size: 50,
      });

      const result = await service.searchSessions({ user_id: 'u1', query: 'debug' });

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions.map((s: { session_id: string }) => s.session_id)).toEqual(['s1', 's3']);
    });

    test('returns all sessions when no query filter', async () => {
      mockGetUserSessions.mockResolvedValue({
        sessions: [{ session_id: 's1' }, { session_id: 's2' }],
        total: 2,
        page: 1,
        page_size: 50,
      });

      const result = await service.searchSessions({ user_id: 'u1' });

      expect(result.sessions).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  // ==========================================================================
  // exportSession
  // ==========================================================================

  describe('exportSession', () => {
    test('exports session as JSON string by default', async () => {
      mockGetSession.mockResolvedValue({
        session_id: 's1',
        user_id: 'u1',
        created_at: '2026-01-01',
        metadata: {},
      });
      mockGetSessionMessages.mockResolvedValue({
        messages: [{ message_id: 'm1', content: 'Hello' }],
      });

      const result = await service.exportSession('s1');

      expect(result.format).toBe('json');
      expect(typeof result.data).toBe('string');
      expect(result.filename).toMatch(/^session_s1_\d+\.json$/);
      const parsed = JSON.parse(result.data as string);
      expect(parsed.session.id).toBe('s1');
      expect(parsed.messages).toHaveLength(1);
    });

    test('exports session as object for non-json format', async () => {
      mockGetSession.mockResolvedValue({
        session_id: 's1',
        user_id: 'u1',
        created_at: '2026-01-01',
        metadata: {},
      });
      mockGetSessionMessages.mockResolvedValue({ messages: [] });

      const result = await service.exportSession('s1', 'csv' as any);

      expect(result.format).toBe('csv');
      expect(typeof result.data).toBe('object');
      expect(result.filename).toMatch(/\.csv$/);
    });
  });

  // ==========================================================================
  // healthCheck
  // ==========================================================================

  describe('healthCheck', () => {
    test('returns healthy on success', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await service.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9080/sessions/health',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.status).toBe('healthy');
      expect(result.service).toBe('SessionService');
      expect(result.timestamp).toBeDefined();
    });

    test('returns unhealthy when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.service).toBe('SessionService');
    });

    test('returns unhealthy when response is not ok', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
    });
  });

  // ==========================================================================
  // Factory function
  // ==========================================================================

  describe('createAuthenticatedSessionService', () => {
    test('returns a SessionService instance', () => {
      const svc = createAuthenticatedSessionService();
      expect(svc).toBeInstanceOf(SessionService);
    });
  });
});
