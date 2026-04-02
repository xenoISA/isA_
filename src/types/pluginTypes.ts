/**
 * ============================================================================
 * Plugin System Types (pluginTypes.ts) - Widget Plugin 基础类型定义
 * ============================================================================
 * 
 * 核心职责：
 * - 定义 Widget 作为 Chat 插件的基础接口
 * - 提供插件输入输出的标准化类型
 * - 支持插件的注册和管理机制
 * 
 * 设计原则：
 * - 最小化实现，不破坏现有代码
 * - 与现有 appTypes.ts 兼容
 * - 为后续扩展预留接口
 */

import { AppId, ContentType } from './appTypes';

// ============================================================================
// 插件核心接口
// ============================================================================

/**
 * Widget 插件输入接口
 */
export interface PluginInput {
  /** 用户提示词 */
  prompt: string;
  /** 可选参数 */
  options?: Record<string, any>;
  /** 上下文信息 */
  context?: {
    sessionId?: string;
    userId?: string;
    messageId?: string;
    [key: string]: any;
  };
}

/**
 * Widget 插件输出接口
 */
export interface PluginOutput {
  /** 输出唯一标识 */
  id: string;
  /** 内容类型 */
  type: ContentType;
  /** 生成的内容 */
  content: any;
  /** 元数据信息 */
  metadata?: {
    /** 处理时间(ms) */
    processingTime?: number;
    /** 版本号 */
    version?: number;
    /** Token 使用量 */
    tokenUsage?: number;
    /** 其他自定义数据 */
    [key: string]: any;
  };
}

/**
 * Widget 插件接口定义
 */
export interface WidgetPlugin {
  /** 插件唯一标识 */
  id: AppId;
  /** 插件显示名称 */
  name: string;
  /** 插件图标 */
  icon: string;
  /** 插件描述 */
  description: string;
  /** 插件版本 */
  version: string;
  /** 触发关键词 */
  triggers?: string[];

  // Skill metadata — user-facing labels for conversational UX (#123)
  /** Human-readable skill label shown in chat (e.g. "Image Generation") */
  skillLabel?: string;
  /** Mate's conversational prefix when activating this skill (e.g. "Let me generate that image...") */
  conversationalTriggerPrefix?: string;

  // 核心方法
  /** 执行插件功能 */
  execute: (input: PluginInput) => Promise<PluginOutput>;

  // 生命周期（可选）
  /** 插件初始化 */
  onInit?: () => Promise<void>;
  /** 插件销毁 */
  onDestroy?: () => void;

  // 配置（可选）
  /** 插件配置 */
  config?: Record<string, any>;
}

/**
 * 插件注册信息
 */
export interface PluginRegistration {
  /** 插件实例 */
  plugin: WidgetPlugin;
  /** 注册时间 */
  registeredAt: string;
  /** 是否启用 */
  enabled: boolean;
  /** 使用次数 */
  usageCount: number;
}

/**
 * 插件执行结果
 */
export interface PluginExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 输出结果 */
  output?: PluginOutput;
  /** 错误信息 */
  error?: string;
  /** 执行时间 */
  executionTime: number;
}

// ============================================================================
// 插件管理器接口
// ============================================================================

/**
 * 插件管理器接口
 */
export interface PluginManager {
  /** 注册插件 */
  register(plugin: WidgetPlugin): void;
  /** 注销插件 */
  unregister(pluginId: AppId): void;
  /** 获取插件 */
  getPlugin(pluginId: AppId): WidgetPlugin | undefined;
  /** 获取所有插件 */
  getAllPlugins(): WidgetPlugin[];
  /** 执行插件 */
  execute(pluginId: AppId, input: PluginInput): Promise<PluginExecutionResult>;
  /** 检查插件是否存在 */
  hasPlugin(pluginId: AppId): boolean;
  /** 启用/禁用插件 */
  setPluginEnabled(pluginId: AppId, enabled: boolean): void;
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 插件触发检测结果
 */
export interface PluginTriggerResult {
  /** 是否触发 */
  triggered: boolean;
  /** 触发的插件ID */
  pluginId?: AppId;
  /** 匹配的触发词 */
  trigger?: string;
  /** 提取的参数 */
  extractedParams?: Record<string, any>;
}

/**
 * 插件执行上下文
 */
export interface PluginExecutionContext {
  /** 会话ID */
  sessionId: string;
  /** 用户ID */
  userId: string;
  /** 消息ID */
  messageId: string;
  /** 时间戳 */
  timestamp: string;
}