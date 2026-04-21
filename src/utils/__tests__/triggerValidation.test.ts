import { describe, test, expect } from 'vitest';
import {
  isValidCronExpression,
  isValidThresholdCondition,
  isValidWebhookCondition,
  validateTriggerInput,
} from '../triggerValidation';

describe('isValidCronExpression', () => {
  test.each([
    '0 9 * * *',
    '*/15 * * * *',
    '0 9 * * 1-5',
    '0,30 * * * *',
    '0 0 1 1 *',
  ])('accepts %s', (expr) => {
    expect(isValidCronExpression(expr)).toBe(true);
  });

  test.each([
    ['', 'empty'],
    ['0 9 * *', 'four fields'],
    ['0 9 * * * *', 'six fields'],
    ['? 9 * * *', 'invalid char ?'],
    ['abc 9 * * *', 'non-numeric'],
    ['   ', 'whitespace only'],
  ])('rejects %s (%s)', (expr) => {
    expect(isValidCronExpression(expr)).toBe(false);
  });
});

describe('isValidThresholdCondition', () => {
  test('accepts metric + above', () => {
    expect(isValidThresholdCondition({ metric: 'cpu', above: 80 })).toBe(true);
  });

  test('accepts metric + below', () => {
    expect(isValidThresholdCondition({ metric: 'disk_free_gb', below: 5 })).toBe(true);
  });

  test('accepts metric + both', () => {
    expect(isValidThresholdCondition({ metric: 'temp', above: 100, below: 0 })).toBe(true);
  });

  test('rejects missing metric', () => {
    expect(isValidThresholdCondition({ above: 80 })).toBe(false);
  });

  test('rejects empty metric', () => {
    expect(isValidThresholdCondition({ metric: '', above: 80 })).toBe(false);
  });

  test('rejects when neither above nor below present', () => {
    expect(isValidThresholdCondition({ metric: 'cpu' })).toBe(false);
  });

  test('rejects non-object', () => {
    expect(isValidThresholdCondition(null)).toBe(false);
    expect(isValidThresholdCondition('cpu>80')).toBe(false);
  });

  test('rejects non-finite bounds', () => {
    expect(isValidThresholdCondition({ metric: 'cpu', above: NaN })).toBe(false);
    expect(isValidThresholdCondition({ metric: 'cpu', above: Infinity })).toBe(false);
  });
});

describe('isValidWebhookCondition', () => {
  test('accepts path-only', () => {
    expect(isValidWebhookCondition({ path: '/hooks/my-hook' })).toBe(true);
  });

  test('accepts path + secret', () => {
    expect(isValidWebhookCondition({ path: '/hooks/x', secret: 's3cr3t' })).toBe(true);
  });

  test('rejects empty path', () => {
    expect(isValidWebhookCondition({ path: '' })).toBe(false);
  });

  test('rejects missing path', () => {
    expect(isValidWebhookCondition({ secret: 'x' })).toBe(false);
  });

  test('rejects non-string secret', () => {
    expect(isValidWebhookCondition({ path: '/x', secret: 42 })).toBe(false);
  });
});

describe('validateTriggerInput', () => {
  test('valid cron returns no errors', () => {
    expect(validateTriggerInput({
      type: 'cron',
      name: 'Morning brief',
      action_prompt: 'Summarize overnight activity',
      condition: { cron: '0 9 * * *' },
    })).toEqual({});
  });

  test('flags missing name', () => {
    const errs = validateTriggerInput({
      type: 'cron',
      name: '',
      action_prompt: 'x',
      condition: { cron: '0 9 * * *' },
    });
    expect(errs.name).toBeDefined();
  });

  test('flags missing action_prompt', () => {
    const errs = validateTriggerInput({
      type: 'cron',
      name: 'x',
      action_prompt: '',
      condition: { cron: '0 9 * * *' },
    });
    expect(errs.action_prompt).toBeDefined();
  });

  test('flags invalid cron', () => {
    const errs = validateTriggerInput({
      type: 'cron',
      name: 'x',
      action_prompt: 'y',
      condition: { cron: 'not a cron' },
    });
    expect(errs.condition).toMatch(/cron/i);
  });

  test('flags unknown type', () => {
    const errs = validateTriggerInput({
      // @ts-expect-error — intentionally invalid
      type: 'garbage',
      name: 'x',
      action_prompt: 'y',
      condition: {},
    });
    expect(errs.condition).toMatch(/unknown/i);
  });

  test('threshold trigger validates condition shape', () => {
    expect(validateTriggerInput({
      type: 'threshold',
      name: 'x',
      action_prompt: 'y',
      condition: { metric: 'cpu', above: 80 },
    })).toEqual({});

    expect(validateTriggerInput({
      type: 'threshold',
      name: 'x',
      action_prompt: 'y',
      condition: { metric: 'cpu' },
    }).condition).toBeDefined();
  });

  test('flags overlong name', () => {
    const errs = validateTriggerInput({
      type: 'cron',
      name: 'x'.repeat(121),
      action_prompt: 'y',
      condition: { cron: '0 9 * * *' },
    });
    expect(errs.name).toMatch(/120/);
  });
});
