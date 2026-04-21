import { describe, test, expect } from 'vitest';
import { shouldDismissFromSwipe } from '../swipeDismiss';

describe('shouldDismissFromSwipe', () => {
  test('returns false for upward drag', () => {
    expect(shouldDismissFromSwipe(200, 150)).toBe(false);
  });

  test('returns false below threshold', () => {
    expect(shouldDismissFromSwipe(100, 159)).toBe(false); // 59px < default 60
  });

  test('returns true at threshold', () => {
    expect(shouldDismissFromSwipe(100, 160)).toBe(true); // exactly 60px
  });

  test('returns true above threshold', () => {
    expect(shouldDismissFromSwipe(100, 300)).toBe(true);
  });

  test('accepts a custom threshold', () => {
    expect(shouldDismissFromSwipe(100, 150, 100)).toBe(false); // 50 < 100
    expect(shouldDismissFromSwipe(100, 210, 100)).toBe(true); // 110 >= 100
  });

  test('no movement is not a dismiss', () => {
    expect(shouldDismissFromSwipe(42, 42)).toBe(false);
  });
});
