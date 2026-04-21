import { describe, test, expect } from 'vitest';
import { shouldTriggerWarmup, WARMUP_TTL_MS } from '../useMatePresence';

describe('shouldTriggerWarmup — debounce predicate', () => {
  test('returns true when never fired before (now=Date.now, prev=0)', () => {
    // In real usage Date.now() is far beyond TTL vs the initial 0 sentinel.
    expect(shouldTriggerWarmup(Date.now(), 0)).toBe(true);
  });

  test('returns false inside the TTL window', () => {
    const now = 10 * 60 * 1000; // 10 min
    const fired = now - (WARMUP_TTL_MS - 1); // just inside TTL
    expect(shouldTriggerWarmup(now, fired)).toBe(false);
  });

  test('returns true exactly at TTL boundary', () => {
    const now = 10 * 60 * 1000;
    const fired = now - WARMUP_TTL_MS;
    expect(shouldTriggerWarmup(now, fired)).toBe(true);
  });

  test('returns true beyond the TTL window', () => {
    const now = 20 * 60 * 1000;
    const fired = now - (WARMUP_TTL_MS + 1);
    expect(shouldTriggerWarmup(now, fired)).toBe(true);
  });

  test('accepts a custom TTL override', () => {
    expect(shouldTriggerWarmup(100, 50, 100)).toBe(false);
    expect(shouldTriggerWarmup(200, 50, 100)).toBe(true);
  });

  test('WARMUP_TTL_MS matches the 5-minute RuntimeContextHelper cache window', () => {
    expect(WARMUP_TTL_MS).toBe(5 * 60 * 1000);
  });
});
