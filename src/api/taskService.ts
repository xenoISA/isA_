/**
 * ============================================================================
 * Task Service - Using @isa/core SDK
 * ============================================================================
 *
 * Wraps @isa/core TaskService with auth token injection.
 * Follows the same adapter pattern as sessionService.ts.
 *
 * Architecture:
 * - SDK: @isa/core TaskService with standardized task API
 * - Transport: @isa/core BaseApiService HTTP layer
 * - Types: SDK-provided type safety (re-exported below)
 * - Auth: JWT token from in-memory authTokenStore
 */

import {
  TaskService as CoreTaskService,
  BaseApiService as CoreBaseApiService,
  TaskTypes,
} from '@isa/core';
import { GATEWAY_ENDPOINTS, getAuthHeaders } from '../config/gatewayConfig';
import { createLogger, LogCategory } from '../utils/logger';

// ================================================================================
// Re-export SDK types so consumers import from this adapter
// ================================================================================

export type TaskCreateRequest = TaskTypes.TaskCreateRequest;
export type TaskUpdateRequest = TaskTypes.TaskUpdateRequest;
export type TaskExecutionRequest = TaskTypes.TaskExecutionRequest;
export type TaskResponse = TaskTypes.TaskResponse;
export type TaskExecutionResponse = TaskTypes.TaskExecutionResponse;
export type TaskTemplateResponse = TaskTypes.TaskTemplateResponse;
export type TaskAnalyticsResponse = TaskTypes.TaskAnalyticsResponse;
export type TaskListResponse = TaskTypes.TaskListResponse;
export type SdkTask = TaskTypes.Task;
export type SdkTaskExecution = TaskTypes.TaskExecution;
export type SdkTaskTemplate = TaskTypes.TaskTemplate;

// Re-export enums (value + type) under aliased names to avoid collisions
// with the local taskTypes.ts string unions
export const SdkTaskStatus = TaskTypes.TaskStatus;
export type SdkTaskStatus = TaskTypes.TaskStatus;

export const SdkTaskType = TaskTypes.TaskType;
export type SdkTaskType = TaskTypes.TaskType;

export const SdkTaskPriority = TaskTypes.TaskPriority;
export type SdkTaskPriority = TaskTypes.TaskPriority;

const log = createLogger('TaskService', LogCategory.API_REQUEST);

// ================================================================================
// TaskService Wrapper
// ================================================================================

export class TaskService {
  private coreTaskService: CoreTaskService;

  private getAuthHeadersFn?: () => Promise<Record<string, string>>;

  /** Resolves when initial auth setup is complete */
  private authReady: Promise<void>;

  constructor(getAuthHeadersFn?: () => Promise<Record<string, string>>) {
    const apiService = new CoreBaseApiService(GATEWAY_ENDPOINTS.TASK.BASE);
    this.coreTaskService = new CoreTaskService();
    // Override the internal apiService with one pointing at our gateway
    (this.coreTaskService as any).apiService = apiService;

    this.getAuthHeadersFn = getAuthHeadersFn;

    // Initialize auth: prefer async fn, fallback to in-memory store.
    this.authReady = this.initAuth();

    log.info('TaskService initialized with @isa/core SDK');
  }

  // ================================================================================
  // Auth Management
  // ================================================================================

  /** Run initial auth setup — called once from the constructor.
   *  Never rejects — errors are caught and logged. */
  private async initAuth(): Promise<void> {
    try {
      if (this.getAuthHeadersFn) {
        try {
          const headers = await this.getAuthHeadersFn();
          const authHeader = headers['Authorization'];
          if (authHeader) {
            this.coreTaskService.setAuthToken(authHeader.replace('Bearer ', ''));
            return;
          }
        } catch (err) {
          log.warn('Async auth init failed, falling back to in-memory store', { error: err });
        }
      }

      const headers = getAuthHeaders();
      const authHeader = headers['Authorization'];
      if (authHeader) {
        this.coreTaskService.setAuthToken(authHeader.replace('Bearer ', ''));
      }
    } catch (err) {
      log.error('initAuth failed entirely', { error: err });
    }
  }

  /** Wait for initial auth to complete before making API calls */
  private async ensureAuth(): Promise<void> {
    await this.authReady;
  }

  /** Refresh the SDK auth token from current state (or custom fn) */
  async refreshAuth(): Promise<void> {
    if (this.getAuthHeadersFn) {
      const headers = await this.getAuthHeadersFn();
      const authHeader = headers['Authorization'];
      if (authHeader) {
        this.coreTaskService.setAuthToken(authHeader.replace('Bearer ', ''));
        return;
      }
    }
    const headers = getAuthHeaders();
    const authHeader = headers['Authorization'];
    if (authHeader) {
      this.coreTaskService.setAuthToken(authHeader.replace('Bearer ', ''));
    } else {
      this.coreTaskService.clearAuth();
    }
  }

  // ================================================================================
  // Task CRUD
  // ================================================================================

  /** Create a new task */
  async createTask(request: TaskCreateRequest): Promise<TaskResponse> {
    await this.ensureAuth();
    try {
      log.debug('Creating task', { name: request.name, type: request.task_type });
      const task = await this.coreTaskService.createTask(request);
      log.info('Task created', { taskId: task.task_id, name: task.name });
      return task;
    } catch (error) {
      log.error('Failed to create task', { error });
      throw error;
    }
  }

