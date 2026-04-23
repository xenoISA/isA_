/**
 * ============================================================================
 * Chat Service - 聊天服务
 * ============================================================================
 * 
 * 简化的3层架构:
 * 1. Transport Layer: SSETransport - 处理 SSE 连接和原始数据
 * 2. Parser Layer: AGUIEventParser - 解析事件为标准格式
 * 3. Callback Layer: 直接调用回调函数
 * 
 * 核心特性:
 * - 清晰的职责分离
 * - 高性能事件处理
 * - 完善的错误处理和连接管理
 * - 类型安全的消息处理
 */

import { createSSETransport } from './transport/SSETransport';
import { createAGUIEventParser } from './parsing/AGUIEventParser';
import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { createLogger, LogCategory } from '../utils/logger';
import { adaptMateEvent, createMateStreamContext, buildMateRequest } from './adapters/MateEventAdapter';
import type { MateSSEEvent } from './adapters/MateEventAdapter';
import { getStorageService } from './storageService';

const log = createLogger('ChatService', LogCategory.CHAT_FLOW);

// 定义标准的回调接口 - 扩展支持所有事件类型
export interface ChatServiceCallbacks {
  // 基础流程回调
  onStreamStart?: (messageId: string, status?: string) => void;
  onStreamContent?: (contentChunk: string) => void;
  onStreamStatus?: (status: string) => void;
  onStreamComplete?: (finalContent?: string) => void;
  onError?: (error: Error) => void;
  
  // 工具执行回调
  onToolStart?: (toolName: string, toolCallId?: string, parameters?: any) => void;
  onToolExecuting?: (toolName: string, status?: string, progress?: number) => void;
  onToolCompleted?: (toolName: string, result?: any, error?: string, durationMs?: number) => void;
  
  // LLM相关回调
  onLLMCompleted?: (model?: string, tokenCount?: number, finishReason?: string) => void;
  
  // 系统状态回调
  onNodeUpdate?: (nodeName: string, status: 'started' | 'completed' | 'failed', data?: any) => void;
  onStateUpdate?: (stateData: any, node?: string) => void;
  onPaused?: (reason?: string, checkpointId?: string) => void;
  
  // 业务功能回调
  onMemoryUpdate?: (memoryData: any, operation: string) => void;
  onBillingUpdate?: (billingData: { creditsRemaining: number; totalCredits: number; modelCalls: number; toolCalls: number; cost?: number }) => void;
  
  // Resume相关回调
  onResumeStart?: (resumedFrom?: string, checkpointId?: string) => void;
  onResumeEnd?: (success: boolean, result?: any) => void;
  
  // 任务管理回调
  onTaskProgress?: (progress: any) => void;
  onTaskListUpdate?: (tasks: any[]) => void;
  onTaskStatusUpdate?: (taskId: string, status: string, result?: any) => void;
  
  // HIL回调
  onHILInterruptDetected?: (hilEvent: any) => void;
  onHILCheckpointCreated?: (checkpoint: any) => void;
  onHILExecutionStatusChanged?: (statusData: any) => void;

  // Browser control callbacks
  onBrowserScreenshot?: (event: any) => void;
  onBrowserAction?: (event: any) => void;
  
  // Artifact回调
  onArtifactCreated?: (artifact: any) => void;
  onArtifactUpdated?: (artifact: any) => void;
}

// ================================================================================
// 简化的 ChatService 实现
// ================================================================================

export class ChatService {
  private readonly name = 'chat_service';
  private readonly version = '3.0.0';
  /** Tracks whether onStreamStart has been called for the current request */
  private _streamStarted = false;
  /** Tracks whether a typed/legacy event already emitted completion */
  private _streamCompleted = false;
  
