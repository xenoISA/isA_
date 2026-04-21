/**
 * ============================================================================
 * Streaming State Store (useStreamingStore.ts) — Buffers, timers, typing, loading
 * ============================================================================
 *
 * Extracted from useChatStore as part of #124.
 *
 * MIGRATION NOTE (#281): The reusable streaming logic (buffer/flush, thinking,
 * task progress) has been extracted to @isa/hooks as:
 *   - useStreaming() — buffer/flush lifecycle
 *   - useThinking() — thinking accumulation
 *   - useTaskProgress() — typed task progress
 *
 * This store remains because it coordinates cross-store state (useMessageStore,
 * useSessionStore) which is isA_-specific. When @isa/hooks is published,
 * this store should delegate to the SDK hooks internally.
 *
 * Does NOT handle:
 *   - Message array CRUD or history (useMessageStore)
 *   - Task management (useMessageStore)
 *   - HIL state (useMessageStore)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { logger, LogCategory, createLogger } from '../utils/logger';

const log = createLogger('StreamingStore', LogCategory.CHAT_FLOW);

import { useMessageStore } from './useMessageStore';
import { useSessionStore } from './useSessionStore';
import { ChatMessage } from '../types/chatTypes';
import { createContentParser, ParsedContent } from '../api/parsing/ContentParser';

// ---------------------------------------------------------------------------
// Module-level flush-timer map (previously in useChatStore.ts at module scope,
// and referenced from ChatModule.tsx).  Encapsulated here.
// ---------------------------------------------------------------------------
const _streamingFlushTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

/** Expose for external callers that need to clear all timers (e.g. clearMessages). */
export function clearAllFlushTimers(): void {
  _streamingFlushTimers.forEach(t => clearTimeout(t));
  _streamingFlushTimers.clear();
}

// ---------------------------------------------------------------------------
// State & Action interfaces
// ---------------------------------------------------------------------------

export interface StreamingStoreState {
  /** Per-message buffered chunks awaiting flush */
  streamingBuffers: Record<string, string[]>;
  /** Timestamp of last flush per message id */
  streamingLastFlush: Record<string, number>;
  /** Whether the assistant is "typing" */
  isTyping: boolean;
  /** Generic loading flag for chat operations */
  chatLoading: boolean;
  /** AbortController for the active SSE connection (set by chat module) */
  activeAbortController: AbortController | null;
  /** Whether the model is currently streaming thinking/chain-of-thought content */
  isThinking: boolean;
  /** Accumulated thinking content for the current streaming message */
  thinkingBuffer: string;
  /** Timestamp (Date.now()) when the current send began, or null if no send in flight.
   *  Used to drive the progressive warmup status stages (#278). */
  sendStartedAt: number | null;
}

export interface StreamingActions {
  setIsTyping: (typing: boolean) => void;
  setChatLoading: (loading: boolean) => void;

  startStreamingMessage: (id: string, status?: string) => void;
  appendToStreamingMessage: (content: string) => void;
  finishStreamingMessage: () => void;
  updateStreamingStatus: (status: string) => void;
  /** Abort the active SSE connection and finalize the partial response as-is. */
  stopStreaming: () => void;
  /** Register the AbortController for the current SSE connection so stopStreaming can abort it. */
  setActiveAbortController: (controller: AbortController | null) => void;

  // Thinking (extended thinking / chain-of-thought) lifecycle
  startThinking: () => void;
  appendThinkingContent: (delta: string) => void;
  finishThinking: () => void;

  /** Mark the moment the user pressed Send, or null to clear. */
  setSendStartedAt: (ts: number | null) => void;
}

export type StreamingStore = StreamingStoreState & StreamingActions;

// ---------------------------------------------------------------------------
// Store creation
// ---------------------------------------------------------------------------

