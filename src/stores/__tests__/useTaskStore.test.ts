import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useTaskStore } from '../useTaskStore';

const {
  mockGetTasks,
  mockCreateTask,
  mockUpdateTask,
  mockDeleteTask,
  mockCompleteTask,
} = vi.hoisted(() => ({
  mockGetTasks: vi.fn(),
  mockCreateTask: vi.fn(),
  mockUpdateTask: vi.fn(),
  mockDeleteTask: vi.fn(),
  mockCompleteTask: vi.fn(),
}));

vi.mock('../../api/adapters/TaskAdapter', () => ({
  getTasks: mockGetTasks,
  createTask: mockCreateTask,
  updateTask: mockUpdateTask,
  deleteTask: mockDeleteTask,
  completeTask: mockCompleteTask,
}));

describe('useTaskStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useTaskStore.getState().clearTasks();
    vi.clearAllMocks();
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

  describe('backend sync', () => {
    test('syncTasks maps backend tasks into store state', async () => {
      mockGetTasks.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Synced task',
          status: 'in_progress',
          priority: 'high',
          createdAt: '2026-04-29T00:00:00Z',
          updatedAt: '2026-04-29T00:10:00Z',
        },
      ]);

      await useTaskStore.getState().syncTasks();

      const task = useTaskStore.getState().getTask('task-1');
      expect(task?.status).toBe('running');
      expect(task?.priority).toBe('high');
      expect(useTaskStore.getState().totalTasks).toBe(1);
    });

    test('createBackendTask persists a task and adds it to the store', async () => {
      mockCreateTask.mockResolvedValue({
        id: 'task-backend-1',
        title: 'Backend task',
        status: 'pending',
        priority: 'normal',
        createdAt: '2026-04-29T00:00:00Z',
        metadata: {},
      });

      const created = await useTaskStore.getState().createBackendTask({
        title: 'Backend task',
      });

      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'Backend task',
        description: undefined,
        priority: undefined,
        dueAt: undefined,
        metadata: undefined,
      });
      expect(created?.id).toBe('task-backend-1');
      expect(useTaskStore.getState().getTask('task-backend-1')?.title).toBe('Backend task');
    });

    test('syncTaskStatus completes a task through the backend', async () => {
      useTaskStore.setState({
        tasks: [
          {
            id: 'task-1',
            title: 'Task',
            type: 'background',
            status: 'pending',
            priority: 'normal',
            progress: { currentStep: 0, totalSteps: 1, percentage: 0 },
            createdAt: '2026-04-29T00:00:00Z',
            updatedAt: '2026-04-29T00:00:00Z',
            canPause: false,
            canResume: false,
            canCancel: true,
            canRetry: false,
            metadata: {},
          },
        ],
      } as any);
      mockCompleteTask.mockResolvedValue({
        id: 'task-1',
        title: 'Task',
        status: 'completed',
        priority: 'normal',
        createdAt: '2026-04-29T00:00:00Z',
        completedAt: '2026-04-29T00:10:00Z',
        metadata: {},
      });

      await useTaskStore.getState().syncTaskStatus('task-1', 'completed');

      expect(mockCompleteTask).toHaveBeenCalledWith('task-1');
      expect(useTaskStore.getState().getTask('task-1')?.status).toBe('completed');
    });

    test('deleteBackendTask removes a task from the store', async () => {
      useTaskStore.setState({
        tasks: [
          {
            id: 'task-1',
            title: 'Task',
            type: 'background',
            status: 'pending',
            priority: 'normal',
            progress: { currentStep: 0, totalSteps: 1, percentage: 0 },
            createdAt: '2026-04-29T00:00:00Z',
            updatedAt: '2026-04-29T00:00:00Z',
            canPause: false,
            canResume: false,
            canCancel: true,
            canRetry: false,
            metadata: {},
          },
        ],
      } as any);
      mockDeleteTask.mockResolvedValue(undefined);

      await useTaskStore.getState().deleteBackendTask('task-1');

      expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
      expect(useTaskStore.getState().getTask('task-1')).toBeUndefined();
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
