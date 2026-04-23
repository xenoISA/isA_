import { describe, expect, test } from 'vitest';
import { formatTokenCount, formatUsd, totalTokens } from '../CostBadge';

describe('CostBadge helpers', () => {
  test('formats USD with extra precision for sub-cent costs', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(0.0042)).toBe('$0.0042');
    expect(formatUsd(1.25)).toBe('$1.25');
  });

  test('formats token counts compactly', () => {
    expect(formatTokenCount(850)).toBe('850 tok');
    expect(formatTokenCount(1250)).toBe('1.3k tok');
    expect(formatTokenCount(12000)).toBe('12k tok');
    expect(formatTokenCount(1_250_000)).toBe('1.3M tok');
  });

  test('totals input and output tokens', () => {
    expect(totalTokens({
      nodes_executed: 0,
      tool_calls: 0,
      model_calls: 0,
      tokens_used: { input: 120, output: 80 },
      cost_usd: 0.01,
      window_start: null,
      window_end: null,
    })).toBe(200);
  });
});
