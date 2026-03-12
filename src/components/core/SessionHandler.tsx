/**
 * ============================================================================
 * Session Handler (SessionHandler.tsx) - Session 事件处理器
 * ============================================================================
 * 
 * 【核心职责】
 * - 处理来自 Session UI 组件的用户事件
 * - 将 UI 事件转发给对应的 Store Actions
 * - 维护 UI 和业务逻辑的完全分离
 * - 提供统一的 Session 事件处理接口
 * 
 * 【架构流程】
 * SessionHistory UI → SessionHandler → SessionStore → SessionService → SessionHook → SessionModule → Session UI
 * 
 * 【关注点分离】
 * ✅ 负责：
 *   - 用户交互事件的接收和转发
 *   - UI 参数的基本验证和格式化
 *   - 事件的统一路由分发
 * 
 * ❌ 不负责：
 *   - 业务逻辑处理（由 SessionModule 处理）
 *   - 数据存储和同步（由 SessionStore 处理）
 *   - API 通信（由 SessionService 处理）
 *   - 状态监听（由 SessionHook 处理）
 */

import { useSessionActions } from '../../stores/useSessionStore';
import { logger, LogCategory } from '../../utils/logger';

// ================================================================================
// Session 事件类型定义
// ================================================================================

export interface SessionSelectEvent {
  sessionId: string;
}

export interface SessionCreateEvent {
  title?: string;
  metadata?: Record<string, any>;
}

export interface SessionDeleteEvent {
  sessionId: string;
}

export interface SessionRenameEvent {
  sessionId: string;
  newTitle: string;
}

export interface SessionLoadEvent {
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface SessionSearchEvent {
  query: string;
  filters?: {
    userId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  };
}

export interface SessionMessageEvent {
  sessionId: string;
  message: any;
}

export interface SessionContextEvent {
  sessionId: string;
  context: any;
}

// ================================================================================
// Session Handler 类
// ================================================================================

export class SessionHandler {
  private sessionActions: ReturnType<typeof useSessionActions>;

  constructor() {
    this.sessionActions = {} as any;
  }

  /**
   * 初始化 handler（在组件中调用）
   */
  init(sessionActions: ReturnType<typeof useSessionActions>) {
    this.sessionActions = sessionActions;
  }

  // ================================================================================
  // Session 基础操作事件转发
  // ================================================================================

