/**
 * ============================================================================
 * AGUI Event Parser Implementation - AGUI 标准事件解析器
 * ============================================================================
 * 
 * 核心功能:
 * - 解析 AGUI 标准事件格式
 * - 事件类型识别和验证
 * - Legacy 事件到 AGUI 事件的转换
 * - 类型安全的事件解析
 * 
 * 使用场景:
 * - SSE 流中的 AGUI 事件解析
 * - WebSocket 消息中的 AGUI 事件
 * - Legacy 事件格式转换
 * - 标准化事件处理管道
 * 
 * 基于现有的 AGUIEventProcessor.ts 逻辑重构
 */

import { BaseParser, ParseError, ParserOptions } from './Parser';
import { createLogger, LogCategory } from '../../utils/logger';

const log = createLogger('AGUIEventParser', LogCategory.API_REQUEST);

// ================================================================================
// AGUI Event Types - 基于现有 aguiTypes.ts
// ================================================================================

export type AGUIEventType = 
  | 'run_started'
  | 'run_finished'
  | 'run_error'
  | 'run_cancelled'
  | 'text_message_start'
  | 'text_message_content'
  | 'text_message_end'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'tool_executing'
  | 'llm_completed'
  | 'node_update'
  | 'state_update'
  | 'memory_update'
  | 'billing'
  | 'paused'
  | 'resume_start'
  | 'resume_end'
  | 'image_generation_start'
  | 'image_generation_content'
  | 'image_generation_end'
  | 'hil_interrupt_detected'
  | 'hil_approval_required'
  | 'hil_checkpoint_created'
  | 'task_progress_update'
  | 'artifact_created'
  | 'artifact_updated'
  | 'graph_update'
  | 'stream_done'
  | 'custom_event';

export interface BaseAGUIEvent {
  type: AGUIEventType;
  thread_id: string;
  timestamp: string;
  run_id?: string;
  message_id?: string;
  metadata?: Record<string, any>;
}

export interface RunStartedEvent extends BaseAGUIEvent {
  type: 'run_started';
  run_id: string;
  model?: string;
  instructions?: string;
}

export interface RunFinishedEvent extends BaseAGUIEvent {
  type: 'run_finished';
  run_id: string;
  result?: any;
  stats?: {
    duration_ms: number;
    token_count?: number;
    cost?: number;
  };
}

