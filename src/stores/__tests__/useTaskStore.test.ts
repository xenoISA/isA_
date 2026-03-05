import { describe, test, expect, beforeEach } from 'vitest';
import { useTaskStore } from '../useTaskStore';

describe('useTaskStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useTaskStore.getState().clearTasks();
  });

  describe('createTask', () => {
    test('creates a task with pending status', () => {
      const id = useTaskStore.getState().createTask('Test task', 'custom');
      const task = useTaskStore.getState().getTask(id);

      expect(task).toBeDefined();
      expect(task!.title).toBe('Test task');
      expect(task!.type).toBe('custom');
      expect(task!.status).toBe('pending');
      expect(task!.progress.percentage).toBe(0);
    });

    test('increments totalTasks', () => {
      useTaskStore.getState().createTask('A', 'custom');
      useTaskStore.getState().createTask('B', 'custom');
      expect(useTaskStore.getState().totalTasks).toBe(2);
    });

    test('chat_response tasks cannot be paused', () => {
      const id = useTaskStore.getState().createTask('Chat', 'chat_response');
      const task = useTaskStore.getState().getTask(id);
      expect(task!.canPause).toBe(false);
    });
  });

  describe('removeTask', () => {
    test('removes a task from all lists', () => {
      const id = useTaskStore.getState().createTask('To remove', 'custom');
      useTaskStore.getState().removeTask(id);

      expect(useTaskStore.getState().getTask(id)).toBeUndefined();
      expect(useTaskStore.getState().tasks).toHaveLength(0);
    });
  });

  describe('completeTask', () => {
    test('sets status to completed', () => {
      const id = useTaskStore.getState().createTask('Complete me', 'custom');
      useTaskStore.getState().completeTask(id, { success: true });

      const task = useTaskStore.getState().getTask(id);
      expect(task!.status).toBe('completed');
      expect(task!.result?.success).toBe(true);
      expect(task!.completedAt).toBeDefined();
    });
  });

  describe('failTask', () => {
    test('sets status to failed with error', () => {
      const id = useTaskStore.getState().createTask('Fail me', 'custom');
      useTaskStore.getState().failTask(id, 'something broke');

      const task = useTaskStore.getState().getTask(id);
      expect(task!.status).toBe('failed');
      expect(task!.result?.error).toBe('something broke');
      expect(task!.canRetry).toBe(true);
    });
  });

  describe('cancelTask', () => {
    test('sets status to cancelled', () => {
      const id = useTaskStore.getState().createTask('Cancel me', 'custom');
      useTaskStore.getState().cancelTask(id, 'not needed');

      const task = useTaskStore.getState().getTask(id);
      expect(task!.status).toBe('cancelled');
      expect(task!.canRetry).toBe(true);
    });

    test('ignores already completed tasks', () => {
      const id = useTaskStore.getState().createTask('Done', 'custom');
      useTaskStore.getState().completeTask(id, { success: true });
      useTaskStore.getState().cancelTask(id);

      expect(useTaskStore.getState().getTask(id)!.status).toBe('completed');
    });
  });

  describe('retryTask', () => {
    test('resets failed task to pending', () => {
      const id = useTaskStore.getState().createTask('Retry me', 'custom');
      useTaskStore.getState().failTask(id, 'error');
      useTaskStore.getState().retryTask(id);

      const task = useTaskStore.getState().getTask(id);
      expect(task!.status).toBe('pending');
      expect(task!.progress.percentage).toBe(0);
    });
  });

  describe('getTaskCount', () => {
    test('returns correct counts', () => {
      const id1 = useTaskStore.getState().createTask('A', 'custom');
      const id2 = useTaskStore.getState().createTask('B', 'custom');
      useTaskStore.getState().createTask('C', 'custom');

      useTaskStore.getState().completeTask(id1, { success: true });
      useTaskStore.getState().failTask(id2, 'err');

      const counts = useTaskStore.getState().getTaskCount();
      expect(counts.total).toBe(3);
      expect(counts.completed).toBe(1);
      expect(counts.failed).toBe(1);
    });
  });

  describe('clearTasks', () => {
    test('resets all task state', () => {
      useTaskStore.getState().createTask('A', 'custom');
      useTaskStore.getState().createTask('B', 'custom');
      useTaskStore.getState().clearTasks();

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(0);
      expect(state.totalTasks).toBe(0);
      expect(state.completedTasksCount).toBe(0);
      expect(state.failedTasksCount).toBe(0);
    });
  });

  describe('updateTaskProgress', () => {
    test('updates progress on a task', () => {
      const id = useTaskStore.getState().createTask('Progress', 'custom');
      useTaskStore.getState().updateTaskProgress(id, {
        currentStep: 2,
        totalSteps: 4,
        percentage: 50,
        currentStepName: 'Step 2',
      });

      const task = useTaskStore.getState().getTask(id);
      expect(task!.progress.percentage).toBe(50);
      expect(task!.progress.currentStep).toBe(2);
    });
  });

  describe('UI state', () => {
    test('setShowTaskPanel toggles panel visibility', () => {
      useTaskStore.getState().setShowTaskPanel(true);
      expect(useTaskStore.getState().showTaskPanel).toBe(true);

      useTaskStore.getState().setShowTaskPanel(false);
      expect(useTaskStore.getState().showTaskPanel).toBe(false);
    });

    test('setSelectedTaskId sets selection', () => {
      useTaskStore.getState().setSelectedTaskId('task_1');
      expect(useTaskStore.getState().selectedTaskId).toBe('task_1');
    });
  });
});