  /**
   * 处理选择会话事件
   */
  handleSessionSelect(event: SessionSelectEvent): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session select event', { 
      sessionId: event.sessionId 
    });

    // 直接转发给 Store
    this.sessionActions.selectSession(event.sessionId);
  }

  /**
   * 处理创建新会话事件
   */
  handleSessionCreate(event: SessionCreateEvent): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session create event', { 
      title: event.title 
    });

    // 基本参数验证
    const title = event.title?.trim() || `新会话 ${new Date().toLocaleTimeString()}`;

    // 构建会话数据并转发给 Store
    const newSession = {
      id: `session_${Date.now()}`,
      title,
      lastMessage: 'New conversation started',
      timestamp: new Date().toISOString(),
      messageCount: 0,
      artifacts: [],
      messages: [],
      metadata: {
        apps_used: [],
        total_messages: 0,
        last_activity: new Date().toISOString(),
        ...event.metadata
      }
    };

    const createdSession = this.sessionActions.createSession(newSession.title);
    this.sessionActions.selectSession(createdSession.id);
  }

  /**
   * 处理删除会话事件
   */
  handleSessionDelete(event: SessionDeleteEvent): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session delete event', { 
      sessionId: event.sessionId 
    });

    // 直接转发给 Store
    this.sessionActions.deleteSession(event.sessionId);
  }

  /**
   * 处理重命名会话事件
   */
  handleSessionRename(event: SessionRenameEvent): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session rename event', { 
      sessionId: event.sessionId,
      newTitle: event.newTitle 
    });

    // 基本参数验证
    const newTitle = event.newTitle?.trim();
    if (!newTitle) {
      logger.warn(LogCategory.CHAT_FLOW, 'Session rename ignored: empty title');
      return;
    }

    // Note: Actual rename logic is handled by SessionModule using updateSession
    // This handler is just for event logging and potential future extensions
  }

  // ================================================================================
  // Session 数据操作事件转发
  // ================================================================================

  /**
   * 处理加载会话列表事件
   */
  handleSessionLoad(event: SessionLoadEvent): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session load event', { 
      userId: event.userId,
      limit: event.limit 
    });

    // 转发给 Store 的加载方法
    this.sessionActions.loadSessionsFromStorage();
  }

  /**
   * 处理搜索会话事件
   */
  handleSessionSearch(event: SessionSearchEvent): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session search event', { 
      query: event.query 
    });

    // 基本参数验证
    if (!event.query?.trim()) {
      logger.warn(LogCategory.CHAT_FLOW, 'Session search ignored: empty query');
      return;
    }

    // Session search not yet implemented in store
    logger.debug(LogCategory.CHAT_FLOW, 'Session search not yet implemented');
  }

  // ================================================================================
  // Session 消息操作事件转发
  // ================================================================================

  /**
   * 处理保存消息到会话事件
   */
  handleSessionSaveMessage(event: SessionMessageEvent): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session save message event', { 
      sessionId: event.sessionId,
      messageId: event.message?.id
    });

    // Message saving handled directly by useSessionStore.addMessage
    logger.debug(LogCategory.CHAT_FLOW, 'Session save message — use useSessionStore.addMessage directly');
  }

  /**
   * 处理清空会话消息事件
   */
  handleSessionClearMessages(sessionId: string): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session clear messages event', { 
      sessionId
    });

    // Message clearing handled directly by useSessionStore.clearMessages
    logger.debug(LogCategory.CHAT_FLOW, 'Session clear messages — use useSessionStore.clearMessages directly');
  }

  /**
   * 处理更新会话上下文事件
   */
  handleSessionUpdateContext(event: SessionContextEvent): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session update context event', { 
      sessionId: event.sessionId
    });

    // Context update not yet implemented in session store
    logger.debug(LogCategory.CHAT_FLOW, 'Session context update not yet implemented');
  }

  // ================================================================================
  // Session 状态操作事件转发
  // ================================================================================

  /**
   * 处理设置加载状态事件
   */
  handleSessionSetLoading(loading: boolean): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session set loading event', { 
      loading 
    });

    // 直接转发给 Store
    this.sessionActions.setLoading(loading);
  }

  /**
   * 处理保存会话到存储事件
   */
  handleSessionSave(): void {
    logger.debug(LogCategory.CHAT_FLOW, 'SessionHandler: Session save event');

    // 直接转发给 Store
    this.sessionActions.saveSessionsToStorage();
  }
}

// ================================================================================
// Hook 和便捷函数
// ================================================================================

/**
 * 使用 SessionHandler 的 Hook
 */
export const useSessionHandler = () => {
  const sessionActions = useSessionActions();
  
  const handler = new SessionHandler();
  handler.init(sessionActions);
  
  return {
    // 基础操作
    handleSessionSelect: (event: SessionSelectEvent) => handler.handleSessionSelect(event),
    handleSessionCreate: (event: SessionCreateEvent) => handler.handleSessionCreate(event),
    handleSessionDelete: (event: SessionDeleteEvent) => handler.handleSessionDelete(event),
    handleSessionRename: (event: SessionRenameEvent) => handler.handleSessionRename(event),
    
    // 数据操作
    handleSessionLoad: (event: SessionLoadEvent) => handler.handleSessionLoad(event),
    handleSessionSearch: (event: SessionSearchEvent) => handler.handleSessionSearch(event),
    
    // 消息操作
    handleSessionSaveMessage: (event: SessionMessageEvent) => handler.handleSessionSaveMessage(event),
    handleSessionClearMessages: (sessionId: string) => handler.handleSessionClearMessages(sessionId),
    handleSessionUpdateContext: (event: SessionContextEvent) => handler.handleSessionUpdateContext(event),
    
    // 状态操作
    handleSessionSetLoading: (loading: boolean) => handler.handleSessionSetLoading(loading),
    handleSessionSave: () => handler.handleSessionSave()
  };
};

// 单例实例
export const sessionHandler = new SessionHandler();

export default sessionHandler;