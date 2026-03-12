/**
 * ============================================================================
 * Chat Hook (useChat.ts) - 聊天状态监听和聚合
 * ============================================================================
 * 
 * 【核心职责】
 * - 选择性订阅各个Store的状态变化
 * - 聚合聊天相关的状态数据
 * - 提供统一的数据接口给UI组件
 * 
 * 【架构原则】
 * ✅ 只负责状态监听和数据聚合
 * ✅ 使用选择性订阅优化性能
 * ✅ 不包含业务逻辑和副作用
 * 
 * ❌ 不负责：
 *   - 业务逻辑处理（由ChatModule处理）
 *   - 消息创建和修改（由ChatModule处理）
 *   - API调用和副作用（由ChatModule处理）
 *   - Widget状态管理（由各Widget Module处理）
 */

import { useMemo } from 'react';
import { 
  useChatMessages, 
  useChatLoading, 
  useChatTyping,
  useHILStatus,
  useCurrentHILInterrupt,
  useHILHistory,
  useHILCheckpoints,
  useCurrentThreadId
} from '../stores/useChatStore';
import { useCurrentSession, useSessionStore } from '../stores/useSessionStore'; // 从session获取历史messages
import { useArtifactStore } from '../stores/useArtifactStore';
import { useCurrentApp, useShowRightSidebar } from '../stores/useAppStore';
import { useAllWidgetStates, useIsAnyWidgetGenerating } from '../stores/useWidgetStores';
import { ChatHookState, ChatMessage } from '../types/chatTypes';
import { AppArtifact } from '../types/appTypes';
import { HILInterruptDetectedEvent, HILCheckpointCreatedEvent } from '../types/aguiTypes';

/**
 * Chat状态监听Hook - 纯数据聚合，无副作用
 * 
 * 使用选择性订阅监听所有聊天相关状态：
 * 1. 聊天消息状态 (从当前session获取，而不是useChatStore)
 * 2. 应用导航状态 (useAppStore) 
 * 3. 工件状态 (useArtifactStore)
 * 4. Widget状态聚合 (useWidgetStores)
 * 5. HIL状态聚合 (useChatStore)
 * 
 * @returns 聚合的聊天状态数据
 */
export const useChat = (): ChatHookState => {
  // 1. 获取实时消息（包括流式消息）和历史消息
  const chatStoreMessages = useChatMessages(); // 实时消息，包括流式
  const currentSession = useCurrentSession(); // 历史消息
  
  // 2. 合并消息：将 chatStore 实时消息和 session artifact 消息合并
  const messages = useMemo((): ChatMessage[] => {
    const allMessages: ChatMessage[] = [];
    
    // 从 chatStore 获取实时消息 (包括流式消息)
    allMessages.push(...chatStoreMessages);
    
    // 从 session 获取 artifact 消息，添加 sessionId 属性
    if (currentSession?.messages) {
      const sessionArtifactMessages = currentSession.messages
        .filter(msg => msg.type === 'artifact' && !chatStoreMessages.some(chatMsg => chatMsg.id === msg.id))
        .map(msg => ({
          ...msg,
          sessionId: currentSession.id
        }));
      allMessages.push(...sessionArtifactMessages);
    }
    
    // 按时间戳排序
    return allMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [chatStoreMessages, currentSession?.messages, currentSession?.id]);
  
  // 2. 聊天状态 - 从useChatStore获取（这些状态是实时的）
  const isLoading = useChatLoading();
  const isTyping = useChatTyping();
  
  // 2.5. HIL状态聚合 - 从useChatStore获取HIL相关状态
  const hilStatus = useHILStatus();
  const currentHILInterrupt = useCurrentHILInterrupt();
  const hilHistory = useHILHistory();
  const hilCheckpoints = useHILCheckpoints();
  const currentThreadId = useCurrentThreadId();
  
  // 3. 应用导航状态 - 选择性订阅
  const currentApp = useCurrentApp();
  const showRightSidebar = useShowRightSidebar();
  
  // 4. 工件状态 - 选择性订阅
  const artifacts = useArtifactStore(state => state.artifacts);
  
  // 5. Widget状态聚合 - 选择性订阅
  const widgetStates = useAllWidgetStates();
  const isAnyWidgetGenerating = useIsAnyWidgetGenerating();
  
  // 6. 派生状态计算 - 使用useMemo优化性能
  const streamingMessage = useMemo((): ChatMessage | undefined => 
    messages.find(m => m.isStreaming), 
    [messages]
  );
  
  const hasStreamingMessage = useMemo((): boolean => 
    !!streamingMessage,
    [streamingMessage]
  );
  
  const latestWidgetArtifact = useMemo((): AppArtifact | null => {
    if (artifacts.length === 0) return null;
    
    // 找到最新的Widget生成的工件
    const widgetArtifacts = artifacts.filter(artifact => 
      ['dream', 'hunt', 'omni', 'data-scientist', 'knowledge'].includes(artifact.appId)
    );
    
    return widgetArtifacts.length > 0 
      ? widgetArtifacts[widgetArtifacts.length - 1] 
      : null;
  }, [artifacts]);
  
  // HIL派生状态计算
  const isHILActive = useMemo((): boolean => 
    hilStatus === 'waiting_for_human' || hilStatus === 'processing_response',
    [hilStatus]
  );
  
  const hasActiveHILInterrupt = useMemo((): boolean => 
    !!currentHILInterrupt,
    [currentHILInterrupt]
  );
  
  const hilInterruptCount = useMemo((): number => 
    hilHistory.length,
    [hilHistory.length]
  );
  
  const hilCheckpointCount = useMemo((): number => 
    hilCheckpoints.length,
    [hilCheckpoints.length]
  );
  
  // 7. 聚合所有状态并返回
  return {
    // 聊天核心数据
    messages,
    isLoading,
    isTyping,
    
    // 应用导航上下文
    currentApp,
    showRightSidebar,
    
    // 工件数据
    artifacts,
    latestWidgetArtifact,
    
    // Widget状态聚合
    widgetStates,
    isAnyWidgetGenerating,
    
    // HIL状态聚合
    hilStatus,
    currentHILInterrupt,
    hilHistory,
    hilCheckpoints,
    currentThreadId,
    
    // 派生状态
    hasStreamingMessage,
    streamingMessage,
    // HIL派生状态
    isHILActive,
    hasActiveHILInterrupt,
    hilInterruptCount,
    hilCheckpointCount
  };
};