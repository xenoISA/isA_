/**
 * ============================================================================
 * 聊天模块 (ChatModule.tsx) - 聊天功能的业务逻辑模块
 * ============================================================================
 *
 * 【核心职责】
 * - 处理聊天相关的所有业务逻辑和副作用
 * - 管理AI客户端交互和消息发送
 * - 封装用户认证和会话管理逻辑
 * - 向纯UI组件提供数据和事件回调
 *
 * 【关注点分离】
 * ✅ 负责：
 *   - 聊天业务逻辑的统一管理
 *   - AI客户端和状态管理的集成
 *   - 消息发送和接收的协调
 *   - 用户认证和权限管理
 *   - 事件回调的封装和传递
 *
 * ❌ 不负责：
 *   - UI布局和样式处理（由ChatLayout处理）
 *   - 组件的直接渲染（由components处理）
 *   - 底层数据存储（由stores处理）
 *   - 网络通信（由api处理）
 *   - 数据解析（由services处理）
 *   - Widget状态监听和消息创建（由各Widget模块自己处理）
 *
 * 【数据流向】
 * main_app → ChatModule → ChatLayout
 * hooks → ChatModule → 事件回调 → stores → api/services
 *
 * 【Handler Decomposition】
 * Handler functions are extracted into focused sub-modules (see #28):
 *   - handlers/hilHandlers.ts     — HIL (Human-in-the-Loop) event & action handlers
 *   - handlers/widgetHandlers.ts  — Widget request, selection, and mode handlers
 *   - handlers/messageHandlers.ts — Message sending, new chat, and message click handlers
 */
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { ChatLayout, ChatLayoutProps } from '../components/ui/chat/ChatLayout';
import { RightPanel } from '../components/ui/chat/RightPanel';
import { RightSidebarLayout } from '../components/ui/chat/RightSidebarLayout';
import { AppId } from '../types/appTypes';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../stores/useChatStore';
import { useAuth } from '../hooks/useAuth';
import { useCurrentSession, useSessionActions } from '../stores/useSessionStore';
import { logger, LogCategory, createLogger } from '../utils/logger';
const log = createLogger('ChatModule');
import { useUserModule } from './UserModule';
import { UpgradeModal } from '../components/ui/UpgradeModal';
import { useAppActions, useAppStore } from '../stores/useAppStore';
import { useHuntActions } from '../stores/useWidgetStores';
import { ArtifactMessage } from '../types/chatTypes';
import { detectPluginTrigger, executePlugin } from '../plugins';
import { useTask } from '../hooks/useTask';

// 🆕 HIL (Human-in-the-Loop) 导入
import { HILInterruptModal } from '../components/ui/hil/HILInterruptModal';
import { HILStatusPanel } from '../components/ui/hil/HILStatusPanel';
import { HILInteractionManager } from '../components/ui/hil/HILInteractionManager';
import { executionControlService } from '../api/ExecutionControlService';
// import { defaultAGUIProcessor } from '../api/AGUIEventProcessor'; // REMOVED - AGUIEventProcessor deleted
import {
  HILInterruptData,
  HILCheckpointData,
  HILExecutionStatusData,
  AGUIConverter
} from '../types/aguiTypes';

// 🆕 Debug monitor for polling optimization - REMOVED FOR TESTING
// import { StatusPollingMonitor } from '../components/debug/StatusPollingMonitor';

// 🆕 Mobile-first responsive layout
import { ResponsiveChatLayout } from '../components/ui/adaptive/ResponsiveChatLayout';
import { useDeviceType } from '../hooks/useDeviceType';
import { useNativeApp } from '../hooks/useNativeApp';

// 🆕 Decomposed handler factories (#28)
import { createHILHandlers } from './handlers/hilHandlers';
import { createWidgetHandlers, mapPluginTypeToContentType } from './handlers/widgetHandlers';
import { createMessageHandlers } from './handlers/messageHandlers';

// 🆕 Autonomous background message listener (#126)
import { mateAutonomousListener } from '../api/mateAutonomousListener';

interface ChatModuleProps extends Omit<ChatLayoutProps, 'messages' | 'isLoading' | 'isTyping' | 'onSendMessage' | 'onSendMultimodal'> {
  // All ChatLayout props except the data and callback props that we'll provide from business logic
  /** Whether the session sidebar is open (injected by AppLayout) */
  sidebarOpen?: boolean;
  /** Callback to change sidebar open state (injected by AppLayout) */
  onSidebarOpenChange?: (open: boolean) => void;
}

