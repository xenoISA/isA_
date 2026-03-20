/**
 * ============================================================================
 * 小部件状态管理 (useWidgetStores.ts) - 专注于侧边栏小部件的状态管理
 * ============================================================================
 * 
 * 【核心职责】
 * - 管理各个小部件的特定状态（Dream, Hunt, Omni等）
 * - 处理小部件的生成状态和结果数据
 * - 提供小部件相关的操作接口
 * - 分离各小部件的关注点
 * 
 * 【关注点分离】
 * ✅ 负责：
 *   - 各小部件的状态数据管理
 *   - 小部件生成状态（loading, generating等）
 *   - 小部件结果数据存储
 *   - 小部件参数管理
 *   - 小部件特有的业务状态
 * 
 * ❌ 不负责：
 *   - 聊天消息管理（由useChatStore处理）
 *   - 会话管理（由useSessionStore处理）
 *   - 应用导航（由useAppStore处理）
 *   - 工件管理（由useArtifactStore处理）
 *   - 全局UI状态（由useAppStore处理）
 * 
 * 【小部件说明】
 * - Dream: AI图像生成小部件
 * - Hunt: 产品搜索和比较小部件
 * - Omni: 多功能内容生成小部件
 * - Assistant: AI助手小部件
 * - Knowledge: 知识管理小部件
 * - DataScientist: 数据科学分析小部件
 */

import { createBaseWidgetStore } from './BaseWidgetStore';
import { 
  extractImageFromMessage, 
  extractTextFromMessage, 
  extractSearchResultFromMessage,
  extractAnalysisFromMessage,
  templateBuilders 
} from './widgetStoreUtils';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { logger, LogCategory, createLogger } from '../utils/logger';

const log = createLogger('WidgetStores', LogCategory.ARTIFACT_CREATION);
import { useAppStore } from './useAppStore';

// Dream Widget State (simplified with BaseWidgetStore)
interface DreamSpecificState {
  generatedImage: string | null;
}

interface DreamSpecificActions {
  setDreamGeneratedImage: (image: string | null) => void;
}

