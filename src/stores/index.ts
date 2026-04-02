/**
 * ============================================================================
 * Store统一导出 (index.ts) - 集中管理所有状态存储的导出
 * ============================================================================
 * 
 * 【架构说明】
 * 将原本的单一巨型store分割成多个专注的小型stores：
 * 
 * 1. useAppStore - 主应用导航、侧边栏、全局UI状态
 * 2. useChatStore - 聊天消息、流式消息、聊天状态
 * 3. useSessionStore - 会话管理、会话持久化
 * 4. useArtifactStore - 工件管理、生成内容
 * 5. useWidgetStores - 各种侧边栏小部件状态（Dream, Hunt, Omni等）
 * 
 * 【优势】
 * - 单一职责：每个store专注于特定的功能域
 * - 更好的可维护性：修改一个功能不影响其他store
 * - 更好的测试性：可以独立测试每个store
 * - 更好的性能：组件只订阅需要的状态
 * - 更清晰的依赖关系：避免循环依赖
 */

// === 主应用状态 ===
export { 
  useAppStore,
  useCurrentApp,
  useShowRightSidebar,
  useAppLoading,
  useAppError,
  type AppStore,
  type AppState,
  type AppActions
} from './useAppStore';

// === 聊天状态 (composed facade — backward-compatible) ===
export {
  useChatStore,
  useChatMessages,
  useChatTyping,
  useChatLoading,
  useChatActions,
  type ChatStore
} from './useChatStore';

// === 消息状态 (split from useChatStore — #124) ===
export {
  useMessageStore,
  type MessageStore
} from './useMessageStore';

// === 流式状态 (split from useChatStore — #124) ===
export {
  useStreamingStore,
  clearAllFlushTimers,
  type StreamingStore
} from './useStreamingStore';

// === 会话状态 ===
export { 
  useSessionStore,
  useSessions,
  useCurrentSessionId,
  useCurrentSession,
  useSessionCount,
  useIsLoadingSession,
  useSessionActions,
  type SessionStore,
  type ChatSession
} from './useSessionStore';

// === 工件状态 ===
export { 
  useArtifactStore,
  useArtifacts,
  usePendingArtifact,
  useOpenArtifacts,
  useArtifactsByApp,
  useArtifactCount,
  useHasArtifacts,
  useLatestArtifact,
  useArtifactActions,
  type ArtifactStore
} from './useArtifactStore';

// === 小部件状态 ===
export { 
  // Dream Widget
  useDreamWidgetStore,
  useDreamState,
  useDreamActions,
  type DreamWidgetStore,
  
  // Hunt Widget
  useHuntWidgetStore,
  useHuntState,
  useHuntActions,
  type HuntWidgetStore,
  
  // Omni Widget
  useOmniWidgetStore,
  useOmniState,
  useOmniActions,
  type OmniWidgetStore,
  
  // Assistant Widget - removed (Assistant widget no longer exists)
  
  // Utility
  clearAllWidgetData
} from './useWidgetStores';

// === 类型导出 ===
export type { AppArtifact, AppId, PendingArtifact } from '../types/appTypes';

// === 迁移指南 ===
/*
从旧的useAppStore迁移到新的stores：

旧代码:
import { useAppStore } from '../stores/useAppStore';
const { messages, currentApp, artifacts } = useAppStore();

新代码:
import { useChatMessages, useCurrentApp, useArtifacts } from '../stores';
const messages = useChatMessages();
const currentApp = useCurrentApp();
const artifacts = useArtifacts();

优势：
1. 组件只订阅需要的状态，性能更好
2. 更清晰的依赖关系
3. 更好的代码组织
4. 更容易测试和维护
*/