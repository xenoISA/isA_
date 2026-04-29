import { describe, test, expect } from 'vitest';
import {
  adaptMateEvent,
  createMateStreamContext,
  buildMateRequest,
  type MateSSEEvent,
} from '../MateEventAdapter';

describe('buildMateRequest', () => {
  test('builds request with prompt only', () => {
    const req = buildMateRequest('hello');
    expect(req).toEqual({ prompt: 'hello' });
  });

  test('builds request with prompt and session_id', () => {
    const req = buildMateRequest('hello', 'sess_123');
    expect(req).toEqual({ prompt: 'hello', session_id: 'sess_123' });
  });

  test('omits session_id when undefined', () => {
    const req = buildMateRequest('hello', undefined);
    expect(req).toEqual({ prompt: 'hello' });
    expect('session_id' in req).toBe(false);
  });

  test('includes prompt_args when project context is provided', () => {
    const req = buildMateRequest('hello', 'sess_123', {
      project_context: {
        project_id: 'project-1',
        project_name: 'Alpha',
        knowledge_file_ids: ['file-1'],
      },
    });

    expect(req).toEqual({
      prompt: 'hello',
      session_id: 'sess_123',
      prompt_args: {
        project_context: {
          project_id: 'project-1',
          project_name: 'Alpha',
          knowledge_file_ids: ['file-1'],
        },
      },
    });
  });
});

describe('createMateStreamContext', () => {
  test('creates run_started event and context', () => {
    const { startEvent, context } = createMateStreamContext('sess_abc');

    expect(startEvent.type).toBe('run_started');
    expect(startEvent.thread_id).toBe('sess_abc');
    expect(startEvent.run_id).toBeTruthy();
    expect(context.sessionId).toBe('sess_abc');
    expect(context.runId).toBeTruthy();
    expect(context.currentMessageId).toBeNull();
  });

  test('generates unique run IDs', () => {
    const a = createMateStreamContext('s1');
    const b = createMateStreamContext('s2');
    expect(a.context.runId).not.toBe(b.context.runId);
  });
});

describe('adaptMateEvent — text events', () => {
  const baseCtx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: null };

  test('first text event emits text_message_start + text_message_content', () => {
    const event: MateSSEEvent = { type: 'text', content: 'Hello' };
    const { events, updatedContext } = adaptMateEvent(event, baseCtx);

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('text_message_start');
    expect(events[0].role).toBe('assistant');
    expect(events[1].type).toBe('text_message_content');
    expect(events[1].delta).toBe('Hello');
    expect(updatedContext.currentMessageId).toBeTruthy();
  });

  test('subsequent text events emit only text_message_content', () => {
    const ctx = { ...baseCtx, currentMessageId: 'msg_existing' };
    const event: MateSSEEvent = { type: 'text', content: ' world' };
    const { events } = adaptMateEvent(event, ctx);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('text_message_content');
    expect(events[0].delta).toBe(' world');
    expect(events[0].message_id).toBe('msg_existing');
  });

  test('empty content is preserved', () => {
    const event: MateSSEEvent = { type: 'text', content: '' };
    const { events } = adaptMateEvent(event, baseCtx);

    const contentEvent = events.find((e) => e.type === 'text_message_content');
    expect(contentEvent?.delta).toBe('');
  });
});

describe('adaptMateEvent — tool events', () => {
  const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: null };

  test('tool_use maps to tool_call_start', () => {
    const event: MateSSEEvent = {
      type: 'tool_use',
      tool_name: 'web_search',
      tool_call_id: 'tc_1',
      parameters: { query: 'isA platform' },
    };
    const { events } = adaptMateEvent(event, ctx);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('tool_call_start');
    expect(events[0].tool_name).toBe('web_search');
    expect(events[0].tool_call_id).toBe('tc_1');
    expect(events[0].parameters).toEqual({ query: 'isA platform' });
  });

  test('tool_result maps to tool_call_end', () => {
    const event: MateSSEEvent = {
      type: 'tool_result',
      tool_name: 'web_search',
      tool_call_id: 'tc_1',
      result: { url: 'https://example.com' },
    };
    const { events } = adaptMateEvent(event, ctx);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('tool_call_end');
    expect(events[0].result).toEqual({ url: 'https://example.com' });
  });

  test('tool_result with error maps to tool_call_end with error', () => {
    const event: MateSSEEvent = {
      type: 'tool_result',
      tool_name: 'web_search',
      error: 'Timeout after 10s',
    };
    const { events } = adaptMateEvent(event, ctx);

    expect(events[0].type).toBe('tool_call_end');
    expect(events[0].error).toEqual({ code: 'TOOL_ERROR', message: 'Timeout after 10s' });
  });

  test('ComputerUseAgent tool_use also emits pending browser action', () => {
    const event: MateSSEEvent = {
      type: 'tool_use',
      tool_name: 'ComputerUseAgent',
      tool_call_id: 'tc_browser',
      content: 'Click Submit',
      parameters: { action: 'click', target: 'button[type=submit]', x: 44, y: 52 },
    };
    const { events } = adaptMateEvent(event, ctx);

    expect(events[0].type).toBe('tool_call_start');
    expect(events[1].type).toBe('custom_event');
    expect(events[1].metadata?.custom_type).toBe('browser_action');
    expect(events[1].metadata?.custom_data).toMatchObject({
      id: 'tc_browser',
      type: 'click',
      status: 'pending',
      description: 'Click Submit',
      target: 'button[type=submit]',
      x: 44,
      y: 52,
    });
  });

  test('ComputerUseAgent tool_result with screenshot emits browser screenshot', () => {
    const event: MateSSEEvent = {
      type: 'tool_result',
      tool_name: 'ComputerUseAgent',
      tool_call_id: 'tc_browser',
      result: {
        action: 'navigate',
        url: 'https://example.com',
        screenshot_url: 'data:image/png;base64,abc',
      },
    };
    const { events } = adaptMateEvent(event, ctx);

    expect(events.map((e) => e.type)).toEqual(['tool_call_end', 'custom_event', 'custom_event']);
    expect(events[1].metadata?.custom_type).toBe('browser_action');
    expect(events[1].metadata?.custom_data).toMatchObject({
      id: 'tc_browser',
      type: 'navigate',
      status: 'completed',
      target: 'https://example.com',
    });
    expect(events[2].metadata?.custom_type).toBe('browser_screenshot');
    expect(events[2].metadata?.custom_data).toMatchObject({
      screenshot: 'data:image/png;base64,abc',
      url: 'https://example.com',
    });
  });
});

