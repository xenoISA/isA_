import { test, expect } from '@playwright/test';

/**
 * E2E tests for isA_Mate chat backend.
 * Tests API endpoints directly — health, tools, query, and SSE streaming.
 *
 * These tests REQUIRE Mate to be running on :18789.
 * They FAIL (not skip) if Mate is down — that's intentional.
 *
 * Start Mate: cd isA_Mate && bash deployment/local-dev.sh
 */

const MATE_URL = 'http://127.0.0.1:18789';

test.describe('Mate backend health', () => {
  test('GET /health returns ok with initialized=true', async ({ request }) => {
    const response = await request.get(`${MATE_URL}/health`, { timeout: 5_000 });
    expect(response.ok(), 'Mate /health should return 200').toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('isa-mate');
    expect(body.initialized).toBe(true);
  });

  test('GET /v1/tools returns non-empty tool list', async ({ request }) => {
    const response = await request.get(`${MATE_URL}/v1/tools`, { timeout: 5_000 });
    expect(response.ok()).toBeTruthy();

    const tools = await response.json();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  test('GET /v1/skills returns array', async ({ request }) => {
    const response = await request.get(`${MATE_URL}/v1/skills`, { timeout: 5_000 });
    expect(response.ok()).toBeTruthy();

    const skills = await response.json();
    expect(Array.isArray(skills)).toBe(true);
  });

  test('GET /v1/teams returns team list', async ({ request }) => {
    const response = await request.get(`${MATE_URL}/v1/teams`, { timeout: 5_000 });
    expect(response.ok()).toBeTruthy();

    const teams = await response.json();
    expect(Array.isArray(teams)).toBe(true);
  });
});

test.describe('Mate query endpoint', () => {
  test('POST /v1/query returns text and session_id', async ({ request }) => {
    const response = await request.post(`${MATE_URL}/v1/query`, {
      data: { prompt: 'Say exactly: test-ok' },
      timeout: 90_000,
    });
    expect(response.ok(), 'Mate /v1/query should return 200').toBeTruthy();

    const body = await response.json();
    expect(body.text).toBeTruthy();
    expect(typeof body.text).toBe('string');
    expect(body.session_id).toBeTruthy();
    expect(body.session_id).toMatch(/^mate_/);
  });
});

test.describe('Mate SSE streaming', () => {
  test('POST /v1/chat returns SSE stream with full lifecycle', async ({ request }) => {
    const response = await request.post(`${MATE_URL}/v1/chat`, {
      data: { prompt: 'Say exactly: hello' },
      headers: { Accept: 'text/event-stream' },
      timeout: 90_000,
    });
    expect(response.ok(), 'Mate /v1/chat should return 200').toBeTruthy();

    const text = await response.text();

    // Must have SSE event format
    expect(text).toContain('event:');
    expect(text).toContain('data:');

    // Must have complete lifecycle
    expect(text).toContain('session_start');
    expect(text).toContain('session_end');
    expect(text).toContain('event: done');

    // Must have a result event with actual content
    expect(text).toContain('"type": "result"');

    // Must include session_id in events
    expect(text).toMatch(/mate_[a-f0-9]+/);
  });

  test('SSE stream contains valid JSON in data lines', async ({ request }) => {
    const response = await request.post(`${MATE_URL}/v1/chat`, {
      data: { prompt: 'Say ok' },
      headers: { Accept: 'text/event-stream' },
      timeout: 90_000,
    });
    const text = await response.text();

    // Parse every data: line and verify it's valid JSON
    const dataLines = text.split('\n')
      .filter(line => line.startsWith('data: '))
      .map(line => line.slice(6).trim())
      .filter(data => data.length > 0);

    expect(dataLines.length).toBeGreaterThan(0);

    for (const data of dataLines) {
      expect(() => JSON.parse(data), `Invalid JSON in SSE data: ${data.slice(0, 100)}`).not.toThrow();
    }
  });
});
