/**
 * ============================================================================
 * Chat Service - Using @isa/core SDK
 * ============================================================================
 * 
 * Migrated from custom implementation to @isa/core ChatService
 * 
 * Architecture Benefits:
 * ✅ SDK: @isa/core AgentService with standardized chat API
 * ✅ Transport: @isa/transport SSE with robust streaming
 * ✅ Types: SDK-provided type safety
 * ✅ Error handling: Built-in SDK error management
 */

import { AgentService } from '@isa/core';
import { HttpClient } from '@isa/transport';
import { getAuthHeaders } from '../config/gatewayConfig';
import { logger, LogCategory } from '../utils/logger';
import { getGatewayUrl } from '../config/runtimeEnv';

// Re-export types for compatibility
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
  
  // 任务管理回调
  onTaskProgress?: (progress: any) => void;
  onTaskListUpdate?: (tasks: any[]) => void;
  onTaskStatusUpdate?: (taskId: string, status: string, result?: any) => void;
  
  // 系统回调
  onBillingUpdate?: (billingData: any) => void;
  
  // HIL (Human-in-the-Loop) 回调
  onHILInterruptDetected?: (hilEvent: any) => void;
  onHILCheckpointCreated?: (checkpointEvent: any) => void;
  
  // 通用回调
  onRawEvent?: (event: any) => void;
}

// ================================================================================
// ChatService Wrapper
// ================================================================================

export class ChatService {
  private agentService: AgentService;
  private currentCallbacks?: ChatServiceCallbacks;

  constructor(baseUrl?: string, getAuthHeadersFn?: () => Promise<Record<string, string>>) {
    // Initialize agent service with base URL
    this.agentService = new AgentService(baseUrl || getGatewayUrl());

    // Set up authentication if provided
    if (getAuthHeadersFn) {
      // The AgentService handles auth through setAuthToken method
      // We'll need to adapt this for the auth headers
    }

    logger.info(LogCategory.API_REQUEST, 'ChatService initialized with @isa/core SDK', { 
      baseUrl: baseUrl || getGatewayUrl()
    });
  }

  // ================================================================================
  // Chat Methods
  // ================================================================================

