/**
 * ============================================================================
 * Widget Hook (useWidget.ts) - Widget状态监听和聚合
 * ============================================================================
 * 
 * 【核心职责】
 * - 选择性订阅各个Widget Store的状态变化
 * - 聚合Widget相关的状态数据
 * - 提供统一的数据接口给Widget组件
 * 
 * 【架构原则】
 * ✅ 只负责状态监听和数据聚合
 * ✅ 使用选择性订阅优化性能
 * ✅ 使用聚合选择器减少Hook调用
 * ✅ 不包含业务逻辑和副作用
 * 
 * ❌ 不负责：
 *   - Widget业务逻辑处理（由WidgetModules处理）
 *   - Widget UI渲染（由Widget UI组件处理）
 *   - API调用和副作用（由WidgetModules处理）
 *   - 数据持久化逻辑（由WidgetModules处理）
 * 
 * 【数据流向】
 * WidgetModule → stores → useWidget → UI组件
 */

import { useMemo } from 'react';
import { AppId } from '../types/appTypes';
import { WidgetConfig, WidgetState } from '../types/widgetTypes';
import { useAllWidgetStates, useAllWidgetActions } from '../stores/useWidgetStores';
import { useCurrentApp, useShowRightSidebar, useTriggeredAppInput } from '../stores/useAppStore';

/**
 * Widget状态监听Hook - 纯数据聚合，无副作用
 * 
 * 使用选择性订阅监听所有Widget相关状态：
 * 1. 应用导航状态 (useAppStore)
 * 2. Widget状态聚合 (useWidgetStores)
 * 
 * @returns 聚合的Widget状态数据
 */
