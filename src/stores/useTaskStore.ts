/**
 * ============================================================================
 * 任务管理状态管理 (useTaskStore.ts) - 专注于任务状态管理
 * ============================================================================
 * 
 * 【核心职责】
 * - 管理任务列表和状态
 * - 处理任务操作（开始、暂停、继续、取消等）
 * - 提供任务进度更新
 * - 管理任务UI状态
 * 
 * 【架构定位】
 * 这是任务的"控制中心"，负责协调任务的生命周期管理，
 * 与聊天系统、工具执行系统集成。
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  TaskItem,
  TaskStatus,
  TaskAction,
  TaskProgress,
  TaskResult,
  TaskType,
  TaskPriority,
  TaskManagerState,
  TaskActionEvent
} from '../types/taskTypes';
import { logger, LogCategory } from '../utils/logger';
import * as TaskAdapter from '../api/adapters/TaskAdapter';

type BackendTask = TaskAdapter.BackendTask;

// ================================================================================
// 任务管理Actions接口
// ================================================================================

interface TaskActions {
  // Backend sync
  syncTasks: () => Promise<void>;
  createBackendTask: (task: {
    title: string;
    description?: string;
    priority?: BackendTask['priority'];
    dueAt?: string;
    metadata?: Record<string, any>;
  }) => Promise<TaskItem | null>;
  syncTaskStatus: (taskId: string, status: BackendTask['status']) => Promise<TaskItem | null>;
  deleteBackendTask: (taskId: string) => Promise<void>;
  addTask: (task: { id: string; title: string; description?: string; status: string; dueAt?: string; createdAt: string }) => void;

  // 任务创建和管理
  createTask: (title: string, type: TaskType, metadata?: Record<string, any>) => string;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  removeTask: (taskId: string) => void;
  clearTasks: () => void;
  
  // 任务操作
  startTask: (taskId: string) => void;
  pauseTask: (taskId: string) => void;
  resumeTask: (taskId: string) => void;
  cancelTask: (taskId: string, reason?: string) => void;
  retryTask: (taskId: string) => void;
  completeTask: (taskId: string, result: TaskResult) => void;
  failTask: (taskId: string, error: string) => void;
  
  // 任务进度
  updateTaskProgress: (taskId: string, progress: TaskProgress) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  
  // 计划执行
  startPlanExecution: (planId: string, tasks: TaskItem[]) => void;
  stopPlanExecution: () => void;
  updatePlanProgress: (progress: TaskProgress) => void;
  
  // UI状态
  setShowTaskPanel: (show: boolean) => void;
  setSelectedTaskId: (taskId?: string) => void;
  
  // 批量操作
  pauseAllTasks: () => void;
  resumeAllTasks: () => void;
  cancelAllTasks: () => void;
  
  // 工具函数
  getTask: (taskId: string) => TaskItem | undefined;
  getActiveTasks: () => TaskItem[];
  getCompletedTasks: () => TaskItem[];
  getTaskCount: () => { total: number; active: number; completed: number; failed: number };
}

export type TaskStore = TaskManagerState & TaskActions;

function mapBackendStatus(status: BackendTask['status']): TaskStatus {
  if (status === 'in_progress') {
    return 'running';
  }

  return status as TaskStatus;
}

function toTaskItem(task: BackendTask): TaskItem {
  return {
    id: task.id,
    title: task.title,
    type: 'background' as TaskType,
    status: mapBackendStatus(task.status),
    priority: (task.priority || 'normal') as TaskPriority,
    progress: {
      currentStep: 0,
      totalSteps: 1,
      percentage: task.status === 'completed' ? 100 : 0,
      currentStepName: task.status === 'completed' ? 'Completed' : 'Pending sync',
    },
    createdAt: task.createdAt,
    updatedAt: task.updatedAt || task.createdAt,
    completedAt: task.completedAt,
    canPause: false,
    canResume: false,
    canCancel: task.status === 'pending' || task.status === 'in_progress',
    canRetry: task.status === 'failed',
    metadata: {
      ...task.metadata,
      description: task.description,
      dueAt: task.dueAt,
      synced: true,
    },
  };
}

function applyTaskCollection(taskItems: TaskItem[]) {
  return {
    tasks: taskItems,
    totalTasks: taskItems.length,
    activeTasks: taskItems.filter((task) => ['running', 'pending'].includes(task.status)),
    completedTasks: taskItems.filter((task) =>
      ['completed', 'failed', 'cancelled'].includes(task.status),
    ),
    completedTasksCount: taskItems.filter((task) => task.status === 'completed').length,
    failedTasksCount: taskItems.filter((task) => task.status === 'failed').length,
  };
}

// ================================================================================
// 任务管理Store实现
// ================================================================================

export const useTaskStore = create<TaskStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    tasks: [],
    activeTasks: [],
    completedTasks: [],
    isExecutingPlan: false,
    currentPlanId: undefined,
    totalTasks: 0,
    completedTasksCount: 0,
    failedTasksCount: 0,
    showTaskPanel: false,
    selectedTaskId: undefined,

    // ================================================================================
    // Backend sync (#160)
    // ================================================================================

    syncTasks: async () => {
      try {
        const backendTasks = await TaskAdapter.getTasks();
        const mapped = backendTasks.map(toTaskItem);
        set(applyTaskCollection(mapped));
        logger.info(LogCategory.TASK_MANAGEMENT, 'Tasks synced from backend', { count: mapped.length });
      } catch (err) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Failed to sync tasks from backend', { error: err });
      }
    },

    createBackendTask: async ({ title, description, priority, dueAt, metadata }) => {
      try {
        const backendTask = await TaskAdapter.createTask({
          title,
          description,
          priority,
          dueAt,
          metadata,
        });
        const mapped = toTaskItem(backendTask);
        set((state) => applyTaskCollection([mapped, ...state.tasks.filter((task) => task.id !== mapped.id)]));
        logger.info(LogCategory.TASK_MANAGEMENT, 'Task created on backend', {
          taskId: mapped.id,
          title,
        });
        return mapped;
      } catch (err) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Failed to create backend task', {
          title,
          error: err,
        });
        return null;
      }
    },

    syncTaskStatus: async (taskId, status) => {
      try {
        const backendTask =
          status === 'completed'
            ? await TaskAdapter.completeTask(taskId)
            : await TaskAdapter.updateTask(taskId, { status });
        const mapped = toTaskItem(backendTask);
        set((state) =>
          applyTaskCollection(
            state.tasks.some((task) => task.id === mapped.id)
              ? state.tasks.map((task) => (task.id === mapped.id ? mapped : task))
              : [mapped, ...state.tasks],
          ),
        );
        logger.info(LogCategory.TASK_MANAGEMENT, 'Task status synced to backend', {
          taskId,
          status,
        });
        return mapped;
      } catch (err) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Failed to sync task status', {
          taskId,
          status,
          error: err,
        });
        return null;
      }
    },

    deleteBackendTask: async (taskId) => {
      try {
        await TaskAdapter.deleteTask(taskId);
        set((state) => applyTaskCollection(state.tasks.filter((task) => task.id !== taskId)));
        logger.info(LogCategory.TASK_MANAGEMENT, 'Task deleted on backend', { taskId });
      } catch (err) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Failed to delete backend task', {
          taskId,
          error: err,
        });
      }
    },

    addTask: (task) => {
      const newTask: TaskItem = {
        id: task.id,
        title: task.title,
        type: 'background' as TaskType,
        status: (task.status === 'in_progress' ? 'running' : task.status || 'pending') as TaskStatus,
        priority: 'normal',
        progress: {
          currentStep: 0,
          totalSteps: 1,
          percentage: 0,
          currentStepName: 'Pending sync',
        },
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        canPause: false,
        canResume: false,
        canCancel: true,
        canRetry: false,
        metadata: { description: task.description, dueAt: task.dueAt },
      };
      set((state) => ({
        tasks: [...state.tasks, newTask],
        totalTasks: state.totalTasks + 1,
        activeTasks: [...state.activeTasks, newTask],
      }));
      // Fire-and-forget backend create
      TaskAdapter.createTask({ title: task.title, description: task.description, dueAt: task.dueAt }).catch(() => {});
      logger.info(LogCategory.TASK_MANAGEMENT, 'Task added (from chat)', { taskId: task.id });
    },

    // ================================================================================
    // 任务创建和管理
    // ================================================================================
    
    createTask: (title, type, metadata = {}) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const newTask: TaskItem = {
        id: taskId,
        title,
        type,
        status: 'pending',
        priority: 'normal',
        progress: {
          currentStep: 0,
          totalSteps: 1,
          percentage: 0,
          currentStepName: '准备中...'
        },
        createdAt: now,
        updatedAt: now,
        canPause: type !== 'chat_response', // 聊天响应不能暂停
        canResume: false,
        canCancel: true,
        canRetry: false,
        metadata
      };
      
      set(state => ({
        tasks: [...state.tasks, newTask],
        totalTasks: state.totalTasks + 1,
        activeTasks: [...state.activeTasks, newTask]
      }));
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Task created', { 
        taskId, 
        title, 
        type 
      });
      
      return taskId;
    },
    
    updateTask: (taskId, updates) => {
      set(state => {
        const taskIndex = state.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return state;
        
        const updatedTasks = [...state.tasks];
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        // 更新activeTasks和completedTasks
        const updatedTask = updatedTasks[taskIndex];
        const newActiveTasks = state.activeTasks.filter(t => t.id !== taskId);
        const newCompletedTasks = state.completedTasks.filter(t => t.id !== taskId);
        
        if (['running', 'starting', 'paused', 'resuming'].includes(updatedTask.status)) {
          newActiveTasks.push(updatedTask);
        } else if (['completed', 'failed', 'cancelled'].includes(updatedTask.status)) {
          newCompletedTasks.push(updatedTask);
        }
        
        return {
          tasks: updatedTasks,
          activeTasks: newActiveTasks,
          completedTasks: newCompletedTasks,
          completedTasksCount: newCompletedTasks.filter(t => t.status === 'completed').length,
          failedTasksCount: newCompletedTasks.filter(t => t.status === 'failed').length
        };
      });
      
      logger.debug(LogCategory.TASK_MANAGEMENT, 'Task updated', { 
        taskId, 
        updates: Object.keys(updates) 
      });
    },
    
    removeTask: (taskId) => {
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId),
        activeTasks: state.activeTasks.filter(t => t.id !== taskId),
        completedTasks: state.completedTasks.filter(t => t.id !== taskId)
      }));
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Task removed', { taskId });
    },
    
    clearTasks: () => {
      set({
        tasks: [],
        activeTasks: [],
        completedTasks: [],
        totalTasks: 0,
        completedTasksCount: 0,
        failedTasksCount: 0,
        isExecutingPlan: false,
        currentPlanId: undefined
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'All tasks cleared');
    },
    
    // ================================================================================
    // 任务操作
    // ================================================================================
    
    startTask: (taskId) => {
      const task = get().getTask(taskId);
      if (!task || !['pending', 'paused', 'failed'].includes(task.status)) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Cannot start task', { taskId, currentStatus: task?.status });
        return;
      }
      
      get().updateTask(taskId, {
        status: 'starting',
        startedAt: new Date().toISOString(),
        canResume: false,
        canRetry: false
      });
      
      // 模拟任务启动延迟
      setTimeout(() => {
        get().updateTask(taskId, { status: 'running' });
      }, 500);
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Task started', { taskId });
    },
    
    pauseTask: (taskId) => {
      const task = get().getTask(taskId);
      if (!task || !task.canPause || task.status !== 'running') {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Cannot pause task', { taskId, canPause: task?.canPause, status: task?.status });
        return;
      }
      
      get().updateTask(taskId, {
        status: 'paused',
        canResume: true
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Task paused', { taskId });
    },
    
    resumeTask: (taskId) => {
      const task = get().getTask(taskId);
      if (!task || !task.canResume || task.status !== 'paused') {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Cannot resume task', { taskId, canResume: task?.canResume, status: task?.status });
        return;
      }
      
      get().updateTask(taskId, {
        status: 'resuming',
        canResume: false
      });
      
      // 模拟任务恢复延迟
      setTimeout(() => {
        get().updateTask(taskId, { status: 'running' });
      }, 300);
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Task resumed', { taskId });
    },
    
    cancelTask: (taskId, reason) => {
      const task = get().getTask(taskId);
      if (!task || !task.canCancel || ['completed', 'failed', 'cancelled'].includes(task.status)) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Cannot cancel task', { taskId, canCancel: task?.canCancel, status: task?.status });
        return;
      }
      
      get().updateTask(taskId, {
        status: 'cancelled',
        canPause: false,
        canResume: false,
        canCancel: false,
        canRetry: true,
        result: {
          success: false,
          error: reason || 'Task cancelled by user'
        }
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Task cancelled', { taskId, reason });
    },
    
    retryTask: (taskId) => {
      const task = get().getTask(taskId);
      if (!task || !task.canRetry || !['failed', 'cancelled'].includes(task.status)) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Cannot retry task', { taskId, canRetry: task?.canRetry, status: task?.status });
        return;
      }
      
      get().updateTask(taskId, {
        status: 'pending',
        progress: {
          currentStep: 0,
          totalSteps: 1,
          percentage: 0,
          currentStepName: '准备中...'
        },
        canRetry: false,
        result: undefined
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Task retry initiated', { taskId });
    },
    
    completeTask: (taskId, result) => {
      const task = get().getTask(taskId);
      if (!task) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Task not found for completion', { taskId });
        return;
      }
      
      get().updateTask(taskId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        result,
        canPause: false,
        canResume: false,
        canCancel: false,
        canRetry: false
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Task completed', { taskId, success: result.success });
    },
    
    failTask: (taskId, error) => {
      const task = get().getTask(taskId);
      if (!task) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Task not found for failure', { taskId });
        return;
      }
      
      get().updateTask(taskId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        result: {
          success: false,
          error
        },
        canPause: false,
        canResume: false,
        canCancel: false,
        canRetry: true
      });
      
      logger.error(LogCategory.TASK_MANAGEMENT, 'Task failed', { taskId, error });
    },
    
    // ================================================================================
    // 任务进度
    // ================================================================================
    
    updateTaskProgress: (taskId, progress) => {
      const task = get().getTask(taskId);
      if (!task) {
        logger.warn(LogCategory.TASK_MANAGEMENT, 'Task not found for progress update', { taskId });
        return;
      }
      
      get().updateTask(taskId, { progress });
      
      logger.debug(LogCategory.TASK_MANAGEMENT, 'Task progress updated', { 
        taskId, 
        progress: `${progress.currentStep}/${progress.totalSteps} (${progress.percentage}%)` 
      });
    },
    
    updateTaskStatus: (taskId, status) => {
      get().updateTask(taskId, { status });
      
      logger.debug(LogCategory.TASK_MANAGEMENT, 'Task status updated', { taskId, status });
    },
    
    // ================================================================================
    // 计划执行
    // ================================================================================
    
    startPlanExecution: (planId, tasks) => {
      set({
        isExecutingPlan: true,
        currentPlanId: planId,
        tasks: [...get().tasks, ...tasks],
        activeTasks: [...get().activeTasks, ...tasks.filter(t => ['pending', 'starting', 'running'].includes(t.status))]
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Plan execution started', { planId, taskCount: tasks.length });
    },
    
    stopPlanExecution: () => {
      set({
        isExecutingPlan: false,
        currentPlanId: undefined
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'Plan execution stopped');
    },
    
    updatePlanProgress: (progress) => {
      // 更新当前计划中所有活跃任务的进度
      const { activeTasks } = get();
      activeTasks.forEach(task => {
        if (task.metadata?.planId === get().currentPlanId) {
          get().updateTaskProgress(task.id, progress);
        }
      });
    },
    
    // ================================================================================
    // UI状态
    // ================================================================================
    
    setShowTaskPanel: (show) => {
      set({ showTaskPanel: show });
      logger.debug(LogCategory.TASK_MANAGEMENT, 'Task panel visibility changed', { show });
    },
    
    setSelectedTaskId: (taskId) => {
      set({ selectedTaskId: taskId });
      logger.debug(LogCategory.TASK_MANAGEMENT, 'Selected task changed', { taskId });
    },
    
    // ================================================================================
    // 批量操作
    // ================================================================================
    
    pauseAllTasks: () => {
      const { activeTasks } = get();
      activeTasks.forEach(task => {
        if (task.canPause && task.status === 'running') {
          get().pauseTask(task.id);
        }
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'All tasks paused', { count: activeTasks.length });
    },
    
    resumeAllTasks: () => {
      const { activeTasks } = get();
      activeTasks.forEach(task => {
        if (task.canResume && task.status === 'paused') {
          get().resumeTask(task.id);
        }
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'All tasks resumed', { count: activeTasks.length });
    },
    
    cancelAllTasks: () => {
      const { activeTasks } = get();
      activeTasks.forEach(task => {
        if (task.canCancel && !['completed', 'failed', 'cancelled'].includes(task.status)) {
          get().cancelTask(task.id, 'Cancelled by user');
        }
      });
      
      logger.info(LogCategory.TASK_MANAGEMENT, 'All tasks cancelled', { count: activeTasks.length });
    },
    
    // ================================================================================
    // 工具函数
    // ================================================================================
    
    getTask: (taskId) => {
      return get().tasks.find(t => t.id === taskId);
    },
    
    getActiveTasks: () => {
      return get().activeTasks;
    },
    
    getCompletedTasks: () => {
      return get().completedTasks;
    },
    
    getTaskCount: () => {
      const { tasks, completedTasks, failedTasksCount } = get();
      return {
        total: tasks.length,
        active: tasks.filter(t => ['running', 'starting', 'paused', 'resuming'].includes(t.status)).length,
        completed: completedTasks.filter(t => t.status === 'completed').length,
        failed: failedTasksCount
      };
    }
  }))
);

// ================================================================================
// 导出选择器和操作
// ================================================================================

// 状态选择器
export const useTasks = () => useTaskStore(state => state.tasks);
export const useActiveTasks = () => useTaskStore(state => state.activeTasks);
export const useCompletedTasks = () => useTaskStore(state => state.completedTasks);
export const useIsExecutingPlan = () => useTaskStore(state => state.isExecutingPlan);
export const useCurrentPlanId = () => useTaskStore(state => state.currentPlanId);
export const useTaskCounts = () => useTaskStore(state => state.getTaskCount());
export const useShowTaskPanel = () => useTaskStore(state => state.showTaskPanel);
export const useSelectedTaskId = () => useTaskStore(state => state.selectedTaskId);

// 操作选择器
export const useTaskActions = () => useTaskStore(state => ({
  syncTasks: state.syncTasks,
  createBackendTask: state.createBackendTask,
  syncTaskStatus: state.syncTaskStatus,
  deleteBackendTask: state.deleteBackendTask,
  createTask: state.createTask,
  updateTask: state.updateTask,
  removeTask: state.removeTask,
  clearTasks: state.clearTasks,
  startTask: state.startTask,
  pauseTask: state.pauseTask,
  resumeTask: state.resumeTask,
  cancelTask: state.cancelTask,
  retryTask: state.retryTask,
  completeTask: state.completeTask,
  failTask: state.failTask,
  updateTaskProgress: state.updateTaskProgress,
  updateTaskStatus: state.updateTaskStatus,
  startPlanExecution: state.startPlanExecution,
  stopPlanExecution: state.stopPlanExecution,
  updatePlanProgress: state.updatePlanProgress,
  setShowTaskPanel: state.setShowTaskPanel,
  setSelectedTaskId: state.setSelectedTaskId,
  pauseAllTasks: state.pauseAllTasks,
  resumeAllTasks: state.resumeAllTasks,
  cancelAllTasks: state.cancelAllTasks,
  getTask: state.getTask,
  getActiveTasks: state.getActiveTasks,
  getCompletedTasks: state.getCompletedTasks,
  getTaskCount: state.getTaskCount
})); 
