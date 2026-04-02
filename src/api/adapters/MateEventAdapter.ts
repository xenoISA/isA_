/**
 * MateEventAdapter — Maps isA_Mate SSE events to AGUI protocol events.
 *
 * isA_Mate streams events with this format:
 *   { type: "text", content: "...", session_id: "...", metadata: {...} }
 *
 * The AGUI pipeline expects:
 *   { type: "text_message_content", delta: "...", thread_id: "...", timestamp: "..." }
 *
 * This adapter translates Mate events so the downstream AGUIEventParser,
 * callbacks, stores, and UI components remain unchanged.
 */

import type { AGUIEventType } from '../../types/aguiTypes';

export interface MateSSEEvent {
  type: string;
  content?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  tool_name?: string;
  tool_call_id?: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  // Autonomous event fields
  source?: 'scheduler' | 'trigger' | 'channel';
  job_id?: string;
  completed_at?: string;
  // Cross-channel origin fields
  channel_origin?: string;
  channel_message_id?: string;
}

export interface AGUICompatEvent {
  type: AGUIEventType;
  thread_id: string;
  timestamp: string;
  run_id?: string;
  message_id?: string;
  delta?: string;
  final_content?: string;
  role?: string;
  tool_name?: string;
  tool_call_id?: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  error?: { code: string; message: string };
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

let messageCounter = 0;

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++messageCounter}`;
}

/**
 * Convert a single Mate SSE event to one or more AGUI-compatible events.
 * Some Mate events (like "text") map 1:1. Others (like the first "text")
 * also emit a preceding "text_message_start" event.
 */
export function adaptMateEvent(
  event: MateSSEEvent,
  context: { runId: string; sessionId: string; currentMessageId: string | null }
): { events: AGUICompatEvent[]; updatedContext: typeof context } {
  const now = event.timestamp || new Date().toISOString();
  const threadId = event.session_id || context.sessionId;
  const results: AGUICompatEvent[] = [];
  let { currentMessageId } = context;

  switch (event.type) {
    case 'text': {
      // Extract cross-channel origin metadata if present
      const channelOrigin = event.channel_origin || (event.metadata?.channel_origin as string | undefined);
      const channelMeta = channelOrigin
        ? {
            channel_origin: channelOrigin,
            channel_message_id: event.channel_message_id || (event.metadata?.channel_message_id as string | undefined),
          }
        : undefined;

      // If no message started yet, emit text_message_start first
      if (!currentMessageId) {
        currentMessageId = generateId('msg');
        results.push({
          type: 'text_message_start',
          thread_id: threadId,
          timestamp: now,
          run_id: context.runId,
          message_id: currentMessageId,
          role: 'assistant',
          ...(channelMeta && { metadata: { ...event.metadata, ...channelMeta } }),
        });
      }
      results.push({
        type: 'text_message_content',
        thread_id: threadId,
        timestamp: now,
        run_id: context.runId,
        message_id: currentMessageId,
        delta: event.content || '',
        ...(channelMeta && { metadata: { ...event.metadata, ...channelMeta } }),
      });
      break;
    }

    case 'tool_use': {
      // Detect memory/recall tool invocations and synthesize a memory_recall custom event
      const toolName = event.tool_name || 'unknown';
      const isMemoryTool = /memory|recall/i.test(toolName);

      results.push({
        type: 'tool_call_start',
        thread_id: threadId,
        timestamp: now,
        run_id: context.runId,
        tool_name: toolName,
        tool_call_id: event.tool_call_id || generateId('tool'),
        parameters: event.parameters,
      });

      if (isMemoryTool && event.result) {
        // Synthesize a memory_recall custom event from the tool result
        const resultData = typeof event.result === 'object' ? event.result as Record<string, unknown> : {};
        results.push({
          type: 'custom_event' as AGUIEventType,
          thread_id: threadId,
          timestamp: now,
          run_id: context.runId,
          metadata: {
            custom_type: 'memory_recall',
            memoryId: resultData.memoryId || resultData.memory_id || generateId('mem'),
            memoryType: resultData.memoryType || resultData.memory_type || 'factual',
            content: resultData.content || (typeof event.result === 'string' ? event.result : JSON.stringify(event.result)),
            learnedAt: resultData.learnedAt || resultData.learned_at,
            confidence: resultData.confidence,
            sourceSessionId: resultData.sourceSessionId || resultData.source_session_id,
          },
        });
      }
      break;
    }

    case 'tool_result': {
      results.push({
        type: 'tool_call_end',
        thread_id: threadId,
        timestamp: now,
        run_id: context.runId,
        tool_name: event.tool_name || 'unknown',
        tool_call_id: event.tool_call_id || '',
        result: event.result,
        error: event.error ? { code: 'TOOL_ERROR', message: event.error } : undefined,
      });
      break;
    }

    case 'result': {
      // Final result — close the text message and finish the run
      if (currentMessageId) {
        results.push({
          type: 'text_message_end',
          thread_id: threadId,
          timestamp: now,
          run_id: context.runId,
          message_id: currentMessageId,
          final_content: event.content,
        });
        currentMessageId = null;
      }
      results.push({
        type: 'run_finished',
        thread_id: threadId,
        timestamp: now,
        run_id: context.runId,
        result: { status: 'success', output: event.content },
      });
      break;
    }

    case 'session_end': {
      if (currentMessageId) {
        results.push({
          type: 'text_message_end',
          thread_id: threadId,
          timestamp: now,
          run_id: context.runId,
          message_id: currentMessageId,
        });
        currentMessageId = null;
      }
      break;
    }

    case 'error': {
      results.push({
        type: 'run_error',
        thread_id: threadId,
        timestamp: now,
        run_id: context.runId,
        error: {
          code: 'MATE_ERROR',
          message: event.content || event.error || 'Unknown error',
        },
      });
      break;
    }

    // Informational events from Mate — map to AGUI status or silently consume
    case 'session_start': {
      // Session started — update context with the session_id from Mate
      break;
    }

    case 'system': {
      // System status (e.g., "Context ready: 47 tools, 38 prompts")
      // Map to stream status notification
      if (event.content) {
        results.push({
          type: 'run_started' as AGUIEventType,
          thread_id: threadId,
          timestamp: now,
          run_id: context.runId,
          metadata: { mate_status: event.content, ...event.metadata },
        });
      }
      break;
    }

    case 'node_exit': {
      // LangGraph node transition — no UI action needed
      break;
    }

case 'memory_recall': {
      // Explicit memory recall event from Mate — map to custom_event
      const recallMeta = event.metadata || {};

    case 'schedule_created': {
      // A new scheduled job was created by Mate
      results.push({
        type: 'custom_event' as AGUIEventType,
        thread_id: threadId,
        timestamp: now,
        run_id: context.runId,
        metadata: {
custom_type: 'memory_recall',
          memoryId: recallMeta.memoryId || recallMeta.memory_id || generateId('mem'),
          memoryType: recallMeta.memoryType || recallMeta.memory_type || 'factual',
          content: event.content || recallMeta.content || '',
          learnedAt: recallMeta.learnedAt || recallMeta.learned_at,
          confidence: recallMeta.confidence,
          sourceSessionId: recallMeta.sourceSessionId || recallMeta.source_session_id,

    custom_type: 'schedule_created',
          job_id: event.job_id,
          name: (event.metadata?.name as string) || '',
          cron_expression: (event.metadata?.cron_expression as string) || '',
          next_run_at: (event.metadata?.next_run_at as string) || '',
        },
      });
      break;
    }

    case 'autonomous_result': {
      // Background autonomous action result from Mate (scheduled tasks, triggers, etc.)
      // Mapped to a custom AGUI event that the autonomousEventService will handle.
      results.push({
        type: 'custom_event' as AGUIEventType,
        thread_id: threadId,
        timestamp: now,
        run_id: context.runId,
        metadata: {
          custom_type: 'autonomous_result',
          content: event.content || '',
          source: event.source || 'scheduler',
          job_id: event.job_id,
          completed_at: event.completed_at || now,
          custom_data: event.metadata,
        },
      });
      break;
    }

    default: {
      // Unknown events — silently ignore (no spurious AGUI events)
      break;
    }
  }

  return {
    events: results,
    updatedContext: { ...context, currentMessageId },
  };
}

/**
 * Create the initial run_started event and context for a Mate streaming session.
 */
export function createMateStreamContext(sessionId: string): {
  startEvent: AGUICompatEvent;
  context: { runId: string; sessionId: string; currentMessageId: string | null };
} {
  const runId = generateId('run');
  const now = new Date().toISOString();

  return {
    startEvent: {
      type: 'run_started',
      thread_id: sessionId,
      timestamp: now,
      run_id: runId,
      agent_info: { name: 'isA Mate', version: '0.2.0', capabilities: ['chat', 'tools', 'delegation'] },
      session_info: { user_id: '', session_id: sessionId },
    },
    context: { runId, sessionId, currentMessageId: null },
  };
}

/**
 * Build the request payload for Mate's /v1/chat endpoint.
 */
export function buildMateRequest(message: string, sessionId?: string): {
  prompt: string;
  session_id?: string;
} {
  return {
    prompt: message,
    ...(sessionId && { session_id: sessionId }),
  };
}
