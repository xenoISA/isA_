import { describe, test, expect, vi, afterEach } from 'vitest';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
} from '../TaskAdapter';

const BASE = 'http://localhost:9080/api/v1/tasks';

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

describe('TaskAdapter', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getTasks
  // ---------------------------------------------------------------------------
  describe('getTasks', () => {
    test('GETs tasks without query params when none given', async () => {
      globalThis.fetch = mockFetchOk([]);
      const result = await getTasks();

      expect(result).toEqual([]);
      expect((globalThis.fetch as any).mock.calls[0][0]).toBe(BASE);
    });

    test('includes status query param', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getTasks({ status: 'pending' });

      const url = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(url).toContain('status=pending');
    });

    test('includes limit query param', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getTasks({ limit: 10 });

      const url = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(url).toContain('limit=10');
    });

    test('includes both status and limit', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getTasks({ status: 'completed', limit: 5 });

      const url = (globalThis.fetch as any).mock.calls[0][0] as string;
      expect(url).toContain('status=completed');
      expect(url).toContain('limit=5');
    });

    test('throws on non-200 response', async () => {
      globalThis.fetch = mockFetchError(500);
      await expect(getTasks()).rejects.toThrow('Task API error: 500');
    });
  });

  // ---------------------------------------------------------------------------
  // getTask
  // ---------------------------------------------------------------------------
  describe('getTask', () => {
    test('GETs /tasks/:id', async () => {
      const task = { id: 't1', title: 'Task 1', status: 'pending', createdAt: '2026-04-16' };
      globalThis.fetch = mockFetchOk(task);

      const result = await getTask('t1');
      expect(result).toEqual(task);
      expect((globalThis.fetch as any).mock.calls[0][0]).toBe(`${BASE}/t1`);
    });

    test('throws on non-200 response', async () => {
      globalThis.fetch = mockFetchError(404);
      await expect(getTask('bad-id')).rejects.toThrow('Task API error: 404');
    });
  });

  // ---------------------------------------------------------------------------
  // createTask
  // ---------------------------------------------------------------------------
  describe('createTask', () => {
    test('POSTs to /tasks with payload body', async () => {
      const created = { id: 't1', title: 'New', status: 'pending', createdAt: '2026-04-16' };
      globalThis.fetch = mockFetchOk(created);

      const payload = { title: 'New', priority: 'high' as const };
      const result = await createTask(payload);

      expect(result).toEqual(created);
      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(BASE);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual(payload);
    });
  });

  // ---------------------------------------------------------------------------
  // updateTask
  // ---------------------------------------------------------------------------
  describe('updateTask', () => {
    test('PATCHes /tasks/:id with payload', async () => {
      const updated = { id: 't1', title: 'Updated', status: 'in_progress', createdAt: '2026-04-16' };
      globalThis.fetch = mockFetchOk(updated);

      const payload = { title: 'Updated', status: 'in_progress' as const };
      const result = await updateTask('t1', payload);

      expect(result).toEqual(updated);
      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/t1`);
      expect(opts.method).toBe('PATCH');
      expect(JSON.parse(opts.body)).toEqual(payload);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteTask
  // ---------------------------------------------------------------------------
  describe('deleteTask', () => {
    test('sends DELETE to /tasks/:id', async () => {
      globalThis.fetch = mockFetchOk(undefined);
      await deleteTask('t42');

      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/t42`);
      expect(opts.method).toBe('DELETE');
    });

    test('throws on non-200 response', async () => {
      globalThis.fetch = mockFetchError(403);
      await expect(deleteTask('t42')).rejects.toThrow('Task API error: 403');
    });
  });

  // ---------------------------------------------------------------------------
  // completeTask
  // ---------------------------------------------------------------------------
  describe('completeTask', () => {
    test('PATCHes task with completed status', async () => {
      const completed = { id: 't1', title: 'Done', status: 'completed', createdAt: '2026-04-16' };
      globalThis.fetch = mockFetchOk(completed);

      const result = await completeTask('t1');

      expect(result).toEqual(completed);
      const [url, opts] = (globalThis.fetch as any).mock.calls[0];
      expect(url).toBe(`${BASE}/t1`);
      expect(opts.method).toBe('PATCH');
      const body = JSON.parse(opts.body);
      expect(body.status).toBe('completed');
      expect(body.completedAt).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Common: credentials and headers
  // ---------------------------------------------------------------------------
  describe('common fetch options', () => {
    test('sends credentials include and content-type header', async () => {
      globalThis.fetch = mockFetchOk([]);
      await getTasks();

      const opts = (globalThis.fetch as any).mock.calls[0][1];
      expect(opts.credentials).toBe('include');
      expect(opts.headers['Content-Type']).toBe('application/json');
    });
  });
});
