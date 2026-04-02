/**
 * ============================================================================
 * Chat Store Facade (useChatStore.ts) — Backward-compatible composition
 * ============================================================================
 *
 * After the split (#124), the actual state lives in:
 *   - useMessageStore  — messages, tasks, HIL
 *   - useStreamingStore — buffers, flush timers, typing, loading
 *
 * This file re-exports a composed `useChatStore` hook so that **existing
 * imports continue to work unchanged**.  New code should import directly
 * from useMessageStore or useStreamingStore for narrower subscriptions.
 *
 * The composed store is NOT a Zustand store itself — it is a custom hook
 * that subscribes to both underlying stores and returns the merged shape.
 */

import { useCallback, useMemo } from 'react';
import { useMessageStore, type MessageStore } from './useMessageStore';
import { useStreamingStore, clearAllFlushTimers, type StreamingStore } from './useStreamingStore';
import { ChatMessage, StreamingStatus } from '../types/chatTypes';
import { TaskItem, TaskProgress } from '../types/taskTypes';
import { HILInterruptDetectedEvent, HILCheckpointCreatedEvent } from '../types/aguiTypes';

// ---------------------------------------------------------------------------
// Re-export the underlying stores for direct use
// ---------------------------------------------------------------------------
export { useMessageStore } from './useMessageStore';
export { useStreamingStore, clearAllFlushTimers } from './useStreamingStore';
export type { MessageStore } from './useMessageStore';
export type { StreamingStore } from './useStreamingStore';

// ---------------------------------------------------------------------------
// Composed ChatStore type (union of both stores)
// ---------------------------------------------------------------------------

export type ChatStore = MessageStore & StreamingStore;

// ---------------------------------------------------------------------------
// Backward-compatible composed hook
// ---------------------------------------------------------------------------

/**
 * Backward-compatible hook that merges useMessageStore and useStreamingStore.
 *
 * Accepts an optional selector for fine-grained subscriptions.  When called
 * without a selector the full merged state+actions object is returned.
 */
export function useChatStore(): ChatStore;
export function useChatStore<T>(selector: (state: ChatStore) => T): T;
export function useChatStore<T>(selector?: (state: ChatStore) => T): T | ChatStore {
  const messageState = useMessageStore();
  const streamingState = useStreamingStore();

  // Compose a clearMessages that also clears flush timers (original behavior)
  const clearMessages = useCallback(() => {
    clearAllFlushTimers();
    messageState.clearMessages();
  }, [messageState]);

  const composed: ChatStore = useMemo(() => ({
    ...messageState,
    ...streamingState,
    // Override clearMessages to also clear flush timers
    clearMessages,
  }), [messageState, streamingState, clearMessages]);

  if (selector) {
    return selector(composed);
  }
  return composed;
}

/**
 * Static getState() equivalent — reads from both stores synchronously.
 * This is used by imperative code (event handlers, callbacks) that calls
 * `useChatStore.getState()`.
 */
useChatStore.getState = (): ChatStore => {
  const messageState = useMessageStore.getState();
  const streamingState = useStreamingStore.getState();
  return {
    ...messageState,
    ...streamingState,
    clearMessages: () => {
      clearAllFlushTimers();
      messageState.clearMessages();
    },
  };
};

/**
 * Static setState() — delegates to the appropriate underlying store.
 * Only the fields relevant to each store are forwarded.
 */
useChatStore.setState = (partial: Partial<ChatStore>) => {
  // Split the partial into message-store and streaming-store fields
  const messageKeys: Array<keyof MessageStore> = [
    'messages', 'currentTasks', 'taskProgress', 'isExecutingPlan',
    'hasExecutedTasks', 'hilStatus', 'currentHILInterrupt', 'hilHistory',
    'hilCheckpoints', 'currentThreadId',
    // actions
    'addMessage', 'clearMessages', 'loadMessagesFromSession',
    'insertAutonomousMessage', 'updateTaskList', 'updateTaskProgress',
    'updateTaskStatus', 'setExecutingPlan', 'clearTasks', 'resetTaskHistory',
    'setHILStatus', 'setCurrentHILInterrupt', 'addHILToHistory',
    'addHILCheckpoint', 'setCurrentThreadId', 'clearHILState',
    'resumeHILExecution', 'checkExecutionStatus',
  ];

  const msgPartial: Record<string, unknown> = {};
  const strmPartial: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(partial)) {
    if (messageKeys.includes(key as keyof MessageStore)) {
      msgPartial[key] = value;
    } else {
      strmPartial[key] = value;
    }
  }

  if (Object.keys(msgPartial).length > 0) {
    useMessageStore.setState(msgPartial as Partial<MessageStore>);
  }
  if (Object.keys(strmPartial).length > 0) {
    useStreamingStore.setState(strmPartial as Partial<StreamingStore>);
  }
};

