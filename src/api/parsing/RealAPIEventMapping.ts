import type { AGUIEventType } from '../../types/aguiTypes';

export interface RealAPIEvent {
  type: string;
  content?: string;
  timestamp?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

export interface CustomEventAnalysis {
  hasLLMChunk: boolean;
  hasProgress: boolean;
  hasTaskPlanning: boolean;
  rawChunk?: Record<string, any>;
  progressInfo?: string;
}

export class RealAPIEventMapper {
  static analyzeCustomEvent(event: RealAPIEvent): CustomEventAnalysis {
    const rawChunk = event.metadata?.raw_chunk;
    const data = String(rawChunk?.data || '');
    const progressInfo = this.parseProgressInfo(data);

    return {
      hasLLMChunk: typeof rawChunk?.custom_llm_chunk === 'string',
      hasProgress: Boolean(progressInfo),
      hasTaskPlanning: /task|plan/i.test(data),
      rawChunk,
      ...(progressInfo && { progressInfo }),
    };
  }

  static extractLLMChunk(event: RealAPIEvent): string | undefined {
    const chunk = event.metadata?.raw_chunk?.custom_llm_chunk;
    return typeof chunk === 'string' ? chunk : undefined;
  }

  static extractToolCalls(event: RealAPIEvent): Array<{ name: string; args: Record<string, any> }> | undefined {
    return event.metadata?.tool_calls;
  }

  static extractToolResult(event: RealAPIEvent): any {
    if (!event.content) return undefined;
    const jsonStart = event.content.indexOf('{');
    if (jsonStart < 0) return undefined;

    try {
      return JSON.parse(event.content.slice(jsonStart));
    } catch {
      return undefined;
    }
  }

  static parseProgressInfo(data: string): string | undefined {
    const match = data.match(/^\[([^\]]+)]\s+([A-Za-z]+)(?:\s+execution)?(?:\s+\(([^)]+)\))?/);
    if (!match) return undefined;

    const [, toolName, status, count] = match;
    return `${toolName} ${status.toLowerCase()}${count ? ` (${count})` : ''}`;
  }
}

export class RealAPIToAGUIMapper {
  static mapToAGUI(event: RealAPIEvent): Array<Record<string, any>> {
    const timestamp = event.timestamp || new Date().toISOString();
    const threadId = event.session_id || 'default';

    switch (event.type) {
      case 'start':
        return [{
          type: 'run_started' as AGUIEventType,
          thread_id: threadId,
          timestamp,
        }];

      case 'content':
        return this.mapContentEvent(event, threadId, timestamp);

      case 'custom_event':
        return this.mapCustomEvent(event, threadId, timestamp);

      case 'tool_calls': {
        const call = RealAPIEventMapper.extractToolCalls(event)?.[0];
        return call
          ? [{
              type: 'tool_call_start' as AGUIEventType,
              thread_id: threadId,
              timestamp,
              tool_name: call.name,
              parameters: call.args,
            }]
          : [];
      }

      case 'tool_result_msg': {
        const result = RealAPIEventMapper.extractToolResult(event);
        return result
          ? [{
              type: 'tool_call_end' as AGUIEventType,
              thread_id: threadId,
              timestamp,
              tool_name: result.action,
              result: result.data,
              error: result.status === 'success' ? undefined : result.error,
            }]
          : [];
      }

      default:
        return [];
    }
  }

  private static mapContentEvent(event: RealAPIEvent, threadId: string, timestamp: string): Array<Record<string, any>> {
    const messageId = `msg_${timestamp}`;
    return [
      {
        type: 'text_message_start' as AGUIEventType,
        thread_id: threadId,
        timestamp,
        message_id: messageId,
        role: 'assistant',
      },
      {
        type: 'text_message_content' as AGUIEventType,
        thread_id: threadId,
        timestamp,
        message_id: messageId,
        delta: event.content || '',
      },
      {
        type: 'text_message_end' as AGUIEventType,
        thread_id: threadId,
        timestamp,
        message_id: messageId,
        final_content: event.content || '',
      },
    ];
  }

  private static mapCustomEvent(event: RealAPIEvent, threadId: string, timestamp: string): Array<Record<string, any>> {
    const chunk = RealAPIEventMapper.extractLLMChunk(event);
    if (chunk !== undefined) {
      return [{
        type: 'text_message_content' as AGUIEventType,
        thread_id: threadId,
        timestamp,
        delta: chunk,
      }];
    }

    const progressInfo = RealAPIEventMapper.analyzeCustomEvent(event).progressInfo;
    if (!progressInfo) return [];

    const [toolName, status] = progressInfo.split(' ');
    return [{
      type: 'tool_executing' as AGUIEventType,
      thread_id: threadId,
      timestamp,
      tool_name: toolName,
      status,
      progress: status === 'completed' ? 100 : 0,
    }];
  }
}

export class ResponseExtractor {
  private chunks: string[] = [];
  private toolResults: any[] = [];

  processEvent(event: RealAPIEvent): Record<string, any> {
    const result: Record<string, any> = {};

    if (event.type === 'content' && event.content) {
      result.complete_response = event.content;
    }

    const chunk = RealAPIEventMapper.extractLLMChunk(event);
    if (chunk !== undefined) {
      this.chunks.push(chunk);
    }

    const toolResult = RealAPIEventMapper.extractToolResult(event);
    if (toolResult) {
      this.toolResults.push(toolResult);
      result.tool_result = toolResult;
    }

    const progressUpdate = RealAPIEventMapper.analyzeCustomEvent(event).progressInfo;
    if (progressUpdate) {
      result.progress_update = progressUpdate;
    }

    return result;
  }

  getReconstructedResponse(): string {
    return this.chunks.join('');
  }

  getToolResults(): any[] {
    return [...this.toolResults];
  }
}