export const useStreamingStore = create<StreamingStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    streamingBuffers: {},
    streamingLastFlush: {},
    isTyping: false,
    chatLoading: false,
    activeAbortController: null,
    isThinking: false,
    thinkingBuffer: '',
    sendStartedAt: null,

    setIsTyping: (typing) => {
      set({ isTyping: typing });
    },

    setChatLoading: (loading) => {
      set({ chatLoading: loading });
    },

    // -------------------------------------------------------------------
    // Streaming message lifecycle
    // -------------------------------------------------------------------
    // NOTE: Streaming operations mutate the *messages* array that lives in
    // useMessageStore.  We access it via getState() to keep the two stores
    // loosely coupled.  The streaming *buffers* and *timers* stay here.
    // -------------------------------------------------------------------

    startStreamingMessage: (id, status = '正在生成回应') => {
      const messageStore = useMessageStore.getState();

      // Finish any existing streaming messages
      const updatedMessages = messageStore.messages.map(msg =>
        msg.isStreaming ? { ...msg, isStreaming: false, streamingStatus: undefined } : msg
      );

      const sessionStore = useSessionStore.getState();
      const currentSession = sessionStore.getCurrentSession();

      const streamingMessage: ChatMessage = {
        id,
        role: 'assistant' as const,
        type: 'regular',
        content: '',
        timestamp: new Date().toISOString(),
        sessionId: currentSession?.id || 'default',
        isStreaming: true,
        streamingStatus: status
      };

      const newMessages = [...updatedMessages, streamingMessage];

      // Write messages back to message store
      useMessageStore.setState({ messages: newMessages });

      // Update local buffers
      set((state) => ({
        streamingBuffers: { ...state.streamingBuffers, [id]: [] },
        streamingLastFlush: { ...state.streamingLastFlush, [id]: Date.now() }
      }));

      logger.debug(LogCategory.CHAT_FLOW, 'Streaming message started', { id, status });
    },

    appendToStreamingMessage: (content) => {
      let flushedMessageId: string | null = null;
      const messageStore = useMessageStore.getState();
      const messages = messageStore.messages;
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage || !lastMessage.isStreaming) return;

      const messageId = lastMessage.id;

      set((state) => {
        const existingBuffer = state.streamingBuffers[messageId] || [];
        const updatedBuffer = [...existingBuffer, content];

        const now = Date.now();
        const lastFlush = state.streamingLastFlush[messageId] || 0;
        const shouldFlush = updatedBuffer.length >= 20 || now - lastFlush >= 50;
        const flushContent = shouldFlush ? updatedBuffer.join('') : '';
        const nextBuffer = shouldFlush ? [] : updatedBuffer;

        if (shouldFlush) {
          flushedMessageId = messageId;
        } else {
          flushedMessageId = null;
        }

        if (shouldFlush) {
          // Flush content into the message store's messages array
          const msgs = useMessageStore.getState().messages;
          const last = msgs[msgs.length - 1];
          if (last && last.id === messageId && last.isStreaming) {
            const updatedMsgs = [...msgs];
            if (last.type === 'regular') {
              updatedMsgs[updatedMsgs.length - 1] = { ...last, content: last.content + flushContent };
            } else if (last.type === 'artifact') {
              const currentArtifactContent = typeof last.artifact.content === 'string' ? last.artifact.content : '';
              updatedMsgs[updatedMsgs.length - 1] = { ...last, artifact: { ...last.artifact, content: currentArtifactContent + flushContent } };
            }
            useMessageStore.setState({ messages: updatedMsgs });
          }
        }

        return {
          streamingBuffers: { ...state.streamingBuffers, [messageId]: nextBuffer },
          streamingLastFlush: shouldFlush
            ? { ...state.streamingLastFlush, [messageId]: now }
            : state.streamingLastFlush
        };
      });

      // Manage auto-flush timer
      const mid = messageId;
      const existing = _streamingFlushTimers.get(mid);
      if (existing) clearTimeout(existing);

      if (!flushedMessageId) {
        const timer = setTimeout(() => {
          _streamingFlushTimers.delete(mid);
          const sState = get();
          const buf = sState.streamingBuffers[mid];
          if (!buf || buf.length === 0) return;
          const flushContent = buf.join('');

          const msgs = useMessageStore.getState().messages;
          const msg = msgs[msgs.length - 1];
          if (!msg || msg.id !== mid || !msg.isStreaming) return;

          const updatedMessages = [...msgs];
          if (msg.type === 'regular') {
            updatedMessages[updatedMessages.length - 1] = { ...msg, content: msg.content + flushContent };
          } else if (msg.type === 'artifact' && typeof msg.artifact.content === 'string') {
            updatedMessages[updatedMessages.length - 1] = { ...msg, artifact: { ...msg.artifact, content: msg.artifact.content + flushContent } };
          }
          useMessageStore.setState({ messages: updatedMessages });

          set((s) => ({
            streamingBuffers: { ...s.streamingBuffers, [mid]: [] },
            streamingLastFlush: { ...s.streamingLastFlush, [mid]: Date.now() },
          }));
        }, 100);
        _streamingFlushTimers.set(mid, timer);
      } else {
        _streamingFlushTimers.delete(mid);
      }
    },

    finishStreamingMessage: () => {
      const messageStore = useMessageStore.getState();
      const messages = messageStore.messages;
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || !lastMessage.isStreaming) return;

      const messageId = lastMessage.id;

      // Clear pending timer
      const pendingTimer = _streamingFlushTimers.get(messageId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        _streamingFlushTimers.delete(messageId);
      }

      const state = get();
      const buffer = state.streamingBuffers[messageId] || [];
      const flushContent = buffer.length > 0 ? buffer.join('') : '';

      const finalizedMessage =
        lastMessage.type === 'regular'
          ? { ...lastMessage, content: lastMessage.content + flushContent }
          : lastMessage.type === 'artifact'
            ? {
                ...lastMessage,
                artifact: {
                  ...lastMessage.artifact,
                  content:
                    (typeof lastMessage.artifact.content === 'string'
                      ? lastMessage.artifact.content
                      : '') + flushContent
                }
              }
            : lastMessage;

      // Parse content for regular messages
      let parsedContent: ParsedContent | undefined;
      if (finalizedMessage.type === 'regular' && finalizedMessage.content) {
        try {
          const contentParser = createContentParser();
          parsedContent = contentParser.parse(finalizedMessage.content) || undefined;
        } catch (error) {
          log.warn('Failed to parse content', error);
        }
      }

      const finishedMessage = {
        ...finalizedMessage,
        isStreaming: false,
        streamingStatus: undefined,
        ...(finalizedMessage.type === 'regular' && parsedContent && {
          parsedContent
        })
      };

      const updatedMessages = [...messages];
      updatedMessages[updatedMessages.length - 1] = finishedMessage;

      // Write back to message store
      useMessageStore.setState({ messages: updatedMessages });

      // Sync to session
      const sessionStore = useSessionStore.getState();
      const currentSession = sessionStore.getCurrentSession();
      if (currentSession) {
        let messageWithFlag: ChatMessage;

        if (finishedMessage.type === 'regular') {
          messageWithFlag = {
            ...finishedMessage,
            metadata: { ...finishedMessage.metadata, _skipSessionSync: true }
          };
        } else {
          messageWithFlag = { ...finishedMessage } as ChatMessage;
        }

        sessionStore.addMessage(currentSession.id, messageWithFlag);
        logger.debug(LogCategory.CHAT_FLOW, 'Finished streaming message synced to session', {
          messageId: finishedMessage.id,
          sessionId: currentSession.id
        });
      }

      // Clear buffers
      set((s) => {
        const nextBuffers = { ...s.streamingBuffers };
        const nextLastFlush = { ...s.streamingLastFlush };
        delete nextBuffers[messageId];
        delete nextLastFlush[messageId];
        return { streamingBuffers: nextBuffers, streamingLastFlush: nextLastFlush };
      });

      logger.debug(LogCategory.CHAT_FLOW, 'Streaming message finished');
    },

    setActiveAbortController: (controller) => {
      set({ activeAbortController: controller });
    },

    stopStreaming: () => {
      const state = get();

      // 1. Abort the SSE connection
      if (state.activeAbortController) {
        state.activeAbortController.abort();
        set({ activeAbortController: null });
      }

      // 2. Finalize the partial streaming message as-is
      const { finishStreamingMessage } = get();
      finishStreamingMessage();

      // 3. Reset typing and loading states
      set({ isTyping: false, chatLoading: false });

      log.info('Streaming stopped by user');
    },

    updateStreamingStatus: (status) => {
      const messageStore = useMessageStore.getState();
      const messages = messageStore.messages;
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || !lastMessage.isStreaming) return;

      const updatedMessages = [...messages];
      updatedMessages[updatedMessages.length - 1] = { ...lastMessage, streamingStatus: status };
      useMessageStore.setState({ messages: updatedMessages });

      logger.debug(LogCategory.CHAT_FLOW, 'Streaming status updated', { status });
    },

    // Thinking lifecycle (#186)
    startThinking: () => {
      set({ isThinking: true, thinkingBuffer: '' });
    },

    appendThinkingContent: (delta) => {
      set((state) => ({ thinkingBuffer: state.thinkingBuffer + delta }));
    },

    finishThinking: () => {
      const { thinkingBuffer } = get();
      // Attach thinking content to the current streaming message
      if (thinkingBuffer) {
        const messageStore = useMessageStore.getState();
        const messages = messageStore.messages;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.isStreaming && lastMessage.type === 'regular') {
          const updatedMessages = [...messages];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            thinkingContent: thinkingBuffer,
          } as typeof lastMessage;
          useMessageStore.setState({ messages: updatedMessages });
        }
      }
      set({ isThinking: false, thinkingBuffer: '' });
    },

    setSendStartedAt: (ts) => {
      set({ sendStartedAt: ts });
    },
  }))
);
