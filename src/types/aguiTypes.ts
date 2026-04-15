/**
 * ============================================================================
 * AGUI Protocol Types - AI事件标准化接口
 * ============================================================================
 * 
 * 【设计理念】
 * - 基于AGUI协议标准化AI-to-UI通信
 * - 保持向后兼容性，渐进式升级
 * - 支持双向交互（Agent→UI，UI→Agent）
 * - 传输层无关（SSE、WebSocket、HTTP等）
 * 
 * 【核心优势】
 * ✅ 标准化事件命名和结构
 * ✅ 更清晰的事件生命周期管理
 * ✅ 更好的工具链和库支持
 * ✅ 跨平台兼容性
 * 
 * 【AGUI事件分类】
 * - Lifecycle Events: 运行生命周期
 * - Text Message Events: 文本消息流
 * - Tool Call Events: 工具调用
 * - UI Interaction Events: 用户界面交互
 * - HIL Events: Human-in-the-Loop扩展
 */

// ================================================================================
// AGUI Core Types - 核心类型定义
// ================================================================================

// 🆕 HIL (Human-in-the-Loop) 数据结构类型
export interface HILInterruptData {
  id: string;
  type: 'approval' | 'review_edit' | 'input_validation' | 'tool_authorization';
  timestamp: string;
  thread_id: string;
  title: string;
  message: string;
  data: any;
  required_fields?: string[];
  validation_rules?: any;
  tool_name?: string;
  tool_args?: any;
  reason?: string;
}

export interface HILCheckpointData {
  checkpoint_id: string;
  thread_id: string;
  node: string;
  timestamp: string;
  state_summary: string;
  can_rollback: boolean;
}

export interface HILExecutionStatusData {
  thread_id: string;
  status: 'ready' | 'running' | 'interrupted' | 'completed' | 'error';
  current_node: string;
  interrupts: HILInterruptData[];
  checkpoints: number;
  durable: boolean;
  last_checkpoint?: string;
}

export type AGUIEventType = 
  // Lifecycle Events
  | 'run_started'
  | 'run_finished' 
  | 'run_error'
  | 'run_paused'
  | 'run_resumed'
  | 'run_cancelled'
  
  // Text Message Events  
  | 'text_message_start'
  | 'text_message_content'
  | 'text_message_end'
  
  // Tool Call Events
  | 'tool_call_start'
  | 'tool_call_args'
  | 'tool_call_result'
  | 'tool_call_end'
  | 'tool_call_error'
  
  // UI Interaction Events
  | 'user_input_required'
  | 'user_feedback'
  | 'ui_state_change'
  
  // Thinking Events (Extended Thinking / Chain-of-Thought)
  | 'thinking_start'
  | 'thinking_content'
  | 'thinking_end'

  // 🆕 HIL Events (Human-in-the-Loop Extension)
  | 'hil_interrupt_detected'
  | 'hil_approval_required'
  | 'hil_review_required'
  | 'hil_input_required'
  | 'hil_checkpoint_created'
  | 'hil_execution_resumed';

export interface AGUIBaseEvent {
  type: AGUIEventType;
  timestamp: string;
  thread_id: string;
  run_id?: string;
  message_id?: string;
}

// ================================================================================
// Lifecycle Events - 生命周期事件
// ================================================================================

export interface RunStartedEvent extends AGUIBaseEvent {
  type: 'run_started';
  agent_info?: {
    name: string;
    version: string;
    capabilities: string[];
  };
  session_info?: {
    user_id: string;
    session_id: string;
  };
}

export interface RunFinishedEvent extends AGUIBaseEvent {
  type: 'run_finished';
  result?: {
    status: 'success' | 'partial' | 'cancelled';
    output?: any;
    metrics?: {
      duration_ms: number;
      tokens_used?: number;
      tools_called?: number;
    };
  };
}

export interface RunErrorEvent extends AGUIBaseEvent {
  type: 'run_error';
  error: {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
  };
}

export interface RunPausedEvent extends AGUIBaseEvent {
  type: 'run_paused';
  reason: 'user_request' | 'system_pause' | 'error' | 'hil_interrupt';
  can_resume: boolean;
}

export interface RunResumedEvent extends AGUIBaseEvent {
  type: 'run_resumed';
  resumed_from: string; // checkpoint_id or state_id
}