describe('adaptMateEvent — browser control events', () => {
  const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: null };

  test('browser_screenshot maps to browser custom event', () => {
    const event: MateSSEEvent = {
      type: 'browser_screenshot',
      screenshot_url: 'data:image/png;base64,abc',
      url: 'https://example.com',
      active_tab_id: 'tab-1',
    };
    const { events } = adaptMateEvent(event, ctx);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('custom_event');
    expect(events[0].metadata?.custom_type).toBe('browser_screenshot');
    expect(events[0].metadata?.custom_data).toMatchObject({
      screenshot: 'data:image/png;base64,abc',
      url: 'https://example.com',
      active_tab_id: 'tab-1',
    });
  });

  test('browser_action_pending maps to browser action custom event', () => {
    const event: MateSSEEvent = {
      type: 'browser_action_pending',
      id: 'act-1',
      action_type: 'click',
      description: 'Click Approve',
      target: '#approve',
      x: 20,
      y: 30,
    };
    const { events } = adaptMateEvent(event, ctx);

    expect(events).toHaveLength(1);
    expect(events[0].metadata?.custom_type).toBe('browser_action_pending');
    expect(events[0].metadata?.custom_data).toMatchObject({
      id: 'act-1',
      type: 'click',
      status: 'pending',
      description: 'Click Approve',
      target: '#approve',
      x: 20,
      y: 30,
    });
  });
});

describe('adaptMateEvent — lifecycle events', () => {
  test('result event closes message and finishes run', () => {
    const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: 'msg_1' };
    const event: MateSSEEvent = { type: 'result', content: 'Final answer' };
    const { events, updatedContext } = adaptMateEvent(event, ctx);

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('text_message_end');
    expect(events[0].final_content).toBe('Final answer');
    expect(events[1].type).toBe('run_finished');
    expect(updatedContext.currentMessageId).toBeNull();
  });

  test('result without active message only emits run_finished', () => {
    const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: null };
    const event: MateSSEEvent = { type: 'result', content: 'Done' };
    const { events } = adaptMateEvent(event, ctx);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('run_finished');
  });

  test('session_end closes active message', () => {
    const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: 'msg_1' };
    const event: MateSSEEvent = { type: 'session_end' };
    const { events, updatedContext } = adaptMateEvent(event, ctx);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('text_message_end');
    expect(updatedContext.currentMessageId).toBeNull();
  });

  test('error maps to run_error', () => {
    const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: null };
    const event: MateSSEEvent = { type: 'error', content: 'Rate limited' };
    const { events } = adaptMateEvent(event, ctx);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('run_error');
    expect(events[0].error?.message).toBe('Rate limited');
  });
});

describe('adaptMateEvent — informational events', () => {
  const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: null };

  test('session_start emits no events', () => {
    const event: MateSSEEvent = { type: 'session_start', content: 'Session started', session_id: 'mate_abc' };
    const { events } = adaptMateEvent(event, ctx);
    expect(events).toHaveLength(0);
  });

  test('system event emits status metadata', () => {
    const event: MateSSEEvent = {
      type: 'system',
      content: 'Context ready: 47 tools',
      metadata: { tools_count: 47 },
    };
    const { events } = adaptMateEvent(event, ctx);
    expect(events).toHaveLength(1);
    expect(events[0].metadata?.mate_status).toBe('Context ready: 47 tools');
  });

  test('node_exit emits no events', () => {
    const event: MateSSEEvent = { type: 'node_exit', content: 'Exiting sense', metadata: { node: 'sense' } };
    const { events } = adaptMateEvent(event, ctx);
    expect(events).toHaveLength(0);
  });

  test('unknown event type emits no events', () => {
    const event: MateSSEEvent = { type: 'some_future_event', content: 'data' };
    const { events } = adaptMateEvent(event, ctx);
    expect(events).toHaveLength(0);
  });
});

describe('adaptMateEvent — context propagation', () => {
  test('session_id from event overrides context', () => {
    const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: null };
    const event: MateSSEEvent = { type: 'text', content: 'hi', session_id: 'sess_override' };
    const { events } = adaptMateEvent(event, ctx);

    expect(events[0].thread_id).toBe('sess_override');
  });

  test('uses context sessionId when event has no session_id', () => {
    const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: null };
    const event: MateSSEEvent = { type: 'text', content: 'hi' };
    const { events } = adaptMateEvent(event, ctx);

    expect(events[0].thread_id).toBe('sess_1');
  });

  test('preserves timestamp from event', () => {
    const ctx = { runId: 'run_1', sessionId: 'sess_1', currentMessageId: null };
    const ts = '2026-03-18T12:00:00Z';
    const event: MateSSEEvent = { type: 'text', content: 'hi', timestamp: ts };
    const { events } = adaptMateEvent(event, ctx);

    expect(events[0].timestamp).toBe(ts);
  });
});
