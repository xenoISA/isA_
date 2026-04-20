import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ResponsiveService } from '../ResponsiveService';
import type { ResponsiveEvent } from '../types/responsive';

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    MATE: {
      RESPONSIVE: {
        STREAM: (id: string) => `http://localhost:18789/v1/responsive/stream/${encodeURIComponent(id)}`,
      },
    },
  },
}));

const MATE = 'http://localhost:18789';

describe('ResponsiveService', () => {
  let service: ResponsiveService;

  beforeEach(() => {
    service = new ResponsiveService();
  });

  function stubEventSource() {
    const listeners: Record<string, EventListener[]> = {};
    const close = vi.fn();
    let onmessageHandler: ((ev: MessageEvent) => void) | null = null;
    class StubEventSource {
      constructor(public readonly url: string) {
        StubEventSource.lastUrl = url;
      }
      static lastUrl = '';
      addEventListener(type: string, fn: EventListener) {
        (listeners[type] ??= []).push(fn);
      }
      removeEventListener(type: string, fn: EventListener) {
        listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn);
      }
      set onmessage(fn: (ev: MessageEvent) => void) {
        onmessageHandler = fn;
      }
      get onmessage() {
        return onmessageHandler as (ev: MessageEvent) => void;
      }
      close = close;
    }
    vi.stubGlobal('EventSource', StubEventSource);
    return { listeners, close, StubEventSource };
  }

  test('builds the URL with session id URL-encoded', () => {
    const { StubEventSource } = stubEventSource();
    service.streamSession('s with spaces', () => {});
    expect(StubEventSource.lastUrl).toBe(`${MATE}/v1/responsive/stream/s%20with%20spaces`);
  });

  test('appends lastEventId as query param', () => {
    const { StubEventSource } = stubEventSource();
    service.streamSession('s1', () => {}, { lastEventId: '42' });
    expect(StubEventSource.lastUrl).toBe(`${MATE}/v1/responsive/stream/s1?last_event_id=42`);
  });

  test('dispatches typed events to handler', () => {
    const { listeners } = stubEventSource();
    const received: ResponsiveEvent[] = [];
    service.streamSession('s1', (ev) => received.push(ev));

    const payload: ResponsiveEvent = {
      event: 'tool.start',
      data: { tool_name: 'web_crawl' },
      timestamp: '2026-04-20T00:00:00Z',
      duration_ms: null,
      node_name: 'tool',
    };
    listeners['tool.start'][0]({ data: JSON.stringify(payload) } as MessageEvent as unknown as Event);

    expect(received).toHaveLength(1);
    expect(received[0].event).toBe('tool.start');
  });

  test('promotes heartbeat payload to a uniform event shape', () => {
    const { listeners } = stubEventSource();
    const received: ResponsiveEvent[] = [];
    service.streamSession('s1', (ev) => received.push(ev));

    listeners['heartbeat'][0](
      { data: JSON.stringify({ ts: '2026-04-20T00:00:00Z' }) } as MessageEvent as unknown as Event,
    );

    expect(received).toHaveLength(1);
    expect(received[0].event).toBe('heartbeat');
    expect(received[0].timestamp).toBe('2026-04-20T00:00:00Z');
  });

  test('unsubscribe closes the source and removes listeners', () => {
    const { listeners, close } = stubEventSource();
    const unsubscribe = service.streamSession('s1', () => {});
    expect(listeners['node.start']?.length).toBe(1);

    unsubscribe();

    expect(listeners['node.start']?.length).toBe(0);
    expect(close).toHaveBeenCalled();
  });

  test('throws if EventSource is unavailable', () => {
    vi.stubGlobal('EventSource', undefined);
    expect(() => service.streamSession('s1', () => {})).toThrow(/EventSource/);
  });
});
