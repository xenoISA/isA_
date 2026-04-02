/**
 * ============================================================================
 * Message State Store (useMessageStore.ts) — Messages, tasks, HIL state
 * ============================================================================
 *
 * Extracted from useChatStore as part of #124.
 *
 * Responsibilities:
 *   - Chat message array (CRUD, history, session sync)
 *   - Autonomous message insertion (no active streaming required)
 *   - Task management state (currentTasks, taskProgress, execution flags)
 *   - HIL (Human-in-the-Loop) state and operations
 *
 * Does NOT handle:
 *   - Streaming buffers / flush timers (useStreamingStore)
 *   - Typing & loading indicators (useStreamingStore)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { logger, LogCategory, createLogger } from '../utils/logger';

const log = createLogger('MessageStore', LogCategory.CHAT_FLOW);

import { getChatServiceInstance } from '../hooks/useChatService';
import { ChatMessage, StreamingStatus } from '../types/chatTypes';
import { useUserStore } from './useUserStore';
import { useSessionStore } from './useSessionStore';
import { GATEWAY_CONFIG, GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { authTokenStore } from './authTokenStore';
import { TaskItem, TaskProgress } from '../types/taskTypes';
import { HILInterruptDetectedEvent, HILCheckpointCreatedEvent, HILExecutionStatusData } from '../types/aguiTypes';

// ---------------------------------------------------------------------------
// State & Action interfaces
// ---------------------------------------------------------------------------

export interface MessageStoreState {
  /** Chat messages (includes in-progress streaming messages) */
  messages: ChatMessage[];

  // Task management
  currentTasks: TaskItem[];
  taskProgress: TaskProgress | null;
  isExecutingPlan: boolean;
  hasExecutedTasks: boolean;

  // HIL (Human-in-the-Loop)
  hilStatus: 'idle' | 'waiting_for_human' | 'processing_response' | 'error';
  currentHILInterrupt: HILInterruptDetectedEvent | null;
  hilHistory: HILInterruptDetectedEvent[];
  hilCheckpoints: HILCheckpointCreatedEvent[];
  currentThreadId: string | null;
}

export interface MessageActions {
  // Message CRUD
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  loadMessagesFromSession: (sessionId?: string) => void;

  /** Insert a message without requiring an active streaming session. */
  insertAutonomousMessage: (message: ChatMessage) => void;

  // Task management
  updateTaskList: (tasks: TaskItem[]) => void;
  updateTaskProgress: (progress: TaskProgress | null) => void;
  updateTaskStatus: (taskId: string, status: TaskItem['status'], result?: any) => void;
  setExecutingPlan: (executing: boolean) => void;
  clearTasks: () => void;
  resetTaskHistory: () => void;

  // HIL
  setHILStatus: (status: 'idle' | 'waiting_for_human' | 'processing_response' | 'error') => void;
  setCurrentHILInterrupt: (interrupt: HILInterruptDetectedEvent | null) => void;
  addHILToHistory: (interrupt: HILInterruptDetectedEvent) => void;
  addHILCheckpoint: (checkpoint: HILCheckpointCreatedEvent) => void;
  setCurrentThreadId: (threadId: string | null) => void;
  clearHILState: () => void;
  resumeHILExecution: (sessionId: string, resumeValue: any, token?: string) => Promise<void>;
  checkExecutionStatus: (sessionId: string, token?: string) => Promise<any>;
}

export type MessageStore = MessageStoreState & MessageActions;

// ---------------------------------------------------------------------------
// Store creation
// ---------------------------------------------------------------------------