  /** Get a task by ID */
  async getTask(taskId: string): Promise<TaskResponse> {
    await this.ensureAuth();
    try {
      log.debug('Getting task', { taskId });
      return await this.coreTaskService.getTask(taskId);
    } catch (error) {
      log.error('Failed to get task', { error, taskId });
      throw error;
    }
  }

  /** Update an existing task */
  async updateTask(taskId: string, updates: TaskUpdateRequest): Promise<TaskResponse> {
    await this.ensureAuth();
    try {
      log.debug('Updating task', { taskId, fields: Object.keys(updates) });
      const task = await this.coreTaskService.updateTask(taskId, updates);
      log.info('Task updated', { taskId });
      return task;
    } catch (error) {
      log.error('Failed to update task', { error, taskId });
      throw error;
    }
  }

  /** Delete a task */
  async deleteTask(taskId: string): Promise<{ message: string }> {
    await this.ensureAuth();
    try {
      log.info('Deleting task', { taskId });
      const result = await this.coreTaskService.deleteTask(taskId);
      return result;
    } catch (error) {
      log.error('Failed to delete task', { error, taskId });
      throw error;
    }
  }

  /** List tasks with optional filters */
  async listTasks(options?: {
    status?: SdkTaskStatus;
    taskType?: SdkTaskType;
    priority?: SdkTaskPriority;
    limit?: number;
    offset?: number;
  }): Promise<TaskListResponse> {
    await this.ensureAuth();
    try {
      log.debug('Listing tasks', options);
      const result = await this.coreTaskService.listTasks(
        options?.status,
        options?.taskType,
        options?.priority,
        options?.limit ?? 100,
        options?.offset ?? 0
      );
      log.debug('Tasks listed', { count: result.count });
      return result;
    } catch (error) {
      log.error('Failed to list tasks', { error });
      throw error;
    }
  }

  // ================================================================================
  // Task Execution
  // ================================================================================

  /** Execute a task */
  async executeTask(
    taskId: string,
    request?: TaskExecutionRequest
  ): Promise<TaskExecutionResponse> {
    await this.ensureAuth();
    try {
      log.info('Executing task', { taskId, triggerType: request?.trigger_type });
      const execution = await this.coreTaskService.executeTask(taskId, request);
      log.info('Task execution started', { taskId, executionId: execution.execution_id });
      return execution;
    } catch (error) {
      log.error('Failed to execute task', { error, taskId });
      throw error;
    }
  }

  /** Get execution history for a task */
  async getExecutions(
    taskId: string,
    limit?: number
  ): Promise<TaskExecutionResponse[]> {
    await this.ensureAuth();
    try {
      log.debug('Getting task executions', { taskId, limit });
      return await this.coreTaskService.getTaskExecutions(taskId, limit ?? 50);
    } catch (error) {
      log.error('Failed to get task executions', { error, taskId });
      throw error;
    }
  }

  // ================================================================================
  // Templates
  // ================================================================================

  /** List available task templates */
  async listTemplates(): Promise<TaskTemplateResponse[]> {
    await this.ensureAuth();
    try {
      log.debug('Listing task templates');
      return await this.coreTaskService.listTemplates();
    } catch (error) {
      log.error('Failed to list task templates', { error });
      throw error;
    }
  }

  /** Create a task from a template */
  async createTaskFromTemplate(
    templateId: string,
    customization?: Record<string, any>
  ): Promise<TaskResponse> {
    await this.ensureAuth();
    try {
      log.debug('Creating task from template', { templateId });
      const task = await this.coreTaskService.createTaskFromTemplate(templateId, customization);
      log.info('Task created from template', { taskId: task.task_id, templateId });
      return task;
    } catch (error) {
      log.error('Failed to create task from template', { error, templateId });
      throw error;
    }
  }

  // ================================================================================
  // Analytics
  // ================================================================================

  /** Get task analytics for the current user */
  async getAnalytics(days?: number): Promise<TaskAnalyticsResponse> {
    await this.ensureAuth();
    try {
      log.debug('Getting task analytics', { days });
      return await this.coreTaskService.getAnalytics(days ?? 30);
    } catch (error) {
      log.error('Failed to get task analytics', { error });
      throw error;
    }
  }

  // ================================================================================
  // Health
  // ================================================================================

  /** Health check */
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    try {
      log.debug('Performing task service health check');
      const headers = getAuthHeaders();
      const response = await fetch(GATEWAY_ENDPOINTS.TASK.HEALTH, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...headers },
      });

      if (!response.ok) {
        throw new Error(`Health check returned ${response.status}`);
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'TaskService',
      };
    } catch (error) {
      log.error('Health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'TaskService',
      };
    }
  }
}

// ================================================================================
// Factory and Singleton
// ================================================================================

/** Create an authenticated TaskService instance */
export const createAuthenticatedTaskService = (
  getAuthHeadersFn?: () => Promise<Record<string, string>>
): TaskService => {
  return new TaskService(getAuthHeadersFn);
};

// Lazy-initialized default instance — uses in-memory token store fallback.
let _defaultInstance: TaskService | null = null;
export const getTaskService = (): TaskService => {
  if (!_defaultInstance) {
    _defaultInstance = createAuthenticatedTaskService();
  }
  return _defaultInstance;
};

export default TaskService;