export interface RunErrorEvent extends BaseAGUIEvent {
  type: 'run_error';
  run_id: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface TextMessageStartEvent extends BaseAGUIEvent {
  type: 'text_message_start';
  message_id: string;
  role: 'assistant' | 'user' | 'system';
  content_type?: 'text' | 'markdown' | 'code';
}

export interface TextMessageContentEvent extends BaseAGUIEvent {
  type: 'text_message_content';
  message_id: string;
  delta: string;
  position?: number;
}

export interface TextMessageEndEvent extends BaseAGUIEvent {
  type: 'text_message_end';
  message_id: string;
  final_content?: string;
  token_count?: number;
}

export interface ToolCallStartEvent extends BaseAGUIEvent {
  type: 'tool_call_start';
  tool_call_id: string;
  tool_name: string;
  parameters?: Record<string, any>;
}

export interface ToolCallEndEvent extends BaseAGUIEvent {
  type: 'tool_call_end';
  tool_call_id: string;
  tool_name: string;
  result?: any;
  error?: string;
  duration_ms?: number;
}

// 新增后端事件类型
export interface ToolExecutingEvent extends BaseAGUIEvent {
  type: 'tool_executing';
  tool_name: string;
  tool_call_id?: string;
  status?: string;
  progress?: number;
}

export interface LLMCompletedEvent extends BaseAGUIEvent {
  type: 'llm_completed';
  model?: string;
  token_count?: number;
  finish_reason?: string;
}

export interface NodeUpdateEvent extends BaseAGUIEvent {
  type: 'node_update';
  node_name: string;
  status: 'started' | 'completed' | 'failed';
  credits?: number;
  messages_count?: number;
  data?: any;
}

export interface StateUpdateEvent extends BaseAGUIEvent {
  type: 'state_update';
  state_data: any;
  node?: string;
}

export interface MemoryUpdateEvent extends BaseAGUIEvent {
  type: 'memory_update';
  memory_data: any;
  operation: 'store' | 'retrieve' | 'update' | 'delete';
}

export interface BillingEvent extends BaseAGUIEvent {
  type: 'billing';
  credits_remaining: number;
  total_credits: number;
  model_calls: number;
  tool_calls: number;
  cost?: number;
}

export interface PausedEvent extends BaseAGUIEvent {
  type: 'paused';
  reason?: string;
  checkpoint_id?: string;
}

export interface ResumeStartEvent extends BaseAGUIEvent {
  type: 'resume_start';
  resumed_from?: string;
  checkpoint_id?: string;
}

export interface ResumeEndEvent extends BaseAGUIEvent {
  type: 'resume_end';
  success: boolean;
  result?: any;
}

export interface HILInterruptDetectedEvent extends BaseAGUIEvent {
  type: 'hil_interrupt_detected';
  interrupt: {
    id: string;
    title: string;
    description?: string;
    type: 'approval_required' | 'user_input_required' | 'checkpoint_reached';
    context?: any;
  };
}

export interface TaskProgressUpdateEvent extends BaseAGUIEvent {
  type: 'task_progress_update';
  task: {
    id: string;
    name: string;
    progress: number; // 0-100
    status: 'pending' | 'running' | 'completed' | 'failed';
    description?: string;
  };
}

export interface ArtifactCreatedEvent extends BaseAGUIEvent {
  type: 'artifact_created';
  artifact: {
    id: string;
    type: 'code' | 'text' | 'image' | 'document' | 'data';
    title: string;
    content?: string;
    url?: string;
    metadata?: Record<string, any>;
  };
}

export interface StreamDoneEvent extends BaseAGUIEvent {
  type: 'stream_done';
  reason?: 'completed' | 'cancelled' | 'error';
}

export type AGUIEvent = 
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallEndEvent
  | ToolExecutingEvent
  | LLMCompletedEvent
  | NodeUpdateEvent
  | StateUpdateEvent
  | MemoryUpdateEvent
  | BillingEvent
  | PausedEvent
  | ResumeStartEvent
  | ResumeEndEvent
  | HILInterruptDetectedEvent
  | TaskProgressUpdateEvent
  | ArtifactCreatedEvent
  | StreamDoneEvent
  | BaseAGUIEvent;

// ================================================================================
// Legacy Event Interface - 基于现有 SSEParser.ts
// ================================================================================

export interface LegacySSEEvent {
  type: string;
  content?: string;
  delta?: string;
  message_id?: string;
  tool_name?: string;
  tool_args?: any;
  error?: string | { message: string; code?: string };
  status?: string;
  progress?: number;
  task_id?: string;
  task_name?: string;
  hil_interrupt?: any;
  artifact?: any;
  custom_llm_chunk?: string;
  [key: string]: any;
}

// ================================================================================
// Parser Options
// ================================================================================

export interface AGUIEventParserOptions extends ParserOptions {
  /** 是否启用 legacy 事件转换 */
  enableLegacyConversion?: boolean;
  
  /** 是否验证事件结构 */
  validateEventStructure?: boolean;
  
  /** 是否自动生成缺失的字段 */
  autoFillMissingFields?: boolean;
  
  /** 自定义事件类型映射 */
  customEventTypeMapping?: Record<string, AGUIEventType>;
  