/**
 * subscribe() — subscribes to changes on both underlying stores.
 * Returns a combined unsubscribe function.
 */
useChatStore.subscribe = (listener: (state: ChatStore, prevState: ChatStore) => void) => {
  let prev = useChatStore.getState();
  const handler = () => {
    const next = useChatStore.getState();
    listener(next, prev);
    prev = next;
  };
  const unsub1 = useMessageStore.subscribe(handler);
  const unsub2 = useStreamingStore.subscribe(handler);
  return () => { unsub1(); unsub2(); };
};

// ---------------------------------------------------------------------------
// Selector hooks (backward-compatible re-exports)
// ---------------------------------------------------------------------------

// Messages
export const useChatMessages = () => useMessageStore(state => state.messages);
export const useChatTyping = () => useStreamingStore(state => state.isTyping);
export const useChatLoading = () => useStreamingStore(state => state.chatLoading);

// Task selectors
export const useCurrentTasks = () => useMessageStore(state => state.currentTasks);
export const useTaskProgress = () => useMessageStore(state => state.taskProgress);
export const useIsExecutingPlan = () => useMessageStore(state => state.isExecutingPlan);
export const useHasExecutedTasks = () => useMessageStore(state => state.hasExecutedTasks);

// HIL selectors
export const useHILStatus = () => useMessageStore(state => state.hilStatus);
export const useCurrentHILInterrupt = () => useMessageStore(state => state.currentHILInterrupt);
export const useHILHistory = () => useMessageStore(state => state.hilHistory);
export const useHILCheckpoints = () => useMessageStore(state => state.hilCheckpoints);
export const useCurrentThreadId = () => useMessageStore(state => state.currentThreadId);

// Chat actions bundle (streaming + message)
export const useChatActions = () => {
  const addMessage = useMessageStore(s => s.addMessage);
  const clearMessages = useMessageStore(s => s.clearMessages);
  const setIsTyping = useStreamingStore(s => s.setIsTyping);
  const setChatLoading = useStreamingStore(s => s.setChatLoading);
  const startStreamingMessage = useStreamingStore(s => s.startStreamingMessage);
  const finishStreamingMessage = useStreamingStore(s => s.finishStreamingMessage);
  const appendToStreamingMessage = useStreamingStore(s => s.appendToStreamingMessage);
  const updateStreamingStatus = useStreamingStore(s => s.updateStreamingStatus);

  return useMemo(() => ({
    addMessage,
    setIsTyping,
    setChatLoading,
    clearMessages,
    startStreamingMessage,
    finishStreamingMessage,
    appendToStreamingMessage,
    updateStreamingStatus
  }), [addMessage, setIsTyping, setChatLoading, clearMessages, startStreamingMessage, finishStreamingMessage, appendToStreamingMessage, updateStreamingStatus]);
};

// Task actions bundle
export const useTaskActions = () => {
  const updateTaskList = useMessageStore(s => s.updateTaskList);
  const updateTaskProgress = useMessageStore(s => s.updateTaskProgress);
  const updateTaskStatus = useMessageStore(s => s.updateTaskStatus);
  const setExecutingPlan = useMessageStore(s => s.setExecutingPlan);
  const clearTasks = useMessageStore(s => s.clearTasks);
  const resetTaskHistory = useMessageStore(s => s.resetTaskHistory);

  return useMemo(() => ({
    updateTaskList,
    updateTaskProgress,
    updateTaskStatus,
    setExecutingPlan,
    clearTasks,
    resetTaskHistory
  }), [updateTaskList, updateTaskProgress, updateTaskStatus, setExecutingPlan, clearTasks, resetTaskHistory]);
};

// HIL actions bundle
export const useHILActions = () => {
  const setHILStatus = useMessageStore(s => s.setHILStatus);
  const setCurrentHILInterrupt = useMessageStore(s => s.setCurrentHILInterrupt);
  const addHILToHistory = useMessageStore(s => s.addHILToHistory);
  const addHILCheckpoint = useMessageStore(s => s.addHILCheckpoint);
  const setCurrentThreadId = useMessageStore(s => s.setCurrentThreadId);
  const clearHILState = useMessageStore(s => s.clearHILState);
  const resumeHILExecution = useMessageStore(s => s.resumeHILExecution);
  const checkExecutionStatus = useMessageStore(s => s.checkExecutionStatus);

  return useMemo(() => ({
    setHILStatus,
    setCurrentHILInterrupt,
    addHILToHistory,
    addHILCheckpoint,
    setCurrentThreadId,
    clearHILState,
    resumeHILExecution,
    checkExecutionStatus
  }), [setHILStatus, setCurrentHILInterrupt, addHILToHistory, addHILCheckpoint, setCurrentThreadId, clearHILState, resumeHILExecution, checkExecutionStatus]);
};
