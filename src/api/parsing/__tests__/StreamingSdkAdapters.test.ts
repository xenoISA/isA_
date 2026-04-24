import { describe, expect, test, vi } from 'vitest';

describe('streaming SDK parser adapters', () => {
  test('AGUIEventParser delegates legacy text deltas to the SDK StreamingEventParser', async () => {
    const { createAGUIEventParser } = await import('../AGUIEventParser');

    const parser = createAGUIEventParser();
    const event = parser.parse({
      type: 'text_message_content',
      content: 'Hello from Mate',
      timestamp: '2026-04-23T08:00:00.000Z',
    });

    expect(event).toMatchObject({
      type: 'content',
      data: {
        delta: 'Hello from Mate',
        contentType: 'text',
      },
      timestamp: '2026-04-23T08:00:00.000Z',
    });
  }, 15000);

  test('AGUIEventParser preserves app compatibility fields on normalized SDK events', async () => {
    const { createAGUIEventParser } = await import('../AGUIEventParser');

    const parser = createAGUIEventParser();
    const done = parser.parse({
      type: 'text_message_end',
      final_content: 'complete response',
      message_id: 'msg-1',
      run_id: 'run-1',
    });
    const billing = parser.parse({
      type: 'billing',
      cost: 0.25,
      credits_remaining: 9,
      total_credits: 10,
      model_calls: 2,
      tool_calls: 3,
    });
    const artifact = parser.parse({
      type: 'artifact_updated',
      artifact: { id: 'artifact-1', title: 'Plan' },
    });
    const toolExecuting = parser.parse({
      type: 'tool_executing',
      tool_name: 'search',
      tool_call_id: 'tool-1',
      status: 'running',
      progress: 42,
    });
    const taskProgress = parser.parse({
      type: 'task_progress_update',
      task: {
        id: 'task-1',
        name: 'Search web',
        status: 'running',
        progress: 50,
        totalSteps: 4,
      },
      thread_id: 'thread-1',
    });
    const hilRequest = parser.parse({
      type: 'hil_approval_required',
      thread_id: 'thread-1',
      checkpoint_id: 'cp-1',
      tool_name: 'ComputerUseAgent',
      action_type: 'navigate',
      target: 'https://example.com',
    });

    expect(done).toMatchObject({
      type: 'done',
      data: {
        finalContent: 'complete response',
        messageId: 'msg-1',
        runId: 'run-1',
      },
    });
    expect(billing).toMatchObject({
      type: 'billing',
      data: {
        creditsRemaining: 9,
        totalCredits: 10,
        modelCalls: 2,
        toolCalls: 3,
        cost: 0.25,
      },
    });
    expect(artifact).toMatchObject({
      type: 'artifact',
      data: {
        action: 'updated',
        artifact: { id: 'artifact-1', title: 'Plan' },
      },
    });
    expect(toolExecuting).toMatchObject({
      type: 'tool_call',
      data: {
        toolName: 'search',
        tool_name: 'search',
        callId: 'tool-1',
        tool_call_id: 'tool-1',
        status: 'running',
        progress: 42,
      },
    });
    expect(taskProgress).toMatchObject({
      type: 'task_progress',
      thread_id: 'thread-1',
      data: {
        thread_id: 'thread-1',
        currentStepName: 'Search web',
        percentage: 50,
      },
    });
    expect(hilRequest).toMatchObject({
      type: 'hil_request',
      thread_id: 'thread-1',
      data: {
        checkpoint_id: 'cp-1',
        tool_name: 'ComputerUseAgent',
        action_type: 'navigate',
        target: 'https://example.com',
      },
    });
  }, 15000);

  test('ContentParser delegates detection to the SDK ContentTypeDetector', async () => {
    const { createContentParser } = await import('../ContentParser');

    const parser = createContentParser();
    const parsed = parser.parse('{"status":"ok"}');

    expect(parsed).toMatchObject({
      raw: '{"status":"ok"}',
      primaryType: 'json',
      isMixed: false,
      elements: [
        {
          type: 'json',
          content: '{"status":"ok"}',
        },
      ],
      renderHints: {
        variant: 'chat',
        complexity: 'simple',
      },
    });
    expect(parsed?.stats).toMatchObject({
      totalLength: 15,
      elementCount: 1,
      typeDistribution: { json: 1 },
    });
  }, 15000);
});

vi.mock('@isa/transport', () => {
  class MockSSEClient {
    static instances: MockSSEClient[] = [];

    private eventCallbacks = new Set<(event: { event: string; data: string; id?: string }) => void>();
    private connectionCallbacks = new Set<(event: { type: string }) => void>();

    constructor(public config: any) {
      MockSSEClient.instances.push(this);
    }

    async connect() {
      this.connectionCallbacks.forEach(callback => callback({ type: 'connected' }));
    }

    disconnect() {
      this.connectionCallbacks.forEach(callback => callback({ type: 'disconnected' }));
    }

    onEvent(callback: (event: { event: string; data: string; id?: string }) => void) {
      this.eventCallbacks.add(callback);
      return () => this.eventCallbacks.delete(callback);
    }

    onConnection(callback: (event: { type: string }) => void) {
      this.connectionCallbacks.add(callback);
      return () => this.connectionCallbacks.delete(callback);
    }

    emit(event: { event: string; data: string; id?: string }) {
      this.eventCallbacks.forEach(callback => callback(event));
    }
  }

  return { SSEClient: MockSSEClient };
});

describe('SSETransport SDK adapter', () => {
  test('wraps @isa/transport SSEClient behind the app stream contract', async () => {
    const { SSEClient } = await import('@isa/transport');
    const { createSSETransport } = await import('../../transport/SSETransport');

    const transport = createSSETransport({ url: '', timeout: 5000 });
    const connection = await transport.connect('https://example.test/stream', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ message: 'hi' }),
    });

    const sdkClient = (SSEClient as any).instances[0];
    expect(sdkClient.config).toMatchObject({
      url: 'https://example.test/stream',
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ message: 'hi' }),
      timeout: 5000,
    });

    const iterator = connection.stream()[Symbol.asyncIterator]();
    sdkClient.emit({ event: 'message', data: '{"type":"content","data":{"delta":"hi"}}' });

    await expect(iterator.next()).resolves.toEqual({
      value: 'data: {"type":"content","data":{"delta":"hi"}}',
      done: false,
    });

    await connection.close();
    await expect(iterator.next()).resolves.toMatchObject({ done: true });
  });
});