export interface RunCancelledEvent extends AGUIBaseEvent {
  type: 'run_cancelled';
  reason: 'user_request' | 'timeout' | 'system_shutdown';
}

// ================================================================================
// Text Message Events - 文本消息事件
// ================================================================================

export interface TextMessageStartEvent extends AGUIBaseEvent {
  type: 'text_message_start';
  message_id: string;
  role: 'assistant' | 'user' | 'system';
  estimated_length?: number;
}

export interface TextMessageContentEvent extends AGUIBaseEvent {
  type: 'text_message_content';
  message_id: string;
  delta: string; // 增量内容
  position?: number; // 在完整消息中的位置
}

export interface TextMessageEndEvent extends AGUIBaseEvent {
  type: 'text_message_end';
  message_id: string;
  final_content: string;
  metadata?: {
    word_count: number;
    language?: string;
    sentiment?: string;
  };
}

// ================================================================================
// Thinking Events - Extended Thinking / Chain-of-Thought
// ================================================================================

export interface ThinkingStartEvent extends AGUIBaseEvent {
  type: 'thinking_start';
  message_id: string;
}

export interface ThinkingContentEvent extends AGUIBaseEvent {
  type: 'thinking_content';
  message_id: string;
  delta: string;
}

export interface ThinkingEndEvent extends AGUIBaseEvent {
  type: 'thinking_end';
  message_id: string;
  final_thinking?: string;
}

// ================================================================================
// Tool Call Events - 工具调用事件
// ================================================================================

export interface ToolCallStartEvent extends AGUIBaseEvent {
  type: 'tool_call_start';
  tool_call_id: string;
  tool_name: string;
  parent_message_id?: string;
  description?: string;
}

export interface ToolCallArgsEvent extends AGUIBaseEvent {
  type: 'tool_call_args';
  tool_call_id: string;
  args_delta?: string; // 增量参数 (JSON string)
  final_args?: object; // 最终参数对象
}

export interface ToolCallResultEvent extends AGUIBaseEvent {
  type: 'tool_call_result';
  tool_call_id: string;
  result: {
    status: 'success' | 'error' | 'timeout';
    data?: any;
    error?: string;
  };
  execution_time_ms?: number;
}

export interface ToolCallEndEvent extends AGUIBaseEvent {
  type: 'tool_call_end';
  tool_call_id: string;
  final_status: 'completed' | 'failed' | 'cancelled';
}

export interface ToolCallErrorEvent extends AGUIBaseEvent {
  type: 'tool_call_error';
  tool_call_id: string;
  error: {
    code: string;
    message: string;
    retry_possible: boolean;
  };
}

// ================================================================================
// UI Interaction Events - UI交互事件
// ================================================================================

export interface UserInputRequiredEvent extends AGUIBaseEvent {
  type: 'user_input_required';
  input_request: {
    prompt: string;
    input_type: 'text' | 'choice' | 'file' | 'confirmation';
    options?: string[]; // for choice type
    validation?: {
      required: boolean;
      pattern?: string;
      min_length?: number;
      max_length?: number;
    };
  };
  timeout_ms?: number;
}

export interface UserFeedbackEvent extends AGUIBaseEvent {
  type: 'user_feedback';
  feedback: {
    type: 'rating' | 'comment' | 'correction' | 'cancellation';
    value: any;
    target_message_id?: string;
  };
}

export interface UIStateChangeEvent extends AGUIBaseEvent {
  type: 'ui_state_change';
  state_change: {
    component: string;
    property: string;
    old_value: any;
    new_value: any;
  };
}

// ================================================================================
// 🆕 HIL Events - Human-in-the-Loop 扩展事件
// ================================================================================

export interface HILInterruptDetectedEvent extends AGUIBaseEvent {
  type: 'hil_interrupt_detected';
  interrupt: {
    id: string;
    interrupt_type: 'approval' | 'review_edit' | 'input_validation' | 'tool_authorization';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    data: any;
    timeout_ms?: number;
  };
}

export interface HILApprovalRequiredEvent extends AGUIBaseEvent {
  type: 'hil_approval_required';
  approval_request: {
    id: string;
    title: string;
    description: string;
    action_preview: string;
    risk_level: 'low' | 'medium' | 'high';
    auto_approve_after_ms?: number;
  };
}

export interface HILReviewRequiredEvent extends AGUIBaseEvent {
  type: 'hil_review_required';
  review_request: {
    id: string;
    content_type: 'text' | 'code' | 'data' | 'image' | 'document';
    content: any;
    required_fields: string[];
    guidelines?: string;
    deadline_ms?: number;
  };
}

