/**
 * ============================================================================
 * Execution Control Service - HIL (Human-in-the-Loop) Integration
 * ============================================================================
 * 
 * 【核心职责】
 * - 提供执行控制API调用接口 
 * - 管理会话的执行状态和中断
 * - 处理时间回溯和检查点操作
 * - 支持流式和非流式恢复执行
 * 
 * 【集成设计】
 * ✅ 复用BaseApiService的网络层
 * ✅ 与现有chatService协同工作
 * ✅ 支持SSE流式响应处理
 * ✅ 统一的错误处理和重试机制
 * 
 * 【API端点】
 * - GET /api/execution/health - 服务健康检查
 * - GET /api/execution/status/{thread_id} - 执行状态查询
 * - GET /api/execution/history/{thread_id} - 执行历史记录
 * - POST /api/execution/rollback/{thread_id} - 时间回溯
 * - POST /api/execution/resume - 恢复执行(非流式)
 * - POST /api/execution/resume-stream - 恢复执行(流式)
 */

import { BaseApiService } from './BaseApiService';
import { config } from '../config';
import { logger, LogCategory } from '../utils/logger';
import { GATEWAY_CONFIG, GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { 
  HILInterruptDetectedEvent, 
  HILCheckpointCreatedEvent,
  HILExecutionStatusData 
} from '../types/aguiTypes';

// ================================================================================
// Type Definitions - HIL执行控制类型定义
// ================================================================================

export interface ExecutionHealth {
  status: 'healthy' | 'degraded' | 'down';
  service: string;
  features: {
    human_in_loop: boolean;
    approval_workflow: boolean;
    tool_authorization: boolean;
    total_interrupts: number;
  };
  graph_info: {
    nodes: number;
    durable: boolean;
    checkpoints: boolean;
    environment: string;
  };
}

export interface ExecutionStatus {
  thread_id: string;
  status: 'ready' | 'running' | 'interrupted' | 'completed' | 'error';
  current_node: string;
  interrupts: InterruptInfo[];
  checkpoints: number;
  durable: boolean;
}

export interface InterruptInfo {
  id: string;
  type: 'approval' | 'review_edit' | 'input_validation' | 'tool_authorization';
  timestamp: string;
  data: any;
  reason?: string;
}

export interface ExecutionCheckpoint {
  checkpoint: string;
  node: string;
  timestamp: string;
  state_summary: string;
}

export interface ExecutionHistory {
  thread_id: string;
  history: ExecutionCheckpoint[];
  total: number;
  limit?: number;
}

export interface RollbackResult {
  thread_id: string;
  success: boolean;
  checkpoint_id: string;
  message: string;
  restored_state: {
    node: string;
    timestamp: string;
  };
}

export interface ResumeRequest {
  thread_id: string;
  action: 'continue' | 'skip' | 'modify' | 'pause' | 'reject';
  resume_data?: {
    approved?: boolean;
    user_input?: string;
    authorization_token?: string;
    human_decision?: string;
    modifications?: any;
    edited_content?: any;
    validation_passed?: boolean;
    [key: string]: any;
  };
}

export interface ResumeResult {
  success: boolean;
  thread_id: string;
  message: string;
  next_step: string;
}

// HIL事件回调接口 - 使用AGUI标准事件
export interface HILEventCallbacks {
  onInterruptDetected?: (event: HILInterruptDetectedEvent) => void;
  onExecutionResumed?: (result: ResumeResult) => void;
  onCheckpointCreated?: (event: HILCheckpointCreatedEvent) => void;
  onStatusChanged?: (status: HILExecutionStatusData) => void;
  onError?: (error: Error) => void;
}

// SSE流式恢复回调接口  
export interface ResumeStreamCallbacks {
  onResumeStart?: (data: { content: string; timestamp: string }) => void;
  onGraphUpdate?: (data: { content: string; node: string }) => void;
  onMessageStream?: (data: { content: { raw_message: string } }) => void;
  onResumeEnd?: (data: { content: string; timestamp: string }) => void;
  onError?: (error: Error) => void;
}

// ================================================================================
// ExecutionControlService Class
// ================================================================================

export class ExecutionControlService {
  private apiService: BaseApiService;
  private activePollingTimers: Map<string, NodeJS.Timeout> = new Map();
  private statusCache: Map<string, { status: ExecutionStatus; timestamp: number }> = new Map();
  private isPageVisible: boolean = true;
  private readonly CACHE_DURATION = 2000; // 2 seconds cache
  private readonly DEFAULT_POLL_INTERVAL = 3000; // Increased from 2s to 3s
  private readonly IDLE_POLL_INTERVAL = 10000; // 10s for idle sessions
  private readonly MAX_RETRY_ATTEMPTS = 3; // Maximum retry attempts for network errors
  private readonly RETRY_DELAY = 1000; // Base delay for retries (1s)

  constructor(apiService?: BaseApiService) {
    this.apiService = apiService || new BaseApiService(config.api.baseUrl);
    
    // 定期清理缓存 (每分钟)
    setInterval(() => {
      this.cleanupCache();
    }, 60000);

    // 监听页面可见性变化
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isPageVisible = !document.hidden;
        if (this.isPageVisible) {
          logger.debug(LogCategory.CHAT_FLOW, 'Page became visible, resuming monitoring');
        } else {
          logger.debug(LogCategory.CHAT_FLOW, 'Page became hidden, monitoring continues with reduced frequency');
        }
      });
    }
  }

  /**
   * Get current auth token from centralized storage
   */
  private getAuthToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(GATEWAY_CONFIG.AUTH.TOKEN_KEY) || '';
    }
    return '';
  }

  // ================================================================================
  // 服务状态查询
  // ================================================================================

  /**
   * 检查HIL执行控制服务健康状态
   */
  async getHealth(): Promise<ExecutionHealth> {
    try {
      const response = await fetch(GATEWAY_ENDPOINTS.AGENTS.EXECUTION.HEALTH, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      const health = await response.json();
      logger.info(LogCategory.CHAT_FLOW, 'HIL service health check successful', health);
      return health;
    } catch (error) {
      logger.error(LogCategory.CHAT_FLOW, 'HIL service health check failed', { error });
      throw error;
    }
  }

  /**
   * 获取线程执行状态 (带重试机制和缓存)
   */
  async getExecutionStatus(threadId: string): Promise<ExecutionStatus> {
    return this.retryWithBackoff(async () => {
      // Check cache first
      const cached = this.statusCache.get(threadId);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
        logger.debug(LogCategory.CHAT_FLOW, 'Execution status retrieved from cache', { 
          threadId, 
          status: cached.status.status,
          cacheAge: now - cached.timestamp
        });
        return cached.status;
      }

      const response = await fetch(`${GATEWAY_ENDPOINTS.AGENTS.EXECUTION.STATUS}/${threadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
      }

      const status = await response.json();
      
      // Cache the response
      this.statusCache.set(threadId, { status, timestamp: now });
      
      logger.debug(LogCategory.CHAT_FLOW, 'Execution status retrieved and cached', { 
        threadId, 
        status: status.status 
      });
      return status;
    }, `getExecutionStatus-${threadId}`);
  }

  /**
   * 带指数退避的重试机制
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>, 
    operationName: string,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const isNetworkError = this.isNetworkError(error);
      
      if (!isNetworkError || attempt >= this.MAX_RETRY_ATTEMPTS) {
        logger.error(LogCategory.CHAT_FLOW, `Operation failed after ${attempt} attempts`, { 
          operationName, 
          error,
          isNetworkError,
          finalAttempt: attempt >= this.MAX_RETRY_ATTEMPTS
        });
        throw error;
      }

      // 指数退避延迟
      const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
      logger.warn(LogCategory.CHAT_FLOW, `Network error, retrying in ${delay}ms`, { 
        operationName, 
        attempt, 
        delay,
        error: error instanceof Error ? error.message : String(error)
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithBackoff(operation, operationName, attempt + 1);
    }
  }

  /**
   * 判断是否为网络错误
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) {
      const message = error.message.toLowerCase();
      return message.includes('failed to fetch') || 
             message.includes('network error') ||
             message.includes('network_io_suspended') ||
             message.includes('socket_not_connected');
    }
    return false;
  }

  // ================================================================================
  // 执行历史和时间回溯
  // ================================================================================

  /**
   * 获取执行历史记录
   */
  async getExecutionHistory(threadId: string, limit: number = 50): Promise<ExecutionHistory> {
    try {
      const response = await fetch(`${GATEWAY_ENDPOINTS.AGENTS.EXECUTION.HISTORY}/${threadId}?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`History retrieval failed: ${response.status} ${response.statusText}`);
      }

      const history = await response.json();
      logger.debug(LogCategory.CHAT_FLOW, 'Execution history retrieved', { 
        threadId, 
        checkpointCount: history.total 
      });
      return history;
    } catch (error) {
      logger.error(LogCategory.CHAT_FLOW, 'Failed to get execution history', { threadId, error });
      throw error;
    }
  }

  /**
   * 时间回溯到指定检查点
   */
  async rollbackToCheckpoint(threadId: string, checkpointId: string): Promise<RollbackResult> {
    try {
      const response = await fetch(`${GATEWAY_ENDPOINTS.AGENTS.EXECUTION.ROLLBACK}/${threadId}?checkpoint_id=${checkpointId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Rollback failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info(LogCategory.CHAT_FLOW, 'Rollback completed', { 
        threadId, 
        checkpointId,
        success: result.success 
      });
      return result;
    } catch (error) {
      logger.error(LogCategory.CHAT_FLOW, 'Failed to rollback execution', { threadId, checkpointId, error });
      throw error;
    }
  }

  // ================================================================================
  // 执行恢复 - 非流式
  // ================================================================================

  /**
   * 恢复执行(非流式响应)
   */
  async resumeExecution(request: ResumeRequest): Promise<ResumeResult> {
    try {
      logger.info(LogCategory.CHAT_FLOW, 'Resuming execution (non-streaming)', {
        threadId: request.thread_id,
        action: request.action
      });

      const response = await fetch(GATEWAY_ENDPOINTS.AGENTS.EXECUTION.RESUME, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Resume execution failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info(LogCategory.CHAT_FLOW, 'Execution resumed successfully', { 
        threadId: request.thread_id,
        success: result.success 
      });
      return result;
    } catch (error) {
      logger.error(LogCategory.CHAT_FLOW, 'Failed to resume execution', { 
        threadId: request.thread_id, 
        error 
      });
      throw error;
    }
  }

  // ================================================================================
  // 执行恢复 - 流式响应
  // ================================================================================

  /**
   * 恢复执行(流式响应) - 集成到现有SSE处理系统
   */
  async resumeExecutionStream(request: ResumeRequest, callbacks: ResumeStreamCallbacks): Promise<void> {
    try {
      logger.info(LogCategory.CHAT_FLOW, 'Resuming execution (streaming)', {
        threadId: request.thread_id,
        action: request.action
      });

      const response = await fetch(GATEWAY_ENDPOINTS.AGENTS.EXECUTION.RESUME_STREAM, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Resume stream failed: ${response.status} ${response.statusText}`);
      }

      // 处理SSE流式响应 - 复用现有的流式处理逻辑
      await this.processResumeStream(response, callbacks);

    } catch (error) {
      logger.error(LogCategory.CHAT_FLOW, 'Failed to resume execution (streaming)', { 
        threadId: request.thread_id, 
        error 
      });
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 处理恢复执行的SSE流式响应
   */
  private async processResumeStream(response: Response, callbacks: ResumeStreamCallbacks): Promise<void> {
    if (!response.body) {
      callbacks.onError?.(new Error('No response body for stream'));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            const dataContent = line.slice(6).trim();
            
            // Handle [DONE] marker
            if (dataContent === '[DONE]') {
              logger.debug(LogCategory.CHAT_FLOW, 'Resume stream completed');
              continue;
            }
            
            try {
              const eventData = JSON.parse(dataContent);
              
              // 根据事件类型调用相应回调
              switch (eventData.type) {
                case 'resume_start':
                  callbacks.onResumeStart?.(eventData);
                  break;
                case 'graph_update':
                  callbacks.onGraphUpdate?.(eventData);
                  break;
                case 'message_stream':
                  callbacks.onMessageStream?.(eventData);
                  break;
                case 'resume_end':
                  callbacks.onResumeEnd?.(eventData);
                  break;
                default:
                  logger.debug(LogCategory.CHAT_FLOW, 'Unknown resume stream event', { type: eventData.type });
              }
            } catch (parseError) {
              logger.warn(LogCategory.CHAT_FLOW, 'Failed to parse resume stream event', { 
                data: dataContent, 
                error: parseError 
              });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ================================================================================
  // 轮询和监控
  // ================================================================================

  /**
   * 轮询执行状态直到中断或完成 (optimized with smart intervals and cleanup)
   */
  async monitorExecution(
    threadId: string, 
    callbacks: HILEventCallbacks,
    pollInterval?: number
  ): Promise<void> {
    // Stop any existing polling for this thread
    this.stopMonitoring(threadId);
    
    // Use smart interval based on session activity
    const interval = pollInterval || this.DEFAULT_POLL_INTERVAL;
    
    // Only log if this is a new monitoring session
    if (!this.activePollingTimers.has(threadId)) {
      logger.debug(LogCategory.CHAT_FLOW, 'Starting execution monitoring', { 
        threadId, 
        pollInterval: interval
      });
    }

    let consecutiveIdleCount = 0;
    const maxIdleCount = 3; // Switch to slow polling after 3 idle checks

    const poll = async (): Promise<boolean> => {
      try {
        const status = await this.getExecutionStatus(threadId);
        
        // 转换为 HIL 标准格式
        const hilStatus: HILExecutionStatusData = {
          thread_id: status.thread_id,
          status: status.status,
          current_node: status.current_node,
          interrupts: status.interrupts.map(interrupt => ({
            id: interrupt.id,
            type: interrupt.type,
            timestamp: interrupt.timestamp,
            thread_id: status.thread_id,
            title: `HIL ${interrupt.type.replace('_', ' ')}`,
            message: interrupt.reason || 'Human intervention required',
            data: interrupt.data
          })),
          checkpoints: status.checkpoints,
          durable: status.durable
        };
        
        callbacks.onStatusChanged?.(hilStatus);

        switch (status.status) {
          case 'interrupted':
            consecutiveIdleCount = 0; // Reset idle count
            if (status.interrupts.length > 0) {
              status.interrupts.forEach(interrupt => {
                // 转换为 AGUI 标准事件
                const hilEvent: HILInterruptDetectedEvent = {
                  thread_id: threadId,
                  timestamp: new Date().toISOString(),
                  type: 'hil_interrupt_detected',
                  interrupt: {
                    id: interrupt.id,
                    interrupt_type: interrupt.type,
                    title: `HIL ${interrupt.type.replace('_', ' ')}`,
                    message: interrupt.reason || 'Human intervention required',
                    priority: 'medium',
                    data: interrupt.data,
                    timeout_ms: 300000 // 5 minutes default
                  }
                };
                callbacks.onInterruptDetected?.(hilEvent);
              });
            }
            return false; // 停止轮询，等待人工干预

          case 'completed':
          case 'error':
            logger.info(LogCategory.CHAT_FLOW, 'Execution monitoring ended', { 
              threadId, 
              finalStatus: status.status 
            });
            return false; // 停止轮询

          case 'running':
            consecutiveIdleCount = 0; // Reset idle count for active execution
            return true; // 继续轮询

          case 'ready':
            consecutiveIdleCount++;
            return true; // 继续轮询

          default:
            consecutiveIdleCount++;
            logger.warn(LogCategory.CHAT_FLOW, 'Unknown execution status', { 
              threadId, 
              status: status.status 
            });
            return true; // 继续轮询
        }
      } catch (error) {
        logger.error(LogCategory.CHAT_FLOW, 'Execution monitoring failed', { threadId, error });
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        return false; // 停止轮询
      }
    };

    // Smart polling with adaptive intervals and page visibility awareness
    const scheduleNextPoll = () => {
      // Use longer interval for idle sessions
      let nextInterval = consecutiveIdleCount >= maxIdleCount ? 
        this.IDLE_POLL_INTERVAL : 
        interval;
      
      // If page is not visible, use longer intervals to reduce network load
      if (!this.isPageVisible) {
        nextInterval = Math.max(nextInterval * 2, 15000); // At least 15s when page is hidden
      }
      
      const timer = setTimeout(async () => {
        if (await poll()) {
          scheduleNextPoll();
        } else {
          this.stopMonitoring(threadId);
        }
      }, nextInterval);
      
      this.activePollingTimers.set(threadId, timer);
    };

    // Initial poll
    if (await poll()) {
      scheduleNextPoll();
    }
  }

  // ================================================================================
  // 工具方法
  // ================================================================================

  /**
   * 停止指定线程的监控
   */
  stopMonitoring(threadId: string): void {
    const timer = this.activePollingTimers.get(threadId);
    if (timer) {
      clearTimeout(timer);
      this.activePollingTimers.delete(threadId);
      // Only log if there was an active timer
      logger.debug(LogCategory.CHAT_FLOW, 'Stopped monitoring for thread', { 
        threadId,
        remainingPollers: this.activePollingTimers.size
      });
    }
  }

  /**
   * 停止所有监控
   */
  stopAllMonitoring(): void {
    const activeCount = this.activePollingTimers.size;
    this.activePollingTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.activePollingTimers.clear();
    this.statusCache.clear();
    
    logger.info(LogCategory.CHAT_FLOW, 'Stopped all execution monitoring', { 
      stoppedPollers: activeCount
    });
  }

  /**
   * 获取活跃监控状态
   */
  getActiveMonitoringStats(): { activePollers: number; cachedStatuses: number } {
    return {
      activePollers: this.activePollingTimers.size,
      cachedStatuses: this.statusCache.size
    };
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.statusCache.entries());
    for (const [threadId, cached] of entries) {
      if ((now - cached.timestamp) > this.CACHE_DURATION * 5) { // Keep cache 5x longer than refresh
        this.statusCache.delete(threadId);
      }
    }
  }

  /**
   * 检查服务是否可用
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取线程的最新检查点
   */
  async getLatestCheckpoint(threadId: string): Promise<ExecutionCheckpoint | null> {
    try {
      const history = await this.getExecutionHistory(threadId, 1);
      return history.history.length > 0 ? history.history[0] : null;
    } catch {
      return null;
    }
  }
}

// ================================================================================
// 默认实例导出
// ================================================================================

export const executionControlService = new ExecutionControlService();

export default executionControlService;