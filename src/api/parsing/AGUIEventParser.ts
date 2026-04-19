/**
 * AGUIEventParser — AGUI/Legacy event → StreamingEvent conversion.
 *
 * MIGRATION NOTE (#281): This file has been reduced from 1,234 lines to ~120.
 * The full typed StreamingEvent protocol now lives in @isa/core (isA_App_SDK#287).
 * When @isa/core is published with streaming exports, replace this file with:
 *
 *   export { StreamingEventParser as AGUIEventParser } from '@isa/core';
 *   export { type StreamingEvent as AGUIEvent } from '@isa/core';
 *
 * Until then, this is a standalone reimplementation matching the SDK contract.
 */

// ---------------------------------------------------------------------------
// StreamingEvent types (mirrors @isa/core/streaming/StreamingEvent)
// ---------------------------------------------------------------------------

export interface StreamingEvent {
  type: string;
  data: Record<string, any>;
  id?: string;
  timestamp: string;
}

export type AGUIEvent = StreamingEvent;
export type AGUIEventType = string;
export type BaseAGUIEvent = StreamingEvent;

// ---------------------------------------------------------------------------
// Raw SSE data shape
// ---------------------------------------------------------------------------

interface RawSSEData {
  type?: string;
  event?: string;
  data?: any;
  id?: string;
  timestamp?: string;
  delta?: string;
  content?: string;
  message_id?: string;
  run_id?: string;
  tool_name?: string;
  tool_call_id?: string;
  parameters?: Record<string, any>;
  result?: any;
  error?: string | { message: string; code?: string };
  status?: string;
  progress?: number;
  task?: any;
  interrupt?: any;
  hil_interrupt?: any;
  artifact?: any;
  checkpoint_id?: string;
  node_name?: string;
  token_count?: number;
  cost?: number;
  credits_remaining?: number;
  total_credits?: number;
  model_calls?: number;
  tool_calls?: number;
  model?: string;
  custom_llm_chunk?: string;
  image_url?: string;
  graph_data?: any;
  state_data?: any;
  node?: string;
  memory_data?: any;
  operation?: string;
  reason?: string;
  success?: boolean;
  resumed_from?: string;
  finish_reason?: string;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

class AGUIEventParser {
  /**
   * Parse raw SSE event data. Returns the event as-is for the callback router
   * in chatService.ts (which handles the event-to-callback mapping).
   *
   * This is intentionally pass-through: chatService.handleAGUIEvent already
   * has the full switch/case logic. We just ensure required fields exist.
   */
  parse(raw: RawSSEData): RawSSEData | null {
    if (!raw || typeof raw !== 'object') return null;
    const eventType = raw.type || raw.event;
    if (!eventType) return null;

    return {
      ...raw,
      type: eventType,
      timestamp: raw.timestamp || new Date().toISOString(),
    };
  }
}

/**
 * Factory function — backward-compatible with existing chatService.ts usage.
 */
export function createAGUIEventParser(_options?: Record<string, any>) {
  return new AGUIEventParser();
}