  /** 是否保留原始数据 */
  preserveRawData?: boolean;
}

// ================================================================================
// Legacy Normalization Maps
// ================================================================================

/**
 * Explicit mapping from legacy event type strings to AGUI standard event types.
 * This consolidates the scattered type-matching logic in convertLegacyToAGUI()
 * into a single searchable lookup table. Each key is a legacy `type` value sent
 * by the backend; each value is the canonical AGUIEventType it maps to.
 *
 * Note: some mappings are approximate (e.g. 'custom_event' -> 'custom_event')
 * because the actual conversion involves sub-type dispatch. The switch/case in
 * convertLegacyToAGUI() remains the authoritative conversion logic.
 */
const LEGACY_EVENT_MAP: Record<string, AGUIEventType> = {
  // Control events
  'start': 'run_started',
  'end': 'run_finished',
  'complete': 'run_finished',
  'error': 'run_error',
  // Message / content events
  'content': 'text_message_content',
  'message_stream': 'text_message_content',
  'message_event': 'text_message_content',
  'custom_stream': 'text_message_content',
  'token': 'text_message_content',
  // Tool events
  'tool_start': 'tool_call_start',
  'tool_calls': 'tool_call_start',
  'tool_executing': 'tool_executing',
  'tool_completed': 'tool_call_end',
  'tool_result_msg': 'tool_call_end',
  // LLM events
  'llm_completed': 'llm_completed',
  // State / system events
  'node_update': 'node_update',
  'state_update': 'state_update',
  'update_event': 'state_update',
  'graph_update': 'state_update',
  'interrupt': 'paused',
  'paused': 'paused',
  'custom_event': 'custom_event',
  // Business events
  'memory_update': 'memory_update',
  'billing': 'billing',
  'credits': 'billing',
  // Resume events
  'resume_start': 'resume_start',
  'resume_end': 'resume_end',
  // HIL / artifact / task events
  'hil_interrupt_detected': 'hil_interrupt_detected',
  'artifact_update': 'artifact_created',
  'task_progress': 'task_progress_update',
};

/**
 * Mapping from legacy field names (camelCase or inconsistent snake_case)
 * to their canonical AGUI field names. This serves as documentation and
 * can be used programmatically for field normalization.
 */
const LEGACY_FIELD_MAP: Record<string, string> = {
  'sessionId': 'thread_id',
  'session_id': 'thread_id',
  'conversationId': 'thread_id',
  'runId': 'run_id',
  'run_id': 'run_id',
  'messageId': 'message_id',
  'message_id': 'message_id',
  'content': 'delta',
  'tool_args': 'parameters',
  'creditsRemaining': 'credits_remaining',
  'totalCredits': 'total_credits',
  'modelCalls': 'model_calls',
  'toolCalls': 'tool_calls',
};

// ================================================================================
// AGUI Event Parser Implementation
// ================================================================================

export class AGUIEventParser extends BaseParser<string | LegacySSEEvent, AGUIEvent> {
  readonly name = 'agui_event';
  readonly version = '1.0.0';
  
  constructor(options: AGUIEventParserOptions = {}) {
    super(options);
  }
  
  canParse(data: string | LegacySSEEvent): boolean {
    try {
      let parsedData: any;
      
      if (typeof data === 'string') {
        // 尝试解析 JSON 字符串
        parsedData = JSON.parse(data);
      } else {
        parsedData = data;
      }
      
      // 检查是否包含基本的事件字段
      return !!(
        parsedData &&
        typeof parsedData === 'object' &&
        (parsedData.type || parsedData.event_type) &&
        (parsedData.thread_id || parsedData.sessionId || parsedData.conversationId)
      );
      
    } catch (error) {
      return false;
    }
  }
  
  parse(data: string | LegacySSEEvent): AGUIEvent | null {
    const options = this.options as AGUIEventParserOptions;
    
    try {
      let eventData: any;
      
      // 解析输入数据
      if (typeof data === 'string') {
        eventData = JSON.parse(data);
      } else {
        eventData = data;
      }
      
      // Parsing event data
      
      let aguiEvent: AGUIEvent;
      
      // 判断是否为 Legacy 事件格式
      if (this.isLegacyEvent(eventData)) {
        if (options.enableLegacyConversion) {
          aguiEvent = this.convertLegacyToAGUI(eventData);
        } else {
          throw new ParseError(
            'Legacy event format detected but conversion is disabled',
            'LEGACY_CONVERSION_DISABLED',
            this.name,
            { eventType: eventData.type }
          );
        }
      } else {
        aguiEvent = this.parseStandardAGUIEvent(eventData);
      }
      
      // 验证事件结构
      if (options.validateEventStructure && !this.validateEventStructure(aguiEvent)) {
        throw new ParseError(
          `Invalid AGUI event structure for type: ${aguiEvent.type}`,
          'INVALID_EVENT_STRUCTURE',
          this.name,
          { event: aguiEvent }
        );
      }
      
      // 自动填充缺失字段
      if (options.autoFillMissingFields) {
        aguiEvent = this.fillMissingFields(aguiEvent);
      }
      
      // 保留原始数据
      if (options.preserveRawData) {
        aguiEvent.metadata = {
          ...aguiEvent.metadata,
          _raw: eventData
        };
      }
      
      // Event parsed successfully
      
      return aguiEvent;
      
    } catch (error) {
      log.error('Parse error', error);
      
      if (error instanceof ParseError) {
        throw error;
      }
      
      throw new ParseError(
        `AGUI event parsing failed: ${error instanceof Error ? error.message : String(error)}`,
        'AGUI_PARSING_FAILED',
        this.name,
        { originalError: error, data: typeof data === 'string' ? data.substring(0, 200) : data }
      );
    }
  }
  
