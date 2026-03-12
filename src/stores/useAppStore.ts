/**
 * ============================================================================
 * 主应用状态管理 (useAppStore.ts) - 专注于主应用导航和全局UI状态
 * ============================================================================
 * 
 * 【核心职责】
 * - 管理主应用的导航状态（当前小部件、侧边栏显示）
 * - 处理全局UI状态（加载、错误、模态框等）
 * - 管理应用级别的配置和设置
 * - 协调各个功能模块的交互
 * 
 * 【关注点分离】
 * ✅ 负责：
 *   - 当前活跃小部件的导航
 *   - 侧边栏显示状态管理
 *   - 全局加载和错误状态
 *   - 应用级UI状态（模态框、仪表板等）
 *   - 小部件触发输入管理
 *   - Widget使用状态跟踪和排序
 *   - 新聊天会话控制
 * 
 * ❌ 不负责：
 *   - 聊天消息管理（由useChatStore处理）
 *   - 会话管理（由useSessionStore处理）
 *   - 工件管理（由useArtifactStore处理）
 *   - 小部件特定状态（由useWidgetStores处理）
 *   - 流式消息处理（由useChatStore处理）
 *   - Widget具体业务逻辑（由各Widget Module处理）
 * 
 * 【架构定位】
 * 这是应用的"交通控制中心"，负责协调各个专门的store，
 * 但不直接管理具体的业务数据。
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { AppId } from '../types/appTypes';
import { logger, LogCategory, createLogger } from '../utils/logger';

const log = createLogger('AppStore', LogCategory.STATE_CHANGE);

// Widget使用状态跟踪
export interface WidgetUsageState {
  lastUsed: string | null; // ISO timestamp
  hasArtifacts: boolean;   // 是否生成过artifacts
  usageCount: number;      // 使用次数
}

export interface AppState {
  // 主应用导航
  currentApp: AppId | null;
  showRightSidebar: boolean;
  
  // 小部件交互
  triggeredAppInput: string;
  
  // Widget使用状态跟踪
  widgetUsage: Record<string, WidgetUsageState>;
  
  // 全局UI状态
  showLoggingDashboard: boolean;
  chatKey: number;
  
  // 全局加载和错误状态
  isLoading: boolean;
  error: string | null;
}

export interface AppActions {
  // 应用导航
  setCurrentApp: (app: AppId | null) => void;
  setShowRightSidebar: (show: boolean) => void;
  closeApp: () => void;
  reopenApp: (artifactId: string) => void;
  
  // 小部件交互
  setTriggeredAppInput: (input: string) => void;
  
  // Widget使用状态跟踪
  recordWidgetUsage: (widgetId: string) => void;
  markWidgetWithArtifacts: (widgetId: string) => void;
  getWidgetUsage: (widgetId: string) => WidgetUsageState;
  getSortedWidgets: () => Array<{ id: string; usage: WidgetUsageState }>;
  
  // 聊天控制
  startNewChat: () => void;
  
  // UI状态
  setShowLoggingDashboard: (show: boolean) => void;
  
  // 全局状态
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    currentApp: null,
    showRightSidebar: false,
    triggeredAppInput: '',
    widgetUsage: {},
    showLoggingDashboard: false,
    chatKey: 0,
    isLoading: false,
    error: null,
    
    // 应用导航
    setCurrentApp: (app) => {
      const oldApp = get().currentApp;
      logger.trackStateChange('currentApp', oldApp, app, 'useAppStore');
      
      // 不在这里记录使用，只在用户真正使用功能时才记录
      
      set({ currentApp: app });
    },
    
    setShowRightSidebar: (show) => {
      const oldValue = get().showRightSidebar;
      const currentApp = get().currentApp;
      logger.trackStateChange('showRightSidebar', oldValue, show, 'useAppStore');
      logger.trackSidebarInteraction(show ? 'opened' : 'closed', currentApp || undefined);
      set({ showRightSidebar: show });
    },
    
    closeApp: () => {
      const currentApp = get().currentApp;
      logger.info(LogCategory.SIDEBAR_INTERACTION, 'Closing app', { currentApp });
      
      set({
        showRightSidebar: false,
        currentApp: null,
        triggeredAppInput: ''
      });
      
      // 移除可能导致循环依赖的 require 调用
      // 工件的关闭将通过其他机制处理，避免循环依赖
      // const { closeAllArtifacts } = require('./useArtifactStore').useArtifactStore.getState();
      // closeAllArtifacts();
    },
    
    reopenApp: (artifactId) => {
      // Simplified to avoid circular dependency with useArtifactStore
      logger.info(LogCategory.SIDEBAR_INTERACTION, 'Reopening app from artifact', { 
        artifactId
      });

      // 简化实现，避免循环依赖
      set({
        showRightSidebar: true,
        triggeredAppInput: `Reopening artifact: ${artifactId}`
      });
      
      // 移除可能导致循环依赖的 require 调用
      // const { useArtifacts } = require('./useArtifactStore');
      // const artifacts = useArtifacts.getState ? useArtifacts.getState() : [];
      // const artifact = artifacts.find((a: any) => a.id === artifactId);
      // 
      // if (!artifact) return;
      // 
      // set({
      //   currentApp: artifact.appId as AppId,
      //   showRightSidebar: true,
      //   triggeredAppInput: artifact.userInput
      // });
      // 
      // const { openArtifact } = require('./useArtifactStore').useArtifactStore.getState();
      // openArtifact(artifactId);
    },
    
    // 小部件交互
    setTriggeredAppInput: (input) => {
      const oldValue = get().triggeredAppInput;
      const currentApp = get().currentApp;
      logger.trackStateChange('triggeredAppInput', oldValue, input, 'useAppStore');
      if (input) {
        logger.trackUserInput(input, { source: 'app_trigger', currentApp });
      }
      set({ triggeredAppInput: input });
    },
    
    // 聊天控制
    startNewChat: () => {
      logger.info(LogCategory.CHAT_FLOW, 'Starting new chat session');
      set((state) => ({
        chatKey: state.chatKey + 1,
        currentApp: null,
        showRightSidebar: false,
        triggeredAppInput: '',
        error: null
      }));
      
      // 重置任务历史状态（避免循环依赖，使用动态导入）
      try {
        import('./useChatStore').then(({ useChatStore }) => {
          const { resetTaskHistory } = useChatStore.getState();
          resetTaskHistory();
        });
      } catch (error) {
        log.warn('Failed to reset task history', error);
      }
    },
    
    // UI状态
    setShowLoggingDashboard: (show) => {
      logger.trackSidebarInteraction(show ? 'logging_dashboard_opened' : 'logging_dashboard_closed');
      set({ showLoggingDashboard: show });
    },
    
    // 全局状态
    setLoading: (loading) => {
      set({ isLoading: loading });
    },
    
    setError: (error) => {
      set({ error });
      if (error) {
        logger.error(LogCategory.STATE_CHANGE, 'App error set', { error });
      }
    },
    
    clearError: () => {
      set({ error: null });
    },
    
    // Widget使用状态跟踪
    recordWidgetUsage: (widgetId) => {
      const currentUsage = get().widgetUsage[widgetId] || {
        lastUsed: null,
        hasArtifacts: false,
        usageCount: 0
      };
      
      const newUsage = {
        ...currentUsage,
        lastUsed: new Date().toISOString(),
        usageCount: currentUsage.usageCount + 1
      };
      
      set(state => ({
        widgetUsage: {
          ...state.widgetUsage,
          [widgetId]: newUsage
        }
      }));
      
      logger.debug(LogCategory.SIDEBAR_INTERACTION, 'Widget usage recorded', { 
        widgetId, 
        usageCount: newUsage.usageCount 
      });
    },
    
    markWidgetWithArtifacts: (widgetId) => {
      const currentUsage = get().widgetUsage[widgetId] || {
        lastUsed: new Date().toISOString(),
        hasArtifacts: false,
        usageCount: 0
      };
      
      const newUsage = {
        ...currentUsage,
        hasArtifacts: true
      };
      
      set(state => ({
        widgetUsage: {
          ...state.widgetUsage,
          [widgetId]: newUsage
        }
      }));
      
      logger.debug(LogCategory.ARTIFACT_CREATION, 'Widget marked with artifacts', { widgetId });
    },
    
    getWidgetUsage: (widgetId) => {
      return get().widgetUsage[widgetId] || {
        lastUsed: null,
        hasArtifacts: false,
        usageCount: 0
      };
    },
    
    getSortedWidgets: () => {
      const usage = get().widgetUsage;
      
      // 获取所有已知的widget ID
      const allWidgetIds = ['dream', 'hunt', 'omni', 'data-scientist', 'knowledge'];
      
      return allWidgetIds
        .map(id => ({
          id,
          usage: usage[id] || {
            lastUsed: null,
            hasArtifacts: false,
            usageCount: 0
          }
        }))
        .sort((a, b) => {
          // 首先按是否有artifacts排序
          if (a.usage.hasArtifacts !== b.usage.hasArtifacts) {
            return b.usage.hasArtifacts ? 1 : -1;
          }
          // 然后按最后使用时间排序
          if (a.usage.lastUsed && b.usage.lastUsed) {
            return new Date(b.usage.lastUsed).getTime() - new Date(a.usage.lastUsed).getTime();
          }
          if (a.usage.lastUsed) return -1;
          if (b.usage.lastUsed) return 1;
          // 最后按使用次数排序
          return b.usage.usageCount - a.usage.usageCount;
        });
    }
  }))
);

// 主应用选择器
export const useCurrentApp = () => useAppStore(state => state.currentApp);
export const useShowRightSidebar = () => useAppStore(state => state.showRightSidebar);
export const useTriggeredAppInput = () => useAppStore(state => state.triggeredAppInput);
export const useAppLoading = () => useAppStore(state => state.isLoading);
export const useAppError = () => useAppStore(state => state.error);
export const useShowLoggingDashboard = () => useAppStore(state => state.showLoggingDashboard);
export const useChatKey = () => useAppStore(state => state.chatKey);
export const useGetWidgetUsage = (widgetId: string) => useAppStore(state => state.getWidgetUsage(widgetId));

// Widget使用状态选择器
export const useWidgetUsage = () => useAppStore(state => state.widgetUsage);
export const useSortedWidgets = () => useAppStore(state => state.getSortedWidgets());

// 主应用操作
export const useAppActions = () => useAppStore(state => ({
  setCurrentApp: state.setCurrentApp,
  setShowRightSidebar: state.setShowRightSidebar,
  closeApp: state.closeApp,
  reopenApp: state.reopenApp,
  setTriggeredAppInput: state.setTriggeredAppInput,
  recordWidgetUsage: state.recordWidgetUsage,
  markWidgetWithArtifacts: state.markWidgetWithArtifacts,
  getWidgetUsage: state.getWidgetUsage,
  getSortedWidgets: state.getSortedWidgets,
  startNewChat: state.startNewChat,
  setShowLoggingDashboard: state.setShowLoggingDashboard,
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError
}));

// Widget状态跟踪操作 
export const useWidgetActions = () => useAppStore(state => ({
  recordWidgetUsage: state.recordWidgetUsage,
  markWidgetWithArtifacts: state.markWidgetWithArtifacts,
  getWidgetUsage: state.getWidgetUsage,
  getSortedWidgets: state.getSortedWidgets
}));