/**
 * Chat Module - Business logic module for ChatLayout
 *
 * This module:
 * - Uses hooks to get chat state and AI client
 * - Handles all message sending business logic
 * - Manages user authentication and session data
 * - Passes pure data and callbacks to ChatLayout
 * - Keeps ChatLayout as pure UI component
 */
export const ChatModule: React.FC<ChatModuleProps> = (props) => {
  // Module state for upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Extract widget selector, panel state, and sidebar state from props (managed by parent)
  const {
    showWidgetSelector = false,
    onCloseWidgetSelector,
    onShowWidgetSelector,
    showRightPanel = false,
    onToggleRightPanel,
    sidebarOpen,
    onSidebarOpenChange,
    ...otherProps
  } = props;

  // Widget system state (managed internally)
  const [currentWidgetMode, setCurrentWidgetMode] = useState<'half' | 'full' | null>(null);

  // 🆕 HIL (Human-in-the-Loop) 状态管理
  const [hilStatus, setHilStatus] = useState<HILExecutionStatusData | null>(null);
  const [hilCheckpoints, setHilCheckpoints] = useState<HILCheckpointData[]>([]);
  const [hilInterrupts, setHilInterrupts] = useState<HILInterruptData[]>([]);
  const [currentInterrupt, setCurrentInterrupt] = useState<HILInterruptData | null>(null);
  const [showHilStatusPanel, setShowHilStatusPanel] = useState(false);
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [isProcessingHilAction, setIsProcessingHilAction] = useState(false);

  // HIL监控状态
  const [hilMonitoringActive, setHilMonitoringActive] = useState(false);

  // Get chat interface state using the hook (now pure state aggregation)
  const chatInterface = useChat();

  // Get authentication state
  const { authUser } = useAuth();

  // Get session management
  const currentSession = useCurrentSession();
  const sessionActions = useSessionActions();

  // Get ChatService for direct API calls
  const getChatService = useCallback(async () => {
    const { getChatServiceInstance } = await import('../hooks/useChatService');
    let chatService = getChatServiceInstance();

    // 如果 ChatService 不可用，等待一下再重试
    if (!chatService) {
      log.warn('ChatService not ready, waiting 500ms...');
      await new Promise(resolve => setTimeout(resolve, 500));
      chatService = getChatServiceInstance();

      if (!chatService) {
        log.warn('ChatService still not ready, waiting 1000ms...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        chatService = getChatServiceInstance();
      }
    }

    if (!chatService) {
      throw new Error('ChatService not initialized after retries - AIProvider may have failed to initialize');
    }

    return chatService;
  }, []);

  // Get current tasks for status display
  const currentTasks = useChatStore(state => state.currentTasks);

  // Get user module for credit validation
  const userModule = useUserModule();

  // Get app actions for navigation
  const { setCurrentApp } = useAppActions();
  const { setShowRightSidebar, setTriggeredAppInput, currentApp: globalCurrentApp, showRightSidebar: globalShowRightSidebar, triggeredAppInput } = useAppStore();

  // Get widget actions for setting output data
  const { setHuntSearchResults } = useHuntActions();

  // 🆕 Device detection and native app support
  const { isMobile, isTablet, deviceType } = useDeviceType();
  const nativeApp = useNativeApp();

  // // 🆕 任务管理集成
  // const { taskActions } = useTask();

  // 🆕 Widget事件监听系统
  const eventEmitterRef = useRef<{
    listeners: { [event: string]: ((data: any) => void)[] };
    emit: (event: string, data: any) => void;
    on: (event: string, handler: (data: any) => void) => void;
    off: (event: string, handler: (data: any) => void) => void;
  }>({
    listeners: {},
    emit: function(event: string, data: any) {
      log.debug(`Emitting ${event} to ${this.listeners[event]?.length || 0} listeners`, data);
      if (this.listeners[event]) {
        this.listeners[event].forEach(handler => handler(data));
      }
    },
    on: function(event: string, handler: (data: any) => void) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(handler);
      log.debug(`Added listener for ${event}, total: ${this.listeners[event].length}`);
    },
    off: function(event: string, handler: (data: any) => void) {
      if (this.listeners[event]) {
        const index = this.listeners[event].indexOf(handler);
        if (index > -1) {
          this.listeners[event].splice(index, 1);
          log.debug(`Removed listener for ${event}, remaining: ${this.listeners[event].length}`);
        }
      }
    }
  });

  // ================================================================================
  // 🆕 Decomposed Handlers — created via factory functions (#28)
  // ================================================================================

  // Helper: stable mapPluginTypeToContentType (used by widget handlers)
  const mapPluginType = useCallback(mapPluginTypeToContentType, []);

  // HIL handlers
  const hilHandlers = useMemo(() => createHILHandlers({
    currentSessionId: currentSession?.id,
    setHilInterrupts,
    setCurrentInterrupt,
    setShowInterruptModal,
    setShowHilStatusPanel,
    setHilCheckpoints,
    setHilStatus,
    setIsProcessingHilAction,
  }), [currentSession?.id]);

  // Widget handlers
  const widgetHandlers = useMemo(() => createWidgetHandlers({
    authUserSub: authUser?.sub,
    currentSessionId: currentSession?.id,
    sessionActions,
    userModule,
    setShowUpgradeModal,
    eventEmitterRef,
    mapPluginTypeToContentType: mapPluginType,
    onCloseWidgetSelector,
    setCurrentApp,
    setShowRightSidebar,
    currentWidgetMode,
    setCurrentWidgetMode,
  }), [authUser?.sub, currentSession?.id, sessionActions, userModule, mapPluginType, onCloseWidgetSelector, setCurrentApp, setShowRightSidebar, currentWidgetMode]);

  // Message handlers
  const messageHandlers = useMemo(() => createMessageHandlers({
    authUserSub: authUser?.sub,
    currentSessionId: currentSession?.id,
    sessionActions,
    userModule,
    setShowUpgradeModal,
    getChatService,
    setCurrentApp,
    setShowRightSidebar,
    setHuntSearchResults,
  }), [authUser?.sub, currentSession?.id, sessionActions, userModule, getChatService, setCurrentApp, setShowRightSidebar, setHuntSearchResults]);

  // 🆕 初始化Plugin模式监听
  useEffect(() => {
    // 动态导入WidgetHandler避免循环依赖
    const initializePluginMode = async () => {
      try {
        const { widgetHandler } = await import('../components/core/WidgetHandler');

        // 设置WidgetHandler为Plugin模式
        widgetHandler.setPluginMode(eventEmitterRef.current);

        // 🆕 设置全局Plugin模式标志，防止BaseWidgetStore重复创建artifact
        if (typeof window !== 'undefined') {
          (window as any).__CHAT_MODULE_PLUGIN_MODE__ = true;
          (window as any).__CHAT_MODULE_EVENT_EMITTER__ = eventEmitterRef.current;
        }

        // 监听Widget请求事件
        eventEmitterRef.current.on('widget:request', widgetHandlers.handleWidgetRequest);

        log.info('Plugin mode initialized, Widget events will be handled by ChatModule');

      } catch (error) {
        log.error('Failed to initialize Plugin mode:', error);
      }
    };

    initializePluginMode();

    // 清理函数
    return () => {
      // 重置为Independent模式
      import('../components/core/WidgetHandler').then(({ widgetHandler }) => {
        widgetHandler.setIndependentMode();
      });

      // 🆕 清理全局Plugin模式标志
      if (typeof window !== 'undefined') {
        (window as any).__CHAT_MODULE_PLUGIN_MODE__ = false;
        (window as any).__CHAT_MODULE_EVENT_EMITTER__ = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: handleWidgetRequest is stable via useMemo and only needs to bind once
  }, []);

  // 🆕 HIL事件处理和监控初始化
  useEffect(() => {
    const initializeHILSystem = async () => {
      try {
        // 始终激活HIL监控，以便处理ask_human工具调用
        setHilMonitoringActive(true);

        // REMOVED: HIL回调注册 - SSEParser已删除

        // 检查HIL服务是否可用
        const isServiceAvailable = await executionControlService.isServiceAvailable();
        if (!isServiceAvailable) {
          log.warn('HIL service not available, but HIL interrupt handling enabled for ask_human');
          return;
        }

        log.info('HIL service available, initializing event handlers');

        // REMOVED: HIL事件回调注册 - defaultAGUIProcessor已删除

        // 注册Legacy回调到SSEParser（通过现有的chatActions）
        // 这样HIL事件也能通过现有的SSE流处理

        setHilMonitoringActive(true);
        log.info('HIL system initialized successfully');

        // 🧪 测试：添加手动HIL测试功能
        if (typeof window !== 'undefined') {
          (window as any).testHIL = () => {
            const testInterrupt = {
              id: `test_hil_${Date.now()}`,
              type: 'input_validation' as const,
              title: 'Test HIL Interrupt',
              message: 'This is a test HIL interrupt to verify the functionality.',
              timestamp: new Date().toISOString(),
              thread_id: currentSession?.id || 'test_thread',
              data: {
                question: 'Please confirm this is working correctly.',
                tool_name: 'test_interrupt',
                context: 'Manual test trigger'
              }
            };
            hilHandlers.handleHILInterrupt(testInterrupt);
            log.info('Test HIL interrupt triggered');
          };
          log.info('Test function available at window.testHIL()');
        }

      } catch (error) {
        log.error('Failed to initialize HIL system:', error);
      }
    };

    initializeHILSystem();

    // 清理函数
    return () => {
      setHilMonitoringActive(false);
      // 停止所有监控以避免内存泄漏
      executionControlService.stopAllMonitoring();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: HIL system initializes once; hilHandlers are stable via useMemo
  }, []);

  // 🆕 当有活跃会话时启动HIL监控 (with cleanup optimization)
  useEffect(() => {
    if (currentSession && hilMonitoringActive) {
      const threadId = currentSession.id;

      // 清理之前会话的监控以避免重复polling
      logger.debug(LogCategory.CHAT_FLOW, 'Starting HIL monitoring for new session', {
        threadId,
        previousPollers: executionControlService.getActiveMonitoringStats().activePollers
      });

      // 开始监控执行状态
      const startMonitoring = async () => {
        try {
          await executionControlService.monitorExecution(threadId, {
            onInterruptDetected: (event) => {
              // 使用标准转换工具
              hilHandlers.handleHILInterrupt(AGUIConverter.toHILInterruptData(event));
            },
            onStatusChanged: (status) => {
              // ExecutionControlService 现在直接提供 HIL 标准数据
              setHilStatus(status);
              hilHandlers.handleHILStatusChange(status);
            },
            onError: (error) => {
              // 区分网络错误和其他错误
              const isNetworkError = error instanceof TypeError &&
                (error.message.includes('Failed to fetch') ||
                 error.message.includes('network_io_suspended') ||
                 error.message.includes('socket_not_connected'));

              if (isNetworkError) {
                logger.warn(LogCategory.CHAT_FLOW, 'HIL monitoring network error (will retry)', {
                  error: error.message,
                  threadId: currentSession.id
                });
              } else {
                logger.error(LogCategory.CHAT_FLOW, 'HIL monitoring error', {
                  error: error.message,
                  threadId: currentSession.id
                });
              }
            }
          });
        } catch (error) {
          log.error('Failed to start HIL monitoring:', error);
        }
      };

      startMonitoring();
    }

    // 清理函数：当会话改变或组件卸载时停止监控
    return () => {
      if (currentSession) {
        executionControlService.stopMonitoring(currentSession.id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omitting hilHandlers to avoid restarting monitoring on callback changes; currentSession?.id change triggers cleanup via return
  }, [currentSession, hilMonitoringActive]);

  // 🆕 Start/stop the autonomous background message listener (#126)
  useEffect(() => {
    mateAutonomousListener.start();
    return () => {
      mateAutonomousListener.stop();
    };
  }, []);

  // Handle upgrade modal actions
  const handleUpgrade = useCallback(async (planType: 'pro' | 'enterprise') => {
    try {
      const checkoutUrl = await userModule.createCheckout(planType);
      window.open(checkoutUrl, '_blank');
      setShowUpgradeModal(false);
    } catch (error) {
      log.error('Failed to create checkout:', error);
      // Fallback to pricing page
      window.open('/pricing', '_blank');
      setShowUpgradeModal(false);
    }
  }, [userModule]);

  const handleViewPricing = useCallback(() => {
    window.open('/pricing', '_blank');
    setShowUpgradeModal(false);
  }, []);

  // 🆕 监听全局 App Store 状态变化，同步到本地 widget 模式
  useEffect(() => {
    if (globalCurrentApp && globalShowRightSidebar) {
      // 从artifact打开widget时，默认使用half模式
      if (!currentWidgetMode) {
        log.info('Syncing from global store - setting widget mode to half for app:', globalCurrentApp);
        setCurrentWidgetMode('half');

        // 设置Plugin模式标志
        if (typeof window !== 'undefined') {
          (window as any).__CHAT_MODULE_PLUGIN_MODE__ = true;
        }
      }
    } else if (!globalShowRightSidebar && currentWidgetMode) {
      // 当全局状态关闭右侧栏时，清理本地状态
      log.info('Global sidebar closed - clearing local widget mode');
      setCurrentWidgetMode(null);
    }
  }, [globalCurrentApp, globalShowRightSidebar, currentWidgetMode]);


  // Pass all data and business logic callbacks as props to pure UI component
  return (
    <>
      <ResponsiveChatLayout
        {...otherProps}
        messages={chatInterface.messages as any} // ChatLayout uses a simplified ChatMessage type (see #28)
        isLoading={chatInterface.isLoading}
        isTyping={chatInterface.isTyping}
        currentTasks={currentTasks}
        onSendMessage={messageHandlers.handleSendMessage}
        onSendMultimodal={messageHandlers.handleSendMultimodal}
        onMessageClick={messageHandlers.handleMessageClick}
        onNewChat={messageHandlers.handleNewChat}
        onEditMessage={messageHandlers.handleEditMessage}
        onRegenerateMessage={messageHandlers.handleRegenerateMessage}

        // Sidebar state (injected from AppLayout via useSidebar)
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={onSidebarOpenChange}

        // Responsive layout: props passed only if ChatLayout supports them
        showHeader={!isMobile} // Hide ChatLayout header on mobile (AppLayout controls desktop header)

        // Right Panel (会话信息管理)
        showRightPanel={showRightPanel}
        onToggleRightPanel={onToggleRightPanel}
        rightPanelContent={
          <RightPanel
            hilStatus={hilStatus}
            hilCheckpoints={hilCheckpoints}
            hilInterrupts={hilInterrupts}
            hilMonitoringActive={hilMonitoringActive}
            showHilStatusPanel={showHilStatusPanel}
            onToggleHilStatusPanel={() => setShowHilStatusPanel(!showHilStatusPanel)}
            onHilRollback={hilHandlers.handleHILRollback}
            onHilPauseExecution={hilHandlers.handleHILPauseExecution}
            onHilResumeExecution={hilHandlers.handleHILResumeExecution}
            onHilViewInterrupt={hilHandlers.handleViewInterrupt}
          />
        }

        // Widget System Integration
        showWidgetSelector={showWidgetSelector}
        onCloseWidgetSelector={onCloseWidgetSelector}
        onShowWidgetSelector={onShowWidgetSelector}
        onWidgetSelect={widgetHandlers.handleWidgetSelect}

        // Half-screen widget mode
        showRightSidebar={currentWidgetMode === 'half'}
        rightSidebarContent={
          globalCurrentApp && currentWidgetMode === 'half' ? (
            <RightSidebarLayout
              currentApp={globalCurrentApp}
              showRightSidebar={true}
              triggeredAppInput=""
              onCloseApp={widgetHandlers.handleCloseWidget}
              onToggleMode={widgetHandlers.handleToggleWidgetMode}
            />
          ) : null
        }
        rightSidebarMode="half"

        // Full-screen widget mode
        showFullScreenWidget={currentWidgetMode === 'full'}
        fullScreenWidget={
          globalCurrentApp && currentWidgetMode === 'full' ? (
            <RightSidebarLayout
              currentApp={globalCurrentApp}
              showRightSidebar={true}
              triggeredAppInput=""
              onCloseApp={widgetHandlers.handleCloseWidget}
              onToggleMode={widgetHandlers.handleToggleWidgetMode}
            />
          ) : null
        }
        onCloseFullScreenWidget={widgetHandlers.handleCloseWidget}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={userModule.currentPlan}
        credits={userModule.credits}
        totalCredits={userModule.totalCredits}
        onUpgrade={handleUpgrade}
        onViewPricing={handleViewPricing}
      />

      {/* 🆕 HIL Interrupt Modal - Keep as overlay */}
      {hilMonitoringActive && (
        <HILInterruptModal
          isOpen={showInterruptModal}
          interrupt={currentInterrupt}
          onClose={() => setShowInterruptModal(false)}
          onApprove={hilHandlers.handleHILApprove}
          onReject={hilHandlers.handleHILReject}
          onEdit={hilHandlers.handleHILEdit}
          onInput={hilHandlers.handleHILInput}
          isProcessing={isProcessingHilAction}
        />
      )}

      {/* 🆕 HIL Interaction Manager - 基于实际API格式的新HIL处理 */}
      <HILInteractionManager />

      {/* 🆕 Debug Monitor for polling optimization - REMOVED FOR TESTING */}
      {/* <StatusPollingMonitor /> */}
    </>
  );
};
