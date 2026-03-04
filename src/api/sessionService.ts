/**
 * ============================================================================
 * Session Service - Using @isa/core SDK
 * ============================================================================
 * 
 * Migrated from custom implementation to @isa/core SessionService
 * 
 * Architecture Benefits:
 * ✅ SDK: @isa/core SessionService with standardized session API
 * ✅ Transport: @isa/transport HTTP with robust handling
 * ✅ Types: SDK-provided type safety
 * ✅ Error handling: Built-in SDK error management
 */

import { SessionService as CoreSessionService, BaseApiService as CoreBaseApiService } from '@isa/core';
import { GATEWAY_CONFIG, getAuthHeaders, GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { logger, LogCategory } from '../utils/logger';

import type {
  Session,
  SessionMessage,
  SessionMetadata,
  SessionResponse,
  SessionListResponse,
  SessionMessagesResponse,
  SessionContext,
  SessionExportFormat,
  GetSessionsOptions,
  GetUserSessionsOptions,
  GetSessionOptions,
  GetSessionMessagesOptions,
  SearchSessionsOptions,
  UpdateSessionData,
  SessionSearchResponse,
  SessionExportData,
} from '../types/sessionTypes';

// Re-export types for compatibility
export type {
  Session,
  SessionMessage,
  SessionMetadata,
  SessionResponse,
  SessionListResponse,
  SessionMessagesResponse,
  SessionContext,
  SessionExportFormat,
  GetSessionsOptions,
  GetUserSessionsOptions,
  GetSessionOptions,
  GetSessionMessagesOptions,
  SearchSessionsOptions,
  UpdateSessionData,
};

/** Metadata passed to createSession */
interface CreateSessionMetadata {
  user_id: string;
  name?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

// ================================================================================
// SessionService Wrapper
// ================================================================================

export class SessionService {
  private coreSessionService: CoreSessionService;

  private getAuthHeadersFn?: () => Promise<Record<string, string>>;

  /** Resolves when initial auth setup is complete */
  private authReady: Promise<void>;

  constructor(getAuthHeadersFn?: () => Promise<Record<string, string>>) {
    // Pass the session-service-scoped gateway URL to the SDK.
    // The gateway routes /{service}/... to each backend, so the SDK's base URL
    // must include the service prefix (e.g. http://localhost:9080/sessions).
    // The SDK then appends its relative paths (e.g. /api/v1/sessions/...).
    const apiService = new CoreBaseApiService(GATEWAY_ENDPOINTS.SESSIONS.BASE);
    this.coreSessionService = new CoreSessionService(apiService);
    this.getAuthHeadersFn = getAuthHeadersFn;

    // Initialize auth: prefer async fn, fallback to localStorage.
    // Store the promise so callers can await it via ensureAuth().
    this.authReady = this.initAuth();

    logger.info(LogCategory.API_REQUEST, 'SessionService initialized with @isa/core SDK');
  }

  /** Run initial auth setup — called once from the constructor.
   *  Never rejects — errors are caught and logged so the constructor
   *  promise stored in `authReady` does not produce unhandled rejections. */
  private async initAuth(): Promise<void> {
    try {
      // If an async auth function is provided, use it as the primary source
      if (this.getAuthHeadersFn) {
        try {
          const headers = await this.getAuthHeadersFn();
          const authHeader = headers['Authorization'];
          if (authHeader) {
            this.coreSessionService.setAuthToken(authHeader.replace('Bearer ', ''));
            return;
          }
        } catch (err) {
          logger.warn(LogCategory.API_REQUEST, 'Async auth init failed, falling back to localStorage', { error: err });
        }
      }

      // Synchronous fallback: read token from localStorage
      const headers = getAuthHeaders();
      const authHeader = headers['Authorization'];
      if (authHeader) {
        this.coreSessionService.setAuthToken(authHeader.replace('Bearer ', ''));
      }
    } catch (err) {
      logger.error(LogCategory.API_REQUEST, 'initAuth failed entirely', { error: err });
    }
  }

  /** Wait for initial auth to complete before making API calls */
  private async ensureAuth(): Promise<void> {
    await this.authReady;
  }

  /** Refresh the SDK auth token from current localStorage state (or custom fn) */
  async refreshAuth(): Promise<void> {
    if (this.getAuthHeadersFn) {
      const headers = await this.getAuthHeadersFn();
      const authHeader = headers['Authorization'];
      if (authHeader) {
        this.coreSessionService.setAuthToken(authHeader.replace('Bearer ', ''));
        return;
      }
    }
    const headers = getAuthHeaders();
    const authHeader = headers['Authorization'];
    if (authHeader) {
      this.coreSessionService.setAuthToken(authHeader.replace('Bearer ', ''));
    } else {
      this.coreSessionService.clearAuth();
    }
  }

  // ================================================================================
  // Session Management Methods
  // ================================================================================

  /**
   * Create new session
   */
  async createSession(metadata: CreateSessionMetadata): Promise<SessionResponse> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Creating new session', { user_id: metadata.user_id });

      if (!metadata.user_id) {
        throw new Error('user_id is required to create a session');
      }

      // Destructure known structural fields so they don't leak into metadata blob
      const { user_id, name, context, ...restMetadata } = metadata;
      const session = await this.coreSessionService.createSession({
        user_id,
        title: name || `Session ${Date.now()}`,
        conversation_data: context || {},
        metadata: restMetadata
      });

      return {
        session_id: session.session_id,
        user_id: session.user_id,
        created_at: session.created_at,
        updated_at: session.updated_at,
        metadata: session.metadata
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to create session', { error });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string, options?: { include_history?: boolean }): Promise<SessionResponse> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting session', { sessionId, options });

      const session = await this.coreSessionService.getSession(sessionId);

      return {
        session_id: session.session_id,
        user_id: session.user_id,
        created_at: session.created_at,
        updated_at: session.updated_at,
        status: session.status,
        metadata: session.metadata
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get session', { error });
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string, options?: GetSessionsOptions): Promise<SessionListResponse> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting user sessions', { userId, options });

      const pageSize = options?.limit || 20;
      const page = options?.offset ? Math.floor(options.offset / pageSize) + 1 : 1;
      const sessions = await this.coreSessionService.getUserSessions(userId, {
        page,
        pageSize
      });

      // sessions is a SessionListResponse, handle accordingly
      return {
        sessions: sessions.sessions || [],
        total: sessions.total || 0,
        has_more: (sessions.page * sessions.page_size) < sessions.total
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get user sessions', { error });
      throw error;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: UpdateSessionData): Promise<SessionResponse> {
    await this.ensureAuth();
    try {
      logger.info(LogCategory.API_REQUEST, 'Updating session', { sessionId, updates });

      // The SDK's SessionUpdateRequest supports metadata and conversation_data.
      // Forward title/tags via metadata so they are not silently dropped.
      const mergedMetadata = {
        ...updates.metadata,
        ...(updates.title != null && { title: updates.title }),
        ...(updates.tags != null && { tags: updates.tags }),
      };
      const session = await this.coreSessionService.updateSession(sessionId, {
        metadata: mergedMetadata,
        conversation_data: updates.context
      });

      return {
        session_id: session.session_id,
        user_id: session.user_id,
        updated_at: session.updated_at,
        metadata: session.metadata
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to update session', { error });
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    await this.ensureAuth();
    try {
      logger.info(LogCategory.API_REQUEST, 'Deleting session', { sessionId });

      await this.coreSessionService.endSession(sessionId);

      return {
        success: true,
        message: 'Session ended successfully'
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to delete session', { error });
      throw error;
    }
  }

  // ================================================================================
  // Session Messages Methods
  // ================================================================================

  /**
   * Get session messages
   */
  async getSessionMessages(sessionId: string, options?: GetSessionMessagesOptions): Promise<SessionMessagesResponse> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting session messages', { sessionId, options });

      const pageSize = options?.limit || 20;
      const page = options?.offset ? Math.floor(options.offset / pageSize) + 1 : 1;
      const messages = await this.coreSessionService.getSessionMessages(sessionId, {
        page,
        pageSize
      });

      return {
        messages: messages.messages || [],
        total: messages.total || 0,
        has_more: (messages.page * messages.page_size) < messages.total
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get session messages', { error });
      throw error;
    }
  }

  /**
   * Add message to session
   */
  async addSessionMessage(sessionId: string, message: { role?: string; content: string; message_type?: string; metadata?: Record<string, unknown>; tokens_used?: number; cost_usd?: number }): Promise<SessionMessage> {
    await this.ensureAuth();
    try {
      logger.info(LogCategory.API_REQUEST, 'Adding session message', { sessionId, message });

      const newMessage = await this.coreSessionService.addMessage(sessionId, {
        role: message.role || 'user',
        content: message.content,
        message_type: message.message_type || 'chat',
        metadata: message.metadata || {},
        tokens_used: message.tokens_used || 0,
        cost_usd: message.cost_usd || 0
      });

      return {
        message_id: newMessage.message_id,
        session_id: sessionId,
        content: newMessage.content,
        role: newMessage.role,
        timestamp: newMessage.created_at,
        metadata: newMessage.metadata
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to add session message', { error });
      throw error;
    }
  }

  // ================================================================================
  // Search and Export Methods
  // ================================================================================

  /**
   * Search sessions
   */
  async searchSessions(options: SearchSessionsOptions & { query?: string }): Promise<SessionSearchResponse> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Searching sessions', { options });

      // Core SDK lacks search — fetch user sessions and filter client-side
      const userId = options?.user_id;
      if (!userId) {
        return { sessions: [], total: 0, has_more: false };
      }

      const pageSize = options?.limit || 50;
      const page = options?.offset ? Math.floor(options.offset / pageSize) + 1 : 1;
      const result = await this.coreSessionService.getUserSessions(userId, {
        page,
        pageSize,
      });

      let sessions = result.sessions || [];

      // Client-side query filter
      if (options?.query) {
        const q = options.query.toLowerCase();
        sessions = sessions.filter((s: any) =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.metadata?.name || '').toLowerCase().includes(q) ||
          (s.metadata?.topic || '').toLowerCase().includes(q)
        );
      }

      return {
        sessions,
        total: sessions.length,
        has_more: false,
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to search sessions', { error });
      throw error;
    }
  }

  /**
   * Export session
   */
  async exportSession(sessionId: string, format: SessionExportFormat = 'json'): Promise<{ format: string; data: string | object; filename: string }> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Exporting session', { sessionId, format });

      const session = await this.coreSessionService.getSession(sessionId);
      const messages = await this.coreSessionService.getSessionMessages(sessionId);

      const exportData = {
        session: {
          id: session.session_id,
          userId: session.user_id,
          createdAt: session.created_at,
          metadata: session.metadata
        },
        messages: messages.messages || []
      };

      return {
        format,
        data: format === 'json' ? JSON.stringify(exportData, null, 2) : exportData,
        filename: `session_${sessionId}_${Date.now()}.${format}`
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to export session', { error });
      throw error;
    }
  }

  // ================================================================================
  // Utility Methods
  // ================================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Performing session service health check');

      // Call the dedicated health endpoint instead of abusing a business endpoint
      const headers = getAuthHeaders();
      const response = await fetch(GATEWAY_ENDPOINTS.SESSIONS.HEALTH, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...headers },
      });

      if (!response.ok) {
        throw new Error(`Health check returned ${response.status}`);
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'SessionService',
      };
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'SessionService',
      };
    }
  }
}

// ================================================================================
// Export Functions and Default Instance
// ================================================================================

/**
 * Create authenticated SessionService
 */
export const createAuthenticatedSessionService = (getAuthHeadersFn?: () => Promise<Record<string, string>>): SessionService => {
  return new SessionService(getAuthHeadersFn);
};

// Lazy-initialized default instance — uses localStorage token fallback.
// Created on first access to avoid firing network requests at module load time.
// For authenticated requests within React components, prefer
// createAuthenticatedSessionService(getAuthHeadersFn) instead.
let _defaultInstance: SessionService | null = null;
export const getSessionService = (): SessionService => {
  if (!_defaultInstance) {
    _defaultInstance = createAuthenticatedSessionService();
  }
  return _defaultInstance;
};

// Default export is the class (for typing/construction).
// Use getSessionService() for a lazy-initialized singleton instance.
export default SessionService;