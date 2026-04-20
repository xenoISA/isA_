/**
 * ResponsiveService — client for the isA_Mate /v1/responsive/stream/
 * SSE endpoint (xenoISA/isA_Mate#408 / #428). Powers live progress
 * indicators in observer / debug views.
 *
 * TODO: Replace with `import { ResponsiveClient } from '@isa/transport'`
 * once xenoISA/isA_App_SDK#312 publishes.
 */

import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import type { ResponsiveEvent } from './types/responsive';

export interface SubscribeOptions {
  /** Last event id to resume from — forwarded as `?last_event_id=`
   *  query param since EventSource can't set custom headers. */
  lastEventId?: string;
}

export class ResponsiveService {
  /**
   * Subscribe to per-session progress events. Returns an unsubscribe
   * function. Throws if `EventSource` is unavailable (non-browser env).
   */
  streamSession(
    sessionId: string,
    handler: (event: ResponsiveEvent) => void,
    opts: SubscribeOptions = {},
  ): () => void {
    if (typeof EventSource === 'undefined') {
      throw new Error('ResponsiveService.streamSession requires EventSource (browser env)');
    }
    const base = GATEWAY_ENDPOINTS.MATE.RESPONSIVE.STREAM(sessionId);
    const url = opts.lastEventId
      ? `${base}?last_event_id=${encodeURIComponent(opts.lastEventId)}`
      : base;
    const source = new EventSource(url, { withCredentials: true });

    const namedHandlers: Record<string, EventListener> = {};
    const genericListener: EventListener = (ev) => {
      const data = (ev as { data?: unknown }).data;
      if (typeof data !== 'string') return;
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && 'ts' in parsed && !('event' in parsed)) {
          handler({
            event: 'heartbeat',
            data: parsed as Record<string, unknown>,
            timestamp: String(parsed.ts),
            duration_ms: null,
            node_name: null,
          });
          return;
        }
        handler(parsed as ResponsiveEvent);
      } catch {
        // Ignore malformed payloads
      }
    };

    const knownEvents = [
      'message', 'heartbeat', 'node.start', 'node.end',
      'tool.start', 'tool.end', 'content.delta',
    ];
    for (const type of knownEvents) {
      namedHandlers[type] = genericListener;
      source.addEventListener(type, genericListener);
    }
    source.onmessage = genericListener as (ev: MessageEvent) => void;

    return () => {
      for (const [type, fn] of Object.entries(namedHandlers)) {
        source.removeEventListener(type, fn);
      }
      source.close();
    };
  }
}

export const responsiveService = new ResponsiveService();
export default responsiveService;
