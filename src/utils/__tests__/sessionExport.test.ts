import { describe, test, expect } from 'vitest';
import {
  formatSessionAsJSON,
  formatSessionAsCSV,
  formatSessionAsTXT,
  exportSession,
  computeSessionStats,
} from '../sessionExport';
import type { ChatSession } from '../../types/chatTypes';
import type { SessionExportFormat } from '../../types/sessionTypes';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseTimestamp = '2026-03-10T10:00:00.000Z';

function makeSession(overrides?: Partial<ChatSession>): ChatSession {
  return {
    id: 'session_123',
    title: 'Test Session',
    lastMessage: 'Hello!',
    timestamp: baseTimestamp,
    messageCount: 2,
    artifacts: [],
    messages: [
      {
        id: 'msg_1',
        type: 'regular' as const,
        role: 'user' as const,
        content: 'Hello, how are you?',
        timestamp: '2026-03-10T10:00:00.000Z',
        sessionId: 'session_123',
      },
      {
        id: 'msg_2',
        type: 'regular' as const,
        role: 'assistant' as const,
        content: 'I am fine, thank you!',
        timestamp: '2026-03-10T10:00:05.000Z',
        sessionId: 'session_123',
      },
    ],
    metadata: {
      apps_used: ['omni'],
      total_messages: 2,
      last_activity: '2026-03-10T10:00:05.000Z',
    },
    ...overrides,
  };
}

const emptySession = makeSession({
  id: 'session_empty',
  title: 'Empty Session',
  lastMessage: '',
  messageCount: 0,
  messages: [],
  metadata: { total_messages: 0 },
});

// ---------------------------------------------------------------------------
// L1 Unit — formatSessionAsJSON
// ---------------------------------------------------------------------------