  /**
   * 判断是否为 Legacy 事件格式.
   * Detection uses LEGACY_EVENT_MAP (defined above the class) for type matching,
   * plus heuristics for missing thread_id or legacy field names.
   */
  private isLegacyEvent(eventData: any): boolean {
    if (!eventData?.type) return false;
    return eventData.type in LEGACY_EVENT_MAP ||
           !eventData.thread_id ||
           eventData.sessionId ||
           eventData.conversationId ||
           eventData.custom_llm_chunk !== undefined || // Legacy chunk content
           eventData.resumed !== undefined; // Resume marker
  }
  
  /**
   * 转换 Legacy 事件为 AGUI 标准事件
   * 基于现有 AGUIEventProcessor.ts 中的转换逻辑
   */
  private convertLegacyToAGUI(legacyEvent: LegacySSEEvent): AGUIEvent {
    const threadId = legacyEvent.thread_id || 
                     legacyEvent.sessionId || 
                     legacyEvent.conversationId || 
                     `thread_${Date.now()}`;
                     
    const timestamp = new Date().toISOString();
    const runId = legacyEvent.run_id || `run_${Date.now()}`;
    
    const baseEvent = {
      thread_id: threadId,
      timestamp,
      run_id: runId,
      metadata: {
        _converted_from_legacy: true,
        _original_type: legacyEvent.type
      }
    };
    
    switch (legacyEvent.type) {
      case 'start':
        return {
          ...baseEvent,
          type: 'run_started' as const,
          run_id: runId,
          message_id: legacyEvent.message_id || `msg_${Date.now()}`,
          model: legacyEvent.model,
          instructions: legacyEvent.instructions
        };
        
      case 'content':
        // content事件包含完整的AI响应 (推荐方法)
        return {
          ...baseEvent,
          type: 'text_message_content' as const,
          message_id: legacyEvent.message_id || `msg_${Date.now()}`,
          delta: legacyEvent.content || '',
          metadata: {
            ...baseEvent.metadata,
            is_complete_response: true,
            extraction_method: 'content_event',
            final_content: legacyEvent.content || ''
          }
        };
        
      case 'custom_event':
        // 处理custom_event的多种子类型
        return this.handleCustomEvent(legacyEvent, baseEvent);
        
      case 'message_stream':
        // 检查多种可能的token数据位置 - 适配后端实际数据结构
        const customLLMChunk = legacyEvent.custom_llm_chunk || 
                               legacyEvent.metadata?.raw_chunk?.custom_llm_chunk ||
                               legacyEvent.delta;
                               
        if (customLLMChunk) {
          return {
            ...baseEvent,
            type: 'text_message_content' as const,
            message_id: legacyEvent.message_id || `msg_${Date.now()}`,
            delta: customLLMChunk
          };
        } else {
          return {
            ...baseEvent,
            type: 'text_message_start' as const,
            message_id: legacyEvent.message_id || `msg_${Date.now()}`,
            role: 'assistant' as const,
            content_type: 'text' as const
          };
        }
        
      case 'custom_stream':
        return {
          ...baseEvent,
          type: 'text_message_content' as const,
          message_id: legacyEvent.message_id || `msg_${Date.now()}`,
          delta: legacyEvent.custom_llm_chunk || 
                 (legacyEvent.content && typeof legacyEvent.content === 'object' && (legacyEvent.content as any).custom_llm_chunk) ||
                 legacyEvent.content || 
                 legacyEvent.delta || 
                 ''
        };
        
      case 'complete':
      case 'end':
        return {
          ...baseEvent,
          type: 'run_finished' as const,
          run_id: runId,
          result: legacyEvent.result || legacyEvent.content
        };
        
      case 'error':
        return {
          ...baseEvent,
          type: 'run_error' as const,
          run_id: runId,
          error: {
            code: (typeof legacyEvent.error === 'object' && legacyEvent.error?.code) || 'UNKNOWN_ERROR',
            message: typeof legacyEvent.error === 'string' ? legacyEvent.error : 
                     (typeof legacyEvent.error === 'object' && legacyEvent.error?.message) || 'An error occurred',
            details: legacyEvent.error
          }
        };
        
      case 'task_progress':
        return {
          ...baseEvent,
          type: 'task_progress_update' as const,
          task: {
            id: legacyEvent.task_id || `task_${Date.now()}`,
            name: legacyEvent.task_name || 'Unknown Task',
            progress: legacyEvent.progress || 0,
            status: this.mapLegacyTaskStatus(legacyEvent.status),
            description: legacyEvent.description
          }
        };
        
      case 'hil_interrupt_detected':
        return {
          ...baseEvent,
          type: 'hil_interrupt_detected' as const,
          interrupt: {
            id: legacyEvent.hil_interrupt?.id || `interrupt_${Date.now()}`,
            title: legacyEvent.hil_interrupt?.title || 'User Intervention Required',
            description: legacyEvent.hil_interrupt?.description,
            type: legacyEvent.hil_interrupt?.type || 'approval_required' as const,
            context: legacyEvent.hil_interrupt?.context
          }
        };
        
      case 'artifact_update':
        return {
          ...baseEvent,
          type: 'artifact_created' as const,
          artifact: {
            id: legacyEvent.artifact?.id || `artifact_${Date.now()}`,
            type: legacyEvent.artifact?.type || 'text' as const,
            title: legacyEvent.artifact?.title || 'Untitled Artifact',
            content: legacyEvent.artifact?.content,
            url: legacyEvent.artifact?.url,
            metadata: legacyEvent.artifact?.metadata
          }
        };
        
      // 工具执行事件转换
      case 'tool_start':
        return {
          ...baseEvent,
          type: 'tool_call_start' as const,
          tool_call_id: legacyEvent.tool_call_id || `tool_${Date.now()}`,
          tool_name: legacyEvent.tool_name || 'unknown_tool',
          parameters: legacyEvent.tool_args || legacyEvent.parameters
        };
        
      case 'tool_executing':
        return {
          ...baseEvent,
          type: 'tool_executing' as const,
          tool_name: legacyEvent.tool_name || 'unknown_tool',
          tool_call_id: legacyEvent.tool_call_id,
          status: legacyEvent.status,
          progress: legacyEvent.progress
        };
        
      case 'tool_completed':
        return {
          ...baseEvent,
          type: 'tool_call_end' as const,
          tool_call_id: legacyEvent.tool_call_id || `tool_${Date.now()}`,
          tool_name: legacyEvent.tool_name || 'unknown_tool',
          result: legacyEvent.result,
          error: typeof legacyEvent.error === 'string' ? legacyEvent.error : 
                 (typeof legacyEvent.error === 'object' && legacyEvent.error?.message) || undefined,
          duration_ms: legacyEvent.duration_ms
        };
        
      // LLM相关事件
      case 'token':
        return {
          ...baseEvent,
          type: 'text_message_content' as const,
          message_id: legacyEvent.message_id || `msg_${Date.now()}`,
          delta: legacyEvent.content || legacyEvent.token || ''
        };
        
      case 'llm_completed':
        return {
          ...baseEvent,
          type: 'llm_completed' as const,
          model: legacyEvent.model,
          token_count: legacyEvent.token_count,
          finish_reason: legacyEvent.finish_reason
        };
        
      // 系统状态事件
      case 'node_update':
        return {
          ...baseEvent,
          type: 'node_update' as const,
          node_name: legacyEvent.node || 'unknown_node',
          status: this.mapNodeStatus(legacyEvent.status),
          credits: legacyEvent.credits,
          messages_count: legacyEvent.messages_count,
          data: legacyEvent.data
        };
        
      case 'state_update':
      case 'update_event':
        return {
          ...baseEvent,
          type: 'state_update' as const,
          state_data: legacyEvent.state || legacyEvent.data || legacyEvent,
          node: legacyEvent.node
        };
        
      case 'interrupt':
        return {
          ...baseEvent,
          type: 'paused' as const,
          reason: legacyEvent.reason,
          checkpoint_id: legacyEvent.checkpoint_id
        };
        
      case 'paused':
        return {
          ...baseEvent,
          type: 'paused' as const,
          reason: legacyEvent.reason,
          checkpoint_id: legacyEvent.checkpoint_id
        };
        
      // 业务功能事件
      case 'memory_update':
        return {
          ...baseEvent,
          type: 'memory_update' as const,
          memory_data: legacyEvent.memory || legacyEvent.data,
          operation: legacyEvent.operation || 'update'
        };
        
      case 'billing':
      case 'credits':
        return {
          ...baseEvent,
          type: 'billing' as const,
          credits_remaining: legacyEvent.creditsRemaining || legacyEvent.credits_remaining || legacyEvent.data?.credits_remaining,
          total_credits: legacyEvent.totalCredits || legacyEvent.total_credits || legacyEvent.data?.total_credits,
          model_calls: legacyEvent.modelCalls || legacyEvent.model_calls || legacyEvent.data?.model_calls || 0,
          tool_calls: legacyEvent.toolCalls || legacyEvent.tool_calls || legacyEvent.data?.tool_calls || 0,
          cost: legacyEvent.cost || legacyEvent.data?.cost
        };
        
      // Resume事件
      case 'resume_start':
        return {
          ...baseEvent,
          type: 'resume_start' as const,
          resumed_from: legacyEvent.resumed_from,
          checkpoint_id: legacyEvent.checkpoint_id
        };
        
      case 'resume_end':
        return {
          ...baseEvent,
          type: 'resume_end' as const,
          success: legacyEvent.success !== false,
          result: legacyEvent.result
        };
        
      case 'graph_update':
        return {
          ...baseEvent,
          type: 'state_update' as const,
          state_data: legacyEvent.graph || legacyEvent.data,
          node: legacyEvent.node
        };
        
      // 真实API事件类型 - 基于实际测试
      case 'tool_calls':
        // 从metadata中提取工具调用信息
        const toolCalls = legacyEvent.metadata?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          // 返回第一个工具调用（通常一次处理一个）
          const firstCall = toolCalls[0];
          return {
            ...baseEvent,
            type: 'tool_call_start' as const,
            tool_call_id: firstCall.id || `tool_${Date.now()}`,
            tool_name: firstCall.name || 'unknown_tool',
            parameters: firstCall.args || {}
          };
        }
        return {
          ...baseEvent,
          type: 'custom_event' as const,
          metadata: { ...baseEvent.metadata, tool_calls_info: legacyEvent.content }
        } as BaseAGUIEvent;
        
      case 'tool_result_msg':
        // 从content中解析工具结果
        const toolResult = this.extractToolResultFromContent(legacyEvent.content || '');
        if (toolResult) {
          return {
            ...baseEvent,
            type: 'tool_call_end' as const,
            tool_call_id: `tool_${Date.now()}`,
            tool_name: toolResult.action || 'unknown_tool',
            result: toolResult.data,
            error: toolResult.status === 'success' ? undefined : toolResult.error
          };
        }
        return {
          ...baseEvent,
          type: 'custom_event' as const,
          metadata: { ...baseEvent.metadata, tool_result_raw: legacyEvent.content }
        } as BaseAGUIEvent;
        
      case 'node_update':
        // 从content中解析节点信息
        const nodeInfo = this.extractNodeInfoFromContent(legacyEvent.content || '');
        return {
          ...baseEvent,
          type: 'node_update' as const,
          node_name: nodeInfo?.node_name || 'unknown_node',
          status: (nodeInfo?.status === 'active' ? 'started' : nodeInfo?.status || 'started') as 'started' | 'completed' | 'failed',
          credits: nodeInfo?.credits || 0,
          messages_count: nodeInfo?.messages || 0,
          data: legacyEvent.metadata || {}
        };
        
      default:
        // 未知类型作为自定义事件
        return {
          ...baseEvent,
          type: 'custom_event' as const,
          metadata: {
            ...baseEvent.metadata,
            custom_type: legacyEvent.type,
            custom_data: legacyEvent,
            // 检测Resume标记
            resumed: legacyEvent.resumed === true
          }
        } as BaseAGUIEvent;
    }
  }
  