export interface HILInputRequiredEvent extends AGUIBaseEvent {
  type: 'hil_input_required';
  input_request: {
    id: string;
    question: string;
    input_type: 'text' | 'number' | 'date' | 'choice' | 'file';
    validation_rules?: any;
    default_value?: any;
    options?: any[];
  };
}

export interface HILCheckpointCreatedEvent extends AGUIBaseEvent {
  type: 'hil_checkpoint_created';
  checkpoint: {
    id: string;
    node: string;
    state_summary: string;
    can_rollback: boolean;
    rollback_friendly_name?: string;
  };
}

export interface HILExecutionResumedEvent extends AGUIBaseEvent {
  type: 'hil_execution_resumed';
  resume_info: {
    action_taken: 'continue' | 'skip' | 'modify' | 'rollback';
    human_input?: any;
    modifications?: any;
    rollback_checkpoint?: string;
  };
}

// ================================================================================
// Union Types and Utilities
// ================================================================================

export type AGUIEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | RunPausedEvent
  | RunResumedEvent
  | RunCancelledEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ThinkingStartEvent
  | ThinkingContentEvent
  | ThinkingEndEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallResultEvent
  | ToolCallEndEvent
  | ToolCallErrorEvent
  | UserInputRequiredEvent
  | UserFeedbackEvent
  | UIStateChangeEvent
  | HILInterruptDetectedEvent
  | HILApprovalRequiredEvent
  | HILReviewRequiredEvent
  | HILInputRequiredEvent
  | HILCheckpointCreatedEvent
  | HILExecutionResumedEvent;

// AGUI事件回调接口
export interface AGUIEventCallbacks {
  // Lifecycle callbacks
  onRunStarted?: (event: RunStartedEvent) => void;
  onRunFinished?: (event: RunFinishedEvent) => void;
  onRunError?: (event: RunErrorEvent) => void;
  onRunPaused?: (event: RunPausedEvent) => void;
  onRunResumed?: (event: RunResumedEvent) => void;
  onRunCancelled?: (event: RunCancelledEvent) => void;
  
  // Text message callbacks
  onTextMessageStart?: (event: TextMessageStartEvent) => void;
  onTextMessageContent?: (event: TextMessageContentEvent) => void;
  onTextMessageEnd?: (event: TextMessageEndEvent) => void;
  
  // Thinking callbacks
  onThinkingStart?: (event: ThinkingStartEvent) => void;
  onThinkingContent?: (event: ThinkingContentEvent) => void;
  onThinkingEnd?: (event: ThinkingEndEvent) => void;

  // Tool call callbacks
  onToolCallStart?: (event: ToolCallStartEvent) => void;
  onToolCallArgs?: (event: ToolCallArgsEvent) => void;
  onToolCallResult?: (event: ToolCallResultEvent) => void;
  onToolCallEnd?: (event: ToolCallEndEvent) => void;
  onToolCallError?: (event: ToolCallErrorEvent) => void;
  
  // UI interaction callbacks
  onUserInputRequired?: (event: UserInputRequiredEvent) => void;
  onUserFeedback?: (event: UserFeedbackEvent) => void;
  onUIStateChange?: (event: UIStateChangeEvent) => void;
  
  // 🆕 HIL callbacks
  onHILInterruptDetected?: (event: HILInterruptDetectedEvent) => void;
  onHILApprovalRequired?: (event: HILApprovalRequiredEvent) => void;
  onHILReviewRequired?: (event: HILReviewRequiredEvent) => void;
  onHILInputRequired?: (event: HILInputRequiredEvent) => void;
  onHILCheckpointCreated?: (event: HILCheckpointCreatedEvent) => void;
  onHILExecutionResumed?: (event: HILExecutionResumedEvent) => void;
}

// ================================================================================
// AGUI Event Builder - 事件构建工具
// ================================================================================

export class AGUIEventBuilder {
  protected baseEvent: Partial<AGUIBaseEvent>;

  constructor(threadId: string, runId?: string) {
    this.baseEvent = {
      thread_id: threadId,
      run_id: runId,
      timestamp: new Date().toISOString()
    };
  }

  getBaseEvent(): Partial<AGUIBaseEvent> {
    return this.baseEvent;
  }

