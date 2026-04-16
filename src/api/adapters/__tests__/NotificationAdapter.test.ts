import { describe, test, expect, vi, afterEach } from 'vitest';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismiss,
  send,
  subscribePush,
  unsubscribePush,
  getPreferences,
  updatePreferences,
} from '../NotificationAdapter';

const BASE = 'http://localhost:9080/api/v1/notifications';

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

describe('NotificationAdapter', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getNotifications
  // ---------------------------------------------------------------------------
  describe('getNotifications', () => {
    test('GETs notifications without query params when none given', async () => {
      globalThis.fetch = mockFetchOk([]);
      const result = await getNotifications();

      expect(result).toEqual([]);
      expect((globalThis.fetch as any).mock.calls[0][0]).toBe(BASE);
    });

    test('includes unread_only query param', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getNotifications({ unreadOnly: true });

      const url = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(url).toContain('unread_only=true');
    });

    test('includes limit query param', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getNotifications({ limit: 20 });

      const url = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(url).toContain('limit=20');
    });

    test('includes both unreadOnly and limit', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getNotifications({ unreadOnly: true, limit: 5 });

      const url = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(url).toContain('unread_only=true');
      expect(url).toContain('limit=5');
    });

    test('throws on non-200 response', async () => {
      globalThis.fetch = mockFetchError(500);
      await expect(getNotifications()).rejects.toThrow('Notification API error: 500');
    });
  });

  // ---------------------------------------------------------------------------
  // getUnreadCount
  // ---------------------------------------------------------------------------
  describe('getUnreadCount', () => {
    test('GETs /unread-count and returns count number', async () => {
      globalThis.fetch = mockFetchOk({ count: 7 });
      const result = await getUnreadCount();

      expect(result).toBe(7);
      expect((globalThis.fetch as any).mock.calls[0][0]).toBe(`${BASE}/unread-count`);
    });
  });

  // ---------------------------------------------------------------------------
  // markAsRead
  // ---------------------------------------------------------------------------
  describe('markAsRead', () => {
    test('POSTs to /:id/read', async () => {
      globalThis.fetch = mockFetchOk(undefined);
      await markAsRead('n1');

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/n1/read`);
      expect(opts.method).toBe('POST');
    });

    test('throws on non-200 response', async () => {
      globalThis.fetch = mockFetchError(404);
      await expect(markAsRead('bad')).rejects.toThrow('Notification API error: 404');
    });
  });

  // ---------------------------------------------------------------------------
  // markAllAsRead
  // ---------------------------------------------------------------------------
  describe('markAllAsRead', () => {
    test('POSTs to /read-all', async () => {
      globalThis.fetch = mockFetchOk(undefined);
      await markAllAsRead();

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/read-all`);
      expect(opts.method).toBe('POST');
    });
  });

  // ---------------------------------------------------------------------------
  // dismiss
  // ---------------------------------------------------------------------------
  describe('dismiss', () => {
    test('POSTs to /:id/dismiss', async () => {
      globalThis.fetch = mockFetchOk(undefined);
      await dismiss('n2');

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/n2/dismiss`);
      expect(opts.method).toBe('POST');
    });
  });

  // ---------------------------------------------------------------------------
  // send
  // ---------------------------------------------------------------------------
  describe('send', () => {
    test('POSTs notification request body', async () => {
      const notif = { id: 'n1', type: 'info', priority: 'normal', title: 'Hi', body: 'Hello', read: false, dismissed: false, createdAt: '2026-04-16' };
      globalThis.fetch = mockFetchOk(notif);

      const payload = { type: 'info' as const, title: 'Hi', body: 'Hello' };
      const result = await send(payload);

      expect(result).toEqual(notif);
      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(BASE);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual(payload);
    });
  });

  // ---------------------------------------------------------------------------
  // subscribePush / unsubscribePush
  // ---------------------------------------------------------------------------
  describe('push subscription', () => {
    test('subscribePush POSTs to /push/subscribe', async () => {
      globalThis.fetch = mockFetchOk(undefined);
      await subscribePush({ endpoint: 'https://push.example.com' });

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/push/subscribe`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ endpoint: 'https://push.example.com' });
    });

    test('unsubscribePush POSTs to /push/unsubscribe', async () => {
      globalThis.fetch = mockFetchOk(undefined);
      await unsubscribePush();

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/push/unsubscribe`);
      expect(opts.method).toBe('POST');
    });
  });

  // ---------------------------------------------------------------------------
  // getPreferences / updatePreferences
  // ---------------------------------------------------------------------------
  describe('preferences', () => {
    test('getPreferences GETs /preferences', async () => {
      const prefs = { enabled: true, channels: { push: true, email: false, inApp: true } };
      globalThis.fetch = mockFetchOk(prefs);

      const result = await getPreferences();
      expect(result).toEqual(prefs);
      expect((globalThis.fetch as any).mock.calls[0][0]).toBe(`${BASE}/preferences`);
    });

    test('updatePreferences PATCHes /preferences', async () => {
      const updated = { enabled: false, channels: { push: false, email: false, inApp: true } };
      globalThis.fetch = mockFetchOk(updated);

      const result = await updatePreferences({ enabled: false });

      expect(result).toEqual(updated);
      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/preferences`);
      expect(opts.method).toBe('PATCH');
      expect(JSON.parse(opts.body)).toEqual({ enabled: false });
    });
  });

  // ---------------------------------------------------------------------------
  // Common: credentials and headers
  // ---------------------------------------------------------------------------
  describe('common fetch options', () => {
    test('sends credentials include and content-type header', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getNotifications();

      const opts = (globalThis.fetch as any).mock.calls[0][1];
      expect(opts.credentials).toBe('include');
      expect(opts.headers['Content-Type']).toBe('application/json');
    });
  });
});