  /**
   * 解析标准 AGUI 事件
   */
  private parseStandardAGUIEvent(eventData: any): AGUIEvent {
    const options = this.options as AGUIEventParserOptions;
    
    // 应用自定义类型映射
    let eventType = eventData.type;
    if (options.customEventTypeMapping && options.customEventTypeMapping[eventType]) {
      eventType = options.customEventTypeMapping[eventType];
    }
    
    const baseEvent = {
      type: eventType,
      thread_id: eventData.thread_id,
      timestamp: eventData.timestamp || new Date().toISOString(),
      run_id: eventData.run_id,
      message_id: eventData.message_id,
      metadata: eventData.metadata || {}
    };
    
    // 根据事件类型添加特定字段
    switch (eventType as AGUIEventType) {
      case 'run_started':
        return {
          ...baseEvent,
          type: 'run_started' as const,
          run_id: eventData.run_id || `run_${Date.now()}`,
          model: eventData.model,
          instructions: eventData.instructions
        };
        
      case 'text_message_content':
        return {
          ...baseEvent,
          type: 'text_message_content' as const,
          message_id: eventData.message_id || `msg_${Date.now()}`,
          delta: eventData.delta || eventData.content || '',
          position: eventData.position
        };
        
      case 'tool_call_start':
        return {
          ...baseEvent,
          type: 'tool_call_start' as const,
          tool_call_id: eventData.tool_call_id || `tool_${Date.now()}`,
          tool_name: eventData.tool_name,
          parameters: eventData.parameters
        };
        
      case 'hil_interrupt_detected':
        return {
          ...baseEvent,
          type: 'hil_interrupt_detected' as const,
          interrupt: eventData.interrupt || {
            id: `interrupt_${Date.now()}`,
            title: 'Interrupt Detected',
            type: 'approval_required' as const
          }
        };
        
      case 'stream_done':
        return {
          ...baseEvent,
          type: 'stream_done' as const,
          reason: eventData.reason || 'completed'
        };
        
      default:
        // 返回基础事件类型
        return baseEvent as AGUIEvent;
    }
  }
  
