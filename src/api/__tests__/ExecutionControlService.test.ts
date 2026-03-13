import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionControlService } from '../ExecutionControlService';
import type {
  ExecutionStatus,
  ExecutionHistory,
  RollbackResult,
  ResumeRequest,
  ResumeResult,
  HILEventCallbacks,
  ResumeStreamCallbacks,
} from '../ExecutionControlService';

// Mock gatewayConfig
vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_CONFIG: {
    BASE_URL: 'http://localhost:9080',
  },
  GATEWAY_ENDPOINTS: {
    AGENTS: {
      EXECUTION: {
        HEALTH: 'http://localhost:9080/agents/execution/health',
        STATUS: 'http://localhost:9080/agents/execution/status',
        HISTORY: 'http://localhost:9080/agents/execution/history',
        ROLLBACK: 'http://localhost:9080/agents/execution/rollback',
        RESUME: 'http://localhost:9080/agents/execution/resume',
        RESUME_STREAM: 'http://localhost:9080/agents/execution/resume-stream',
      },
    },
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

// Mock authTokenStore
vi.mock('../../stores/authTokenStore', () => ({
  authTokenStore: {
    getToken: vi.fn().mockReturnValue('test-token'),
  },
}));

// Mock BaseApiService (constructor used as fallback)
vi.mock('../BaseApiService', () => ({
  BaseApiService: vi.fn().mockImplementation(() => ({})),
}));

// Helper: create a mock Response
function mockResponse(body: any, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(body),
    body: null,
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: vi.fn(),
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn(),
    bytes: vi.fn(),
  } as unknown as Response;
}

// Helper: create a mock SSE Response with a readable stream
function mockSSEResponse(events: string[]): Response {
  const ssePayload = events.join('\n') + '\n';
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(ssePayload));
      controller.close();
    },
  });

  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: stream,
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: vi.fn(),
    bodyUsed: false,
    json: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn(),
    bytes: vi.fn(),
  } as unknown as Response;
}