export const useWidget = () => {
  // 1. 应用导航状态 - 选择性订阅
  const currentApp = useCurrentApp();
  const showRightSidebar = useShowRightSidebar();
  const triggeredAppInput = useTriggeredAppInput();
  
  // 2. Widget状态聚合 - 选择性订阅（与useChat.ts一致）
  const widgetStates = useAllWidgetStates();
  
  // 3. Widget配置定义 - 使用useMemo优化性能
  const widgetConfigs = useMemo((): Record<AppId, WidgetConfig> => ({
    dream: {
      id: 'dream',
      title: 'DreamForge AI',
      icon: '🎨',
      description: 'AI-powered image generation',
      component: null as any
    },
    hunt: {
      id: 'hunt',
      title: 'HuntAI',
      icon: '🔍',
      description: 'Product search and comparison',
      component: null as any
    },
    omni: {
      id: 'omni',
      title: 'Omni Content Generator',
      icon: '⚡',
      description: 'Multi-purpose content creation',
      component: null as any
    },
    'data-scientist': {
      id: 'data-scientist',
      title: 'DataWise Analytics',
      icon: '📊',
      description: 'Data analysis and insights',
      component: null as any
    },
    knowledge: {
      id: 'knowledge',
      title: 'Knowledge Hub',
      icon: '🧠',
      description: 'Advanced document analysis with vector and graph RAG',
      component: null as any
    },
    digitalhub: {
      id: 'digitalhub',
      title: 'Digital Hub',
      icon: '💻',
      description: 'Digital tools and utilities',
      component: null as any
    },
    doc: {
      id: 'doc',
      title: 'Document Processor',
      icon: '📄',
      description: 'Document processing and analysis',
      component: null as any
    },
    assistant: {
      id: 'assistant',
      title: 'AI Assistant',
      icon: '🤖',
      description: 'General purpose AI assistant',
      component: null as any
    },
    'code-reviewer': {
      id: 'code-reviewer',
      title: 'Code Reviewer',
      icon: '👨‍💻',
      description: 'AI code review and analysis',
      component: null as any
    },
    translator: {
      id: 'translator',
      title: 'Translator',
      icon: '🌐',
      description: 'Language translation service',
      component: null as any
    },
    custom_automation: {
      id: 'custom_automation',
      title: 'Custom Automation',
      icon: '⚙️',
      description: 'Custom automation workflows',
      component: null as any
    }
  }), []);
  
  // 4. 派生状态计算 - 使用useMemo优化性能
  const currentWidgetConfig = useMemo((): WidgetConfig | null => 
    currentApp ? widgetConfigs[currentApp] || null : null,
    [currentApp, widgetConfigs]
  );
  
  const currentWidgetState = useMemo((): WidgetState => {
    if (!currentApp) return 'idle';
    
    switch (currentApp) {
      case 'dream':
        return widgetStates.dream.isGenerating ? 'generating' : 'idle';
      case 'hunt':
        return widgetStates.hunt.isSearching ? 'processing' : 'idle';
      case 'omni':
        return widgetStates.omni.isGenerating ? 'generating' : 'idle';
      case 'data-scientist':
        return widgetStates.dataScientist.isAnalyzing ? 'processing' : 'idle';
      case 'knowledge':
        return widgetStates.knowledge.isProcessing ? 'processing' : 'idle';
      default:
        return 'idle';
    }
  }, [currentApp, widgetStates]);
  
  const currentWidgetData = useMemo(() => {
    if (!currentApp) return null;
    
    switch (currentApp) {
      case 'dream':
        return {
          generatedImage: widgetStates.dream.generatedImage,
          params: widgetStates.dream.lastParams
        };
      case 'hunt':
        return {
          searchResults: widgetStates.hunt.searchResults,
          lastQuery: widgetStates.hunt.lastQuery,
          currentStatus: widgetStates.hunt.currentStatus
        };
      case 'omni':
        return {
          generatedContent: widgetStates.omni.generatedContent,
          params: widgetStates.omni.lastParams
        };
      case 'data-scientist':
        return {
          analysisResult: widgetStates.dataScientist.analysisResult,
          params: widgetStates.dataScientist.lastParams
        };
      case 'knowledge':
        return {
          analysisResult: widgetStates.knowledge.analysisResult,
          documents: widgetStates.knowledge.documents,
          params: widgetStates.knowledge.lastParams
        };
      default:
        return null;
    }
  }, [currentApp, widgetStates]);
  
  const hasActiveWidget = useMemo((): boolean => 
    !!(currentApp && showRightSidebar),
    [currentApp, showRightSidebar]
  );
  
  const isWidgetProcessing = useMemo((): boolean => 
    currentWidgetState !== 'idle',
    [currentWidgetState]
  );
  
  // 5. 聚合所有状态并返回
  return {
    // 应用导航上下文
    currentApp,
    showRightSidebar,
    triggeredAppInput,
    
    // Widget配置
    currentWidgetConfig,
    widgetConfigs,
    getWidgetConfig: (appId: AppId) => widgetConfigs[appId] || null,
    
    // Widget状态聚合
    widgetStates,
    currentWidgetState,
    currentWidgetData,
    
    // 派生状态
    hasActiveWidget,
    isWidgetProcessing
  };
};

/**
 * Widget操作Hook - 聚合所有Widget操作
 * 
 * 使用聚合选择器获取所有Widget操作方法
 * 
 * @returns 聚合的Widget操作方法
 */
export const useWidgetActions = () => {
  // 使用聚合选择器获取所有操作 - 与useChat.ts架构一致
  const widgetActions = useAllWidgetActions();
  
  // 应用级操作 - 选择性订阅
  const appActions = {
    openWidget: require('../stores/useAppStore').useAppActions().setCurrentApp,
    closeWidget: require('../stores/useAppStore').useAppActions().closeApp,
    setTriggeredInput: require('../stores/useAppStore').useAppActions().setTriggeredAppInput
  };
  
  return {
    // 应用级Widget操作
    ...appActions,
    
    // Widget特定操作（聚合）
    ...widgetActions
  };
};