describe('formatSessionAsJSON', () => {
  test('returns valid JSON string', () => {
    const result = formatSessionAsJSON(makeSession());
    expect(() => JSON.parse(result)).not.toThrow();
  });

  test('includes session metadata fields', () => {
    const result = formatSessionAsJSON(makeSession());
    const parsed = JSON.parse(result);
    expect(parsed.session.id).toBe('session_123');
    expect(parsed.session.title).toBe('Test Session');
    expect(parsed.session.created_at).toBe(baseTimestamp);
  });

  test('includes all messages with role, content, timestamp', () => {
    const result = formatSessionAsJSON(makeSession());
    const parsed = JSON.parse(result);
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages[0].role).toBe('user');
    expect(parsed.messages[0].content).toBe('Hello, how are you?');
    expect(parsed.messages[0].timestamp).toBeDefined();
    expect(parsed.messages[1].role).toBe('assistant');
  });

  test('handles empty session with no messages', () => {
    const result = formatSessionAsJSON(emptySession);
    const parsed = JSON.parse(result);
    expect(parsed.messages).toHaveLength(0);
    expect(parsed.session.id).toBe('session_empty');
  });

  test('includes exported_at timestamp', () => {
    const result = formatSessionAsJSON(makeSession());
    const parsed = JSON.parse(result);
    expect(parsed.exported_at).toBeDefined();
    expect(() => new Date(parsed.exported_at)).not.toThrow();
  });

  test('includes session stats', () => {
    const result = formatSessionAsJSON(makeSession());
    const parsed = JSON.parse(result);
    expect(parsed.stats).toBeDefined();
    expect(parsed.stats.total_messages).toBe(2);
    expect(parsed.stats.user_messages).toBe(1);
    expect(parsed.stats.assistant_messages).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// L1 Unit — formatSessionAsCSV
// ---------------------------------------------------------------------------

describe('formatSessionAsCSV', () => {
  test('starts with a header row', () => {
    const result = formatSessionAsCSV(makeSession());
    const lines = result.split('\n');
    expect(lines[0]).toBe('timestamp,role,content');
  });

  test('contains one data row per message', () => {
    const result = formatSessionAsCSV(makeSession());
    const lines = result.split('\n').filter(Boolean);
    // header + 2 messages
    expect(lines).toHaveLength(3);
  });

  test('escapes commas and quotes in content', () => {
    const session = makeSession({
      messages: [
        {
          id: 'msg_special',
          type: 'regular' as const,
          role: 'user' as const,
          content: 'Hello, "world"',
          timestamp: baseTimestamp,
          sessionId: 'session_123',
        },
      ],
    });
    const result = formatSessionAsCSV(session);
    // Content with commas/quotes should be wrapped in double-quotes with escaped quotes
    expect(result).toContain('"Hello, ""world"""');
  });

  test('handles empty session', () => {
    const result = formatSessionAsCSV(emptySession);
    const lines = result.split('\n').filter(Boolean);
    // Only the header
    expect(lines).toHaveLength(1);
  });

  test('handles newlines in content', () => {
    const session = makeSession({
      messages: [
        {
          id: 'msg_nl',
          type: 'regular' as const,
          role: 'assistant' as const,
          content: 'Line one\nLine two',
          timestamp: baseTimestamp,
          sessionId: 'session_123',
        },
      ],
    });
    const result = formatSessionAsCSV(session);
    // Content with newlines should be quoted
    expect(result).toContain('"Line one\nLine two"');
  });
});

// ---------------------------------------------------------------------------
// L1 Unit — formatSessionAsTXT
// ---------------------------------------------------------------------------

describe('formatSessionAsTXT', () => {
  test('includes session title as header', () => {
    const result = formatSessionAsTXT(makeSession());
    expect(result).toContain('Test Session');
  });

  test('includes session date', () => {
    const result = formatSessionAsTXT(makeSession());
    expect(result).toContain('2026-03-10');
  });

  test('labels each message with role', () => {
    const result = formatSessionAsTXT(makeSession());
    expect(result).toContain('[User]');
    expect(result).toContain('[Assistant]');
  });

  test('includes message content', () => {
    const result = formatSessionAsTXT(makeSession());
    expect(result).toContain('Hello, how are you?');
    expect(result).toContain('I am fine, thank you!');
  });

  test('handles empty session', () => {
    const result = formatSessionAsTXT(emptySession);
    expect(result).toContain('Empty Session');
    // Should not crash; should still include the header
    expect(result).not.toContain('[User]');
  });

  test('includes message timestamps', () => {
    const result = formatSessionAsTXT(makeSession());
    expect(result).toContain('10:00:00');
  });
});

// ---------------------------------------------------------------------------
// L1 Unit — computeSessionStats
// ---------------------------------------------------------------------------

describe('computeSessionStats', () => {
  test('counts total messages', () => {
    const stats = computeSessionStats(makeSession());
    expect(stats.total_messages).toBe(2);
  });

  test('counts messages by role', () => {
    const stats = computeSessionStats(makeSession());
    expect(stats.user_messages).toBe(1);
    expect(stats.assistant_messages).toBe(1);
    expect(stats.system_messages).toBe(0);
  });

  test('computes total duration in seconds', () => {
    const stats = computeSessionStats(makeSession());
    // 5 seconds between first and last message
    expect(stats.total_duration).toBe(5);
  });

  test('returns zero duration for single or no messages', () => {
    const stats = computeSessionStats(emptySession);
    expect(stats.total_duration).toBe(0);
  });

  test('computes average response time', () => {
    const stats = computeSessionStats(makeSession());
    // One assistant response, 5s after user message
    expect(stats.avg_response_time).toBe(5);
  });

  test('returns zero avg response time when no assistant messages', () => {
    const session = makeSession({
      messages: [
        {
          id: 'msg_u1',
          type: 'regular' as const,
          role: 'user' as const,
          content: 'Hello',
          timestamp: baseTimestamp,
          sessionId: 'session_123',
        },
      ],
    });
    const stats = computeSessionStats(session);
    expect(stats.avg_response_time).toBe(0);
  });

  test('includes created_at and last_activity', () => {
    const stats = computeSessionStats(makeSession());
    expect(stats.created_at).toBe('2026-03-10T10:00:00.000Z');
    expect(stats.last_activity).toBe('2026-03-10T10:00:05.000Z');
  });
});

// ---------------------------------------------------------------------------
// L1 Unit — exportSession (dispatcher)
// ---------------------------------------------------------------------------

describe('exportSession', () => {
  test('dispatches to JSON formatter', () => {
    const result = exportSession(makeSession(), 'json');
    expect(result.format).toBe('json');
    expect(result.filename).toMatch(/\.json$/);
    expect(() => JSON.parse(result.data)).not.toThrow();
  });

  test('dispatches to CSV formatter', () => {
    const result = exportSession(makeSession(), 'csv');
    expect(result.format).toBe('csv');
    expect(result.filename).toMatch(/\.csv$/);
    expect(result.data).toContain('timestamp,role,content');
  });

  test('dispatches to TXT formatter', () => {
    const result = exportSession(makeSession(), 'txt');
    expect(result.format).toBe('txt');
    expect(result.filename).toMatch(/\.txt$/);
    expect(result.data).toContain('Test Session');
  });

  test('generates filename with session id', () => {
    const result = exportSession(makeSession(), 'json');
    expect(result.filename).toContain('session_123');
  });

  test('defaults to json format when not specified', () => {
    const result = exportSession(makeSession());
    expect(result.format).toBe('json');
  });
});
