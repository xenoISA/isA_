import { describe, test, expect } from 'vitest';
import { MessageTimingTracker, formatTimingLog, type MessageTiming } from '../messageTiming';

describe('MessageTimingTracker', () => {
  test('snapshot is all null before any marks', () => {
    const t = new MessageTimingTracker(() => 0);
    const s = t.snapshot();
    expect(s.ttft_ms).toBeNull();
    expect(s.stream_start_ms).toBeNull();
    expect(s.stream_duration_ms).toBeNull();
    expect(s.total_ms).toBeNull();
  });

  test('computes all four metrics from t0..t3', () => {
    // Clock that returns each value once in order.
    const times = [100, 150, 250, 900];
    let i = 0;
    const now = () => times[i++];
    const t = new MessageTimingTracker(now);

    t.markSent();         // t0 = 100
    t.markStreamStart();  // t1 = 150
    t.markFirstToken();   // t2 = 250
    t.markComplete();     // t3 = 900

    const s = t.snapshot();
    expect(s.stream_start_ms).toBe(50);
    expect(s.ttft_ms).toBe(150);
    expect(s.stream_duration_ms).toBe(650);
    expect(s.total_ms).toBe(800);
    expect(typeof s.timestamp).toBe('string');
  });

  test('markStreamStart / markFirstToken / markComplete are each idempotent (first call wins)', () => {
    const clock = { v: 0 };
    const now = () => clock.v;

    const t = new MessageTimingTracker(now);
    clock.v = 10; t.markSent();
    clock.v = 20; t.markStreamStart();
    clock.v = 30; t.markStreamStart();  // second call ignored
    clock.v = 40; t.markFirstToken();
    clock.v = 50; t.markFirstToken();   // second call ignored
    clock.v = 60; t.markComplete();
    clock.v = 70; t.markComplete();     // second call ignored

    const s = t.snapshot();
    expect(s.stream_start_ms).toBe(10);   // 20 - 10
    expect(s.ttft_ms).toBe(30);           // 40 - 10
    expect(s.total_ms).toBe(50);          // 60 - 10
  });

  test('ttft stays null when no content token arrives', () => {
    const times = [0, 5, 100]; // t0, t1, t3 (no t2)
    let i = 0;
    const t = new MessageTimingTracker(() => times[i++]);
    t.markSent();
    t.markStreamStart();
    t.markComplete();
    const s = t.snapshot();
    expect(s.stream_start_ms).toBe(5);
    expect(s.ttft_ms).toBeNull();
    expect(s.stream_duration_ms).toBeNull();
    expect(s.total_ms).toBe(100);
  });
});

describe('formatTimingLog', () => {
  test('renders all metrics', () => {
    const t: MessageTiming = {
      ttft_ms: 1234.7,
      stream_start_ms: 56.2,
      stream_duration_ms: 789,
      total_ms: 2000,
      timestamp: '2026-04-21T00:00:00.000Z',
    };
    const out = formatTimingLog(t);
    expect(out).toContain('[PERF]');
    expect(out).toContain('TTFT: 1235ms');
    expect(out).toContain('stream_start: 56ms');
    expect(out).toContain('duration: 789ms');
    expect(out).toContain('total: 2000ms');
  });

  test('renders em-dash for null fields', () => {
    const t: MessageTiming = {
      ttft_ms: null,
      stream_start_ms: 10,
      stream_duration_ms: null,
      total_ms: 100,
      timestamp: '2026-04-21T00:00:00.000Z',
    };
    const out = formatTimingLog(t);
    expect(out).toContain('TTFT: —');
    expect(out).toContain('duration: —');
    expect(out).toContain('stream_start: 10ms');
    expect(out).toContain('total: 100ms');
  });
});
