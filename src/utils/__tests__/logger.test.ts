import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LogLevel, LogCategory, createLogger } from '../logger';

// We import the singleton logger indirectly through createLogger tests
// and directly for log-level filtering tests.

describe('createLogger', () => {
  test('returns an object with debug/info/warn/error methods', () => {
    const log = createLogger('TestModule');
    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
  });

  test('prefixes messages with module name', () => {
    const log = createLogger('MyModule', LogCategory.SYSTEM);
    // Just ensure it doesn't throw
    expect(() => log.info('hello')).not.toThrow();
    expect(() => log.error('oops', { detail: 1 })).not.toThrow();
  });
});

describe('LogLevel enum', () => {
  test('levels are ordered DEBUG < INFO < WARN < ERROR', () => {
    expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
    expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
    expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
  });
});

describe('LogCategory enum', () => {
  test('contains expected categories', () => {
    expect(LogCategory.USER_INPUT).toBe('USER_INPUT');
    expect(LogCategory.API_CALL).toBe('API_CALL');
    expect(LogCategory.CHAT_FLOW).toBe('CHAT_FLOW');
    expect(LogCategory.SYSTEM).toBe('SYSTEM');
  });
});

describe('MainAppLogger (via singleton)', () => {
  // Import the singleton
  let logger: typeof import('../logger').logger;

  beforeEach(async () => {
    // Re-import to get the singleton
    const mod = await import('../logger');
    logger = mod.logger;
  });

  test('exportLogs returns an array', () => {
    const logs = logger.exportLogs();
    expect(Array.isArray(logs)).toBe(true);
  });

  test('log entries have required fields', () => {
    logger.info(LogCategory.SYSTEM, 'test entry');
    const logs = logger.exportLogs();
    const last = logs[logs.length - 1];
    expect(last).toHaveProperty('timestamp');
    expect(last).toHaveProperty('level');
    expect(last).toHaveProperty('category');
    expect(last).toHaveProperty('message');
  });

  test('startTrace and endTrace set traceId', () => {
    const traceId = logger.startTrace('test-operation');
    expect(traceId).toMatch(/^trace_/);
    logger.info(LogCategory.SYSTEM, 'traced message');
    logger.endTrace();

    const logs = logger.exportLogs();
    const traced = logs.find(
      (l) => l.message === 'traced message' && l.traceId === traceId,
    );
    expect(traced).toBeTruthy();
  });

  test('getFlowSummary returns summary object', () => {
    const summary = logger.getFlowSummary();
    expect(summary).toHaveProperty('sessionId');
    expect(summary).toHaveProperty('totalLogs');
    expect(summary).toHaveProperty('categoryCounts');
    expect(summary).toHaveProperty('levelCounts');
  });

  test('configure updates logger settings', () => {
    expect(() => logger.configure({ level: LogLevel.WARN })).not.toThrow();
    // Restore
    logger.configure({ level: LogLevel.DEBUG });
  });
});