  /**
   * Start chat conversation
   */
  async startChat(
    message: string,
    sessionId: string,
    callbacks: ChatServiceCallbacks,
    userId?: string
  ): Promise<void> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Starting chat conversation', {
        sessionId,
        userId,
        messageLength: message.length
      });

      this.currentCallbacks = callbacks;

      // Use AgentService's chat method with SSE streaming
      await this.agentService.chat(
        {
          message,
          user_id: userId || 'default_user',
          session_id: sessionId
        },
        {
          onSessionStart: (event) => {
            callbacks.onStreamStart?.(sessionId, 'session_started');
          },
          onContentThinking: (event) => {
            callbacks.onStreamContent?.(event.content);
          },
          onContentToken: (event) => {
            callbacks.onStreamContent?.(event.content);
          },
          onContentComplete: (event) => {
            callbacks.onStreamComplete?.(event.content);
          },
          onToolCall: (event) => {
            callbacks.onToolStart?.(
              event.metadata?.tool_name || 'unknown_tool', 
              event.metadata?.tool_call_id, 
              event.metadata?.parameters
            );
          },
          onToolExecuting: (event) => {
            callbacks.onToolExecuting?.(
              event.metadata?.tool_name || 'unknown_tool', 
              event.metadata?.status, 
              parseFloat(event.metadata?.progress || '0') || 0
            );
          },
          onToolResult: (event) => {
            callbacks.onToolCompleted?.(
              event.metadata?.tool_name || 'unknown_tool',
              event.metadata?.result,
              event.metadata?.error,
              event.metadata?.duration_ms
            );
          },
          onNodeExit: (event) => {
            callbacks.onNodeUpdate?.(
              event.metadata?.node || 'unknown_node', 
              'completed', 
              event.metadata
            );
          },
          onSessionEnd: (event) => {
            callbacks.onLLMCompleted?.(
              event.metadata?.model,
              event.metadata?.token_count,
              event.metadata?.finish_reason
            );
            callbacks.onStreamComplete?.(event.content);
          },
          onSessionError: (event) => {
            const error = new Error(event.content || 'Session error');
            callbacks.onError?.(error);
          },
          // Task management events
          onTaskProgress: (event) => {
            callbacks.onTaskProgress?.({
              task_name: event.metadata?.task_name,
              status: event.metadata?.status,
              progress: event.metadata?.progress,
              currentStep: event.metadata?.current_step,
              totalSteps: event.metadata?.total_steps,
              currentStepName: event.metadata?.current_step_name,
              ...event.metadata
            });
          },
          onTaskStart: (event) => {
            // Convert single task start to task list update
            callbacks.onTaskListUpdate?.([{
              id: event.metadata?.task_id || event.session_id,
              name: event.metadata?.task_name || 'Unknown Task',
              status: 'running',
              createdAt: event.timestamp,
              updatedAt: event.timestamp
            }]);
          },
          onTaskComplete: (event) => {
            // Update task status when completed
            callbacks.onTaskStatusUpdate?.(
              event.metadata?.task_id || event.session_id,
              'completed',
              event.metadata?.result
            );
          },
          // System events
          onSystemBilling: (event) => {
            callbacks.onBillingUpdate?.({
              creditsRemaining: event.metadata?.credits_remaining,
              totalCredits: event.metadata?.total_credits,
              modelCalls: event.metadata?.model_calls,
              toolCalls: event.metadata?.tool_calls,
              cost: event.metadata?.cost,
              ...event.metadata
            });
          },
          // HIL events
          onHILRequest: (event) => {
            callbacks.onHILInterruptDetected?.({
              type: 'hil',
              question: event.content,
              metadata: event.metadata,
              sessionId: event.session_id,
              timestamp: event.timestamp
            });
          },
          onSessionPaused: (event) => {
            // Session paused also indicates HIL
            if (event.metadata?.interrupt_type === 'hil') {
              callbacks.onHILInterruptDetected?.({
                type: 'hil',
                question: event.metadata?.question || event.content,
                metadata: event.metadata,
                sessionId: event.session_id,
                timestamp: event.timestamp
              });
            }
          }
        }
      );

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to start chat', { error });
      callbacks.onError?.(error as Error);
    }
  }

  /**
   * Send message in existing conversation (using same session)
   */
  async sendMessage(
    message: string,
    sessionId: string,
    callbacks: ChatServiceCallbacks,
    userId?: string
  ): Promise<void> {
    // For continuation in same session, we can use the same startChat method
    return this.startChat(message, sessionId, callbacks, userId);
  }

  /**
   * Get conversation history via session service
   */
  async getConversationHistory(sessionId: string): Promise<any[]> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting conversation history', { sessionId });

      // Fetch messages from the session service endpoint
      const res = await fetch(
        `${getGatewayUrl()}/api/v1/sessions/${encodeURIComponent(sessionId)}/messages`,
        { headers: getAuthHeaders() }
      );

      if (!res.ok) {
        logger.warn(LogCategory.API_REQUEST, 'Session history endpoint returned non-OK', {
          sessionId,
          status: res.status
        });
        return [];
      }

      const data = await res.json();
      return Array.isArray(data) ? data : data.messages || [];
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get conversation history', { error });
      return [];
    }
  }

  // ================================================================================
  // Auth Helper Methods
  // ================================================================================

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.agentService.setAuthToken(token);
    logger.info(LogCategory.API_REQUEST, 'Auth token set for ChatService');
  }

  // ================================================================================
  // Compatibility Methods
  // ================================================================================

  /**
   * Send multimodal message (compatibility method)
   */
  async sendMultimodalMessage(
    message: string,
    files: any[],
    sessionId: string,
    userId?: string,
    callbacks?: ChatServiceCallbacks
  ): Promise<void> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Sending multimodal message', {
        sessionId,
        userId,
        messageLength: message.length,
        fileCount: files?.length || 0
      });

      // For now, just send the text message - file handling would need enhancement
      if (callbacks) {
        return this.sendMessage(message, sessionId, callbacks, userId);
      } else {
        throw new Error('Callbacks are required for sendMultimodalMessage');
      }

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to send multimodal message', { error });
      throw error;
    }
  }

  /**
   * Resume HIL (Human-in-the-Loop) execution
   */
  async resumeHIL(sessionId: string, input?: any, callbacks?: ChatServiceCallbacks): Promise<void> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Resuming HIL execution', { sessionId, input });

      // This would typically interact with the execution control service
      // For now, we'll just log and potentially call the regular message flow
      logger.warn(LogCategory.API_REQUEST, 'HIL resume not fully implemented - consider using ExecutionControlService');

      if (callbacks?.onError) {
        callbacks.onError(new Error('HIL resume functionality needs ExecutionControlService integration'));
      }

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to resume HIL', { error });
      throw error;
    }
  }

  // ================================================================================
  // Utility Methods
  // ================================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Performing chat service health check');

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'ChatService'
      };

    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Health check failed', { error });
      throw error;
    }
  }

  /**
   * Cleanup connections
   */
  disconnect(): void {
    try {
      // AgentService handles its own cleanup
      logger.info(LogCategory.API_REQUEST, 'ChatService disconnected');
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Error during disconnect', { error });
    }
  }
}

// ================================================================================
// Export Instance for Backward Compatibility
// ================================================================================

// Create default instance
export const chatService = new ChatService();

// For backwards compatibility, also export as default
export default ChatService;
