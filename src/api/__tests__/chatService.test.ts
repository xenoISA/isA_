import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '../chatService';
import type { ChatServiceCallbacks } from '../chatService';

// ============================================================================
// Mocks
// ============================================================================

const mockConnection = {
  stream: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockTransport = {
  connect: vi.fn().mockResolvedValue(mockConnection),
};

vi.mock('../transport/SSETransport', () => ({
  createSSETransport: vi.fn(() => mockTransport),
}));

const mockParser = {
  parse: vi.fn(),
};

vi.mock('../parsing/AGUIEventParser', () => ({
  createAGUIEventParser: vi.fn(() => mockParser),
}));

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    AGENTS: {
      CHAT: 'http://localhost:9080/agents/chat',
    },
    MATE: {
      CHAT: 'http://localhost:9080/mate/v1/chat',
    },
  },
  getAuthHeaders: vi.fn(() => ({})),
}));

const mockUploadFile = vi.fn().mockResolvedValue({
  file_id: 'uploaded-file-1',
  file_name: 'test.png',
  file_size: 7,
});

vi.mock('../storageService', () => ({
  getStorageService: vi.fn(() => ({
    uploadFile: (...args: any[]) => mockUploadFile(...args),
  })),
}));

vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  LogCategory: {
    CHAT_FLOW: 'chat_flow',
  },
}));

const mockBuildMateRequest = vi.fn();
const mockCreateMateStreamContext = vi.fn();
const mockAdaptMateEvent = vi.fn();

vi.mock('../adapters/MateEventAdapter', () => ({
  buildMateRequest: (...args: any[]) => mockBuildMateRequest(...args),
  createMateStreamContext: (...args: any[]) => mockCreateMateStreamContext(...args),
  adaptMateEvent: (...args: any[]) => mockAdaptMateEvent(...args),
}));

// ============================================================================
// Helpers
// ============================================================================

/** Create an async iterable that yields the given chunks then returns. */
function createAsyncIterable(chunks: string[]): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          if (i < chunks.length) {
            return { value: chunks[i++], done: false };
          }
          return { value: undefined as any, done: true };
        },
      };
    },
  };
}

const defaultMetadata = {
  user_id: 'user-1',
  session_id: 'session-1',
  prompt_name: null,
  prompt_args: {},
  proactive_enabled: false,
  collaborative_enabled: false,
  confidence_threshold: 0.7,
  proactive_predictions: null,
};

const defaultToken = 'test-token';

// ============================================================================
// Tests
// ============================================================================