describe('ExecutionControlService', () => {
  let service: ExecutionControlService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Stub global fetch
    vi.stubGlobal('fetch', vi.fn());
    service = new ExecutionControlService();
  });

  afterEach(() => {
    service.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ============================================================================
  // getExecutionStatus — caching
  // ============================================================================

  describe('getExecutionStatus', () => {
    const threadId = 'thread-1';
    const statusPayload: ExecutionStatus = {
      thread_id: threadId,
      status: 'running',
      current_node: 'tool_node',
      interrupts: [],
      checkpoints: 2,
      durable: true,
    };

    test('fetches status from API on first call', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(statusPayload));

      const result = await service.getExecutionStatus(threadId);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result.thread_id).toBe(threadId);
      expect(result.status).toBe('running');
    });

    test('returns cached status within 2s TTL', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(statusPayload));

      const first = await service.getExecutionStatus(threadId);
      // Advance less than 2s
      vi.advanceTimersByTime(1500);
      const second = await service.getExecutionStatus(threadId);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });

    test('re-fetches after cache expires (>2s)', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(statusPayload));

      await service.getExecutionStatus(threadId);

      // Advance past cache duration
      vi.advanceTimersByTime(2100);

      const updatedPayload = { ...statusPayload, status: 'interrupted' as const };
      vi.mocked(fetch).mockResolvedValue(mockResponse(updatedPayload));

      const result = await service.getExecutionStatus(threadId);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('interrupted');
    });

    test('throws on non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(null, false, 500));

      await expect(service.getExecutionStatus(threadId)).rejects.toThrow('Status check failed');
    });
  });

  // ============================================================================
  // getExecutionHistory
  // ============================================================================

  describe('getExecutionHistory', () => {
    const threadId = 'thread-2';
    const historyPayload: ExecutionHistory = {
      thread_id: threadId,
      history: [
        { checkpoint: 'cp-1', node: 'start', timestamp: '2026-01-01T00:00:00Z', state_summary: 'init' },
        { checkpoint: 'cp-2', node: 'tool_node', timestamp: '2026-01-01T00:01:00Z', state_summary: 'tool called' },
      ],
      total: 2,
    };

    test('returns checkpoint list', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(historyPayload));

      const result = await service.getExecutionHistory(threadId);

      expect(result.history).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.history[0].checkpoint).toBe('cp-1');
    });

    test('passes limit as query parameter', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(historyPayload));

      await service.getExecutionHistory(threadId, 10);

      const url = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(url).toContain(`/${threadId}?limit=10`);
    });

    test('throws on API error', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(null, false, 404));

      await expect(service.getExecutionHistory(threadId)).rejects.toThrow('History retrieval failed');
    });
  });

  // ============================================================================
  // rollbackToCheckpoint
  // ============================================================================

  describe('rollbackToCheckpoint', () => {
    const threadId = 'thread-3';
    const checkpointId = 'cp-abc';
    const rollbackResult: RollbackResult = {
      thread_id: threadId,
      success: true,
      checkpoint_id: checkpointId,
      message: 'Rolled back',
      restored_state: { node: 'start', timestamp: '2026-01-01T00:00:00Z' },
    };

    test('sends POST with correct URL including checkpoint_id', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(rollbackResult));

      const result = await service.rollbackToCheckpoint(threadId, checkpointId);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const url = callArgs[0] as string;
      const opts = callArgs[1] as RequestInit;

      expect(url).toContain(`/${threadId}?checkpoint_id=${checkpointId}`);
      expect(opts.method).toBe('POST');
      expect(result.success).toBe(true);
      expect(result.restored_state.node).toBe('start');
    });

    test('throws on failure response', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(null, false, 400));

      await expect(service.rollbackToCheckpoint(threadId, checkpointId)).rejects.toThrow('Rollback failed');
    });
  });

  // ============================================================================
  // resumeExecution (non-streaming)
  // ============================================================================

  describe('resumeExecution', () => {
    const request: ResumeRequest = {
      thread_id: 'thread-4',
      action: 'continue',
      resume_data: { approved: true },
    };
    const resumeResult: ResumeResult = {
      success: true,
      thread_id: 'thread-4',
      message: 'Resumed',
      next_step: 'tool_node',
    };

    test('sends POST with JSON body', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(resumeResult));

      const result = await service.resumeExecution(request);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const opts = callArgs[1] as RequestInit;
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body as string)).toEqual(request);
      expect(result.success).toBe(true);
      expect(result.next_step).toBe('tool_node');
    });

    test('throws on server error', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(null, false, 500));

      await expect(service.resumeExecution(request)).rejects.toThrow('Resume execution failed');
    });
  });

  // ============================================================================
  // resumeExecutionStream (SSE)
  // ============================================================================

  describe('resumeExecutionStream', () => {
    const request: ResumeRequest = {
      thread_id: 'thread-5',
      action: 'continue',
    };

    test('processes SSE events and calls correct callbacks', async () => {
      const sseEvents = [
        'data: {"type":"resume_start","content":"Starting","timestamp":"2026-01-01T00:00:00Z"}',
        'data: {"type":"graph_update","content":"Updated","node":"tool_node"}',
        'data: {"type":"message_stream","content":{"raw_message":"hello"}}',
        'data: {"type":"resume_end","content":"Done","timestamp":"2026-01-01T00:00:01Z"}',
        'data: [DONE]',
      ];

      vi.mocked(fetch).mockResolvedValue(mockSSEResponse(sseEvents));

      const callbacks: ResumeStreamCallbacks = {
        onResumeStart: vi.fn(),
        onGraphUpdate: vi.fn(),
        onMessageStream: vi.fn(),
        onResumeEnd: vi.fn(),
        onError: vi.fn(),
      };

      await service.resumeExecutionStream(request, callbacks);

      expect(callbacks.onResumeStart).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'resume_start', content: 'Starting' })
      );
      expect(callbacks.onGraphUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'graph_update', node: 'tool_node' })
      );
      expect(callbacks.onMessageStream).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'message_stream' })
      );
      expect(callbacks.onResumeEnd).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'resume_end' })
      );
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    test('calls onError when fetch fails', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('network down'));

      const callbacks: ResumeStreamCallbacks = {
        onError: vi.fn(),
      };

      await service.resumeExecutionStream(request, callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    test('calls onError when response body is null', async () => {
      const resp = mockResponse(null, true);
      // body is already null from mockResponse
      vi.mocked(fetch).mockResolvedValue(resp);

      const callbacks: ResumeStreamCallbacks = {
        onError: vi.fn(),
      };

      await service.resumeExecutionStream(request, callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'No response body for stream' })
      );
    });
  });

  // ============================================================================
  // monitorExecution / stopMonitoring
  // ============================================================================

  describe('monitorExecution', () => {
    const threadId = 'thread-6';

    test('starts polling and invokes onStatusChanged', async () => {
      const status: ExecutionStatus = {
        thread_id: threadId,
        status: 'running',
        current_node: 'tool_node',
        interrupts: [],
        checkpoints: 1,
        durable: true,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse(status));

      const callbacks: HILEventCallbacks = {
        onStatusChanged: vi.fn(),
      };

      await service.monitorExecution(threadId, callbacks);

      expect(callbacks.onStatusChanged).toHaveBeenCalledTimes(1);
      expect(callbacks.onStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          thread_id: threadId,
          status: 'running',
        })
      );
    });

    test('stops polling when status is completed', async () => {
      const status: ExecutionStatus = {
        thread_id: threadId,
        status: 'completed',
        current_node: 'end',
        interrupts: [],
        checkpoints: 3,
        durable: true,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse(status));

      const callbacks: HILEventCallbacks = {
        onStatusChanged: vi.fn(),
      };

      await service.monitorExecution(threadId, callbacks);

      // Should not schedule further polling
      const stats = service.getActiveMonitoringStats();
      expect(stats.activePollers).toBe(0);
    });

    test('stops polling and fires onInterruptDetected on interrupt', async () => {
      const status: ExecutionStatus = {
        thread_id: threadId,
        status: 'interrupted',
        current_node: 'approval_node',
        interrupts: [
          {
            id: 'int-1',
            type: 'approval',
            timestamp: '2026-01-01T00:00:00Z',
            data: { tool: 'shell' },
            reason: 'Needs approval',
          },
        ],
        checkpoints: 2,
        durable: true,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse(status));

      const callbacks: HILEventCallbacks = {
        onStatusChanged: vi.fn(),
        onInterruptDetected: vi.fn(),
      };

      await service.monitorExecution(threadId, callbacks);

      expect(callbacks.onInterruptDetected).toHaveBeenCalledTimes(1);
      expect(callbacks.onInterruptDetected).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hil_interrupt_detected',
          thread_id: threadId,
          interrupt: expect.objectContaining({
            id: 'int-1',
            interrupt_type: 'approval',
            message: 'Needs approval',
          }),
        })
      );
    });

    test('stopMonitoring clears the timer for a thread', async () => {
      const status: ExecutionStatus = {
        thread_id: threadId,
        status: 'running',
        current_node: 'tool_node',
        interrupts: [],
        checkpoints: 1,
        durable: true,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse(status));

      await service.monitorExecution(threadId, { onStatusChanged: vi.fn() });

      expect(service.getActiveMonitoringStats().activePollers).toBe(1);

      service.stopMonitoring(threadId);

      expect(service.getActiveMonitoringStats().activePollers).toBe(0);
    });

    test('invokes onError when fetch rejects during polling', async () => {
      // First call succeeds (initial poll in monitorExecution), then subsequent polls fail
      const status: ExecutionStatus = {
        thread_id: threadId,
        status: 'running',
        current_node: 'tool_node',
        interrupts: [],
        checkpoints: 1,
        durable: true,
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockResponse(status))
        .mockRejectedValue(new TypeError('Failed to fetch'));

      const callbacks: HILEventCallbacks = {
        onStatusChanged: vi.fn(),
        onError: vi.fn(),
      };

      await service.monitorExecution(threadId, callbacks);

      // Advance past poll interval + retry delays to trigger the error callback
      await vi.advanceTimersByTimeAsync(20000);

      expect(callbacks.onError).toHaveBeenCalled();

      service.stopMonitoring(threadId);
    }, 10000);
  });

  // ============================================================================
  // Adaptive polling intervals
  // ============================================================================

  describe('adaptive polling', () => {
    const threadId = 'thread-7';

    test('switches to idle interval after consecutive idle checks', async () => {
      let pollCount = 0;
      const readyStatus: ExecutionStatus = {
        thread_id: threadId,
        status: 'ready',
        current_node: 'start',
        interrupts: [],
        checkpoints: 0,
        durable: true,
      };

      vi.mocked(fetch).mockImplementation(async () => {
        pollCount++;
        return mockResponse(readyStatus);
      });

      const callbacks: HILEventCallbacks = {
        onStatusChanged: vi.fn(),
      };

      // Start monitoring (initial poll fires immediately)
      await service.monitorExecution(threadId, callbacks);
      expect(pollCount).toBe(1);

      // Advance through default interval polls (3s each), triggering 3 idle checks
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(3100);
      }

      // After idle polls we should have more than the initial 1
      expect(pollCount).toBeGreaterThanOrEqual(3);

      // Now the service should switch to IDLE_POLL_INTERVAL (10s)
      // A 3s advance should NOT trigger another poll
      const countBefore = pollCount;
      await vi.advanceTimersByTimeAsync(3100);
      expect(pollCount).toBe(countBefore);

      // But a full 10s advance should
      await vi.advanceTimersByTimeAsync(7000);
      expect(pollCount).toBe(countBefore + 1);

      service.stopMonitoring(threadId);
    });
  });

  // ============================================================================
  // Retry logic with exponential backoff
  // ============================================================================

  describe('retry with exponential backoff', () => {
    const threadId = 'thread-8';

    test('retries on network error with exponential delays', async () => {
      const status: ExecutionStatus = {
        thread_id: threadId,
        status: 'running',
        current_node: 'tool_node',
        interrupts: [],
        checkpoints: 1,
        durable: true,
      };

      // Fail twice with network error, succeed on third attempt
      vi.mocked(fetch)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(mockResponse(status));

      const promise = service.getExecutionStatus(threadId);

      // First retry after 1s (RETRY_DELAY * 2^0)
      await vi.advanceTimersByTimeAsync(1000);
      // Second retry after 2s (RETRY_DELAY * 2^1)
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.status).toBe('running');
    });

    test('throws after max retry attempts on persistent network error', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const promise = service.getExecutionStatus(threadId);

      // Flush all retry delays
      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow('Failed to fetch');
    });

    test('does not retry on non-network errors', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse(null, false, 500));

      await expect(service.getExecutionStatus(threadId)).rejects.toThrow('Status check failed');
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // AGUI HIL event format conversion
  // ============================================================================

  describe('AGUI HIL event format conversion', () => {
    const threadId = 'thread-9';

    test('converts interrupts to HILInterruptDetectedEvent format', async () => {
      const status: ExecutionStatus = {
        thread_id: threadId,
        status: 'interrupted',
        current_node: 'approval_node',
        interrupts: [
          {
            id: 'int-100',
            type: 'tool_authorization',
            timestamp: '2026-01-01T12:00:00Z',
            data: { tool: 'dangerous_tool' },
            reason: 'Tool needs authorization',
          },
        ],
        checkpoints: 5,
        durable: true,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse(status));

      const onInterruptDetected = vi.fn();
      await service.monitorExecution(threadId, { onInterruptDetected });

      const event = onInterruptDetected.mock.calls[0][0];
      expect(event.type).toBe('hil_interrupt_detected');
      expect(event.thread_id).toBe(threadId);
      expect(event.interrupt.id).toBe('int-100');
      expect(event.interrupt.interrupt_type).toBe('tool_authorization');
      expect(event.interrupt.title).toBe('HIL tool authorization');
      expect(event.interrupt.message).toBe('Tool needs authorization');
      expect(event.interrupt.priority).toBe('medium');
      expect(event.interrupt.timeout_ms).toBe(300000);
      expect(event.interrupt.data).toEqual({ tool: 'dangerous_tool' });
    });

    test('converts status to HILExecutionStatusData with mapped interrupts', async () => {
      const status: ExecutionStatus = {
        thread_id: threadId,
        status: 'interrupted',
        current_node: 'review_node',
        interrupts: [
          {
            id: 'int-200',
            type: 'review_edit',
            timestamp: '2026-03-01T00:00:00Z',
            data: { content: 'draft' },
          },
        ],
        checkpoints: 3,
        durable: false,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse(status));

      const onStatusChanged = vi.fn();
      await service.monitorExecution(threadId, { onStatusChanged });

      const hilStatus = onStatusChanged.mock.calls[0][0];
      expect(hilStatus.thread_id).toBe(threadId);
      expect(hilStatus.status).toBe('interrupted');
      expect(hilStatus.interrupts).toHaveLength(1);
      expect(hilStatus.interrupts[0].title).toBe('HIL review edit');
      expect(hilStatus.interrupts[0].message).toBe('Human intervention required');
      expect(hilStatus.checkpoints).toBe(3);
      expect(hilStatus.durable).toBe(false);
    });
  });

  // ============================================================================
  // Utility methods
  // ============================================================================

  describe('utility methods', () => {
    test('stopAllMonitoring clears all timers and caches', async () => {
      const status: ExecutionStatus = {
        thread_id: 'thread-a',
        status: 'running',
        current_node: 'node',
        interrupts: [],
        checkpoints: 0,
        durable: true,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse(status));

      await service.monitorExecution('thread-a', { onStatusChanged: vi.fn() });
      await service.monitorExecution('thread-b', { onStatusChanged: vi.fn() });

      service.stopAllMonitoring();

      const stats = service.getActiveMonitoringStats();
      expect(stats.activePollers).toBe(0);
      expect(stats.cachedStatuses).toBe(0);
    });

    test('dispose cleans up cache cleanup timer and stops monitoring', async () => {
      const status: ExecutionStatus = {
        thread_id: 'thread-d',
        status: 'running',
        current_node: 'node',
        interrupts: [],
        checkpoints: 0,
        durable: true,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse(status));
      await service.monitorExecution('thread-d', { onStatusChanged: vi.fn() });

      service.dispose();

      expect(service.getActiveMonitoringStats().activePollers).toBe(0);
    });

    test('getActiveMonitoringStats returns correct counts', async () => {
      const stats = service.getActiveMonitoringStats();
      expect(stats).toEqual({ activePollers: 0, cachedStatuses: 0 });
    });
  });
});
