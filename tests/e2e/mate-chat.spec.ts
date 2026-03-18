import { test, expect } from '@playwright/test';

/**
 * L5 Smoke Tests — isA_Mate chat integration.
 *
 * Tests the Mate SSE endpoint directly to verify the backend is
 * reachable and returns valid events.
 *
 * These tests SKIP automatically when Mate is not running.
 *
 * Prerequisites: isA_Mate running on localhost:18789
 *   Start with: cd isA_Mate && bash deployment/local-dev.sh
 */

// Use 127.0.0.1 explicitly — Mate binds to IPv4
const MATE_URL = process.env.NEXT_PUBLIC_MATE_URL || 'http://127.0.0.1:18789';

// Check if Mate is available before running tests
let mateAvailable = false;

test.beforeAll(async ({ request }) => {
  try {
    const response = await request.get(`${MATE_URL}/health`, { timeout: 3000 });
    mateAvailable = response.ok();
  } catch {
    mateAvailable = false;
  }
});

test.describe('Mate backend health', () => {
  test('Mate service is reachable', async ({ request }) => {
    test.skip(!mateAvailable, 'isA_Mate not running — start with: cd isA_Mate && bash deployment/local-dev.sh');

    const response = await request.get(`${MATE_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('isa-mate');
    expect(body.initialized).toBe(true);
  });

  test('Mate lists available tools', async ({ request }) => {
    test.skip(!mateAvailable, 'isA_Mate not running');

    const response = await request.get(`${MATE_URL}/v1/tools`);
    expect(response.ok()).toBeTruthy();

    const tools = await response.json();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });
});

test.describe('Mate chat endpoint', () => {
  test('POST /v1/query returns text response', async ({ request }) => {
    test.skip(!mateAvailable, 'isA_Mate not running');

    const response = await request.post(`${MATE_URL}/v1/query`, {
      data: { prompt: 'Say exactly: test-ok' },
      timeout: 60_000,
    });
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.text).toBeTruthy();
    expect(body.session_id).toBeTruthy();
  });

  test('POST /v1/chat returns SSE stream', async ({ request }) => {
    test.skip(!mateAvailable, 'isA_Mate not running');

    const response = await request.post(`${MATE_URL}/v1/chat`, {
      data: { prompt: 'Say exactly: stream-ok' },
      headers: { Accept: 'text/event-stream' },
      timeout: 60_000,
    });
    expect(response.ok()).toBeTruthy();

    const text = await response.text();
    // Verify SSE format — should contain event types
    expect(text).toContain('event:');
    expect(text).toContain('data:');
    // Should have session_start event
    expect(text).toContain('session_start');
  });
});
