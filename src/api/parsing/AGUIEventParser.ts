/**
 * AGUIEventParser — thin app compatibility wrapper around @isa/core streaming.
 *
 * The canonical StreamingEvent protocol lives in the SDK. This file keeps the
 * historical factory name used by chatService while delegating parsing to
 * StreamingEventParser.
 */

import {
  StreamingEventParser,
  type RawSSEData,
  type StreamingEvent,
} from '@isa/core';

export type AGUIEvent = StreamingEvent;
export type AGUIEventType = string;
export type BaseAGUIEvent = StreamingEvent;

class AGUIEventParser {
  private readonly parser = new StreamingEventParser();

  parse(raw: RawSSEData): StreamingEvent | null {
    const event = this.parser.parse(raw);
    if (!event) return null;
    return this.addAppCompatibilityFields(event, raw);
  }

  private addAppCompatibilityFields(event: StreamingEvent, raw: RawSSEData): StreamingEvent {
    const additions: Record<string, any> = {};
    const messageId = raw.message_id ?? raw.messageId;
    const runId = raw.run_id ?? raw.runId;

    if (messageId) {
      additions.messageId = messageId;
      additions.message_id = messageId;
    }
    if (runId) {
      additions.runId = runId;
      additions.run_id = runId;
    }

    if (event.type === 'done') {
      const finalContent = raw.final_content ?? raw.finalContent ?? raw.content;
      if (finalContent !== undefined) {
        additions.finalContent = finalContent;
        additions.final_content = finalContent;
      }
    }

    if (event.type === 'billing') {
      Object.assign(additions, {
        totalCredits: raw.totalCredits ?? raw.total_credits,
        modelCalls: raw.modelCalls ?? raw.model_calls,
        toolCalls: raw.toolCalls ?? raw.tool_calls,
        cost: raw.cost,
      });
    }

    if (event.type === 'artifact') {
      additions.action = raw.type === 'artifact_updated' ? 'updated' : 'created';
      additions.artifact = raw.artifact;
    }

    const filteredAdditions = Object.fromEntries(
      Object.entries(additions).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(filteredAdditions).length === 0) return event;

    return {
      ...event,
      data: {
        ...(event.data as Record<string, any>),
        ...filteredAdditions,
      },
    } as StreamingEvent;
  }
}

export function createAGUIEventParser(_options?: Record<string, any>) {
  return new AGUIEventParser();
}
