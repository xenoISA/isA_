/**
 * ============================================================================
 * useTaskFromChat Hook — Create tasks from chat messages
 * ============================================================================
 *
 * Bridges the task scheduling service with the task store so that Mate can
 * create tasks when a user says "remind me to ..." or "schedule a task ...".
 *
 * Usage in ChatModule / message handlers:
 *
 *   const { handleTaskCreation } = useTaskFromChat();
 *   const result = handleTaskCreation(userMessage);
 *   if (result) {
 *     // show confirmation to user
 *   }
 */

import { useCallback } from 'react';
import { useTaskStore } from '../stores/useTaskStore';
import { detectTaskIntent, type TaskIntent } from '../services/taskSchedulingService';
import { createLogger, LogCategory } from '../utils/logger';
import type { TaskPriority } from '../types/taskTypes';

const log = createLogger('useTaskFromChat', LogCategory.TASK_MANAGEMENT);

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface TaskCreationResult {
  /** The local task ID created in the store */
  taskId: string;
  /** Parsed intent data */
  intent: TaskIntent;
  /** Whether backend sync was attempted */
  syncAttempted: boolean;
  /** Remote task ID if sync succeeded (null otherwise) */
  remoteTaskId: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTaskFromChat() {
  const createTask = useTaskStore((s) => s.createTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const syncTaskToBackend = useTaskStore((s) => s.syncTaskToBackend);

  /**
   * Inspect a chat message for task intent. If detected, create a task in the
   * store and optionally sync to the backend.
   *
   * @returns  TaskCreationResult if a task was created, `null` otherwise.
   */
  const handleTaskCreation = useCallback(
    async (message: string): Promise<TaskCreationResult | null> => {
      const intent = detectTaskIntent(message);

      if (!intent.isTask || !intent.title) {
        return null;
      }

      log.info(`Task intent detected: "${intent.title}"`, {
        dueDate: intent.dueDate,
        priority: intent.priority,
      });

      // Create local task
      const taskId = createTask(intent.title, 'custom', {
        source: 'chat',
        dueDate: intent.dueDate,
        scheduledPriority: intent.priority,
      });

      // Apply priority if non-default
      if (intent.priority && intent.priority !== 'normal') {
        updateTask(taskId, { priority: intent.priority as TaskPriority });
      }

      // Best-effort backend sync
      let remoteTaskId: string | null = null;
      let syncAttempted = false;
      try {
        syncAttempted = true;
        remoteTaskId = await syncTaskToBackend(taskId);
        if (remoteTaskId) {
          log.info('Task synced to backend', { taskId, remoteTaskId });
        }
      } catch (err) {
        log.warn('Backend sync failed (best-effort)', { taskId, error: err });
      }

      return {
        taskId,
        intent,
        syncAttempted,
        remoteTaskId,
      };
    },
    [createTask, updateTask, syncTaskToBackend],
  );

  return { handleTaskCreation, detectTaskIntent };
}