  /**
   * 验证事件结构
   */
  private validateEventStructure(event: AGUIEvent): boolean {
    // 基本字段验证
    if (!event.type || !event.thread_id || !event.timestamp) {
      return false;
    }
    
    // 类型特定验证
    switch (event.type) {
      case 'text_message_content':
        const contentEvent = event as TextMessageContentEvent;
        return !!(contentEvent.message_id && contentEvent.delta !== undefined);
        
      case 'tool_call_start':
        const toolEvent = event as ToolCallStartEvent;
        return !!(toolEvent.tool_call_id && toolEvent.tool_name);
        
      case 'hil_interrupt_detected':
        const interruptEvent = event as HILInterruptDetectedEvent;
        return !!(interruptEvent.interrupt && interruptEvent.interrupt.id);
        
      default:
        return true; // 其他类型的基础验证已通过
    }
  }
  
  /**
   * 填充缺失字段
   */
  private fillMissingFields(event: AGUIEvent): AGUIEvent {
    const filledEvent = { ...event };
    
    // 确保有时间戳
    if (!filledEvent.timestamp) {
      filledEvent.timestamp = new Date().toISOString();
    }
    
    // 确保有 run_id（如果需要）
    if (this.requiresRunId(event.type) && !filledEvent.run_id) {
      filledEvent.run_id = `run_${Date.now()}`;
    }
    
    // 确保有 message_id（对于消息相关事件）
    if (this.requiresMessageId(event.type) && !filledEvent.message_id) {
      filledEvent.message_id = `msg_${Date.now()}`;
    }
    
    // 确保有 metadata
    if (!filledEvent.metadata) {
      filledEvent.metadata = {};
    }
    
    return filledEvent;
  }
  