// Create Dream store using BaseWidgetStore factory
export const useDreamWidgetStore = createBaseWidgetStore(
  // Widget configuration
  {
    widgetType: 'dream',
    logEmoji: '🎨',
    defaultTemplateName: 'text_to_image_prompt'
  },
  
  // Specific initial state
  {
    generatedImage: null
  },
  
  // Specific actions factory
  (set: any, get: any, helpers: any) => ({
    setDreamGeneratedImage: (image: string | null) => {
      set((state: any) => ({ ...state, generatedImage: image }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Dream image updated`, { 
        imageUrl: image 
      });
    }
  }),
  
  // Custom result handlers  
  {
    // 不使用 store 级别的 buildTemplateParams，让 DreamWidgetModule 处理模板参数
    onMessageComplete: (completeMessage?: string, params?: any, helpers?: any, get?: any) => {
      const store = get();
      const setDreamGeneratedImage = store.setDreamGeneratedImage;
      if (completeMessage && get && helpers) {
        extractImageFromMessage(completeMessage, setDreamGeneratedImage, helpers);
      }
    },
    onArtifactCreated: (artifact: any, params: any, helpers: any, get: any) => {
      const store = get();
      const setDreamGeneratedImage = store.setDreamGeneratedImage;
      log.debug('Dream onArtifactCreated called', {
        artifactType: artifact.type,
        hasContent: !!artifact.content,
        contentPreview: artifact.content?.substring(0, 80),
        currentGeneratedImage: store.generatedImage?.substring(0, 80)
      });
      
      let imageUrl = null;
      
      // Handle direct image URL (type: 'image')
      if (artifact.type === 'image' && artifact.content) {
        imageUrl = artifact.content;
        log.debug('Dream direct image URL', { imageUrl });
      }
      // Handle JSON data with image URLs (type: 'data')
      else if (artifact.type === 'data' && artifact.content) {
        try {
          const data = JSON.parse(artifact.content);
          log.debug('Dream parsed data artifact', data);

          // Extract image URL from different possible structures
          if (data.data?.image_urls && Array.isArray(data.data.image_urls) && data.data.image_urls.length > 0) {
            imageUrl = data.data.image_urls[0];
            log.debug('Dream extracted from image_urls array', { imageUrl });
          } else if (data.image_urls && Array.isArray(data.image_urls) && data.image_urls.length > 0) {
            imageUrl = data.image_urls[0];
            log.debug('Dream extracted from top-level image_urls', { imageUrl });
          } else if (data.url) {
            imageUrl = data.url;
            log.debug('Dream extracted from url field', { imageUrl });
          }
        } catch (parseError) {
          log.error('Dream failed to parse data artifact', parseError);
        }
      }
      
      // Set the image if we found a valid URL and don't already have an image
      if (imageUrl && !store.generatedImage) {
        log.debug('Setting dream generated image', { imageUrl });
        setDreamGeneratedImage(imageUrl);
        helpers.markWithArtifacts();
      } else {
        log.debug('Dream image not set - conditions not met', {
          hasImageUrl: !!imageUrl,
          hasExistingImage: !!store.generatedImage,
          imageUrl: imageUrl?.substring(0, 50)
        });
      }
    }
  }
);

export type DreamWidgetStore = DreamSpecificState & DreamSpecificActions;

// Hunt Widget State (simplified with BaseWidgetStore)
interface HuntSpecificState {
  searchResults: any[];
  lastQuery: string;
  currentStatus: string;
}

interface HuntSpecificActions {
  setHuntSearchResults: (results: any[]) => void;
  setHuntLastQuery: (query: string) => void;
  setHuntCurrentStatus: (status: string) => void;
}

export type HuntWidgetStore = HuntSpecificState & HuntSpecificActions;

// Create Hunt store using BaseWidgetStore factory
export const useHuntWidgetStore = createBaseWidgetStore(
  // Widget configuration
  {
    widgetType: 'hunt',
    logEmoji: '🔍',
    defaultTemplateName: 'hunt_general_prompt'
  },
  
  // Specific initial state
  {
    searchResults: [],
    lastQuery: '',
    currentStatus: ''
  },
  
  // Specific actions factory
  (set: any, get: any, helpers: any) => ({
    setHuntSearchResults: (results: any[]) => {
      set((state: any) => ({ ...state, searchResults: results }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Hunt results updated`, { 
        resultCount: results.length 
      });
    },
    setHuntLastQuery: (query: string) => {
      set((state: any) => ({ ...state, lastQuery: query }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Hunt query updated`, { query });
    },
    setHuntCurrentStatus: (status: string) => {
      set((state: any) => ({ ...state, currentStatus: status }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Hunt status updated`, { status });
    }
  }),
  
  // Custom result handlers
  {
    buildTemplateParams: templateBuilders.search,
    onMessageStatus: (status: string, params: any, helpers: any, get: any) => {
      const store = get();
      const setHuntCurrentStatus = store.setHuntCurrentStatus;
      setHuntCurrentStatus(status);
    },
    onMessageComplete: (completeMessage?: string, params?: any, helpers?: any, get?: any) => {
      const store = get();
      const setHuntSearchResults = store.setHuntSearchResults;
      const setHuntLastQuery = store.setHuntLastQuery;
      setHuntLastQuery(params.query || '');
      if (completeMessage && params && helpers) {
        extractSearchResultFromMessage(completeMessage, params, setHuntSearchResults, helpers);
      }
    },
    onArtifactCreated: (artifact: any, params: any, helpers: any, get: any) => {
      const store = get();
      const setHuntSearchResults = store.setHuntSearchResults;
      if (artifact.content) {
        helpers.markWithArtifacts();
        
        if (artifact.type === 'image') {
          const imageResult = {
            title: 'Image Result',
            description: 'Generated or found image',
            content: artifact.content,
            url: artifact.content,
            type: 'image'
          };
          setHuntSearchResults([...store.searchResults, imageResult]);
        }
      }
    }
  }
);

// Omni Widget State (simplified with BaseWidgetStore)
interface OmniSpecificState {
  generatedContent: string | null;
}

interface OmniSpecificActions {
  setOmniGeneratedContent: (content: string | null) => void;
}

// Create Omni store using BaseWidgetStore factory
export const useOmniWidgetStore = createBaseWidgetStore(
  // Widget configuration
  {
    widgetType: 'omni',
    logEmoji: '⚡',
    defaultTemplateName: 'general_content_prompt'
  },
  
  // Specific initial state
  {
    generatedContent: null
  },
  
  // Specific actions factory
  (set: any, get: any, helpers: any) => ({
    setOmniGeneratedContent: (content: string | null) => {
      set((state: any) => ({ ...state, generatedContent: content }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Omni content updated`, { 
        contentLength: content?.length 
      });
    }
  }),
  
  // Custom result handlers
  {
    buildTemplateParams: templateBuilders.contentGeneration,
    onMessageComplete: (completeMessage?: string, params?: any, helpers?: any, get?: any) => {
      const store = get();
      const setOmniGeneratedContent = store.setOmniGeneratedContent;
      if (completeMessage && helpers) {
        extractTextFromMessage(completeMessage, setOmniGeneratedContent, helpers);
      }
    },
    onArtifactCreated: (artifact: any, params: any, helpers: any, get: any) => {
      const store = get();
      const setOmniGeneratedContent = store.setOmniGeneratedContent;
      if (artifact.content && !store.generatedContent) {
        setOmniGeneratedContent(artifact.content);
        helpers.markWithArtifacts();
      }
    }
  }
);

export type OmniWidgetStore = OmniSpecificState & OmniSpecificActions;

// DataScientist Widget State (simplified with BaseWidgetStore)
interface DataScientistSpecificState {
  analysisResult: any | null;
}

interface DataScientistSpecificActions {
  setDataScientistAnalysisResult: (result: any | null) => void;
}

// Create DataScientist store using BaseWidgetStore factory
export const useDataScientistWidgetStore = createBaseWidgetStore(
  // Widget configuration
  {
    widgetType: 'data_scientist',
    logEmoji: '📊',
    defaultTemplateName: 'csv_analyze_prompt'
  },
  
  // Specific initial state
  {
    analysisResult: null
  },
  
  // Specific actions factory
  (set: any, get: any, helpers: any) => ({
    setDataScientistAnalysisResult: (result: any | null) => {
      set((state: any) => ({ ...state, analysisResult: result }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} DataScientist analysis result updated`, { 
        hasResult: !!result 
      });
    }
  }),
  
  // Custom result handlers
  {
    buildTemplateParams: templateBuilders.dataAnalysis,
    onMessageComplete: (completeMessage?: string, params?: any, helpers?: any, get?: any) => {
      const store = get();
      const setDataScientistAnalysisResult = store.setDataScientistAnalysisResult;
      if (completeMessage && helpers) {
        extractAnalysisFromMessage(completeMessage, setDataScientistAnalysisResult, helpers);
      }
    },
    onArtifactCreated: (artifact: any, params: any, helpers: any, get: any) => {
      const store = get();
      const setDataScientistAnalysisResult = store.setDataScientistAnalysisResult;
      if (artifact.content && !store.analysisResult) {
        try {
          const analysisResult = JSON.parse(artifact.content);
          setDataScientistAnalysisResult(analysisResult);
          helpers.markWithArtifacts();
        } catch (parseError) {
          setDataScientistAnalysisResult({
            analysis: {
              summary: artifact.content,
              insights: [],
              recommendations: []
            },
            visualizations: [],
            statistics: {
              dataPoints: 0,
              columns: []
            }
          });
          helpers.markWithArtifacts();
        }
      }
    }
  }
);

export type DataScientistWidgetStore = DataScientistSpecificState & DataScientistSpecificActions;

// Knowledge Widget State (simplified with BaseWidgetStore)
interface KnowledgeSpecificState {
  documents: any[];
  analysisResult: string | null;
}

interface KnowledgeSpecificActions {
  setKnowledgeDocuments: (documents: any[]) => void;
  setKnowledgeAnalysisResult: (result: string | null) => void;
}

// Create Knowledge store using BaseWidgetStore factory
export const useKnowledgeWidgetStore = createBaseWidgetStore(
  // Widget configuration
  {
    widgetType: 'knowledge',
    logEmoji: '📚',
    defaultTemplateName: 'intelligent_rag_search_prompt'
  },
  
  // Specific initial state
  {
    documents: [],
    analysisResult: null
  },
  
  // Specific actions factory
  (set: any, get: any, helpers: any) => ({
    setKnowledgeDocuments: (documents: any[]) => {
      set((state: any) => ({ ...state, documents }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Knowledge documents updated`, { 
        documentCount: documents.length 
      });
    },
    setKnowledgeAnalysisResult: (result: string | null) => {
      set((state: any) => ({ ...state, analysisResult: result }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Knowledge analysis result updated`, { 
        hasResult: !!result 
      });
    }
  }),
  
  // Custom result handlers
  {
    buildTemplateParams: templateBuilders.knowledgeAnalysis,
    onMessageComplete: (completeMessage?: string, params?: any, helpers?: any, get?: any) => {
      const store = get();
      const setKnowledgeAnalysisResult = store.setKnowledgeAnalysisResult;
      const setKnowledgeDocuments = store.setKnowledgeDocuments;
      
      // Store documents if provided
      if (params.documents && params.documents.length > 0) {
        setKnowledgeDocuments(params.documents);
      }
      
      if (completeMessage && helpers) {
        extractTextFromMessage(completeMessage, setKnowledgeAnalysisResult, helpers);
      }
    },
    onArtifactCreated: (artifact: any, params: any, helpers: any, get: any) => {
      const store = get();
      const setKnowledgeAnalysisResult = store.setKnowledgeAnalysisResult;
      if (artifact.content && !store.analysisResult) {
        setKnowledgeAnalysisResult(artifact.content);
        helpers.markWithArtifacts();
      }
    }
  }
);

export type KnowledgeWidgetStore = KnowledgeSpecificState & KnowledgeSpecificActions;

// ============================================================================
// Custom Automation Widget State (Business Process Automation)
// ============================================================================

interface AutomationSpecificState {
  currentTemplate: string | null;
  automationResults: any[];
  processStatus: 'idle' | 'configuring' | 'running' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
}

interface AutomationSpecificActions {
  setCurrentTemplate: (template: string | null) => void;
  setAutomationResults: (results: any[]) => void;
  setProcessStatus: (status: 'idle' | 'configuring' | 'running' | 'completed' | 'error') => void;
  setCurrentStep: (step: number) => void;
  setTotalSteps: (total: number) => void;
}

// Create CustomAutomation store using BaseWidgetStore factory
export const useCustomAutomationWidgetStore = createBaseWidgetStore(
  // Widget configuration
  {
    widgetType: 'custom_automation',
    logEmoji: '🤖',
    defaultTemplateName: 'automation_workflow'
  },
  
  // Specific initial state
  {
    currentTemplate: null,
    automationResults: [],
    processStatus: 'idle',
    currentStep: 0,
    totalSteps: 0
  },
  
  // Specific actions factory
  (set: any, get: any, helpers: any) => ({
    setCurrentTemplate: (template: string | null) => {
      set((state: any) => ({ ...state, currentTemplate: template }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Automation template set`, { 
        template 
      });
    },
    setAutomationResults: (results: any[]) => {
      set((state: any) => ({ ...state, automationResults: results }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Automation results updated`, { 
        resultCount: results.length 
      });
    },
    setProcessStatus: (status: 'idle' | 'configuring' | 'running' | 'completed' | 'error') => {
      set((state: any) => ({ ...state, processStatus: status }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Process status changed`, { 
        status 
      });
    },
    setCurrentStep: (step: number) => {
      set((state: any) => ({ ...state, currentStep: step }));
    },
    setTotalSteps: (total: number) => {
      set((state: any) => ({ ...state, totalSteps: total }));
    }
  }),
  
  // Custom result handlers
  {
    buildTemplateParams: (params: any) => {
      // Build automation template parameters based on input
      return {
        templateId: params.templateId,
        inputs: params.inputs,
        mode: params.mode || 'guided',
        chatContext: params.chatContext
      };
    },
    onMessageComplete: (completeMessage?: string, params?: any, helpers?: any, get?: any) => {
      const store = get();
      const setAutomationResults = store.setAutomationResults;
      const setProcessStatus = store.setProcessStatus;
      
      if (completeMessage && helpers) {
        // Process automation results from message
        try {
          const results = JSON.parse(completeMessage);
          if (results.automationResults) {
            setAutomationResults(results.automationResults);
            setProcessStatus('completed');
          }
        } catch (error) {
          // Fallback to text extraction
          extractTextFromMessage(completeMessage, setAutomationResults, helpers);
          setProcessStatus('completed');
        }
      }
    },
    onArtifactCreated: (artifact: any, params: any, helpers: any, get: any) => {
      const store = get();
      const setAutomationResults = store.setAutomationResults;
      const setProcessStatus = store.setProcessStatus;
      
      if (artifact.content && artifact.type === 'data') {
        setAutomationResults([artifact.content]);
        setProcessStatus('completed');
        helpers.markWithArtifacts();
      }
    }
  }
);

export type CustomAutomationWidgetStore = AutomationSpecificState & AutomationSpecificActions;

// ============================================================================
// DigitalHub Widget State (File Organization & Storage)
// ============================================================================

interface DigitalHubSpecificState {
  files: any[];
  currentPath: string;
  lastQuery: string;
}

interface DigitalHubSpecificActions {
  setDigitalHubFiles: (files: any[]) => void;
  setDigitalHubCurrentPath: (path: string) => void;
  setDigitalHubLastQuery: (query: string) => void;
}

// Create DigitalHub store using BaseWidgetStore factory
export const useDigitalHubWidgetStore = createBaseWidgetStore(
  // Widget configuration
  {
    widgetType: 'digitalhub',
    logEmoji: '📂',
    defaultTemplateName: 'storage_list_prompt'
  },

  // Specific initial state
  {
    files: [],
    currentPath: '/',
    lastQuery: ''
  },

  // Specific actions factory
  (set: any, get: any, helpers: any) => ({
    setDigitalHubFiles: (files: any[]) => {
      set((state: any) => ({ ...state, files }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} DigitalHub files updated`, {
        fileCount: files.length
      });
    },
    setDigitalHubCurrentPath: (path: string) => {
      set((state: any) => ({ ...state, currentPath: path }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} DigitalHub path updated`, { path });
    },
    setDigitalHubLastQuery: (query: string) => {
      set((state: any) => ({ ...state, lastQuery: query }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} DigitalHub query updated`, { query });
    }
  }),

  // Custom result handlers
  {
    onMessageComplete: (completeMessage?: string, params?: any, helpers?: any, get?: any) => {
      const store = get();
      if (completeMessage && helpers) {
        // TODO: Parse file listing results from message
        extractTextFromMessage(completeMessage, () => {}, helpers);
      }
    },
    onArtifactCreated: (artifact: any, params: any, helpers: any, get: any) => {
      const store = get();
      if (artifact.content && artifact.type === 'data') {
        try {
          const data = JSON.parse(artifact.content);
          if (data.files) {
            store.setDigitalHubFiles(data.files);
          }
        } catch (e) {
          // Not JSON data
        }
        helpers.markWithArtifacts();
      }
    }
  }
);

export type DigitalHubWidgetStore = DigitalHubSpecificState & DigitalHubSpecificActions;

// ============================================================================
// Doc Widget State (Document Processing)
// ============================================================================

interface DocSpecificState {
  currentDocument: any | null;
  generatedContent: string | null;
}

interface DocSpecificActions {
  setDocCurrentDocument: (document: any | null) => void;
  setDocGeneratedContent: (content: string | null) => void;
}

// Create Doc store using BaseWidgetStore factory
export const useDocWidgetStore = createBaseWidgetStore(
  // Widget configuration
  {
    widgetType: 'doc',
    logEmoji: '📝',
    defaultTemplateName: 'doc_create_prompt'
  },

  // Specific initial state
  {
    currentDocument: null,
    generatedContent: null
  },

  // Specific actions factory
  (set: any, get: any, helpers: any) => ({
    setDocCurrentDocument: (document: any | null) => {
      set((state: any) => ({ ...state, currentDocument: document }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Doc document updated`, {
        hasDocument: !!document
      });
    },
    setDocGeneratedContent: (content: string | null) => {
      set((state: any) => ({ ...state, generatedContent: content }));
      helpers.logger.debug('ARTIFACT_CREATION', `${helpers.config.logEmoji} Doc content updated`, {
        contentLength: content?.length
      });
    }
  }),

  // Custom result handlers
  {
    buildTemplateParams: templateBuilders.contentGeneration,
    onMessageComplete: (completeMessage?: string, params?: any, helpers?: any, get?: any) => {
      const store = get();
      const setDocGeneratedContent = store.setDocGeneratedContent;
      if (completeMessage && helpers) {
        extractTextFromMessage(completeMessage, setDocGeneratedContent, helpers);
      }
    },
    onArtifactCreated: (artifact: any, params: any, helpers: any, get: any) => {
      const store = get();
      const setDocGeneratedContent = store.setDocGeneratedContent;
      if (artifact.content && !store.generatedContent) {
        setDocGeneratedContent(artifact.content);
        helpers.markWithArtifacts();
      }
    }
  }
);

export type DocWidgetStore = DocSpecificState & DocSpecificActions;

// ============================================================================
// 选择性订阅 Widget Hooks - 避免流数据重复处理
// ============================================================================

// Dream Widget - 选择性订阅，每个字段单独订阅避免重渲染
export const useDreamGeneratedImage = () => useDreamWidgetStore((state: any) => state.generatedImage);
export const useDreamIsGenerating = () => useDreamWidgetStore((state: any) => state.isProcessing);
export const useDreamLastParams = () => useDreamWidgetStore((state: any) => state.lastParams);

// Dream Widget - 组合状态（仅在必要时使用）
export const useDreamState = () => {
  const generatedImage = useDreamGeneratedImage();
  const isGenerating = useDreamIsGenerating();
  const lastParams = useDreamLastParams();
  
  return {
    generatedImage,
    isGenerating,
    lastParams
  };
};

export const useDreamActions = () => useDreamWidgetStore((state: any) => ({
  setDreamGeneratedImage: state.setDreamGeneratedImage,
  setDreamGenerating: state.setProcessing, // 使用BaseWidgetStore的setProcessing
  setDreamParams: state.setParams, // 使用BaseWidgetStore的setParams
  clearDreamData: state.clearData, // 使用BaseWidgetStore的clearData
  triggerDreamGeneration: state.triggerAction // 使用BaseWidgetStore的triggerAction
}));

// Hunt Widget - 选择性订阅，每个字段单独订阅避免重渲染
export const useHuntSearchResults = () => useHuntWidgetStore((state: any) => state.searchResults);
export const useHuntIsSearching = () => useHuntWidgetStore((state: any) => state.isProcessing);
export const useHuntLastQuery = () => useHuntWidgetStore((state: any) => state.lastQuery);
export const useHuntCurrentStatus = () => useHuntWidgetStore((state: any) => state.currentStatus);

// Hunt Widget - 组合状态（仅在必要时使用）
export const useHuntState = () => {
  const searchResults = useHuntSearchResults();
  const isSearching = useHuntIsSearching();
  const lastQuery = useHuntLastQuery();
  const currentStatus = useHuntCurrentStatus();
  
  return {
    searchResults,
    isSearching,
    lastQuery,
    currentStatus
  };
};

export const useHuntActions = () => useHuntWidgetStore((state: any) => ({
  setHuntSearchResults: state.setHuntSearchResults,
  setHuntSearching: state.setProcessing, // 使用BaseWidgetStore的setProcessing
  setHuntLastQuery: state.setHuntLastQuery,
  clearHuntData: state.clearData, // 使用BaseWidgetStore的clearData
  triggerHuntSearch: state.triggerAction // 使用BaseWidgetStore的triggerAction
}));

// Widget选择器 - Omni (统一使用BaseWidgetStore字段)
export const useOmniState = () => useOmniWidgetStore((state: any) => ({
  generatedContent: state.generatedContent,
  isGenerating: state.isProcessing, // 使用BaseWidgetStore的isProcessing
  lastParams: state.lastParams
}));

export const useOmniActions = () => useOmniWidgetStore((state: any) => ({
  setOmniGeneratedContent: state.setOmniGeneratedContent,
  setOmniGenerating: state.setProcessing, // 使用BaseWidgetStore的setProcessing
  setOmniParams: state.setParams, // 使用BaseWidgetStore的setParams
  clearOmniData: state.clearData, // 使用BaseWidgetStore的clearData
  triggerOmniGeneration: state.triggerAction // 使用BaseWidgetStore的triggerAction
}));

// Widget选择器 - DataScientist (已经正确使用BaseWidgetStore字段)
export const useDataScientistState = () => useDataScientistWidgetStore((state: any) => ({
  analysisResult: state.analysisResult,
  isAnalyzing: state.isProcessing,
  lastParams: state.lastParams
}));

export const useDataScientistActions = () => useDataScientistWidgetStore((state: any) => ({
  setDataScientistAnalysisResult: state.setDataScientistAnalysisResult,
  setDataScientistAnalyzing: state.setProcessing,
  setDataScientistParams: state.setParams,
  clearDataScientistData: state.clearData,
  triggerDataScientistAnalysis: state.triggerAction
}));

// Widget选择器 - Knowledge (已经正确使用BaseWidgetStore字段)
export const useKnowledgeState = () => useKnowledgeWidgetStore((state: any) => ({
  documents: state.documents,
  isProcessing: state.isProcessing,
  lastParams: state.lastParams,
  analysisResult: state.analysisResult
}));

export const useKnowledgeActions = () => useKnowledgeWidgetStore((state: any) => ({
  setKnowledgeDocuments: state.setKnowledgeDocuments,
  setKnowledgeProcessing: state.setProcessing,
  setKnowledgeParams: state.setParams,
  setKnowledgeAnalysisResult: state.setKnowledgeAnalysisResult,
  clearKnowledgeData: state.clearData,
  triggerKnowledgeAnalysis: state.triggerAction
}));

// DigitalHub Widget - selective subscriptions
export const useDigitalHubFiles = () => useDigitalHubWidgetStore((state: any) => state.files);
export const useDigitalHubCurrentPath = () => useDigitalHubWidgetStore((state: any) => state.currentPath);
export const useDigitalHubIsProcessing = () => useDigitalHubWidgetStore((state: any) => state.isProcessing);
export const useDigitalHubLastQuery = () => useDigitalHubWidgetStore((state: any) => state.lastQuery);

export const useDigitalHubState = () => {
  const files = useDigitalHubFiles();
  const currentPath = useDigitalHubCurrentPath();
  const isProcessing = useDigitalHubIsProcessing();
  const lastQuery = useDigitalHubLastQuery();

  return {
    files,
    currentPath,
    isProcessing,
    lastQuery
  };
};

export const useDigitalHubActions = () => useDigitalHubWidgetStore((state: any) => ({
  setDigitalHubFiles: state.setDigitalHubFiles,
  setDigitalHubCurrentPath: state.setDigitalHubCurrentPath,
  setDigitalHubLastQuery: state.setDigitalHubLastQuery,
  setDigitalHubProcessing: state.setProcessing,
  clearDigitalHubData: state.clearData,
  triggerDigitalHubAction: state.triggerAction
}));

// Doc Widget - selective subscriptions
export const useDocCurrentDocument = () => useDocWidgetStore((state: any) => state.currentDocument);
export const useDocGeneratedContent = () => useDocWidgetStore((state: any) => state.generatedContent);
export const useDocIsProcessing = () => useDocWidgetStore((state: any) => state.isProcessing);
export const useDocLastParams = () => useDocWidgetStore((state: any) => state.lastParams);

export const useDocState = () => {
  const currentDocument = useDocCurrentDocument();
  const generatedContent = useDocGeneratedContent();
  const isProcessing = useDocIsProcessing();
  const lastParams = useDocLastParams();

  return {
    currentDocument,
    generatedContent,
    isProcessing,
    lastParams
  };
};

export const useDocActions = () => useDocWidgetStore((state: any) => ({
  setDocCurrentDocument: state.setDocCurrentDocument,
  setDocGeneratedContent: state.setDocGeneratedContent,
  setDocProcessing: state.setProcessing,
  setDocParams: state.setParams,
  clearDocData: state.clearData,
  triggerDocAction: state.triggerAction
}));

// 统一的Widget清理操作
export const clearAllWidgetData = () => {
  useDreamWidgetStore.getState().clearData();
  useHuntWidgetStore.getState().clearData();
  useOmniWidgetStore.getState().clearData();
  useDataScientistWidgetStore.getState().clearData();
  useKnowledgeWidgetStore.getState().clearData();
  useCustomAutomationWidgetStore.getState().clearData();
  useDigitalHubWidgetStore.getState().clearData();
  useDocWidgetStore.getState().clearData();
  logger.debug(LogCategory.ARTIFACT_CREATION, 'All widget data cleared');
};

// ================================================================================
// 高级聚合选择器 - 基于现有BaseWidgetStore架构
// ================================================================================

/**
 * 统一Widget状态聚合 - 利用现有的组合选择器
 * 这样可以复用现有的useDreamState, useHuntState等
 */
export const useAllWidgetStates = () => {
  const dream = useDreamState();
  const hunt = useHuntState();
  const omni = useOmniState();
  const dataScientist = useDataScientistState();
  const knowledge = useKnowledgeState();
  
  return {
    dream,
    hunt,
    omni,
    dataScientist,
    knowledge
  };
};

/**
 * 检查是否有任何Widget正在处理 - 利用BaseWidgetStore的isProcessing
 */
export const useIsAnyWidgetGenerating = () => {
  const dream = useDreamState();
  const hunt = useHuntState();
  const omni = useOmniState();
  const dataScientist = useDataScientistState();
  const knowledge = useKnowledgeState();
  
  return dream.isGenerating || 
         hunt.isSearching || 
         omni.isGenerating || 
         dataScientist.isAnalyzing || 
         knowledge.isProcessing;
};

/**
 * 获取所有Widget操作的聚合 - 利用现有的Actions选择器
 */
export const useAllWidgetActions = () => {
  const dreamActions = useDreamActions();
  const huntActions = useHuntActions();
  const omniActions = useOmniActions();
  const dataScientistActions = useDataScientistActions();
  const knowledgeActions = useKnowledgeActions();
  
  return {
    dream: dreamActions,
    hunt: huntActions,
    omni: omniActions,
    dataScientist: dataScientistActions,
    knowledge: knowledgeActions,
    clearAll: clearAllWidgetData
  };
};