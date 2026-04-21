import { describe, test, expect, beforeEach } from 'vitest';
import { usePerformanceStore, selectLastMessageTiming } from '../usePerformanceStore';
import type { MessageTiming } from '../../utils/messageTiming';

const sample: MessageTiming = {
  ttft_ms: 1200,
  stream_start_ms: 80,
  stream_duration_ms: 400,
  total_ms: 1600,
  timestamp: '2026-04-21T00:00:00.000Z',
};

describe('usePerformanceStore', () => {
  beforeEach(() => {
    usePerformanceStore.getState().clear();
  });

  test('initial state is null', () => {
    expect(usePerformanceStore.getState().lastMessageTiming).toBeNull();
  });

  test('recordTiming replaces the previous timing', () => {
    usePerformanceStore.getState().recordTiming(sample);
    expect(usePerformanceStore.getState().lastMessageTiming).toEqual(sample);

    const next: MessageTiming = { ...sample, ttft_ms: 500, timestamp: '2026-04-21T00:00:01.000Z' };
    usePerformanceStore.getState().recordTiming(next);
    expect(usePerformanceStore.getState().lastMessageTiming).toEqual(next);
  });

  test('clear() resets to null', () => {
    usePerformanceStore.getState().recordTiming(sample);
    usePerformanceStore.getState().clear();
    expect(usePerformanceStore.getState().lastMessageTiming).toBeNull();
  });

  test('selectLastMessageTiming selector returns the current timing', () => {
    usePerformanceStore.getState().recordTiming(sample);
    expect(selectLastMessageTiming(usePerformanceStore.getState())).toEqual(sample);
  });
});
