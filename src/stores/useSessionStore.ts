/**
 * ============================================================================
 * Session State Management (useSessionStore.ts) - Focused Session Management Store
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Manage chat session creation, storage and navigation
 * - Persist session data to localStorage
 * - Provide session switching and history functionality
 * - Sync current messages and artifacts to sessions
 * 
 * Separation of Concerns:
 * ✅ Responsible for:
 *   - Session data storage and management
 *   - Session CRUD operations (Create, Read, Update, Delete)
 *   - Session persistence to localStorage
 *   - Current session state management
 *   - Session loading state
 * 
 * ❌ Not responsible for:
 *   - Chat message management (handled by useChatStore)
 *   - App navigation (handled by useAppStore)
 *   - Artifact management (handled by useArtifactStore)
 *   - UI interface state (handled by useAppStore)
 *   - Widget state (handled by useWidgetStores)
 * 
 * Session Structure:
 * ChatSession {
 *   id: string
 *   title: string
 *   lastMessage: string
 *   timestamp: string
 *   messageCount: number
 *   artifacts: string[]
 *   messages: ChatMessage[]
 *   metadata?: object
 * }
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { logger, LogCategory, createLogger } from '../utils/logger';
import {
  ChatMessage,
  ChatSession,
  ArtifactMessage,
  getMessageContent,
} from '../types/chatTypes';

// Re-export types for backward compatibility
export type { ChatMessage, ChatSession, ArtifactMessage };
export type { BaseMessage, RegularMessage } from '../types/chatTypes';

const log = createLogger('SessionStore', LogCategory.CHAT_FLOW);
import { createAuthenticatedSessionService } from '../api/sessionService';

const STORAGE_SAVE_DEBOUNCE_MS = 500;
// Module-level timer handle — not in Zustand state to avoid triggering re-renders.
// Safe because this store is client-only (guarded by typeof window checks).
let _saveToStorageTimer: ReturnType<typeof setTimeout> | null = null;

interface SessionState {
  // Session data
  sessions: ChatSession[];
  currentSessionId: string;

  // Search state
  searchQuery: string;

  // Loading state
  isLoading: boolean;
  error: string | null;
}

interface SessionActions {
  // Session CRUD operations
  createSession: (title?: string) => ChatSession;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  updateSession: (session: ChatSession) => void;
  
  // Session message operations
  addMessage: (sessionId: string, message: ChatMessage) => void;
  clearMessages: (sessionId: string) => void;
  
  // 🆕 Artifact message operations
  addArtifactMessage: (sessionId: string, artifactMessage: ArtifactMessage) => void;
  getArtifactMessages: (sessionId?: string) => ArtifactMessage[];
  getArtifactById: (artifactId: string, sessionId?: string) => ArtifactMessage | null;
  getArtifactVersions: (artifactId: string, sessionId?: string) => ArtifactMessage[];
  
  // Search operations
  setSearchQuery: (query: string) => void;

  // Session state management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Storage operations
  loadFromStorage: () => void;
  saveToStorage: () => void;
  saveToStorageDebounced: () => void;
  loadFromAPI: (userId: string, authHeaders?: any) => Promise<void>;
  saveToAPI: (userId: string, authHeaders?: any) => Promise<void>;
  
  // Computed getters
  getCurrentSession: () => ChatSession | null;
  getSessionById: (sessionId: string) => ChatSession | null;
}

export type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    sessions: [],
    currentSessionId: 'default',
    searchQuery: '',
    isLoading: false,
    error: null,
    
    // Session CRUD operations
    createSession: (title = 'New Chat') => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newSession: ChatSession = {
        id: sessionId,
        title,
        lastMessage: 'New conversation started',
        timestamp: new Date().toISOString(),
        messageCount: 0,
        artifacts: [],
        messages: [],
        metadata: {
          apps_used: [],
          total_messages: 0,
          last_activity: new Date().toISOString()
        }
      };
      
      set((state) => ({
        sessions: [...state.sessions, newSession],
        currentSessionId: sessionId
      }));
      
      // Auto-save to storage (debounced)
      get().saveToStorageDebounced();
      
      logger.info(LogCategory.CHAT_FLOW, 'Session created', {
        sessionId,
        title
      });
      
      return newSession;
    },
    
    selectSession: (sessionId) => {
      const currentState = get();
      
      // 防止重复设置相同的sessionId，避免无限循环
      if (currentState.currentSessionId === sessionId) {
        log.debug('Session already selected, skipping', { sessionId });
        return;
      }
      
      set({ currentSessionId: sessionId });
      localStorage.setItem('currentSessionId', sessionId);
      
      logger.debug(LogCategory.CHAT_FLOW, 'Session selected', { sessionId });
      log.info('Session selected', {
        sessionId,
        previousSessionId: currentState.currentSessionId
      });
    },
    
    deleteSession: (sessionId) => {
      const state = get();
      const remainingSessions = state.sessions.filter(s => s.id !== sessionId);
      
      set({ sessions: remainingSessions });
      
      // If deleted session was current, switch to another
      if (sessionId === state.currentSessionId) {
        if (remainingSessions.length > 0) {
          get().selectSession(remainingSessions[0].id);
        } else {
          // Create a default session if none left
          get().createSession('Welcome Chat');
        }
      }
      
      get().saveToStorageDebounced();
      
      logger.debug(LogCategory.CHAT_FLOW, 'Session deleted', { sessionId });
    },
    
    updateSession: (updatedSession) => {
      set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === updatedSession.id ? updatedSession : s
        )
      }));
      
      get().saveToStorageDebounced();
      
      logger.debug(LogCategory.CHAT_FLOW, 'Session updated', {
        sessionId: updatedSession.id
      });
    },
    
    // Session message operations
    addMessage: (sessionId, message) => {
      set((state) => ({
        sessions: state.sessions.map(session => {
          if (session.id === sessionId) {
            const updatedMessages = [...session.messages, message];
            const displayContent = getMessageContent(message);
            return {
              ...session,
              messages: updatedMessages,
              messageCount: updatedMessages.length,
              lastMessage: displayContent.length > 100
                ? displayContent.substring(0, 100) + '...'
                : displayContent,
              timestamp: new Date().toISOString(),
              metadata: {
                ...session.metadata,
                total_messages: updatedMessages.length,
                last_activity: new Date().toISOString()
              }
            };
          }
          return session;
        })
      }));
      
      get().saveToStorageDebounced();
    },
    
    clearMessages: (sessionId) => {
      set((state) => ({
        sessions: state.sessions.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              messages: [],
              messageCount: 0,
              lastMessage: 'Session cleared',
              timestamp: new Date().toISOString(),
              metadata: {
                ...session.metadata,
                total_messages: 0,
                last_activity: new Date().toISOString()
              }
            };
          }
          return session;
        })
      }));
      
      get().saveToStorageDebounced();
    },
    
    // 🆕 Artifact message operations
    addArtifactMessage: (sessionId, artifactMessage) => {
      // 复用现有的 addMessage 逻辑
      get().addMessage(sessionId, artifactMessage);
      
      logger.info(LogCategory.ARTIFACT_CREATION, 'Artifact message added to session', {
        sessionId,
        artifactId: artifactMessage.artifact.id,
        widgetType: artifactMessage.artifact.widgetType,
        version: artifactMessage.artifact.version
      });
    },
    
    getArtifactMessages: (sessionId) => {
      const { getCurrentSession, getSessionById } = get();
      const session = sessionId ? getSessionById(sessionId) : getCurrentSession();
      
      if (!session) return [];
      
      return session.messages
        .filter((msg): msg is ArtifactMessage => msg.type === 'artifact');
    },
    
    getArtifactById: (artifactId, sessionId) => {
      const artifactMessages = get().getArtifactMessages(sessionId);
      
      // 返回最新版本的 artifact
      const artifacts = artifactMessages.filter(msg => msg.artifact.id === artifactId);
      if (artifacts.length === 0) return null;
      
      // 按版本号排序，返回最新的
      return artifacts.sort((a, b) => b.artifact.version - a.artifact.version)[0];
    },
    
    getArtifactVersions: (artifactId, sessionId) => {
      const artifactMessages = get().getArtifactMessages(sessionId);
      
      return artifactMessages
        .filter(msg => msg.artifact.id === artifactId)
        .sort((a, b) => a.artifact.version - b.artifact.version); // 按版本升序
    },
    
    // Search operations
    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },

    // Session state management
    setLoading: (loading) => {
      set({ isLoading: loading });
    },
    
    setError: (error) => {
      set({ error });
      if (error) {
        logger.error(LogCategory.CHAT_FLOW, 'Session error set', { error });
      }
    },
    
    // Storage operations
    loadFromStorage: () => {
      // 防止重复加载
      if (get().isLoading) {
        logger.debug(LogCategory.CHAT_FLOW, 'Sessions already loading, skipping duplicate call');
        return;
      }

      // Check if running on client side
      if (typeof window === 'undefined') {
        logger.debug(LogCategory.CHAT_FLOW, 'Skipping localStorage load - server side');
        return;
      }
      
      // 设置加载状态，防止重复调用
      set({ isLoading: true });
      
      try {
        // Client side - load from localStorage
        const savedSessions = localStorage.getItem('sessions');
        let parsedSessions: ChatSession[] = [];
        
        if (savedSessions) {
          parsedSessions = JSON.parse(savedSessions);
          set({ 
            sessions: parsedSessions,
            isLoading: false,
            error: null
          });
        } else {
          // Create default session
          const defaultSession: ChatSession = {
            id: 'default',
            title: 'Welcome Chat',
            lastMessage: 'Welcome to AI Agent SDK!',
            timestamp: new Date().toISOString(),
            messageCount: 0,
            artifacts: [],
            messages: [],
            metadata: {
              apps_used: [],
              total_messages: 0,
              last_activity: new Date().toISOString()
            }
          };
          
          parsedSessions = [defaultSession];
          set({ 
            sessions: parsedSessions, 
            currentSessionId: defaultSession.id,
            isLoading: false,
            error: null
          });
          
          // 异步保存，避免立即触发状态变化
          setTimeout(() => {
            try {
              localStorage.setItem('sessions', JSON.stringify([defaultSession]));
              localStorage.setItem('currentSessionId', defaultSession.id);
              logger.debug(LogCategory.CHAT_FLOW, 'Default session saved to localStorage');
            } catch (error) {
              logger.error(LogCategory.CHAT_FLOW, 'Failed to save default session', { error });
            }
          }, 0);
        }
        
        // Load current session ID
        const savedCurrentSessionId = localStorage.getItem('currentSessionId');
        // Loading current session ID
        
        if (savedCurrentSessionId) {
          // 验证保存的session ID是否存在于加载的sessions中
          const sessionExists = parsedSessions.some((s: ChatSession) => s.id === savedCurrentSessionId);
          // Checking saved session ID
          
          if (sessionExists) {
            set({ currentSessionId: savedCurrentSessionId });
            // Using saved session ID
          } else {
            // 如果保存的session不存在，使用第一个session
            const firstSessionId = parsedSessions.length > 0 ? parsedSessions[0].id : 'default';
            set({ currentSessionId: firstSessionId });
            localStorage.setItem('currentSessionId', firstSessionId);
            log.warn('Saved session not found, using first session', {
              savedSessionId: savedCurrentSessionId,
              newSessionId: firstSessionId
            });
            logger.warn(LogCategory.CHAT_FLOW, 'Saved session ID not found, using first session', {
              savedSessionId: savedCurrentSessionId,
              newSessionId: firstSessionId
            });
          }
        } else if (parsedSessions.length > 0) {
          // 如果没有保存的session ID，使用第一个session
          const firstSessionId = parsedSessions[0].id;
          set({ currentSessionId: firstSessionId });
          localStorage.setItem('currentSessionId', firstSessionId);
          log.info('No saved session ID, using first session', {
            firstSessionId,
            totalSessions: parsedSessions.length
          });
        } else {
          log.warn('No sessions available, cannot set current session');
        }
        
        const finalCurrentSessionId = get().currentSessionId;
        // Final session state loaded
        
        logger.debug(LogCategory.CHAT_FLOW, 'Sessions loaded from localStorage', {
          sessionCount: parsedSessions.length,
          currentSessionId: finalCurrentSessionId
        });
      } catch (error) {
        logger.error(LogCategory.CHAT_FLOW, 'Failed to load sessions from localStorage', { error });
        set({ 
          error: 'Failed to load sessions from storage',
          isLoading: false
        });
      }
    },
    
    saveToStorage: () => {
      // Check if running on client side
      if (typeof window === 'undefined') {
        logger.debug(LogCategory.CHAT_FLOW, 'Skipping localStorage save - server side');
        return;
      }
      
      try {
        const { sessions, currentSessionId } = get();
        
        // Save sessions
        localStorage.setItem('sessions', JSON.stringify(sessions));
        // Save current session ID
        localStorage.setItem('currentSessionId', currentSessionId);
        
        logger.debug(LogCategory.CHAT_FLOW, 'Sessions saved to localStorage', {
          sessionCount: sessions.length,
          currentSessionId
        });
      } catch (error) {
        logger.error(LogCategory.CHAT_FLOW, 'Failed to save sessions to localStorage', { error });
        get().setError('Failed to save sessions to storage');
      }
    },

    saveToStorageDebounced: () => {
      if (_saveToStorageTimer) {
        clearTimeout(_saveToStorageTimer);
      }

      _saveToStorageTimer = setTimeout(() => {
        _saveToStorageTimer = null;
        get().saveToStorage();
      }, STORAGE_SAVE_DEBOUNCE_MS);
    },
    
    // Computed getters
    getCurrentSession: () => {
      const { sessions, currentSessionId } = get();
      return sessions.find(session => session.id === currentSessionId) || null;
    },
    
    getSessionById: (sessionId) => {
      const { sessions } = get();
      return sessions.find(session => session.id === sessionId) || null;
    },
    
    // API operations
    loadFromAPI: async (userId, authHeaders) => {
      if (!userId || !authHeaders) {
        logger.warn(LogCategory.CHAT_FLOW, 'Missing userId or authHeaders for API load');
        return;
      }
      
      try {
        set({ isLoading: true, error: null });
        
        const sessionService = createAuthenticatedSessionService(async () => authHeaders);
        const result = await sessionService.getUserSessions(userId, { limit: 100 });

        const apiSessions = (result.sessions || []).map((session: any) => ({
          id: session.session_id || session.id,
          title: session.title || session.metadata?.name || 'Untitled',
          lastMessage: session.summary || 'No messages',
          timestamp: session.updated_at || session.created_at,
          messageCount: session.message_count || 0,
          artifacts: [],
          messages: [],
          metadata: {
            ...session.metadata,
            api_session_id: session.session_id || session.id,
            user_id: session.user_id
          }
        }));

        set({ sessions: apiSessions, isLoading: false });
        logger.info(LogCategory.CHAT_FLOW, 'Sessions loaded from API', {
          sessionCount: apiSessions.length
        });
      } catch (error) {
        logger.error(LogCategory.CHAT_FLOW, 'Failed to load sessions from API', { error });
        set({ isLoading: false, error: 'Failed to load sessions from API' });
      }
    },
    
    saveToAPI: async (userId, authHeaders) => {
      if (!userId || !authHeaders) {
        logger.warn(LogCategory.CHAT_FLOW, 'Missing userId or authHeaders for API save');
        return;
      }
      
      try {
        const sessionService = createAuthenticatedSessionService(async () => authHeaders);
        const currentSession = get().getCurrentSession();

        // Save current session if it exists and doesn't have API ID
        if (currentSession && !currentSession.metadata?.api_session_id) {
          const result = await sessionService.createSession({
            user_id: userId,
            name: currentSession.title,
            context: currentSession.metadata
          });

          if (result.session_id) {
            const updatedSession = {
              ...currentSession,
              metadata: {
                ...currentSession.metadata,
                api_session_id: result.session_id
              }
            };

            set(state => ({
              sessions: state.sessions.map(s =>
                s.id === currentSession.id ? updatedSession : s
              )
            }));

            logger.info(LogCategory.CHAT_FLOW, 'Session synced to API', {
              sessionId: currentSession.id,
              apiSessionId: result.session_id
            });
          }
        }
      } catch (error) {
        logger.error(LogCategory.CHAT_FLOW, 'Failed to save session to API', { error });
      }
    }
  }))
);

// Initialize store on import - only on client side
if (typeof window !== 'undefined') {
  useSessionStore.getState().loadFromStorage();
}

// Selector hooks for performance optimization
export const useSessions = () => useSessionStore(state => state.sessions);
export const useCurrentSessionId = () => useSessionStore(state => state.currentSessionId);
export const useCurrentSession = () => useSessionStore(state => state.getCurrentSession());
export const useSessionSearchQuery = () => useSessionStore(state => state.searchQuery);
export const useSessionLoading = () => useSessionStore(state => state.isLoading);
export const useSessionError = () => useSessionStore(state => state.error);

// Additional selector hooks for compatibility
export const useSessionCount = () => useSessionStore(state => state.sessions.length);
export const useIsLoadingSession = () => useSessionStore(state => state.isLoading);
export const useIsSyncingToAPI = () => useSessionStore(state => false); // Simplified for now
export const useSyncStatus = () => useSessionStore(state => 'idle'); // Simplified for now  
export const useLastSyncError = () => useSessionStore(state => state.error);

// Selective action hooks - avoid unnecessary re-renders
export const useSessionCRUDActions = () => useSessionStore(state => ({
  createSession: state.createSession,
  selectSession: state.selectSession,
  deleteSession: state.deleteSession,
  updateSession: state.updateSession
}));

export const useSessionMessageActions = () => useSessionStore(state => ({
  addMessage: state.addMessage,
  clearMessages: state.clearMessages
}));

export const useSessionStorageActions = () => useSessionStore(state => ({
  saveToStorage: state.saveToStorage,
  loadFromStorage: state.loadFromStorage
}));

export const useSessionAPIActions = () => useSessionStore(state => ({
  loadFromAPI: state.loadFromAPI,
  saveToAPI: state.saveToAPI
}));

export const useSessionStateActions = () => useSessionStore(state => ({
  setLoading: state.setLoading,
  setError: state.setError,
  setSearchQuery: state.setSearchQuery
}));

// Composite action hook for backward compatibility
export const useSessionActions = () => useSessionStore(state => ({
  createSession: state.createSession,
  selectSession: state.selectSession,
  deleteSession: state.deleteSession,
  updateSession: state.updateSession,
  addMessage: state.addMessage,
  clearMessages: state.clearMessages,
  setLoading: state.setLoading,
  setError: state.setError,
  setSearchQuery: state.setSearchQuery,
  saveToStorage: state.saveToStorage,
  loadFromStorage: state.loadFromStorage,
  loadFromAPI: state.loadFromAPI,
  saveToAPI: state.saveToAPI,
  // Compatibility methods
  saveSessionsToStorage: state.saveToStorage,
  loadSessionsFromStorage: state.loadFromStorage
}));