  /**
   * 发送消息 - 符合 how_to_chat.md 标准格式
   */
  async sendMessage(
    message: string,
    metadata: {
      user_id: string;
      session_id: string;
      prompt_name?: string | null;
      prompt_args?: any;
      proactive_enabled?: boolean;
      collaborative_enabled?: boolean;
      confidence_threshold?: number;
      proactive_predictions?: any;
    },
    token: string,
    callbacks: ChatServiceCallbacks,
    options?: { signal?: AbortSignal }
  ): Promise<void> {
    // Starting message processing
    
    try {
      this._streamStarted = false; // Reset for new request
      this._streamCompleted = false;
      // 构建标准的Chat API payload (符合 how_to_chat.md)
      const payload = {
        message,
        user_id: metadata.user_id,
        session_id: metadata.session_id,
        prompt_name: metadata.prompt_name || null,
        prompt_args: metadata.prompt_args || {},
        proactive_enabled: metadata.proactive_enabled || false,
        collaborative_enabled: metadata.collaborative_enabled || false,
        confidence_threshold: metadata.confidence_threshold || 0.7,
        proactive_predictions: metadata.proactive_predictions || null
      };

      // Use centralized gateway Chat API endpoint
      const endpoint = GATEWAY_ENDPOINTS.AGENTS.CHAT;
      
      // 1. 创建 SSE 传输层
      const transport = createSSETransport({
        url: endpoint,
        timeout: 300000, // 5分钟超时
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000
        }
      });
      
      // 2. 创建 AGUI 事件解析器
      const aguiParser = createAGUIEventParser({
        enableLegacyConversion: true,
        validateEventStructure: false,
        autoFillMissingFields: true,
        preserveRawData: true
      });
      
      // 3. 建立连接
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const connection = await transport.connect(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      // If an external abort signal is provided, close the connection when it fires
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          connection.close();
        }, { once: true });
      }

      // Connection established, starting data processing

      // 4. 处理数据流
      return new Promise<void>((resolve, reject) => {
        let streamEnded = false;

        // 处理完成时关闭连接
        const handleComplete = async (finalContent?: string) => {
          if (!streamEnded) {
            streamEnded = true;
            await connection.close();
            if (!this._streamCompleted) {
              callbacks.onStreamComplete?.(finalContent);
              this._streamCompleted = true;
            }
            resolve();
          }
        };

        // 处理错误时关闭连接
        const handleError = async (error: Error) => {
          if (!streamEnded) {
            streamEnded = true;
            await connection.close();
            callbacks.onError?.(error);
            reject(error);
          }
        };
        
        // 处理数据流
        const processData = async () => {
          try {
            for await (const rawData of connection.stream()) {
              
              // 解析 SSE 数据
              const lines = rawData.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataContent = line.slice(6).trim();
                  
                  // 处理结束标记
                  if (dataContent === '[DONE]') {
                    await handleComplete();
                    return;
                  }
                  
                  try {
                    const eventData = JSON.parse(dataContent);
                    
                    // 通过 AGUI 解析器处理
                    const aguiEvent = aguiParser.parse(eventData);
                    if (!aguiEvent) continue;
                    
                    // 直接调用相应的回调函数
                    this.handleAGUIEvent(aguiEvent, callbacks);
                    if (this.isTerminalStreamEvent(aguiEvent)) {
                      await handleComplete();
                      return;
                    }
                    
                  } catch (parseError) {
                    log.warn('Failed to parse event', parseError);
                  }
                }
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              log.debug('Data processing aborted normally');
            } else {
              log.error('Data processing error', error);
              await handleError(error instanceof Error ? error : new Error(String(error)));
            }
          }
        };
        
        // 启动数据处理
        processData();
      });
      
    } catch (error) {
      log.error('Failed to initialize', error);
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 处理 AGUI 事件，直接调用相应回调 - 支持所有事件类型
   */
  private handleAGUIEvent(event: any, callbacks: ChatServiceCallbacks): void {
    // 记录事件处理（开发模式）
    if (process.env.NODE_ENV === 'development') {
      log.debug('Processing AGUI event', { type: event.type, event });
    }
    
    switch (event.type) {
      // Canonical SDK streaming protocol
      case 'status': {
        const data = event.data || {};
        const phase = data.phase || data.status;
        const message = data.message || data.status;
        if (!this._streamStarted && ['connecting', 'preparing', 'generating'].includes(phase)) {
          this._streamStarted = true;
          callbacks.onStreamStart?.(event.id || data.messageId || data.message_id || data.runId || `stream-${Date.now()}`, message || 'Starting...');
        } else if (message) {
          callbacks.onStreamStatus?.(message);
        }
        break;
      }

      case 'content': {
        const data = event.data || {};
        const delta = data.delta || data.content || '';
        if (delta) {
          if (!this._streamStarted) {
            this._streamStarted = true;
            callbacks.onStreamStart?.(event.id || data.messageId || data.message_id || data.runId || `stream-${Date.now()}`, 'Generating...');
          }
          callbacks.onStreamContent?.(delta);
        }
        break;
      }

      case 'thinking': {
        const data = event.data || {};
        callbacks.onStreamStatus?.(data.message || 'Thinking...');
        break;
      }

      case 'done': {
        const data = event.data || {};
        callbacks.onStreamComplete?.(data.finalContent || data.content);
        this._streamCompleted = true;
        break;
      }

      case 'tool_call': {
        const data = event.data || {};
        const status = data.status;
        if (status === 'result' || status === 'error') {
          callbacks.onToolCompleted?.(data.toolName, data.result, data.error);
        } else if (status === 'calling') {
          callbacks.onToolStart?.(data.toolName, data.callId, data.arguments);
        } else {
          callbacks.onToolExecuting?.(data.toolName, status, data.progress);
        }
        break;
      }

      case 'task_progress':
        callbacks.onTaskProgress?.(event.data);
        break;

      case 'artifact': {
        const data = event.data || {};
        if (data.action === 'updated') {
          callbacks.onArtifactUpdated?.(data.artifact || data);
        } else {
          callbacks.onArtifactCreated?.(data.artifact || data);
        }
        break;
      }

      case 'billing': {
        const data = event.data || event;
        callbacks.onBillingUpdate?.({
          creditsRemaining: data.creditsRemaining ?? data.credits_remaining,
          totalCredits: data.totalCredits ?? data.total_credits,
          modelCalls: data.modelCalls ?? data.model_calls,
          toolCalls: data.toolCalls ?? data.tool_calls,
          cost: data.creditsUsed ?? data.cost,
        });
        break;
      }

      case 'hil_request':
        callbacks.onHILInterruptDetected?.(event.data || event);
        break;

      // 基础流程事件
      case 'run_started':
        if (!this._streamStarted) {
          this._streamStarted = true;
          callbacks.onStreamStart?.(event.message_id || event.run_id, 'Starting...');
        }
        break;

      case 'text_message_start':
        // Create the streaming message — real content is about to arrive
        if (!this._streamStarted) {
          this._streamStarted = true;
          callbacks.onStreamStart?.(event.message_id || event.run_id, 'Generating...');
        }
        break;

      case 'text_message_end':
        // If we got content but never started, start + immediately complete
        if (!this._streamStarted && (event.final_content || event.content)) {
          this._streamStarted = true;
          callbacks.onStreamStart?.(event.message_id || event.run_id, 'Generating...');
          callbacks.onStreamContent?.(event.final_content || event.content);
        }
        callbacks.onStreamComplete?.(event.final_content || event.content);
        this._streamCompleted = true;
        break;

      case 'text_delta':
      case 'text_message_content':
        if (event.delta || event.content) {
          // Auto-start stream on first content if text_message_start was missed
          if (!this._streamStarted) {
            this._streamStarted = true;
            callbacks.onStreamStart?.(event.message_id || event.run_id, 'Generating...');
          }
          callbacks.onStreamContent?.(event.delta || event.content);
        }
        break;
        
      case 'run_finished':
      case 'run_completed':
        callbacks.onStreamComplete?.(event.final_content || event.content);
        this._streamCompleted = true;
        break;
        
      case 'run_error':
      case 'error':
        callbacks.onError?.(new Error(event.error?.message || event.message || 'Unknown error'));
        break;
        
      case 'stream_done':
        callbacks.onStreamComplete?.(event.final_content || event.content);
        this._streamCompleted = true;
        break;
        
      // 工具执行事件
      case 'tool_call_start':
        callbacks.onToolStart?.(event.tool_name, event.tool_call_id, event.parameters);
        break;
        
      case 'tool_executing':
        callbacks.onToolExecuting?.(event.tool_name, event.status, event.progress);
        break;
        
      case 'tool_call_end':
        callbacks.onToolCompleted?.(event.tool_name, event.result, event.error, event.duration_ms);
        break;
        
      // LLM相关事件
      case 'llm_completed':
        callbacks.onLLMCompleted?.(event.model, event.token_count, event.finish_reason);
        break;
        
      // 系统状态事件
      case 'node_update':
        callbacks.onNodeUpdate?.(event.node_name, event.status, { 
          credits: event.credits, 
          messages_count: event.messages_count, 
          data: event.data 
        });
        break;
        
      case 'state_update':
        callbacks.onStateUpdate?.(event.state_data, event.node);
        break;
        
      case 'graph_update':
        callbacks.onStateUpdate?.(event.graph_data);
        break;
        
      case 'paused':
        callbacks.onPaused?.(event.reason, event.checkpoint_id);
        break;
        
      // 业务功能事件
      case 'memory_update':
        callbacks.onMemoryUpdate?.(event.memory_data, event.operation);
        break;
        
      // Resume事件
      case 'resume_start':
        callbacks.onResumeStart?.(event.resumed_from, event.checkpoint_id);
        break;
        
      case 'resume_end':
        callbacks.onResumeEnd?.(event.success, event.result);
        break;
        
      // 任务管理事件
      case 'task_progress_update':
        callbacks.onTaskProgress?.(event.task);
        break;
        
      // HIL事件
      case 'hil_interrupt_detected':
        callbacks.onHILInterruptDetected?.(event);
        break;
        
      case 'hil_checkpoint_created':
        callbacks.onHILCheckpointCreated?.(event);
        break;
        
      case 'hil_approval_required':
        // 使用现有的HIL interrupt回调处理approval required事件
        callbacks.onHILInterruptDetected?.(event);
        if (this.isBrowserControlEvent(event)) {
          callbacks.onBrowserAction?.(this.normalizeBrowserAction({ ...event, status: 'pending' }));
        }
        break;

      // Browser control events
      case 'browser_screenshot':
      case 'computer_use_screenshot':
      case 'computer_screenshot':
        callbacks.onBrowserScreenshot?.(this.normalizeBrowserScreenshot(event));
        break;

      case 'browser_action':
      case 'browser_action_pending':
      case 'computer_use_action':
      case 'computer_action':
        callbacks.onBrowserAction?.(this.normalizeBrowserAction(event));
        break;
        
      // 图像生成事件
      case 'image_generation_start':
        callbacks.onStreamStart?.(event.message_id || event.run_id, 'Generating image...');
        break;
        
      case 'image_generation_content':
        if (event.image_url || event.content) {
          callbacks.onStreamContent?.(event.image_url || event.content);
        }
        break;
        
      case 'image_generation_end':
        callbacks.onStreamComplete?.(event.image_url || event.result);
        break;
        
      // Artifact事件
      case 'artifact_created':
        callbacks.onArtifactCreated?.(event.artifact);
        break;
        
      case 'artifact_updated':
        callbacks.onArtifactUpdated?.(event.artifact);
        break;
        
      // 状态更新
      case 'status_update':
        callbacks.onStreamStatus?.(event.status);
        break;
        
      // 标准AGUI事件处理 - 不再处理Legacy格式
      case 'custom_event':
        // 处理Resume标记和其他自定义事件
        if (event.metadata?.resumed) {
          callbacks.onStreamStatus?.(`🔄 Resumed: ${event.metadata.custom_type || 'Unknown event'}`);
        }
        // 根据custom_type进一步处理
        if (event.metadata?.custom_type) {
          this.handleCustomEvent(event, callbacks);
        }
        break;
        
      default:
        log.warn('Unhandled AGUI event type', { type: event.type, event });
        break;
    }
  }
  
  /**
   * 处理自定义事件类型
   */
  private handleCustomEvent(event: any, callbacks: ChatServiceCallbacks): void {
    const customType = event.metadata?.custom_type;
    const customData = event.metadata?.custom_data || {};
    
    switch (customType) {
      case 'browser_screenshot':
      case 'computer_use_screenshot':
      case 'computer_screenshot':
        callbacks.onBrowserScreenshot?.(this.normalizeBrowserScreenshot(event));
        break;

      case 'browser_action':
      case 'browser_action_pending':
      case 'computer_use_action':
      case 'computer_action':
        callbacks.onBrowserAction?.(this.normalizeBrowserAction(event));
        break;

      case 'content':
        // 处理streaming内容 - 这是关键的修复！
        if (event.metadata?.content || customData.content) {
          const content = event.metadata?.content || customData.content;
          callbacks.onStreamContent?.(content);
          log.debug('Streaming content forwarded to callbacks', { preview: content.substring(0, 50) });
        }
        break;
        
      case 'graph_update':
        callbacks.onStateUpdate?.(event.metadata.graph_data);
        break;
        
      case 'billing':
      case 'credits':
        callbacks.onBillingUpdate?.({
          creditsRemaining: customData.creditsRemaining || customData.credits_remaining || 0,
          totalCredits: customData.totalCredits || customData.total_credits || 0,
          modelCalls: customData.modelCalls || customData.model_calls || 0,
          toolCalls: customData.toolCalls || customData.tool_calls || 0,
          cost: customData.cost
        });
        break;
        
      case 'memory_recall': {
        // Attach the recalled memory to the current streaming message
        const { useMessageStore } = require('../stores/useMessageStore');
        const msgStore = useMessageStore.getState();
        // Find the last streaming assistant message
        const streamingMsg = [...msgStore.messages].reverse().find(
          (m: any) => m.role === 'assistant' && m.isStreaming
        );
        const currentMsgId = streamingMsg?.id;
        if (currentMsgId) {
          msgStore.attachMemoryRecall(currentMsgId, {
            memoryId: customData.memoryId || event.metadata?.memoryId,
            memoryType: customData.memoryType || event.metadata?.memoryType || 'factual',
            content: customData.content || event.metadata?.content || '',
            learnedAt: customData.learnedAt || event.metadata?.learnedAt,
            confidence: customData.confidence || event.metadata?.confidence,
            sourceSessionId: customData.sourceSessionId || event.metadata?.sourceSessionId,
          });
        }
        log.info('Memory recall event dispatched', {
          memoryType: customData.memoryType || event.metadata?.memoryType,
          messageId: currentMsgId,
        });
        break;
      }

      case 'task_created': {
        const { useTaskStore } = require('../stores/useTaskStore');
        useTaskStore.getState().addTask({
          id: event.metadata?.task_id || `task-${Date.now()}`,
          title: event.metadata?.title || 'New task',
          description: event.metadata?.description,
          status: 'pending',
          dueAt: event.metadata?.due_at,
          createdAt: new Date().toISOString(),
        });
        log.info('Task created from conversation', { taskId: event.metadata?.task_id });
        break;
      }

      case 'autonomous_result': {
        // Background autonomous event received via the active chat stream.
        // Dispatch directly to the chat store so it appears in the timeline.
        const { useChatStore } = require('../stores/useChatStore');
        const store = useChatStore.getState();
        store.insertAutonomousMessage(
          event.metadata?.content || customData.content || '',
          event.metadata?.source || 'scheduler',
          event.metadata?.completed_at,
        );
        log.info('Autonomous result dispatched to store', {
          source: event.metadata?.source,
          jobId: event.metadata?.job_id,
        });
        break;
      }

      default:
        log.debug('Custom event', { customType, customData });
        break;
    }
  }

  private isBrowserControlEvent(event: any): boolean {
    const data = event?.metadata?.custom_data || event?.metadata || event?.data || {};
    const haystack = [
      event?.tool_name,
      event?.agent_name,
      event?.type,
      event?.metadata?.custom_type,
      data?.tool_name,
      data?.agent_name,
      data?.type,
    ].filter(Boolean).join(' ');

    return /browser|computer[_ -]?use|screenshot|viewport/i.test(haystack);
  }

  private normalizeBrowserScreenshot(event: any): any {
    const data = event?.metadata?.custom_data || event?.metadata || event?.data || {};
    return {
      ...data,
      screenshotUrl:
        event?.screenshotUrl ||
        event?.screenshot_url ||
        event?.screenshot ||
        event?.image_url ||
        event?.content ||
        data?.screenshotUrl ||
        data?.screenshot_url ||
        data?.screenshot ||
        data?.image_url,
      currentUrl: event?.currentUrl || event?.current_url || event?.url || data?.currentUrl || data?.current_url || data?.url,
      tabs: event?.tabs || data?.tabs,
      activeTabId: event?.activeTabId || event?.active_tab_id || data?.activeTabId || data?.active_tab_id,
    };
  }

  private normalizeBrowserAction(event: any): any {
    const data = event?.metadata?.custom_data || event?.metadata || event?.data || {};
    const rawType =
      event?.action_type ||
      event?.actionType ||
      event?.action ||
      data?.action_type ||
      data?.actionType ||
      data?.action ||
      data?.type;
    const description =
      event?.description ||
      event?.message ||
      data?.description ||
      data?.message ||
      data?.target ||
      event?.tool_name ||
      'Browser action requires approval';

    return {
      ...data,
      id: event?.id || event?.tool_call_id || data?.id || data?.tool_call_id,
      type: rawType,
      status: event?.status || data?.status || 'pending',
      description,
      target: event?.target || event?.url || data?.target || data?.url,
      x: event?.x ?? data?.x,
      y: event?.y ?? data?.y,
      durationMs: event?.durationMs || event?.duration_ms || data?.durationMs || data?.duration_ms,
    };
  }

  private isTerminalStreamEvent(event: any): boolean {
    return ['done', 'stream_done', 'run_finished', 'run_completed'].includes(event?.type);
  }
  
  /**
   * Send message via isA_Mate backend (streaming SSE).
   * Uses MateEventAdapter to convert Mate events to AGUI format,
   * so all downstream callbacks, stores, and UI remain unchanged.
   */
  async sendMessageViaMate(
    message: string,
    metadata: { session_id: string },
    token: string,
    callbacks: ChatServiceCallbacks
  ): Promise<void> {
    log.info('Sending message via Mate backend');

    try {
      const payload = buildMateRequest(message, metadata.session_id);
      const endpoint = GATEWAY_ENDPOINTS.MATE.CHAT;

      const transport = createSSETransport({
        url: endpoint,
        timeout: 300000,
        retryConfig: { maxRetries: 3, retryDelay: 1000 },
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const connection = await transport.connect(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      return new Promise<void>((resolve, reject) => {
        let streamEnded = false;
        this._streamStarted = false; // Reset for new request
        this._streamCompleted = false;
        const { startEvent, context } = createMateStreamContext(metadata.session_id);
        let adaptCtx = context;

        // Emit synthetic run_started (just logs — doesn't create message)
        this.handleAGUIEvent(startEvent, callbacks);

        const handleComplete = async (finalContent?: string) => {
          if (!streamEnded) {
            streamEnded = true;
            await connection.close();
            if (!this._streamCompleted) {
              callbacks.onStreamComplete?.(finalContent);
              this._streamCompleted = true;
            }
            resolve();
          }
        };

        const handleError = async (error: Error) => {
          if (!streamEnded) {
            streamEnded = true;
            await connection.close();
            callbacks.onError?.(error);
            reject(error);
          }
        };

        const processData = async () => {
          try {
            for await (const rawData of connection.stream()) {
              const lines = rawData.split('\n');
              for (const line of lines) {
                // Handle SSE "event: done" format
                if (line.trim() === 'event: done' || line.trim() === 'data: [DONE]') {
                  await handleComplete();
                  return;
                }

                if (line.startsWith('data: ')) {
                  const dataContent = line.slice(6).trim();
                  if (dataContent === '[DONE]') {
                    await handleComplete();
                    return;
                  }

                  try {
                    const mateEvent: MateSSEEvent = JSON.parse(dataContent);
                    const { events, updatedContext } = adaptMateEvent(mateEvent, adaptCtx);
                    adaptCtx = updatedContext;

                    for (const aguiEvent of events) {
                      this.handleAGUIEvent(aguiEvent, callbacks);
                      if (this.isTerminalStreamEvent(aguiEvent)) {
                        await handleComplete();
                        return;
                      }
                    }
                  } catch (parseError) {
                    log.warn('Failed to parse Mate event', parseError);
                  }
                }
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              log.debug('Mate stream aborted normally');
            } else {
              log.error('Mate stream error', error);
              await handleError(error instanceof Error ? error : new Error(String(error)));
            }
          }
        };

        processData();
      });
    } catch (error) {
      log.error('Failed to connect to Mate', error);
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Allowed MIME types for multimodal uploads
  private static readonly ALLOWED_FILE_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    // Text
    'text/plain', 'text/csv', 'text/markdown',
    'application/json',
  ]);

  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  /**
   * Validate files for multimodal upload.
   * Throws on invalid file type or size.
   */
  private validateFiles(files: File[]): void {
    for (const file of files) {
      if (!ChatService.ALLOWED_FILE_TYPES.has(file.type)) {
        throw new Error(
          `Unsupported file type: ${file.type || 'unknown'}. Accepted: images, PDFs, and text files.`
        );
      }
      if (file.size > ChatService.MAX_FILE_SIZE) {
        throw new Error(
          `File "${file.name}" exceeds the 20 MB size limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`
        );
      }
    }
  }

  /**
   * 发送多模态消息
   *
   * Strategy: upload files via StorageService first, then send a regular
   * chat message that includes file references so the backend can access them.
   */
  async sendMultimodalMessage(
    message: string,
    metadata: {
      user_id: string;
      session_id: string;
      prompt_name?: string | null;
      prompt_args?: any;
      proactive_enabled?: boolean;
      collaborative_enabled?: boolean;
      confidence_threshold?: number;
      proactive_predictions?: any;
    },
    token: string,
    callbacks: ChatServiceCallbacks,
    files?: File[]
  ): Promise<void> {
    log.info('Starting multimodal message', {
      hasFiles: !!files,
      fileCount: files?.length || 0
    });

    // If no files, fall back to plain text chat
    if (!files || files.length === 0) {
      return this.sendMessage(message, metadata, token, callbacks);
    }

    try {
      // Validate file types and sizes
      this.validateFiles(files);

      // Upload files via StorageService
      const storageService = getStorageService();
      const fileReferences: Array<{ file_id: string; file_name: string; mime_type: string; file_size: number }> = [];

      for (const file of files) {
        try {
          const uploadResult = await storageService.uploadFile(file, {
            user_id: metadata.user_id,
            access_level: 'private' as any,
            tags: ['chat-attachment', metadata.session_id],
          });

          fileReferences.push({
            file_id: uploadResult.file_id,
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
          });

          log.info('File uploaded for multimodal message', {
            fileId: uploadResult.file_id,
            fileName: file.name,
          });
        } catch (uploadError) {
          log.error('Failed to upload file for multimodal message', {
            fileName: file.name,
            error: uploadError,
          });
          throw new Error(
            `Failed to upload file "${file.name}": ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`
          );
        }
      }

      // Send the message with file references in prompt_args
      const augmentedMetadata = {
        ...metadata,
        prompt_args: {
          ...metadata.prompt_args,
          file_attachments: fileReferences,
        },
      };

      return this.sendMessage(message, augmentedMetadata, token, callbacks);
    } catch (error) {
      log.error('Multimodal message failed', { error });
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * 恢复HIL会话
   */
  async resumeHIL(
    message: string,
    metadata: {
      user_id: string;
      session_id: string;
      prompt_name?: string | null;
      prompt_args?: any;
      proactive_enabled?: boolean;
      collaborative_enabled?: boolean;
      confidence_threshold?: number;
      proactive_predictions?: any;
    },
    token: string,
    callbacks: ChatServiceCallbacks
  ): Promise<void> {
    log.info('Resuming HIL session');
    
    // HIL恢复使用相同的架构模式
    return this.sendMessage(message, metadata, token, callbacks);
  }
}

// 导出实例
export const chatService = new ChatService();
