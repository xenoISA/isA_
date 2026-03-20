/**
 * ============================================================================
 * 小部件类型定义 (widgetTypes.ts) - 小部件相关的类型定义
 * ============================================================================
 * 
 * 【核心职责】
 * - 定义小部件的数据结构和配置
 * - 定义小部件状态和操作接口
 * - 小部件配置和元数据类型
 * 
 * 【关注点分离】
 * ✅ 负责：
 *   - Widget 小部件基础接口
 *   - 小部件配置和元数据
 *   - 小部件状态枚举
 *   - 特定小部件的参数类型
 * 
 * ❌ 不负责：
 *   - 聊天消息类型（由chatTypes.ts处理）
 *   - 应用工件类型（由appTypes.ts处理）
 *   - 用户认证类型（由authTypes.ts处理）
 */

import { AppId } from './appTypes';

// 统一的Widget类型定义 - 与AppId保持一致
export type WidgetType = 'dream' | 'hunt' | 'omni' | 'knowledge' | 'data_scientist' | 'custom_automation' | 'digitalhub' | 'doc';

// 小部件配置接口
export interface WidgetConfig {
  id: AppId;
  title: string;
  icon: string;
  description: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

// 小部件状态枚举
export type WidgetState = 
  | 'idle'
  | 'loading'
  | 'generating'
  | 'processing'
  | 'completed'
  | 'error';

// ============================================================================
// 基础 API 请求和返回数据类型
// ============================================================================

// 基础 API 请求参数接口 - 所有widget都需要的通用字段
export interface BaseWidgetApiParams {
  prompt?: string;              // 用户输入的主要内容
  sessionId?: string;          // 会话ID
  userId?: string;             // 用户ID
  templateParams?: {           // 模板参数
    template_id: string;
    prompt_args: Record<string, any>;
  };
  metadata?: Record<string, any>; // 附加元数据
}

// 基础 API 返回结果接口 - 所有widget返回都包含的通用字段
export interface BaseWidgetApiResult {
  success: boolean;            // 请求是否成功
  message?: string;           // 状态消息
  timestamp: string;          // 生成时间
  metadata?: {               // 结果元数据
    processingTime?: number;
    model?: string;
    tokens?: number;
    [key: string]: any;
  };
}

// 基础 UI 数据接口 - 适配当前UI组件结构
export interface BaseWidgetUIData {
  id: string;                 // 唯一标识
  type: 'text' | 'image' | 'data' | 'analysis' | 'search' | 'knowledge';
  title: string;              // 显示标题
  content: string;            // 主要内容
  isProcessing?: boolean;     // 是否处理中
  error?: string;            // 错误信息
  timestamp: Date;           // 时间戳
  params?: any;              // 原始参数
}

// ============================================================================
// Dream 小部件类型 - 基于基础类型扩展
// ============================================================================

// Dream API 请求参数
export interface DreamWidgetApiParams extends BaseWidgetApiParams {
  style?: string;             // 图像风格 (对应mode)
  size?: string;              // 图像尺寸
  quality?: string;           // 图像质量
  mode?: string;              // 生成模式
  
