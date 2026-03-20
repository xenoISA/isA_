import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionControlService } from '../ExecutionControlService';

// Mock BaseApiService
vi.mock('../BaseApiService', () => ({
  BaseApiService: vi.fn().mockImplementation(() => ({})),
}));

// Mock gatewayConfig
vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_CONFIG: {
    BASE_URL: 'http://localhost:9080',
  },
  GATEWAY_ENDPOINTS: {
    AGENTS: {
      EXECUTION: {
        HEALTH: 'http://localhost:9080/agents/api/execution/health',
        STATUS: 'http://localhost:9080/agents/api/execution/status',
        HISTORY: 'http://localhost:9080/agents/api/execution/history',
        ROLLBACK: 'http://localhost:9080/agents/api/execution/rollback',
        RESUME: 'http://localhost:9080/agents/api/execution/resume',
        RESUME_STREAM: 'http://localhost:9080/agents/api/execution/resume-stream',
      },
    },
  },
}));

// Mock authTokenStore
vi.mock('../../stores/authTokenStore', () => ({
  authTokenStore: {
    getToken: vi.fn().mockReturnValue('mock-token'),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  LogCategory: {
    CHAT_FLOW: 'chat_flow',
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ExecutionControlService', () => {
  let service: ExecutionControlService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new ExecutionControlService();
  });

  afterEach(() => {
    service.dispose();
    vi.useRealTimers();
  });

  // ============================================================================
  // getHealth
  // ============================================================================

  describe('getHealth', () => {
    test('returns health data on success', async () => {
      const healthData = {
        status: 'healthy',
        service: 'execution-control',
        features: {
          human_in_loop: true,
          approval_workflow: true,
          tool_authorization: true,
          total_interrupts: 5,
        },
        graph_info: {
          nodes: 10,
          durable: true,
          checkpoints: true,
          environment: 'development',
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(healthData),
      });

      const result = await service.getHealth();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9080/agents/api/execution/health',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.status).toBe('healthy');
      expect(result.features.human_in_loop).toBe(true);
    });

    test('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      await expect(service.getHealth()).rejects.toThrow(
        'Health check failed: 503 Service Unavailable'
      );
    });

    test('throws on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      await expect(service.getHealth()).rejects.toThrow('Connection refused');
    });
  });

  // ============================================================================
  // getExecutionStatus
  // ============================================================================

  describe('getExecutionStatus', () => {
    test('fetches execution status for a thread', async () => {
      const statusData = {
        thread_id: 'thread-1',
        status: 'running',
        current_node: 'tool_node',
        interrupts: [],
        checkpoints: 3,
        durable: true,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(statusData),
      });

      const result = await service.getExecutionStatus('thread-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9080/agents/api/execution/status/thread-1',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.thread_id).toBe('thread-1');
      expect(result.status).toBe('running');
    });

    test('returns cached status within cache duration', async () => {
      const statusData = {
        thread_id: 'thread-1',
        status: 'running',
        current_node: 'tool_node',
        interrupts: [],
        checkpoints: 3,
        durable: true,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(statusData),
      });

      // First call — fetches from network
      await service.getExecutionStatus('thread-1');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call within cache window — should use cache
      const result = await service.getExecutionStatus('thread-1');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('running');
    });

    test('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getExecutionStatus('bad-thread')).rejects.toThrow(
        'Status check failed: 404 Not Found'
      );
    });
  });

  // ============================================================================
  // getExecutionHistory
  // ============================================================================

  describe('getExecutionHistory', () => {
    test('fetches execution history with default limit', async () => {
      const historyData = {
        thread_id: 'thread-1',
        history: [
          { checkpoint: 'cp-1', node: 'start', timestamp: '2026-01-01T00:00:00Z', state_summary: 'Initial' },
        ],
        total: 1,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(historyData),
      });

      const result = await service.getExecutionHistory('thread-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9080/agents/api/execution/history/thread-1?limit=50',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.history).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    test('passes custom limit', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ thread_id: 'thread-1', history: [], total: 0 }),
      });

      await service.getExecutionHistory('thread-1', 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.anything()
      );
    });

    test('throws on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getExecutionHistory('thread-1')).rejects.toThrow(
        'History retrieval failed: 500 Internal Server Error'
      );
    });
  });

  // ============================================================================
  // rollbackToCheckpoint
  // ============================================================================

  describe('rollbackToCheckpoint', () => {
    test('rolls back to a specific checkpoint', async () => {
      const rollbackResult = {
        thread_id: 'thread-1',
        success: true,
        checkpoint_id: 'cp-1',
        message: 'Rollback successful',
        restored_state: { node: 'start', timestamp: '2026-01-01T00:00:00Z' },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(rollbackResult),
      });

      const result = await service.rollbackToCheckpoint('thread-1', 'cp-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9080/agents/api/execution/rollback/thread-1?checkpoint_id=cp-1',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.success).toBe(true);
      expect(result.checkpoint_id).toBe('cp-1');
    });

    test('throws on rollback failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(
        service.rollbackToCheckpoint('thread-1', 'bad-cp')
      ).rejects.toThrow('Rollback failed: 400 Bad Request');
    });
  });

  // ============================================================================
  // resumeExecution
  // ============================================================================

  describe('resumeExecution', () => {
    test('resumes execution with action and resume data', async () => {
      const resumeResult = {
        success: true,
        thread_id: 'thread-1',
        message: 'Execution resumed',
        next_step: 'tool_node',
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(resumeResult),
      });

      const request = {
        thread_id: 'thread-1',
        action: 'continue' as const,
        resume_data: { approved: true },
      };
      const result = await service.resumeExecution(request);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9080/agents/api/execution/resume',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result.success).toBe(true);
      expect(result.next_step).toBe('tool_node');
    });

    test('throws on resume failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
      });

      await expect(
        service.resumeExecution({ thread_id: 'thread-1', action: 'continue' })
      ).rejects.toThrow('Resume execution failed: 409 Conflict');
    });
  });

  // ============================================================================
  // isServiceAvailable
  // ============================================================================

  describe('isServiceAvailable', () => {
    test('returns true when health check succeeds', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'healthy' }),
      });

      const result = await service.isServiceAvailable();

      expect(result).toBe(true);
    });

    test('returns false when health check fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await service.isServiceAvailable();

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // getActiveMonitoringStats
  // ============================================================================

  describe('getActiveMonitoringStats', () => {
    test('returns zero counts when no monitoring is active', () => {
      const stats = service.getActiveMonitoringStats();

      expect(stats.activePollers).toBe(0);
      expect(stats.cachedStatuses).toBe(0);
    });

    test('reflects cached statuses after a status fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          thread_id: 'thread-1',
          status: 'running',
          current_node: 'node',
          interrupts: [],
          checkpoints: 0,
          durable: false,
        }),
      });

      await service.getExecutionStatus('thread-1');
      const stats = service.getActiveMonitoringStats();

      expect(stats.cachedStatuses).toBe(1);
    });
  });

  // ============================================================================
  // dispose
  // ============================================================================

  describe('dispose', () => {
    test('clears all timers and stops monitoring', () => {
      // Call dispose — should not throw
      service.dispose();

      const stats = service.getActiveMonitoringStats();
      expect(stats.activePollers).toBe(0);
      expect(stats.cachedStatuses).toBe(0);
    });

    test('is safe to call multiple times', () => {
      service.dispose();
      service.dispose();

      expect(service.getActiveMonitoringStats().activePollers).toBe(0);
    });
  });
});
