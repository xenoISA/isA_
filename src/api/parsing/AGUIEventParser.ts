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
    const eventAdditions: Record<string, any> = {};
    const messageId = raw.message_id ?? raw.messageId;
    const runId = raw.run_id ?? raw.runId;
    const threadId = raw.thread_id ?? raw.threadId ?? raw.session_id ?? raw.sessionId;

    if (messageId) {
      additions.messageId = messageId;
      additions.message_id = messageId;
    }
    if (runId) {
      additions.runId = runId;
      additions.run_id = runId;
    }
    if (threadId) {
      additions.threadId = threadId;
      additions.thread_id = threadId;
      eventAdditions.threadId = threadId;
      eventAdditions.thread_id = threadId;
    }
    if (raw.metadata) {
      additions.metadata = raw.metadata;
      eventAdditions.metadata = raw.metadata;
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

    if (event.type === 'tool_call') {
      const durationMs = raw.durationMs ?? raw.duration_ms;
      Object.assign(additions, {
        toolName: (event.data as Record<string, any>).toolName ?? raw.tool_name,
        tool_name: raw.tool_name ?? (event.data as Record<string, any>).toolName,
        callId: (event.data as Record<string, any>).callId ?? raw.tool_call_id,
        tool_call_id: raw.tool_call_id ?? (event.data as Record<string, any>).callId,
        progress: raw.progress,
        durationMs,
        duration_ms: durationMs,
      });

      if (raw.type === 'tool_executing') {
        additions.status = raw.status || 'running';
      } else if (raw.type === 'tool_call_start') {
        additions.status = 'calling';
      }
    }

    if (event.type === 'task_progress') {
      const eventData = event.data as Record<string, any>;
      const task = raw.task || {};
      const currentStep = Number(eventData.currentStep || 0);
      const totalSteps = Number(eventData.totalSteps || 1);
      const rawPercentage = typeof task.percentage === 'number' ? task.percentage : task.progress;
      const percentage = typeof rawPercentage === 'number'
        ? rawPercentage
        : totalSteps > 0
          ? Math.round((currentStep / totalSteps) * 100)
          : 0;

      Object.assign(additions, {
        percentage,
        currentStepName:
          task.currentStepName ||
          task.stepName ||
          task.name ||
          task.title ||
          eventData.toolName ||
          raw.tool_name ||
          'In progress',
        estimatedTimeRemaining:
          task.estimatedTimeRemaining ??
          eventData.estimatedTimeRemaining ??
          eventData.estimatedSecondsRemaining,
        estimatedSecondsRemaining:
          eventData.estimatedSecondsRemaining ??
          task.estimatedSecondsRemaining,
      });
    }

    if (event.type === 'hil_request') {
      Object.assign(additions, {
        checkpoint_id: raw.checkpoint_id ?? (event.data as Record<string, any>).checkpointId,
        tool_name:
          raw.tool_name ??
          raw.metadata?.tool_name ??
          raw.metadata?.custom_data?.tool_name,
        action_type:
          raw.action_type ??
          raw.metadata?.action_type ??
          raw.metadata?.custom_data?.type,
        target:
          raw.target ??
          raw.url ??
          raw.metadata?.target ??
          raw.metadata?.url ??
          raw.metadata?.custom_data?.target ??
          raw.metadata?.custom_data?.url,
        x: raw.x ?? raw.metadata?.x ?? raw.metadata?.custom_data?.x,
        y: raw.y ?? raw.metadata?.y ?? raw.metadata?.custom_data?.y,
      });
    }

    if (event.type === 'error') {
      Object.assign(additions, {
        message:
          (event.data as Record<string, any>).message ??
          raw.message ??
          (typeof raw.error === 'string' ? raw.error : raw.error?.message),
        code:
          (event.data as Record<string, any>).code ??
          raw.code ??
          (typeof raw.error === 'object' ? raw.error?.code : undefined),
      });
    }

    const filteredAdditions = Object.fromEntries(
      Object.entries(additions).filter(([, value]) => value !== undefined)
    );
    const filteredEventAdditions = Object.fromEntries(
      Object.entries(eventAdditions).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(filteredAdditions).length === 0 && Object.keys(filteredEventAdditions).length === 0) {
      return event;
    }

    return {
      ...event,
      ...filteredEventAdditions,
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