  // MCP prompt 参数 - 基于实际的9个MCP prompts
  stylePreset?: string;       // 风格预设 (text_to_image, image_to_image, style_transfer, emoji_generation, sticker_generation)
  strength?: string;          // 强度 (image_to_image, style_transfer, photo_inpainting, photo_outpainting)
  hairSource?: string;        // 头发处理 (face_swap)
  industry?: string;          // 行业背景 (professional_headshot)
  expression?: string;        // 表情 (emoji_generation)
  colorScheme?: string;       // 色彩方案 (emoji_generation)
  theme?: string;             // 主题 (sticker_generation)
  fillMethod?: string;        // 填充方法 (photo_inpainting)
  direction?: string;         // 扩展方向 (photo_outpainting)
}

// Dream API 返回结果
export interface DreamWidgetApiResult extends BaseWidgetApiResult {
  data?: {
    imageUrl: string;         // 生成的图片URL
    prompt: string;           // 使用的提示词
    style?: string;           // 实际使用的风格
    size?: string;            // 实际图片尺寸
  };
}

// Dream UI 数据
export interface DreamWidgetUIData extends BaseWidgetUIData {
  type: 'image';
  content: string;            // 图片URL
  imageMetadata?: {
    style?: string;
    size?: string;
    quality?: string;
  };
}

// ============================================================================
// Hunt 小部件类型 - 基于基础类型扩展
// ============================================================================

// Hunt API 请求参数
export interface HuntWidgetApiParams extends BaseWidgetApiParams {
  query?: string;             // 搜索查询
  category?: string;          // 搜索分类
  search_depth?: string;      // 搜索深度
  result_format?: string;     // 结果格式
  priceRange?: {             // 价格范围
    min: number;
    max: number;
  };
}

// Hunt API 返回结果
export interface HuntWidgetApiResult extends BaseWidgetApiResult {
  data?: {
    searchResults: Array<{    // 搜索结果
      id: string;
      title: string;
      description: string;
      url?: string;
      price?: number;
      rating?: number;
      image?: string;
      content: string;
    }>;
    query: string;            // 实际搜索查询
    totalResults: number;     // 总结果数
  };
}

// Hunt UI 数据
export interface HuntWidgetUIData extends BaseWidgetUIData {
  type: 'search';
  content: string;            // 搜索结果摘要
  searchResults?: Array<{
    title: string;
    description: string;
    url?: string;
    content: string;
  }>;
}

// ============================================================================
// Omni 小部件类型 - 基于基础类型扩展
// ============================================================================

// Omni API 请求参数
export interface OmniWidgetApiParams extends BaseWidgetApiParams {
  contentType?: 'text' | 'code' | 'markdown' | 'email' | 'social' | 'research';
  tone?: 'professional' | 'casual' | 'creative' | 'technical' | 'academic';
  length?: 'short' | 'medium' | 'long';
}

// Omni API 返回结果
export interface OmniWidgetApiResult extends BaseWidgetApiResult {
  data?: {
    content: string;          // 生成的内容
    contentType: string;      // 实际内容类型
    tone: string;            // 实际语调
    wordCount?: number;      // 字数统计
  };
}

// Omni UI 数据
export interface OmniWidgetUIData extends BaseWidgetUIData {
  type: 'text';
  content: string;            // 生成的文本内容
  contentMetadata?: {
    contentType?: string;
    tone?: string;
    wordCount?: number;
  };
}

// ============================================================================
// DataScientist 小部件类型 - 基于基础类型扩展
// ============================================================================

// DataScientist API 请求参数
export interface DataScientistWidgetApiParams extends BaseWidgetApiParams {
  data?: File | string;       // 数据文件或字符串
  query?: string;            // 分析查询
  analysisType?: 'descriptive' | 'predictive' | 'prescriptive' | 'exploratory';
  visualizationType?: 'chart' | 'graph' | 'table' | 'dashboard';
}

// DataScientist API 返回结果
export interface DataScientistWidgetApiResult extends BaseWidgetApiResult {
  data?: {
    analysis: {
      summary: string;
      insights: string[];
      recommendations: string[];
    };
    visualizations: Array<{
      type: string;
      title: string;
      data: any;
      chartConfig?: any;
    }>;
    statistics: {
      dataPoints: number;
      columns: string[];
      correlations?: any;
    };
  };
}

// DataScientist UI 数据
export interface DataScientistWidgetUIData extends BaseWidgetUIData {
  type: 'analysis';
  content: string;            // 分析摘要
  analysisData?: {
    insights: string[];
    recommendations: string[];
    visualizations: any[];
    statistics: any;
  };
}

// ============================================================================
// Knowledge 小部件类型 - 基于基础类型扩展
// ============================================================================

// Knowledge API 请求参数
export interface KnowledgeWidgetApiParams extends BaseWidgetApiParams {
  query?: string;             // 知识查询
  topic?: string;            // 主题
  task?: string;             // 任务
  sources?: string[];        // 来源
  searchDepth?: 'shallow' | 'deep' | 'comprehensive';
  files?: File[];            // 文件
  searchType?: 'semantic' | 'keyword' | 'hybrid';
  contextSize?: 'small' | 'medium' | 'large';
}

// Knowledge API 返回结果
export interface KnowledgeWidgetApiResult extends BaseWidgetApiResult {
  data?: {
    answer: string;           // 主要答案
    sources: Array<{         // 引用来源
      title: string;
      url: string;
      snippet: string;
      relevance: number;
    }>;
    relatedQuestions: string[]; // 相关问题
    confidence: number;       // 置信度
  };
}

// Knowledge UI 数据
export interface KnowledgeWidgetUIData extends BaseWidgetUIData {
  type: 'knowledge';
  content: string;            // 知识回答
  knowledgeData?: {
    sources: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
    relatedQuestions: string[];
    confidence: number;
  };
}

// ============================================================================
// 向后兼容的类型别名
// ============================================================================
export type DreamWidgetParams = DreamWidgetApiParams;
export type DreamWidgetResult = DreamWidgetApiResult;
export type HuntWidgetParams = HuntWidgetApiParams;
export type HuntWidgetResult = HuntWidgetApiResult;
export type OmniWidgetParams = OmniWidgetApiParams;
export type OmniWidgetResult = OmniWidgetApiResult;
export type DataScientistWidgetParams = DataScientistWidgetApiParams;
export type DataScientistWidgetResult = DataScientistWidgetApiResult;
export type KnowledgeWidgetParams = KnowledgeWidgetApiParams;
export type KnowledgeWidgetResult = KnowledgeWidgetApiResult;

// ============================================================================
// 旧类型定义已移除 - 请使用上面基于BaseWidgetApiParams的新类型
// ============================================================================

// 通用小部件接口
export interface Widget<TParams = any, TResult = any> {
  id: string;
  config: WidgetConfig;
  state: WidgetState;
  params?: TParams;
  result?: TResult;
  error?: string;
  triggeredInput?: string;
}

// 小部件管理器属性
export interface WidgetManagerProps {
  currentApp: AppId | null;
  showRightSidebar: boolean;
  triggeredAppInput: string;
  onCloseApp: () => void;
  onAppSelect?: (appId: string) => void;
}

// ============================================================================
// BaseWidget Store 相关类型定义
// ============================================================================

// Widget配置接口 - 用于BaseWidgetStore
export interface BaseWidgetConfig {
  widgetType: WidgetType;           // widget标识符，如 'dream', 'hunt'
  defaultTemplateName: string;  // 默认模板名称
  logEmoji: string;            // 日志前缀emoji，如 '🎨', '🔍'
}

// 基础Widget状态 - 所有widget都有的通用状态
export interface BaseWidgetState {
  isProcessing: boolean;  // 是否正在处理中
  lastParams: any;       // 最后使用的参数
}

// 基础Widget Actions - 所有widget都有的通用操作
export interface BaseWidgetActions {
  setProcessing: (isProcessing: boolean) => void;
  setParams: (params: any) => void;
  clearData: () => void;
  triggerAction: (params: any) => Promise<void>;
}

// Widget辅助工具接口
export interface WidgetHelpers {
  setProcessing: (isProcessing: boolean) => void;
  markWithArtifacts: () => void;
  logger: any; // logger实例
  config: BaseWidgetConfig;
}

// 自定义结果处理回调接口
export interface CustomResultHandlers {
  // 构建提示词
  buildPrompt?: (params: any) => string;
  