export const useMessageStore = create<MessageStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    messages: [],

    currentTasks: [],
    taskProgress: null,
    isExecutingPlan: false,
    hasExecutedTasks: false,

    hilStatus: 'idle',
    currentHILInterrupt: null,
    hilHistory: [],
    hilCheckpoints: [],
    currentThreadId: null,

    // -------------------------------------------------------------------
    // Message operations
    // -------------------------------------------------------------------

    addMessage: (message) => {
      set((state) => {
        const existingIndex = state.messages.findIndex(m => m.id === message.id);
        if (existingIndex >= 0) {
          const newMessages = [...state.messages];
          newMessages[existingIndex] = message;
          return { messages: newMessages };
        } else {
          return { messages: [...state.messages, message] };
        }
      });

      // Sync to current session
      if (!('metadata' in message && message.metadata?._skipSessionSync)) {
        const sessionStore = useSessionStore.getState();
        const currentSession = sessionStore.getCurrentSession();
        if (currentSession) {
          const messageWithFlag = { ...message, metadata: { ...('metadata' in message ? message.metadata : {}), _skipSessionSync: true } };
          sessionStore.addMessage(currentSession.id, messageWithFlag);
        }
      }

      logger.info(LogCategory.CHAT_FLOW, 'Message added/updated in message store and session', {
        messageId: message.id,
        role: message.role,
        contentLength: ('content' in message && message.content) ? message.content.length : 0
      });
    },

    clearMessages: () => {
      set({ messages: [] });

      const sessionStore = useSessionStore.getState();
      const currentSession = sessionStore.getCurrentSession();
      if (currentSession) {
        sessionStore.clearMessages(currentSession.id);
      }

      logger.info(LogCategory.CHAT_FLOW, 'Messages cleared from message store and session', {
        sessionId: currentSession?.id
      });
    },

    loadMessagesFromSession: (sessionId?: string) => {
      const sessionStore = useSessionStore.getState();
      const session = sessionId
        ? sessionStore.getSessionById(sessionId)
        : sessionStore.getCurrentSession();

      if (session?.messages) {
        const messagesWithFlag = session.messages.map(msg => ({
          ...msg,
          metadata: { ...('metadata' in msg ? msg.metadata : {}), _skipSessionSync: true }
        }));
        set({ messages: messagesWithFlag as ChatMessage[] });
        logger.info(LogCategory.CHAT_FLOW, 'Messages loaded from session to message store', {
          sessionId: session.id,
          messageCount: session.messages.length
        });
      } else {
        set({ messages: [] });
        logger.info(LogCategory.CHAT_FLOW, 'No messages to load from session', {
          sessionId: session?.id || 'none'
        });
      }
    },

    insertAutonomousMessage: (message) => {
      // Add message without any streaming session requirement
      set((state) => {
        const existingIndex = state.messages.findIndex(m => m.id === message.id);
        if (existingIndex >= 0) {
          const newMessages = [...state.messages];
          newMessages[existingIndex] = message;
          return { messages: newMessages };
        } else {
          return { messages: [...state.messages, message] };
        }
      });

      // Sync to session
      if (!('metadata' in message && message.metadata?._skipSessionSync)) {
        const sessionStore = useSessionStore.getState();
        const currentSession = sessionStore.getCurrentSession();
        if (currentSession) {
          const messageWithFlag = { ...message, metadata: { ...('metadata' in message ? message.metadata : {}), _skipSessionSync: true } };
          sessionStore.addMessage(currentSession.id, messageWithFlag);
        }
      }

      logger.info(LogCategory.CHAT_FLOW, 'Autonomous message inserted', {
        messageId: message.id,
        role: message.role,
        contentLength: ('content' in message && message.content) ? message.content.length : 0
      });
    },

    // -------------------------------------------------------------------
    // Task management
    // -------------------------------------------------------------------

    updateTaskList: (tasks) => {
      set({ currentTasks: tasks });
      logger.info(LogCategory.CHAT_FLOW, 'Task list updated', { taskCount: tasks.length });
    },

    updateTaskProgress: (progress) => {
      set({ taskProgress: progress });
      if (progress) {
        logger.info(LogCategory.CHAT_FLOW, 'Task progress updated', {
          step: progress.currentStep,
          stepName: progress.currentStepName,
          total: progress.totalSteps,
          percentage: progress.percentage
        });
      }
    },

    updateTaskStatus: (taskId, status, result) => {
      set((state) => ({
        currentTasks: state.currentTasks.map(task =>
          task.id === taskId
            ? { ...task, status, result, updatedAt: new Date().toISOString() }
            : task
        )
      }));
      logger.info(LogCategory.CHAT_FLOW, 'Task status updated', { taskId, status });
    },

    setExecutingPlan: (executing) => {
      set((state) => ({
        isExecutingPlan: executing,
        hasExecutedTasks: executing ? true : state.hasExecutedTasks
      }));
      if (executing) {
        logger.debug(LogCategory.CHAT_FLOW, 'Message processing started');
      } else {
        logger.debug(LogCategory.CHAT_FLOW, 'Message processing completed');
      }
    },

    clearTasks: () => {
      set({
        currentTasks: [],
        taskProgress: null,
        isExecutingPlan: false,
        hilStatus: 'idle',
        currentHILInterrupt: null
      });
      logger.info(LogCategory.CHAT_FLOW, 'Tasks and HIL state cleared');
    },

    resetTaskHistory: () => {
      set({
        hasExecutedTasks: false,
        currentTasks: [],
        taskProgress: null,
        isExecutingPlan: false,
        hilStatus: 'idle',
        currentHILInterrupt: null,
        hilHistory: [],
        hilCheckpoints: [],
        currentThreadId: null
      });
      logger.info(LogCategory.CHAT_FLOW, 'Task history and HIL state reset for new session');
    },

    // -------------------------------------------------------------------
    // HIL operations
    // -------------------------------------------------------------------

    setHILStatus: (status) => {
      set({ hilStatus: status });
      logger.info(LogCategory.CHAT_FLOW, 'HIL status updated', { status });
    },

    setCurrentHILInterrupt: (interrupt) => {
      set({ currentHILInterrupt: interrupt });
      if (interrupt) {
        logger.info(LogCategory.CHAT_FLOW, 'Current HIL interrupt set', {
          threadId: interrupt.thread_id,
          type: interrupt.type,
          timestamp: interrupt.timestamp
        });
      } else {
        logger.info(LogCategory.CHAT_FLOW, 'Current HIL interrupt cleared');
      }
    },

    addHILToHistory: (interrupt) => {
      set((state) => ({
        hilHistory: [...state.hilHistory, interrupt]
      }));
      logger.info(LogCategory.CHAT_FLOW, 'HIL interrupt added to history', {
        threadId: interrupt.thread_id,
        type: interrupt.type,
        historyCount: get().hilHistory.length + 1
      });
    },

    addHILCheckpoint: (checkpoint) => {
      set((state) => ({
        hilCheckpoints: [...state.hilCheckpoints, checkpoint]
      }));
      logger.info(LogCategory.CHAT_FLOW, 'HIL checkpoint added', {
        threadId: checkpoint.thread_id,
        type: checkpoint.type,
        checkpointCount: get().hilCheckpoints.length + 1
      });
    },

    setCurrentThreadId: (threadId) => {
      set({ currentThreadId: threadId });
      logger.info(LogCategory.CHAT_FLOW, 'Current thread ID updated', { threadId });
    },

    clearHILState: () => {
      set({
        hilStatus: 'idle',
        currentHILInterrupt: null,
        hilHistory: [],
        hilCheckpoints: [],
        currentThreadId: null
      });
      logger.info(LogCategory.CHAT_FLOW, 'HIL state cleared');
    },

    // HIL Resume (based on actual tested API)
    resumeHILExecution: async (sessionId: string, resumeValue: any, token?: string) => {
      const {
        setHILStatus,
        setCurrentHILInterrupt,
        setExecutingPlan
      } = get();

      // We need streaming actions from the streaming store — import lazily
      // to avoid circular dependency at module level.
      const { useStreamingStore } = await import('./useStreamingStore');
      const {
        startStreamingMessage,
        appendToStreamingMessage,
        finishStreamingMessage,
        updateStreamingStatus
      } = useStreamingStore.getState();
      const {
        updateTaskProgress,
        updateTaskList,
        updateTaskStatus
      } = get();

      try {
        logger.info(LogCategory.CHAT_FLOW, 'Starting HIL resume execution', {
          sessionId,
          resumeValueType: typeof resumeValue
        });

        setHILStatus('processing_response');

        let chatService = getChatServiceInstance();
        if (!chatService) {
          throw new Error('ChatService not available for HIL resume');
        }

        const authToken = token || authTokenStore.getToken() || null;
        if (!authToken) {
          throw new Error('No auth token available for HIL resume');
        }

        const userStore = useUserStore.getState();
        const eu = userStore.externalUser as Record<string, any> | null;
        const userId = eu?.auth0_id || eu?.sub || eu?.user_id || eu?.id || '';
        if (!userId) {
          throw new Error('No user ID available for HIL resume');
        }

        const isStructured = typeof resumeValue !== 'string';
        const message = isStructured ? 'HIL resume' : resumeValue;
        await chatService.resumeHIL(message, {
          user_id: userId,
          session_id: sessionId,
          prompt_args: isStructured ? resumeValue : undefined,
        }, authToken, {
          onStreamStart: (messageId: string, status?: string) => {
            startStreamingMessage(messageId, status || '🔄 Resuming HIL execution...');
            setExecutingPlan(true);
          },
          onStreamContent: (contentChunk: string) => {
            appendToStreamingMessage(contentChunk);
          },
          onStreamStatus: (status: string) => {
            updateStreamingStatus(status);
          },
          onStreamComplete: () => {
            finishStreamingMessage();
            setHILStatus('idle');
            setCurrentHILInterrupt(null);
            setExecutingPlan(false);
            logger.info(LogCategory.CHAT_FLOW, 'HIL resume execution completed successfully');
          },
          onTaskProgress: (progress) => {
            updateTaskProgress(progress);
          },
          onTaskListUpdate: (tasks) => {
            updateTaskList(tasks);
          },
          onTaskStatusUpdate: (taskId: string, status: string, result?: any) => {
            updateTaskStatus(taskId, status as any, result);
          },
          onBillingUpdate: (billingData: any) => {
            if (typeof billingData.creditsRemaining === 'number') {
              useUserStore.getState().updateCredits(billingData.creditsRemaining, 'billing');
              logger.info(LogCategory.CHAT_FLOW, 'User credits updated from billing event', {
                creditsRemaining: billingData.creditsRemaining,
                modelCalls: billingData.modelCalls,
                toolCalls: billingData.toolCalls
              });
            }
          },
          onHILInterruptDetected: (hilEvent: any) => {
            setHILStatus('waiting_for_human');
            setCurrentHILInterrupt(hilEvent);
            logger.info(LogCategory.CHAT_FLOW, 'Nested HIL interrupt during resume', {
              threadId: hilEvent.thread_id,
              type: hilEvent.type
            });
          },
          onError: (error: Error) => {
            logger.error(LogCategory.CHAT_FLOW, 'HIL resume execution failed', {
              error: error.message,
              sessionId
            });
            finishStreamingMessage();
            setHILStatus('error');
            setExecutingPlan(false);
          }
        });

      } catch (error) {
        logger.error(LogCategory.CHAT_FLOW, 'Failed to start HIL resume execution', {
          error,
          sessionId
        });
        setHILStatus('error');
        throw error;
      }
    },

    // Execution Status monitoring (based on actual tested API)
    checkExecutionStatus: async (sessionId: string, token?: string) => {
      try {
        logger.info(LogCategory.CHAT_FLOW, 'Checking execution status', { sessionId });

        const authToken = token || authTokenStore.getToken() || null;
        if (!authToken) {
          throw new Error('No auth token available for execution status check');
        }

        const res = await fetch(`${GATEWAY_ENDPOINTS.AGENTS.EXECUTION.STATUS}/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errorMsg = `Execution status check failed with HTTP ${res.status}`;
          if (res.status === 401) {
            logger.error(LogCategory.CHAT_FLOW, 'Auth expired during execution status check', { sessionId, status: res.status });
            throw new Error('Authentication expired — please log in again');
          }
          logger.error(LogCategory.CHAT_FLOW, errorMsg, { sessionId, status: res.status });
          throw new Error(errorMsg);
        }

        const statusData = await res.json();

        logger.info(LogCategory.CHAT_FLOW, 'Execution status retrieved', {
          sessionId,
          status: statusData.status,
        });

        const { setHILStatus, setCurrentHILInterrupt } = get();
        if (statusData.status === 'interrupted' || statusData.status === 'waiting_for_human') {
          setHILStatus('waiting_for_human');
          if (statusData.interrupt || statusData.interrupts?.[0]) {
            setCurrentHILInterrupt(statusData.interrupt || statusData.interrupts[0]);
          }
        } else if (statusData.status === 'completed' || statusData.status === 'idle') {
          setHILStatus('idle');
          setCurrentHILInterrupt(null);
        }

        return statusData;

      } catch (error) {
        logger.error(LogCategory.CHAT_FLOW, 'Failed to check execution status', {
          error,
          sessionId
        });
        throw error;
      }
    }
  }))
);