  /**
   * 映射 Legacy 任务状态
   */
  private mapLegacyTaskStatus(legacyStatus?: string): 'pending' | 'running' | 'completed' | 'failed' {
    switch (legacyStatus?.toLowerCase()) {
      case 'running':
      case 'active':
        return 'running';
      case 'completed':
      case 'done':
      case 'finished':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'pending';
    }
  }
  
  /**
   * 映射节点状态
   */
  private mapNodeStatus(legacyStatus?: string): 'started' | 'completed' | 'failed' {
    switch (legacyStatus?.toLowerCase()) {
      case 'completed':
      case 'done':
      case 'finished':
      case 'success':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      case 'started':
      case 'running':
      case 'active':
      default:
        return 'started';
    }
  }
  
  /**
   * 检查事件类型是否需要 run_id
   */
  private requiresRunId(eventType: AGUIEventType): boolean {
    return [
      'run_started', 'run_finished', 'run_error', 'run_cancelled'
    ].includes(eventType);
  }
  
  /**
   * 检查事件类型是否需要 message_id
   */
  private requiresMessageId(eventType: AGUIEventType): boolean {
    return [
      'text_message_start', 'text_message_content', 'text_message_end'
    ].includes(eventType);
  }
  
  /**
   * 处理custom_event的复杂子类型
   * 基于真实测试数据的8种子类型
   */
  private handleCustomEvent(legacyEvent: LegacySSEEvent, baseEvent: any): AGUIEvent {
    const content = legacyEvent.content || '';
    const metadata = legacyEvent.metadata || {};
    
    // 子类型1: LLM Token流 - 最频繁
    const customLLMChunk = metadata.raw_chunk?.custom_llm_chunk;
    if (customLLMChunk || content.includes("'custom_llm_chunk':")) {
      const chunk = customLLMChunk || this.extractLLMChunk(content);
      return {
        ...baseEvent,
        type: 'text_message_content' as const,
        message_id: legacyEvent.message_id || `msg_${Date.now()}`,
        delta: chunk || '',
        metadata: {
          ...baseEvent.metadata,
          extraction_method: 'custom_event_llm_chunk'
        }
      };
    }
    
    // 子类型2: 工具执行进度
    if (content.includes("'type': 'progress'") || content.includes('Starting execution') || content.includes('Completed -')) {
      const progressInfo = this.extractProgressInfo(content);
      return {
        ...baseEvent,
        type: 'tool_executing' as const,
        tool_name: progressInfo?.tool_name || 'unknown_tool',
        status: progressInfo?.status || 'running',
        progress: progressInfo?.progress || 0,
        metadata: {
          ...baseEvent.metadata,
          progress_info: progressInfo
        }
      };
    }
    
    // 子类型3: 任务规划状态
    if (content.includes('Task Planning:') || content.includes('📋 Task Planning') || metadata.task_planning) {
      return {
        ...baseEvent,
        type: 'task_progress_update' as const,
        task: {
          id: `task_${Date.now()}`,
          name: 'Task Planning',
          progress: 50,
          status: 'running' as const,
          description: content.substring(0, 100)
        }
      };
    }
    
    // 默认返回自定义事件
    return {
      ...baseEvent,
      type: 'custom_event' as const,
      metadata: {
        ...baseEvent.metadata,
        custom_content: content,
        custom_metadata: metadata
      }
    } as BaseAGUIEvent;
  }
  
