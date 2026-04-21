import { describe, test, expect } from 'vitest';
import { pickStage, DEFAULT_STAGES } from '../useProgressiveStage';

describe('pickStage — time-based synthetic warmup stages (#278)', () => {
  test('returns connecting at 0ms', () => {
    expect(pickStage(0).phase).toBe('connecting');
    expect(pickStage(0).label).toBe('Connecting...');
  });

  test('stays on connecting below 1s', () => {
    expect(pickStage(500).label).toBe('Connecting...');
    expect(pickStage(999).label).toBe('Connecting...');
  });

  test('transitions to preparing at 1s', () => {
    expect(pickStage(1_000).phase).toBe('preparing');
    expect(pickStage(1_000).label).toBe('Preparing...');
  });

  test('transitions to thinking at 3s', () => {
    expect(pickStage(3_000).phase).toBe('preparing');
    expect(pickStage(3_000).label).toBe('Thinking...');
  });

  test('transitions to still working at 5s', () => {
    expect(pickStage(5_000).label).toBe('Still working... (complex query)');
    expect(pickStage(30_000).label).toBe('Still working... (complex query)');
  });

  test('stages are monotonically ordered by atMs', () => {
    for (let i = 1; i < DEFAULT_STAGES.length; i++) {
      expect(DEFAULT_STAGES[i].atMs).toBeGreaterThan(DEFAULT_STAGES[i - 1].atMs);
    }
  });

  test('accepts a custom threshold table', () => {
    const custom = [
      { atMs: 0, phase: 'connecting' as const, label: 'A' },
      { atMs: 100, phase: 'preparing' as const, label: 'B' },
    ];
    expect(pickStage(50, custom).label).toBe('A');
    expect(pickStage(100, custom).label).toBe('B');
  });

  test('returns idle if the threshold table is empty', () => {
    expect(pickStage(1000, []).phase).toBe('idle');
    expect(pickStage(1000, []).label).toBe('');
  });
});
