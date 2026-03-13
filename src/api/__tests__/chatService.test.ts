import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import { ChatService, ChatServiceCallbacks } from '../chatService';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock SSETransport — we intercept createSSETransport so ChatService never
// touches the network.  The mock exposes a `connect` method that returns a
// mock SSEConnection whose `stream()` yields whatever data we configure.
const mockClose = vi.fn().mockResolvedValue(undefined);
let streamData: string[] = [];
const mockStream = vi.fn();
const mockConnect = vi.fn().mockImplementation(async () => ({
  close: mockClose,
  stream: () => mockStream(),
}));

vi.mock('../transport/SSETransport', () => ({
  createSSETransport: vi.fn(() => ({
    connect: mockConnect,
  })),
}));

// Mock AGUIEventParser — parse() returns the parsed JSON as-is (it already
// has a `type` field in our test data).
const mockParse = vi.fn().mockImplementation((data: any) => data);

vi.mock('../parsing/AGUIEventParser', () => ({
  createAGUIEventParser: vi.fn(() => ({
    parse: mockParse,
  })),
}));

// Mock gateway config
vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    AGENTS: {
      CHAT: 'http://localhost:9080/agents/chat',
    },
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  LogCategory: { CHAT_FLOW: 'chat_flow' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a default metadata object for sendMessage / resumeHIL. */
const defaultMeta = () => ({
  user_id: 'user-1',
  session_id: 'session-1',
});

/** Create an async generator that yields the configured `streamData` lines. */
function makeAsyncStream(data: string[]) {
  return async function* () {
    for (const chunk of data) {
      yield chunk;
    }
  };
}

/** Convenience: encode a single SSE data frame containing JSON. */
function sseFrame(obj: Record<string, any>): string {
  return `data: ${JSON.stringify(obj)}`;
}

/** Configure stream data and make mockStream return the async generator. */
function setStreamData(frames: string[]) {
  streamData = frames;
  mockStream.mockImplementation(makeAsyncStream(streamData));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatService', () => {
  let service: ChatService;
  let callbacks: Required<ChatServiceCallbacks>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService();

    // Build a callbacks object where every handler is a spy.
    callbacks = {
      onStreamStart: vi.fn(),
      onStreamContent: vi.fn(),
      onStreamStatus: vi.fn(),
      onStreamComplete: vi.fn(),
      onError: vi.fn(),
      onToolStart: vi.fn(),
      onToolExecuting: vi.fn(),
      onToolCompleted: vi.fn(),
      onLLMCompleted: vi.fn(),
      onNodeUpdate: vi.fn(),
      onStateUpdate: vi.fn(),
      onPaused: vi.fn(),
      onMemoryUpdate: vi.fn(),
      onBillingUpdate: vi.fn(),
      onResumeStart: vi.fn(),
      onResumeEnd: vi.fn(),
      onTaskProgress: vi.fn(),
      onTaskListUpdate: vi.fn(),
      onTaskStatusUpdate: vi.fn(),
      onHILInterruptDetected: vi.fn(),
      onHILCheckpointCreated: vi.fn(),
      onHILExecutionStatusChanged: vi.fn(),
      onArtifactCreated: vi.fn(),
      onArtifactUpdated: vi.fn(),
    };

    // Default: stream a [DONE] marker so sendMessage resolves.
    setStreamData(['data: [DONE]']);
  });

  // ==========================================================================
  // sendMessage — SSE setup
  // ==========================================================================

  describe('sendMessage()', () => {
    test('connects to the correct gateway endpoint', async () => {
      await service.sendMessage('hello', defaultMeta(), 'tok-1', callbacks);

      expect(mockConnect).toHaveBeenCalledWith(
        'http://localhost:9080/agents/chat',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    test('sends correct payload in the request body', async () => {
      const meta = {
        user_id: 'u1',
        session_id: 's1',
        prompt_name: 'test-prompt',
        prompt_args: { foo: 'bar' },
        proactive_enabled: true,
        collaborative_enabled: true,
        confidence_threshold: 0.9,
        proactive_predictions: { x: 1 },
      };

      await service.sendMessage('hi', meta, 'tok', callbacks);

      const callArgs = mockConnect.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.message).toBe('hi');
      expect(body.user_id).toBe('u1');
      expect(body.session_id).toBe('s1');
      expect(body.prompt_name).toBe('test-prompt');
      expect(body.prompt_args).toEqual({ foo: 'bar' });
      expect(body.proactive_enabled).toBe(true);
      expect(body.collaborative_enabled).toBe(true);
      expect(body.confidence_threshold).toBe(0.9);
      expect(body.proactive_predictions).toEqual({ x: 1 });
    });

    test('passes auth token as Bearer header', async () => {
      await service.sendMessage('hi', defaultMeta(), 'my-jwt-token', callbacks);

      const callArgs = mockConnect.mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBe('Bearer my-jwt-token');
    });

    test('omits Authorization header when token is empty', async () => {
      await service.sendMessage('hi', defaultMeta(), '', callbacks);

      const callArgs = mockConnect.mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBeUndefined();
    });

    test('sets required SSE headers (Content-Type, Accept, Cache-Control)', async () => {
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      const callArgs = mockConnect.mock.calls[0][1];
      expect(callArgs.headers['Content-Type']).toBe('application/json');
      expect(callArgs.headers['Accept']).toBe('text/event-stream');
      expect(callArgs.headers['Cache-Control']).toBe('no-cache');
    });

    test('uses default values for optional metadata fields', async () => {
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      const body = JSON.parse(mockConnect.mock.calls[0][1].body);
      expect(body.prompt_name).toBeNull();
      expect(body.prompt_args).toEqual({});
      expect(body.proactive_enabled).toBe(false);
      expect(body.collaborative_enabled).toBe(false);
      expect(body.confidence_threshold).toBe(0.7);
      expect(body.proactive_predictions).toBeNull();
    });
  });

  // ==========================================================================
  // sendMessage — [DONE] handling
  // ==========================================================================

  describe('stream [DONE] handling', () => {
    test('resolves and fires onStreamComplete on [DONE]', async () => {
      setStreamData(['data: [DONE]']);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamComplete).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // sendMessage — AGUI event routing (callback dispatch)
  // ==========================================================================

  describe('AGUI event routing', () => {
    test('run_started → onStreamStart', async () => {
      setStreamData([
        sseFrame({ type: 'run_started', message_id: 'msg-1', run_id: 'run-1' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamStart).toHaveBeenCalledWith('msg-1', 'Starting...');
    });

    test('text_delta → onStreamContent', async () => {
      setStreamData([
        sseFrame({ type: 'text_delta', delta: 'Hello ' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamContent).toHaveBeenCalledWith('Hello ');
    });

    test('text_message_content → onStreamContent', async () => {
      setStreamData([
        sseFrame({ type: 'text_message_content', content: 'World' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamContent).toHaveBeenCalledWith('World');
    });

    test('text_message_end → onStreamComplete', async () => {
      setStreamData([
        sseFrame({ type: 'text_message_end', content: 'final' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamComplete).toHaveBeenCalledWith('final');
    });

    test('run_finished → onStreamComplete', async () => {
      setStreamData([
        sseFrame({ type: 'run_finished', result: 'done' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamComplete).toHaveBeenCalledWith('done');
    });

    test('run_error → onError', async () => {
      setStreamData([
        sseFrame({ type: 'run_error', error: { message: 'boom' } }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    });

    test('error event with plain message → onError', async () => {
      setStreamData([
        sseFrame({ type: 'error', message: 'something went wrong' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'something went wrong' }),
      );
    });

    test('tool_call_start → onToolStart', async () => {
      setStreamData([
        sseFrame({
          type: 'tool_call_start',
          tool_name: 'search',
          tool_call_id: 'tc-1',
          parameters: { q: 'test' },
        }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onToolStart).toHaveBeenCalledWith('search', 'tc-1', { q: 'test' });
    });

    test('tool_executing → onToolExecuting', async () => {
      setStreamData([
        sseFrame({ type: 'tool_executing', tool_name: 'search', status: 'running', progress: 50 }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onToolExecuting).toHaveBeenCalledWith('search', 'running', 50);
    });

    test('tool_call_end → onToolCompleted', async () => {
      setStreamData([
        sseFrame({
          type: 'tool_call_end',
          tool_name: 'search',
          result: { items: [] },
          error: undefined,
          duration_ms: 120,
        }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onToolCompleted).toHaveBeenCalledWith('search', { items: [] }, undefined, 120);
    });

    test('llm_completed → onLLMCompleted', async () => {
      setStreamData([
        sseFrame({ type: 'llm_completed', model: 'gpt-4', token_count: 500, finish_reason: 'stop' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onLLMCompleted).toHaveBeenCalledWith('gpt-4', 500, 'stop');
    });

    test('billing → onBillingUpdate with mapped fields', async () => {
      setStreamData([
        sseFrame({
          type: 'billing',
          credits_remaining: 100,
          total_credits: 200,
          model_calls: 3,
          tool_calls: 5,
          cost: 0.05,
        }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onBillingUpdate).toHaveBeenCalledWith({
        creditsRemaining: 100,
        totalCredits: 200,
        modelCalls: 3,
        toolCalls: 5,
        cost: 0.05,
      });
    });

    test('hil_interrupt_detected → onHILInterruptDetected', async () => {
      const hilEvent = {
        type: 'hil_interrupt_detected',
        interrupt: { id: 'int-1', title: 'Approve?', type: 'approval_required' },
      };
      setStreamData([sseFrame(hilEvent), 'data: [DONE]']);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onHILInterruptDetected).toHaveBeenCalledWith(hilEvent);
    });

    test('hil_approval_required → routes to onHILInterruptDetected', async () => {
      const evt = { type: 'hil_approval_required', details: 'confirm deletion' };
      setStreamData([sseFrame(evt), 'data: [DONE]']);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onHILInterruptDetected).toHaveBeenCalledWith(evt);
    });

    test('hil_checkpoint_created → onHILCheckpointCreated', async () => {
      const cp = { type: 'hil_checkpoint_created', checkpoint_id: 'cp-1' };
      setStreamData([sseFrame(cp), 'data: [DONE]']);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onHILCheckpointCreated).toHaveBeenCalledWith(cp);
    });

    test('node_update → onNodeUpdate', async () => {
      setStreamData([
        sseFrame({
          type: 'node_update',
          node_name: 'reason_model',
          status: 'completed',
          credits: 10,
          messages_count: 5,
          data: { extra: true },
        }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onNodeUpdate).toHaveBeenCalledWith('reason_model', 'completed', {
        credits: 10,
        messages_count: 5,
        data: { extra: true },
      });
    });

    test('state_update → onStateUpdate', async () => {
      setStreamData([
        sseFrame({ type: 'state_update', state_data: { key: 'val' }, node: 'n1' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStateUpdate).toHaveBeenCalledWith({ key: 'val' }, 'n1');
    });

    test('paused → onPaused', async () => {
      setStreamData([
        sseFrame({ type: 'paused', reason: 'user_request', checkpoint_id: 'cp-2' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onPaused).toHaveBeenCalledWith('user_request', 'cp-2');
    });

    test('memory_update → onMemoryUpdate', async () => {
      setStreamData([
        sseFrame({ type: 'memory_update', memory_data: { k: 'v' }, operation: 'store' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onMemoryUpdate).toHaveBeenCalledWith({ k: 'v' }, 'store');
    });

    test('resume_start → onResumeStart', async () => {
      setStreamData([
        sseFrame({ type: 'resume_start', resumed_from: 'cp-1', checkpoint_id: 'cp-1' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onResumeStart).toHaveBeenCalledWith('cp-1', 'cp-1');
    });

    test('resume_end → onResumeEnd', async () => {
      setStreamData([
        sseFrame({ type: 'resume_end', success: true, result: 'ok' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onResumeEnd).toHaveBeenCalledWith(true, 'ok');
    });

    test('task_progress_update → onTaskProgress', async () => {
      const task = { id: 't1', name: 'compile', progress: 80, status: 'running' };
      setStreamData([
        sseFrame({ type: 'task_progress_update', task }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onTaskProgress).toHaveBeenCalledWith(task);
    });

    test('artifact_created → onArtifactCreated', async () => {
      const artifact = { id: 'a1', type: 'code', title: 'snippet.ts' };
      setStreamData([
        sseFrame({ type: 'artifact_created', artifact }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onArtifactCreated).toHaveBeenCalledWith(artifact);
    });

    test('artifact_updated → onArtifactUpdated', async () => {
      const artifact = { id: 'a1', type: 'code', title: 'snippet-v2.ts' };
      setStreamData([
        sseFrame({ type: 'artifact_updated', artifact }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onArtifactUpdated).toHaveBeenCalledWith(artifact);
    });

    test('status_update → onStreamStatus', async () => {
      setStreamData([
        sseFrame({ type: 'status_update', status: 'Thinking...' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamStatus).toHaveBeenCalledWith('Thinking...');
    });

    test('stream_done → onStreamComplete (no content)', async () => {
      setStreamData([
        sseFrame({ type: 'stream_done' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamComplete).toHaveBeenCalled();
    });

    test('image_generation_start → onStreamStart with image status', async () => {
      setStreamData([
        sseFrame({ type: 'image_generation_start', message_id: 'img-1' }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamStart).toHaveBeenCalledWith('img-1', 'Generating image...');
    });

    test('graph_update → onStateUpdate', async () => {
      setStreamData([
        sseFrame({ type: 'graph_update', graph_data: { nodes: [] } }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStateUpdate).toHaveBeenCalledWith({ nodes: [] });
    });
  });

  // ==========================================================================
  // sendMessage — error handling
  // ==========================================================================

  describe('error handling', () => {
    test('transport connect failure calls onError and throws', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        service.sendMessage('hi', defaultMeta(), 'tok', callbacks),
      ).rejects.toThrow('Network failure');

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Network failure' }),
      );
    });

    test('stream error calls onError and rejects', async () => {
      mockStream.mockImplementation(async function* () {
        throw new Error('Stream interrupted');
      });

      await expect(
        service.sendMessage('hi', defaultMeta(), 'tok', callbacks),
      ).rejects.toThrow('Stream interrupted');

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Stream interrupted' }),
      );
    });

    test('malformed JSON in SSE frame is silently skipped', async () => {
      setStreamData([
        'data: {not-valid-json}',
        'data: [DONE]',
      ]);

      // Should resolve without error — bad frames are skipped.
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);
      expect(callbacks.onStreamComplete).toHaveBeenCalled();
    });

    test('parser returning null skips the event', async () => {
      mockParse.mockReturnValueOnce(null);

      setStreamData([
        sseFrame({ type: 'unknown_type' }),
        'data: [DONE]',
      ]);

      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);
      // No callback should have been invoked for the unknown event.
      expect(callbacks.onStreamStart).not.toHaveBeenCalled();
      expect(callbacks.onStreamContent).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // custom_event sub-routing
  // ==========================================================================

  describe('custom_event handling', () => {
    test('custom_event with content metadata → onStreamContent', async () => {
      setStreamData([
        sseFrame({
          type: 'custom_event',
          metadata: { custom_type: 'content', content: 'streamed text' },
        }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamContent).toHaveBeenCalledWith('streamed text');
    });

    test('custom_event with billing custom_type → onBillingUpdate', async () => {
      setStreamData([
        sseFrame({
          type: 'custom_event',
          metadata: {
            custom_type: 'billing',
            custom_data: {
              creditsRemaining: 50,
              totalCredits: 100,
              modelCalls: 2,
              toolCalls: 3,
              cost: 0.01,
            },
          },
        }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onBillingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ creditsRemaining: 50, totalCredits: 100 }),
      );
    });

    test('custom_event with resumed metadata → onStreamStatus', async () => {
      setStreamData([
        sseFrame({
          type: 'custom_event',
          metadata: { resumed: true, custom_type: 'state_restore' },
        }),
        'data: [DONE]',
      ]);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamStatus).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // resumeHIL
  // ==========================================================================

  describe('resumeHIL()', () => {
    test('delegates to sendMessage with the same arguments', async () => {
      const spy = vi.spyOn(service, 'sendMessage');

      await service.resumeHIL('resume msg', defaultMeta(), 'tok', callbacks);

      expect(spy).toHaveBeenCalledWith('resume msg', defaultMeta(), 'tok', callbacks);
    });

    test('sends correct payload through SSE transport', async () => {
      await service.resumeHIL('continue', defaultMeta(), 'tok', callbacks);

      const body = JSON.parse(mockConnect.mock.calls[0][1].body);
      expect(body.message).toBe('continue');
      expect(body.user_id).toBe('user-1');
      expect(body.session_id).toBe('session-1');
    });
  });

  // ==========================================================================
  // sendMultimodalMessage
  // ==========================================================================

  describe('sendMultimodalMessage()', () => {
    test('falls back to sendMessage (multimodal not yet implemented)', async () => {
      const spy = vi.spyOn(service, 'sendMessage');
      const files = [new File(['data'], 'photo.png', { type: 'image/png' })];

      await service.sendMultimodalMessage('look at this', defaultMeta(), 'tok', callbacks, files);

      expect(spy).toHaveBeenCalledWith('look at this', defaultMeta(), 'tok', callbacks);
    });

    test('works without files parameter', async () => {
      await service.sendMultimodalMessage('just text', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamComplete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Multi-line SSE frames
  // ==========================================================================

  describe('multi-line SSE data', () => {
    test('processes multiple events from a single chunk', async () => {
      // The stream yields a single string containing two data lines separated
      // by a newline — ChatService splits on '\n'.
      const combined =
        sseFrame({ type: 'run_started', message_id: 'm1' }) +
        '\n' +
        sseFrame({ type: 'text_delta', delta: 'hi' }) +
        '\n' +
        'data: [DONE]';

      mockStream.mockImplementation(async function* () {
        yield combined;
      });

      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(callbacks.onStreamStart).toHaveBeenCalled();
      expect(callbacks.onStreamContent).toHaveBeenCalledWith('hi');
      expect(callbacks.onStreamComplete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Connection lifecycle
  // ==========================================================================

  describe('connection lifecycle', () => {
    test('closes connection on [DONE]', async () => {
      setStreamData(['data: [DONE]']);
      await service.sendMessage('hi', defaultMeta(), 'tok', callbacks);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    test('closes connection on stream error', async () => {
      mockStream.mockImplementation(async function* () {
        throw new Error('broken pipe');
      });

      await expect(
        service.sendMessage('hi', defaultMeta(), 'tok', callbacks),
      ).rejects.toThrow('broken pipe');

      expect(mockClose).toHaveBeenCalled();
    });
  });
});