  // 构建模板参数
  buildTemplateParams?: (params: any) => any;
  
  // 处理完整消息回调
  onMessageComplete?: (completeMessage?: string, params?: any, helpers?: WidgetHelpers, get?: any) => void;
  
  // 处理Artifact创建回调
  onArtifactCreated?: (artifact: any, params: any, helpers: WidgetHelpers, get?: any) => void;
  
  // 处理状态更新回调 (仅Hunt使用)
  onMessageStatus?: (status: string, params: any, helpers: WidgetHelpers, get?: any) => void;
  
  // 自定义错误处理
  onError?: (error: any, params: any, helpers: WidgetHelpers, get?: any) => void;
}

// ChatService回调选项类型
export interface ChatServiceCallbacks {
  onMessageStart?: (messageId: string, status: string) => void;
  onMessageContent?: (contentChunk: string) => void;
  onMessageStatus?: (status: string) => void;
  onMessageComplete?: (completeMessage?: string) => void;
  onArtifactCreated?: (artifact: any) => void;
  onError?: (error: any) => void;
}

// ChatService请求选项类型
export interface ChatServiceOptions {
  session_id: string;
  user_id: string;
  template_parameters?: any;
  prompt_name?: string;
  prompt_args?: any;
}

// Widget Store完整类型定义
export type BaseWidgetStore<TSpecificState = {}, TSpecificActions = {}> = 
  BaseWidgetState & 
  BaseWidgetActions & 
  TSpecificState & 
  TSpecificActions;