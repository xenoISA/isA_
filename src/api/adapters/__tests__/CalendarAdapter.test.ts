import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getEvents,
  getTodayEvents,
  createEvent,
  deleteEvent,
  getProviders,
  connectProvider,
  disconnectProvider,
  syncProvider,
} from '../CalendarAdapter';

const BASE = 'http://localhost:9080/api/v1/calendar';

function mockFetchOk(data: any) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

describe('CalendarAdapter', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getEvents
  // ---------------------------------------------------------------------------
  describe('getEvents', () => {
    test('constructs URL with encoded start/end query params', async () => {
      const events = [{ id: 'e1', title: 'Standup' }];
      globalThis.fetch = mockFetchOk(events);

      const result = await getEvents('2026-04-16T00:00:00Z', '2026-04-17T00:00:00Z');

      expect(result).toEqual(events);
      const url = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(url).toContain(`${BASE}/events?start=`);
      expect(url).toContain(encodeURIComponent('2026-04-16T00:00:00Z'));
      expect(url).toContain(encodeURIComponent('2026-04-17T00:00:00Z'));
    });

    test('sends credentials include and content-type header', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getEvents('a', 'b');

      const opts = (globalThis.fetch as any).mock.calls[0][1];
      expect(opts.credentials).toBe('include');
      expect(opts.headers['Content-Type']).toBe('application/json');
    });

    test('throws on non-200 response', async () => {
      globalThis.fetch = mockFetchError(500);
      await expect(getEvents('a', 'b')).rejects.toThrow('Calendar API error: 500');
    });
  });

  // ---------------------------------------------------------------------------
  // getTodayEvents
  // ---------------------------------------------------------------------------
  describe('getTodayEvents', () => {
    test('calls getEvents with today start/end', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getTodayEvents();

      const url = (globalThis.fetch as any).mock.calls[0][0] as string;
      // Should contain today's date (ISO format)
      const now = new Date();
      const yearStr = String(now.getFullYear());
      expect(url).toContain(yearStr);
    });
  });

  // ---------------------------------------------------------------------------
  // createEvent
  // ---------------------------------------------------------------------------
  describe('createEvent', () => {
    test('POSTs event body to /events', async () => {
      const created = { id: 'e1', title: 'New Event', startTime: '', endTime: '' };
      globalThis.fetch = mockFetchOk(created);

      const payload = { title: 'New Event', startTime: '2026-04-16T10:00:00Z', endTime: '2026-04-16T11:00:00Z' };
      const result = await createEvent(payload);

      expect(result).toEqual(created);
      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/events`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual(payload);
    });

    test('throws on non-200 response', async () => {
      globalThis.fetch = mockFetchError(400);
      await expect(createEvent({ title: 'X', startTime: '', endTime: '' })).rejects.toThrow('Calendar API error: 400');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteEvent
  // ---------------------------------------------------------------------------
  describe('deleteEvent', () => {
    test('sends DELETE to /events/:id', async () => {
      globalThis.fetch = mockFetchOk(undefined);
      await deleteEvent('e42');

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/events/e42`);
      expect(opts.method).toBe('DELETE');
    });

    test('throws on non-200 response', async () => {
      globalThis.fetch = mockFetchError(404);
      await expect(deleteEvent('bad-id')).rejects.toThrow('Calendar API error: 404');
    });
  });

  // ---------------------------------------------------------------------------
  // getProviders
  // ---------------------------------------------------------------------------
  describe('getProviders', () => {
    test('GETs /providers', async () => {
      const providers = [{ id: 'p1', name: 'Google', type: 'google', connected: true }];
      globalThis.fetch = mockFetchOk(providers);

      const result = await getProviders();
      expect(result).toEqual(providers);
      expect((globalThis.fetch as any).mock.calls[0][0]).toBe(`${BASE}/providers`);
    });
  });

  // ---------------------------------------------------------------------------
  // connectProvider
  // ---------------------------------------------------------------------------
  describe('connectProvider', () => {
    test('POSTs to /providers/:type/connect', async () => {
      globalThis.fetch = mockFetchOk({ authUrl: 'https://oauth.example.com' });
      const result = await connectProvider('google');

      expect(result.authUrl).toBe('https://oauth.example.com');
      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/providers/google/connect`);
      expect(opts.method).toBe('POST');
    });
  });

  // ---------------------------------------------------------------------------
  // disconnectProvider
  // ---------------------------------------------------------------------------
  describe('disconnectProvider', () => {
    test('POSTs to /providers/:type/disconnect', async () => {
      globalThis.fetch = mockFetchOk(undefined);
      await disconnectProvider('outlook');

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/providers/outlook/disconnect`);
      expect(opts.method).toBe('POST');
    });
  });

  // ---------------------------------------------------------------------------
  // syncProvider
  // ---------------------------------------------------------------------------
  describe('syncProvider', () => {
    test('POSTs to /providers/:type/sync', async () => {
      globalThis.fetch = mockFetchOk(undefined);
      await syncProvider('apple');

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/providers/apple/sync`);
      expect(opts.method).toBe('POST');
    });

    test('throws on non-200 response', async () => {
      globalThis.fetch = mockFetchError(503);
      await expect(syncProvider('google')).rejects.toThrow('Calendar API error: 503');
    });
  });
});