describe('ChatService', () => {
  let service: ChatService;
  let callbacks: ChatServiceCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService();
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
      onHILInterruptDetected: vi.fn(),
      onHILCheckpointCreated: vi.fn(),
      onBrowserScreenshot: vi.fn(),
      onBrowserAction: vi.fn(),
      onArtifactCreated: vi.fn(),
      onArtifactUpdated: vi.fn(),
    };
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================

  describe('constructor', () => {
    test('creates a ChatService instance', () => {
      expect(service).toBeInstanceOf(ChatService);
    });
  });

  // ==========================================================================
  // sendMessage — payload & transport
  // ==========================================================================

  describe('sendMessage', () => {
    test('builds correct payload from message and metadata', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMessage('Hello', defaultMetadata, defaultToken, callbacks);

      expect(mockTransport.connect).toHaveBeenCalledWith(
        'http://localhost:9080/agents/chat',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            message: 'Hello',
            user_id: 'user-1',
            session_id: 'session-1',
            prompt_name: null,
            prompt_args: {},
            proactive_enabled: false,
            collaborative_enabled: false,
            confidence_threshold: 0.7,
            proactive_predictions: null,
          }),
        })
      );
    });

    test('sets Authorization header from token', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMessage('Hi', defaultMetadata, 'my-jwt', callbacks);

      const connectCall = mockTransport.connect.mock.calls[0];
      const options = connectCall[1];
      expect(options.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Authorization': 'Bearer my-jwt',
      });
    });

    test('omits Authorization header when token is empty', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMessage('Hi', defaultMetadata, '', callbacks);

      const connectCall = mockTransport.connect.mock.calls[0];
      const options = connectCall[1];
      expect(options.headers).not.toHaveProperty('Authorization');
    });

    test('uses AGENTS.CHAT gateway endpoint', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMessage('Hi', defaultMetadata, defaultToken, callbacks);

      const { createSSETransport } = await import('../transport/SSETransport');
      expect(createSSETransport).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'http://localhost:9080/agents/chat' })
      );
    });

    test('calls onStreamComplete when [DONE] is received', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMessage('Hi', defaultMetadata, defaultToken, callbacks);

      expect(callbacks.onStreamComplete).toHaveBeenCalled();
    });

    test('applies defaults for optional metadata fields', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      const sparseMetadata = { user_id: 'u1', session_id: 's1' };
      await service.sendMessage('Hi', sparseMetadata, defaultToken, callbacks);

      const body = JSON.parse(mockTransport.connect.mock.calls[0][1].body);
      expect(body.prompt_name).toBeNull();
      expect(body.prompt_args).toEqual({});
      expect(body.proactive_enabled).toBe(false);
      expect(body.collaborative_enabled).toBe(false);
      expect(body.confidence_threshold).toBe(0.7);
      expect(body.proactive_predictions).toBeNull();
    });
  });

  // ==========================================================================
  // handleAGUIEvent (via sendMessage stream)
  // ==========================================================================

  describe('handleAGUIEvent routing', () => {
    /**
     * Helper: stream a single JSON event through the service.
     * The parser mock returns the given aguiEvent so handleAGUIEvent runs.
     */
    async function streamEvent(aguiEvent: any): Promise<void> {
      const rawPayload = JSON.stringify({ type: aguiEvent.type });
      mockConnection.stream.mockReturnValue(
        createAsyncIterable([
          `data: ${rawPayload}`,
          'data: [DONE]',
        ])
      );
      mockParser.parse.mockReturnValueOnce(aguiEvent);
      await service.sendMessage('Hi', defaultMetadata, defaultToken, callbacks);
    }

    test('run_started → onStreamStart', async () => {
      await streamEvent({ type: 'run_started', message_id: 'msg-1' });
      expect(callbacks.onStreamStart).toHaveBeenCalledWith('msg-1', 'Starting...');
    });

    test('text_message_content → onStreamContent', async () => {
      await streamEvent({ type: 'text_message_content', delta: 'chunk' });
      expect(callbacks.onStreamContent).toHaveBeenCalledWith('chunk');
    });

    test('text_delta → onStreamContent', async () => {
      await streamEvent({ type: 'text_delta', delta: 'piece' });
      expect(callbacks.onStreamContent).toHaveBeenCalledWith('piece');
    });

    test('tool_call_start → onToolStart', async () => {
      await streamEvent({
        type: 'tool_call_start',
        tool_name: 'search',
        tool_call_id: 'tc-1',
        parameters: { q: 'test' },
      });
      expect(callbacks.onToolStart).toHaveBeenCalledWith('search', 'tc-1', { q: 'test' });
    });

    test('tool_executing → onToolExecuting', async () => {
      await streamEvent({
        type: 'tool_executing',
        tool_name: 'search',
        status: 'running',
        progress: 50,
      });
      expect(callbacks.onToolExecuting).toHaveBeenCalledWith('search', 'running', 50);
    });

    test('tool_call_end → onToolCompleted', async () => {
      await streamEvent({
        type: 'tool_call_end',
        tool_name: 'search',
        result: { data: [] },
        error: undefined,
        duration_ms: 120,
      });
      expect(callbacks.onToolCompleted).toHaveBeenCalledWith('search', { data: [] }, undefined, 120);
    });

    test('canonical tool_call running → onToolExecuting', async () => {
      await streamEvent({
        type: 'tool_call',
        data: {
          toolName: 'search',
          status: 'running',
          progress: 50,
        },
      });
      expect(callbacks.onToolExecuting).toHaveBeenCalledWith('search', 'running', 50);
    });

    test('run_finished → onStreamComplete', async () => {
      await streamEvent({ type: 'run_finished', content: 'final' });
      expect(callbacks.onStreamComplete).toHaveBeenCalledWith('final');
    });

    test('canonical done event completes without a separate DONE sentinel', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable([
          `data: ${JSON.stringify({ type: 'done' })}`,
        ])
      );
      mockParser.parse.mockReturnValueOnce({
        type: 'done',
        data: { finalContent: 'final from sdk' },
      });

      await service.sendMessage('Hi', defaultMetadata, defaultToken, callbacks);

      expect(callbacks.onStreamComplete).toHaveBeenCalledWith('final from sdk');
      expect(mockConnection.close).toHaveBeenCalled();
    });

    test('run_error → onError', async () => {
      await streamEvent({ type: 'run_error', error: { message: 'boom' } });
      expect(callbacks.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    });

    test('error → onError', async () => {
      await streamEvent({ type: 'error', message: 'bad request' });
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'bad request' })
      );
    });

    test('canonical error event uses data.message', async () => {
      await streamEvent({ type: 'error', data: { message: 'sdk failure' } });
      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'sdk failure' })
      );
    });

    test('llm_completed → onLLMCompleted', async () => {
      await streamEvent({
        type: 'llm_completed',
        model: 'gpt-4',
        token_count: 100,
        finish_reason: 'stop',
      });
      expect(callbacks.onLLMCompleted).toHaveBeenCalledWith('gpt-4', 100, 'stop');
    });

    test('node_update → onNodeUpdate', async () => {
      await streamEvent({
        type: 'node_update',
        node_name: 'router',
        status: 'completed',
        credits: 5,
        messages_count: 2,
        data: null,
      });
      expect(callbacks.onNodeUpdate).toHaveBeenCalledWith('router', 'completed', {
        credits: 5,
        messages_count: 2,
        data: null,
      });
    });

    test('state_update → onStateUpdate', async () => {
      await streamEvent({ type: 'state_update', state_data: { key: 1 }, node: 'n1' });
      expect(callbacks.onStateUpdate).toHaveBeenCalledWith({ key: 1 }, 'n1');
    });

    test('paused → onPaused', async () => {
      await streamEvent({ type: 'paused', reason: 'approval', checkpoint_id: 'cp-1' });
      expect(callbacks.onPaused).toHaveBeenCalledWith('approval', 'cp-1');
    });

    test('memory_update → onMemoryUpdate', async () => {
      await streamEvent({ type: 'memory_update', memory_data: { facts: [] }, operation: 'add' });
      expect(callbacks.onMemoryUpdate).toHaveBeenCalledWith({ facts: [] }, 'add');
    });

    test('billing → onBillingUpdate', async () => {
      await streamEvent({
        type: 'billing',
        credits_remaining: 90,
        total_credits: 100,
        model_calls: 5,
        tool_calls: 3,
        cost: 0.12,
      });
      expect(callbacks.onBillingUpdate).toHaveBeenCalledWith({
        creditsRemaining: 90,
        totalCredits: 100,
        modelCalls: 5,
        toolCalls: 3,
        cost: 0.12,
      });
    });

    test('resume_start → onResumeStart', async () => {
      await streamEvent({ type: 'resume_start', resumed_from: 'step-2', checkpoint_id: 'cp-2' });
      expect(callbacks.onResumeStart).toHaveBeenCalledWith('step-2', 'cp-2');
    });

    test('resume_end → onResumeEnd', async () => {
      await streamEvent({ type: 'resume_end', success: true, result: 'ok' });
      expect(callbacks.onResumeEnd).toHaveBeenCalledWith(true, 'ok');
    });

    test('task_progress_update → onTaskProgress', async () => {
      const task = { id: 't1', progress: 80 };
      await streamEvent({ type: 'task_progress_update', task });
      expect(callbacks.onTaskProgress).toHaveBeenCalledWith(task);
    });

    test('hil_interrupt_detected → onHILInterruptDetected', async () => {
      const event = { type: 'hil_interrupt_detected', tool: 'bash' };
      await streamEvent(event);
      expect(callbacks.onHILInterruptDetected).toHaveBeenCalledWith(event);
    });

    test('hil_checkpoint_created → onHILCheckpointCreated', async () => {
      const event = { type: 'hil_checkpoint_created', checkpoint_id: 'cp-3' };
      await streamEvent(event);
      expect(callbacks.onHILCheckpointCreated).toHaveBeenCalledWith(event);
    });

    test('hil_approval_required → onHILInterruptDetected', async () => {
      const event = { type: 'hil_approval_required', action: 'file_write' };
      await streamEvent(event);
      expect(callbacks.onHILInterruptDetected).toHaveBeenCalledWith(event);
    });

    test('browser_screenshot → onBrowserScreenshot', async () => {
      await streamEvent({
        type: 'browser_screenshot',
        screenshot_url: 'data:image/png;base64,abc',
        url: 'https://example.com',
        tabs: [{ id: 'tab-1', title: 'Example', url: 'https://example.com' }],
        active_tab_id: 'tab-1',
      });

      expect(callbacks.onBrowserScreenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          screenshotUrl: 'data:image/png;base64,abc',
          currentUrl: 'https://example.com',
          activeTabId: 'tab-1',
        }),
      );
    });

    test('custom browser_action_pending → onBrowserAction', async () => {
      await streamEvent({
        type: 'custom_event',
        metadata: {
          custom_type: 'browser_action_pending',
          custom_data: {
            id: 'act-1',
            action_type: 'click',
            description: 'Click Submit',
            target: 'button[type=submit]',
            x: 42,
            y: 55,
          },
        },
      });

      expect(callbacks.onBrowserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'act-1',
          type: 'click',
          status: 'pending',
          description: 'Click Submit',
          target: 'button[type=submit]',
          x: 42,
          y: 55,
        }),
      );
    });

    test('custom browser_action preserves SDK adapter action type', async () => {
      await streamEvent({
        type: 'custom_event',
        metadata: {
          custom_type: 'browser_action',
          custom_data: {
            id: 'tc-browser',
            type: 'navigate',
            status: 'completed',
            description: 'Navigation completed',
            target: 'https://example.com',
          },
        },
      });

      expect(callbacks.onBrowserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'tc-browser',
          type: 'navigate',
          status: 'completed',
          target: 'https://example.com',
        }),
      );
    });

    test('browser hil_approval_required also creates pending browser action', async () => {
      const event = {
        type: 'hil_approval_required',
        tool_name: 'ComputerUseAgent',
        action_type: 'navigate',
        target: 'https://example.com',
      };
      await streamEvent(event);

      expect(callbacks.onHILInterruptDetected).toHaveBeenCalledWith(event);
      expect(callbacks.onBrowserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigate',
          status: 'pending',
          target: 'https://example.com',
        }),
      );
    });

    test('canonical hil_request also creates pending browser action', async () => {
      const event = {
        type: 'hil_request',
        thread_id: 'thread-1',
        data: {
          checkpointId: 'cp-1',
          tool_name: 'ComputerUseAgent',
          action_type: 'navigate',
          target: 'https://example.com',
        },
      };
      await streamEvent(event);

      expect(callbacks.onHILInterruptDetected).toHaveBeenCalledWith(event);
      expect(callbacks.onBrowserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigate',
          status: 'pending',
          target: 'https://example.com',
        }),
      );
    });

    test('artifact_created → onArtifactCreated', async () => {
      const artifact = { id: 'a1', name: 'code.py' };
      await streamEvent({ type: 'artifact_created', artifact });
      expect(callbacks.onArtifactCreated).toHaveBeenCalledWith(artifact);
    });

    test('artifact_updated → onArtifactUpdated', async () => {
      const artifact = { id: 'a1', name: 'code.py', version: 2 };
      await streamEvent({ type: 'artifact_updated', artifact });
      expect(callbacks.onArtifactUpdated).toHaveBeenCalledWith(artifact);
    });

    test('canonical artifact update → onArtifactUpdated', async () => {
      const artifact = { id: 'a1', title: 'code.py', version: 2 };
      await streamEvent({ type: 'artifact', data: { action: 'updated', artifact } });
      expect(callbacks.onArtifactUpdated).toHaveBeenCalledWith(artifact);
    });

    test('status_update → onStreamStatus', async () => {
      await streamEvent({ type: 'status_update', status: 'Thinking...' });
      expect(callbacks.onStreamStatus).toHaveBeenCalledWith('Thinking...');
    });

    test('text_message_end → onStreamComplete', async () => {
      await streamEvent({ type: 'text_message_end', content: 'done' });
      expect(callbacks.onStreamComplete).toHaveBeenCalledWith('done');
    });

    test('stream_done → onStreamComplete', async () => {
      await streamEvent({ type: 'stream_done' });
      expect(callbacks.onStreamComplete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // sendMessageViaMate
  // ==========================================================================

  describe('sendMessageViaMate', () => {
    const mateMetadata = {
      session_id: 'mate-session-1',
      prompt_args: {
        project_context: {
          project_id: 'project-1',
          project_name: 'Alpha',
          knowledge_file_ids: ['file-1'],
        },
      },
    };

    beforeEach(() => {
      mockBuildMateRequest.mockReturnValue({
        prompt: 'Hello mate',
        session_id: 'mate-session-1',
        prompt_args: mateMetadata.prompt_args,
      });
      mockCreateMateStreamContext.mockReturnValue({
        startEvent: { type: 'run_started', message_id: 'mate-run-1' },
        context: { runId: 'mate-run-1', sessionId: 'mate-session-1', currentMessageId: null },
      });
    });

    test('calls buildMateRequest with message, session_id, and prompt_args', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMessageViaMate('Hello mate', mateMetadata, defaultToken, callbacks);

      expect(mockBuildMateRequest).toHaveBeenCalledWith(
        'Hello mate',
        'mate-session-1',
        mateMetadata.prompt_args,
      );
    });

    test('builds Mate request format with prompt, session_id, and prompt_args', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMessageViaMate('Hello mate', mateMetadata, defaultToken, callbacks);

      const body = JSON.parse(mockTransport.connect.mock.calls[0][1].body);
      expect(body).toEqual({
        prompt: 'Hello mate',
        session_id: 'mate-session-1',
        prompt_args: mateMetadata.prompt_args,
      });
    });

    test('uses MATE.CHAT gateway endpoint', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMessageViaMate('Hi', mateMetadata, defaultToken, callbacks);

      expect(mockTransport.connect).toHaveBeenCalledWith(
        'http://localhost:9080/mate/v1/chat',
        expect.anything()
      );
    });

    test('emits synthetic run_started event via createMateStreamContext', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMessageViaMate('Hi', mateMetadata, defaultToken, callbacks);

      expect(mockCreateMateStreamContext).toHaveBeenCalledWith('mate-session-1');
      expect(callbacks.onStreamStart).toHaveBeenCalledWith('mate-run-1', 'Starting...');
    });

    test('adapts Mate events via adaptMateEvent', async () => {
      const mateRaw = { type: 'text', content: 'world' };
      mockConnection.stream.mockReturnValue(
        createAsyncIterable([
          `data: ${JSON.stringify(mateRaw)}`,
          'data: [DONE]',
        ])
      );
      mockAdaptMateEvent.mockReturnValue({
        events: [{ type: 'text_message_content', delta: 'world' }],
        updatedContext: { runId: 'mate-run-1', sessionId: 'mate-session-1', currentMessageId: 'mid-1' },
      });

      await service.sendMessageViaMate('Hi', mateMetadata, defaultToken, callbacks);

      expect(mockAdaptMateEvent).toHaveBeenCalledWith(
        mateRaw,
        { runId: 'mate-run-1', sessionId: 'mate-session-1', currentMessageId: null }
      );
    });

    test('handles "event: done" SSE format', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['event: done'])
      );

      await service.sendMessageViaMate('Hi', mateMetadata, defaultToken, callbacks);

      expect(callbacks.onStreamComplete).toHaveBeenCalled();
    });

    test('completes when Mate adapter emits a terminal event without DONE sentinel', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable([
          `data: ${JSON.stringify({ type: 'result', content: 'done' })}`,
        ])
      );
      mockAdaptMateEvent.mockReturnValue({
        events: [{ type: 'run_finished', content: 'mate final' }],
        updatedContext: { runId: 'mate-run-1', sessionId: 'mate-session-1', currentMessageId: null },
      });

      await service.sendMessageViaMate('Hi', mateMetadata, defaultToken, callbacks);

      expect(callbacks.onStreamComplete).toHaveBeenCalledWith('mate final');
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // sendMultimodalMessage
  // ==========================================================================

  describe('sendMultimodalMessage', () => {
    test('uploads files then sends message with file references', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.sendMultimodalMessage(
        'Look at this',
        defaultMetadata,
        defaultToken,
        callbacks,
        [new File(['content'], 'test.png', { type: 'image/png' })]
      );

      // Files should have been uploaded first
      expect(mockUploadFile).toHaveBeenCalledTimes(1);

      // Should use AGENTS.CHAT with file_attachments in prompt_args
      expect(mockTransport.connect).toHaveBeenCalledWith(
        'http://localhost:9080/agents/chat',
        expect.objectContaining({
          body: expect.stringContaining('"file_attachments"'),
        })
      );
      expect(callbacks.onStreamComplete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // resumeHIL
  // ==========================================================================

  describe('resumeHIL', () => {
    test('delegates to sendMessage', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable(['data: [DONE]'])
      );

      await service.resumeHIL('approve', defaultMetadata, defaultToken, callbacks);

      const body = JSON.parse(mockTransport.connect.mock.calls[0][1].body);
      expect(body.message).toBe('approve');
      expect(body.user_id).toBe('user-1');
      expect(body.session_id).toBe('session-1');
      expect(callbacks.onStreamComplete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Error handling
  // ==========================================================================

  describe('error handling', () => {
    test('calls onError when transport.connect throws', async () => {
      mockTransport.connect.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        service.sendMessage('Hi', defaultMetadata, defaultToken, callbacks)
      ).rejects.toThrow('Connection refused');

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Connection refused' })
      );
    });

    test('calls onError when stream throws a non-abort error', async () => {
      const streamError = new Error('Network failure');
      mockConnection.stream.mockReturnValue({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw streamError;
            },
          };
        },
      });

      await expect(
        service.sendMessage('Hi', defaultMetadata, defaultToken, callbacks)
      ).rejects.toThrow('Network failure');

      expect(callbacks.onError).toHaveBeenCalledWith(streamError);
      expect(mockConnection.close).toHaveBeenCalled();
    });

    test('does not call onError on AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockConnection.stream.mockReturnValue({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw abortError;
            },
          };
        },
      });

      // AbortError is silently handled — the promise never resolves or rejects
      // via handleError, so we race with a timeout
      const result = await Promise.race([
        service.sendMessage('Hi', defaultMetadata, defaultToken, callbacks).catch(() => 'rejected'),
        new Promise((r) => setTimeout(() => r('timeout'), 100)),
      ]);

      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    test('calls onError callback for Mate connection failure', async () => {
      mockBuildMateRequest.mockReturnValue({ prompt: 'Hi', session_id: 's1' });
      mockCreateMateStreamContext.mockReturnValue({
        startEvent: { type: 'run_started', message_id: 'r1' },
        context: { runId: 'r1', sessionId: 's1', currentMessageId: null },
      });
      mockTransport.connect.mockRejectedValueOnce(new Error('Mate down'));

      await expect(
        service.sendMessageViaMate('Hi', { session_id: 's1' }, defaultToken, callbacks)
      ).rejects.toThrow('Mate down');

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Mate down' })
      );
    });

    test('skips unparseable SSE data lines gracefully', async () => {
      mockConnection.stream.mockReturnValue(
        createAsyncIterable([
          'data: not-valid-json',
          'data: [DONE]',
        ])
      );
      mockParser.parse.mockImplementation(() => {
        throw new Error('parse error');
      });

      await service.sendMessage('Hi', defaultMetadata, defaultToken, callbacks);

      // Should complete without throwing; onError should NOT be called for parse errors
      expect(callbacks.onStreamComplete).toHaveBeenCalled();
      expect(callbacks.onError).not.toHaveBeenCalled();
    });
  });
});