  // Lifecycle event builders
  runStarted(agentInfo?: any, sessionInfo?: any): RunStartedEvent {
    return {
      ...this.baseEvent,
      type: 'run_started',
      agent_info: agentInfo,
      session_info: sessionInfo
    } as RunStartedEvent;
  }

  runFinished(result?: any): RunFinishedEvent {
    return {
      ...this.baseEvent,
      type: 'run_finished',
      result
    } as RunFinishedEvent;
  }

  textMessageStart(messageId: string, role: 'assistant' | 'user' | 'system'): TextMessageStartEvent {
    return {
      ...this.baseEvent,
      type: 'text_message_start',
      message_id: messageId,
      role
    } as TextMessageStartEvent;
  }

  textMessageContent(messageId: string, delta: string): TextMessageContentEvent {
    return {
      ...this.baseEvent,
      type: 'text_message_content',
      message_id: messageId,
      delta
    } as TextMessageContentEvent;
  }

  // 🆕 HIL event builders
  hilInterruptDetected(interrupt: any): HILInterruptDetectedEvent {
    return {
      ...this.baseEvent,
      type: 'hil_interrupt_detected',
      interrupt
    } as HILInterruptDetectedEvent;
  }

  hilApprovalRequired(approvalRequest: any): HILApprovalRequiredEvent {
    return {
      ...this.baseEvent,
      type: 'hil_approval_required',
      approval_request: approvalRequest
    } as HILApprovalRequiredEvent;
  }
}

// ================================================================================
// Legacy Compatibility - 向后兼容支持
// ================================================================================

/**
 * 将legacy SSE事件转换为AGUI标准事件
 */
export function convertLegacyToAGUI(legacyEvent: any, threadId: string): AGUIEvent | null {
  const builder = new AGUIEventBuilder(threadId);
  
  switch (legacyEvent.type) {
    case 'start':
      return builder.runStarted();
      
    case 'custom_event':
      if (legacyEvent.metadata?.raw_chunk?.response_batch) {
        const messageId = `streaming-${Date.now()}`;
        return builder.textMessageContent(messageId, legacyEvent.metadata.raw_chunk.response_batch.tokens);
      }
      break;
      
    case 'end':
      return builder.runFinished();
      
    case 'error':
      return {
        ...builder.getBaseEvent(),
        type: 'run_error',
        error: {
          code: 'legacy_error',
          message: legacyEvent.content || 'Unknown error',
          recoverable: false
        }
      } as RunErrorEvent;
      
    default:
      return null;
  }
  
  return null;
}

// ================================================================================
// AGUI 标准转换工具 - 减少代码重复
// ================================================================================

export class AGUIConverter {
  /**
   * 转换 HILInterruptDetectedEvent 到 HILInterruptData (业务层)
   */
  static toHILInterruptData(event: HILInterruptDetectedEvent): HILInterruptData {
    return {
      id: event.interrupt.id,
      type: event.interrupt.interrupt_type,
      timestamp: event.timestamp,
      thread_id: event.thread_id,
      title: event.interrupt.title,
      message: event.interrupt.message,
      data: event.interrupt.data
    };
  }

  /**
   * 转换 HILCheckpointCreatedEvent 到 HILCheckpointData (业务层)
   */
  static toHILCheckpointData(event: HILCheckpointCreatedEvent): HILCheckpointData {
    return {
      checkpoint_id: event.checkpoint.id,
      node: event.checkpoint.node,
      timestamp: event.timestamp,
      thread_id: event.thread_id,
      state_summary: event.checkpoint.state_summary,
      can_rollback: event.checkpoint.can_rollback
    };
  }

  /**
   * 转换 ExecutionStatus 到 HILExecutionStatusData (AGUI标准)
   */
  static toHILExecutionStatusData(status: any, threadId: string): HILExecutionStatusData {
    return {
      thread_id: status.thread_id || threadId,
      status: status.status,
      current_node: status.current_node || '',
      interrupts: status.interrupts.map((interrupt: any) => ({
        id: interrupt.id,
        type: interrupt.type,
        timestamp: interrupt.timestamp,
        thread_id: status.thread_id || threadId,
        title: `HIL ${interrupt.type.replace('_', ' ')}`,
        message: interrupt.reason || 'Human intervention required',
        data: interrupt.data
      })),
      checkpoints: status.checkpoints || 0,
      durable: status.durable || false
    };
  }
}

export default AGUIEvent;