  /**
   * 从content字符串中提取LLM chunk
   */
  private extractLLMChunk(content: string): string | null {
    const chunkMatch = content.match(/'custom_llm_chunk':\s*'([^']*)'/) || 
                       content.match(/"custom_llm_chunk":\s*"([^"]*)"/);
    return chunkMatch ? chunkMatch[1] : null;
  }
  
  /**
   * 提取进度信息
   */
  private extractProgressInfo(content: string): {
    tool_name: string;
    status: string;
    progress: number;
  } | null {
    // 匹配: [tool_name] Starting execution (1/2)
    const startMatch = content.match(/\[([^\]]+)\] Starting execution \((\d+\/\d+)\)/);
    if (startMatch) {
      return {
        tool_name: startMatch[1],
        status: 'starting',
        progress: 0
      };
    }
    
    // 匹配: [tool_name] Completed - 1234 chars result
    const completeMatch = content.match(/\[([^\]]+)\] Completed - (\d+) chars result/);
    if (completeMatch) {
      return {
        tool_name: completeMatch[1],
        status: 'completed',
        progress: 100
      };
    }
    
    return null;
  }
  
  /**
   * 从content字符串中提取工具结果
   */
  private extractToolResultFromContent(content: string): any | null {
    // 匹配: 🔧 ToolMessage: {"status": "success", ...}
    const toolMessageMatch = content.match(/🔧 ToolMessage: ({[\s\S]*})/);
    if (toolMessageMatch) {
      try {
        return JSON.parse(toolMessageMatch[1]);
      } catch (e) {
        log.warn('Failed to parse tool result JSON', e);
      }
    }
    return null;
  }
  
  /**
   * 从content字符串中提取节点信息
   */
  private extractNodeInfoFromContent(content: string): {
    node_name: string;
    status: string;
    credits: number;
    messages: number;
  } | null {
    // 匹配: 📊 reason_model: Credits: N/A, Messages: 1
    const nodeMatch = content.match(/📊 ([^:]+): Credits: ([^,]+), Messages: (\d+)/);
    if (nodeMatch) {
      return {
        node_name: nodeMatch[1].trim(),
        status: 'active',
        credits: nodeMatch[2].trim() === 'N/A' ? 0 : parseInt(nodeMatch[2]),
        messages: parseInt(nodeMatch[3])
      };
    }
    return null;
  }
  
  validate(data: AGUIEvent): boolean {
    try {
      return this.validateEventStructure(data);
    } catch (error) {
      log.error('Validation error', error);
      return false;
    }
  }
}

/**
 * 工厂函数：创建 AGUI 事件解析器
 */
export const createAGUIEventParser = (options: AGUIEventParserOptions = {}): AGUIEventParser => {
  return new AGUIEventParser(options);
};

/**
 * 预定义的解析器配置
 */
export const StandardAGUIParserConfig: AGUIEventParserOptions = {
  enableLegacyConversion: true,
  validateEventStructure: true,
  autoFillMissingFields: true,
  preserveRawData: false
};

export const LegacyCompatibleConfig: AGUIEventParserOptions = {
  enableLegacyConversion: true,
  validateEventStructure: false,
  autoFillMissingFields: true,
  preserveRawData: true
};

export const StrictModeConfig: AGUIEventParserOptions = {
  enableLegacyConversion: false,
  validateEventStructure: true,
  autoFillMissingFields: false,
  preserveRawData: false
};