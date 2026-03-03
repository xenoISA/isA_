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

import { SessionService as CoreSessionService } from '@isa/core';
import { getAuthHeaders } from '../config/gatewayConfig';
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

  constructor(getAuthHeadersFn?: () => Promise<Record<string, string>>) {
    this.coreSessionService = new CoreSessionService();
    this.getAuthHeadersFn = getAuthHeadersFn;

    // Wire auth token from localStorage into the SDK instance
    const headers = getAuthHeaders();
    const authHeader = headers['Authorization'];
    if (authHeader) {
      this.coreSessionService.setAuthToken(authHeader.replace('Bearer ', ''));
    }

    logger.info(LogCategory.API_REQUEST, 'SessionService initialized with @isa/core SDK');
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
    try {
      logger.info(LogCategory.API_REQUEST, 'Creating new session', { metadata });

      if (!metadata.user_id) {
        throw new Error('user_id is required to create a session');
      }

      const session = await this.coreSessionService.createSession({
        user_id: metadata.user_id,
        title: metadata?.name || `Session ${Date.now()}`,
        conversation_data: metadata?.context || {},
        metadata: metadata || {}
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
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting session', { sessionId, options });

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
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting user sessions', { userId, options });

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
    try {
      logger.info(LogCategory.API_REQUEST, 'Updating session', { sessionId, updates });

      const session = await this.coreSessionService.updateSession(sessionId, {
        metadata: updates.metadata,
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
    try {
      logger.info(LogCategory.API_REQUEST, 'Deleting session', { sessionId });

      await this.coreSessionService.endSession(sessionId);

      return {
        success: true,
        message: 'Session deleted successfully'
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
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting session messages', { sessionId, options });

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
    try {
      logger.info(LogCategory.API_REQUEST, 'Searching sessions', { options });

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
    try {
      logger.info(LogCategory.API_REQUEST, 'Exporting session', { sessionId, format });

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
      logger.info(LogCategory.API_REQUEST, 'Performing session service health check');

      // Use a lightweight SDK call as a health probe (getSessionStats endpoint
      // may not be defined in the frontend gateway config).
      await this.coreSessionService.getUserSessions('_health_check', { page: 1, pageSize: 1 });
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

// Create default instance
export const sessionService = createAuthenticatedSessionService();

// For backwards compatibility, also export as default
export default SessionService;