/**
 * Pure validators for proactive trigger forms (#303).
 *
 * Kept UI-free so they're trivially unit-testable. Returns a structured
 * error record (field → message) instead of throwing so the form can
 * render field-level messages.
 */

import type { TriggerInput, TriggerType } from '../api/types/proactive';

export type TriggerFormErrors = Partial<Record<'name' | 'action_prompt' | 'condition', string>>;

/**
 * Validate a 5-field cron expression. Not exhaustive — checks the basic
 * shape: 5 space-separated fields, each non-empty, no obviously-invalid
 * characters. Full cron semantics are the backend's responsibility.
 */
export function isValidCronExpression(expr: string): boolean {
  const trimmed = expr.trim();
  if (!trimmed) return false;
  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) return false;
  // Each field must contain only digits, *, /, -, ,, or whitespace-bounded.
  const fieldRe = /^[0-9*/,\-]+$/;
  return fields.every((f) => fieldRe.test(f));
}

/**
 * Validate a threshold condition — requires `metric` (string) and `above`
 * OR `below` (finite number). Both can be present (range).
 */
export function isValidThresholdCondition(condition: unknown): boolean {
  if (!condition || typeof condition !== 'object') return false;
  const c = condition as Record<string, unknown>;
  if (typeof c.metric !== 'string' || !c.metric.trim()) return false;
  const above = c.above;
  const below = c.below;
  const hasAbove = typeof above === 'number' && Number.isFinite(above);
  const hasBelow = typeof below === 'number' && Number.isFinite(below);
  return hasAbove || hasBelow;
}

/**
 * Validate a webhook condition — requires a non-empty `path` string.
 * Optional `secret` must be a string if present.
 */
export function isValidWebhookCondition(condition: unknown): boolean {
  if (!condition || typeof condition !== 'object') return false;
  const c = condition as Record<string, unknown>;
  if (typeof c.path !== 'string' || !c.path.trim()) return false;
  if (c.secret !== undefined && typeof c.secret !== 'string') return false;
  return true;
}

/**
 * Validate a full trigger input object. Returns field-level errors —
 * empty object means valid.
 */
export function validateTriggerInput(input: Partial<TriggerInput>): TriggerFormErrors {
  const errors: TriggerFormErrors = {};

  if (!input.name || !input.name.trim()) {
    errors.name = 'Name is required';
  } else if (input.name.length > 120) {
    errors.name = 'Name must be 120 characters or fewer';
  }

  if (!input.action_prompt || !input.action_prompt.trim()) {
    errors.action_prompt = 'Action prompt is required';
  }

  // Condition shape depends on type
  const type = input.type as TriggerType | undefined;
  if (type === 'cron') {
    const cron = (input.condition?.cron as string | undefined) ?? '';
    if (!isValidCronExpression(cron)) {
      errors.condition = 'Cron expression must be 5 fields (e.g. "0 9 * * 1-5")';
    }
  } else if (type === 'threshold') {
    if (!isValidThresholdCondition(input.condition)) {
      errors.condition = 'Threshold needs a metric and at least one of above/below';
    }
  } else if (type === 'webhook') {
    if (!isValidWebhookCondition(input.condition)) {
      errors.condition = 'Webhook needs a non-empty path';
    }
  } else if (type === 'event') {
    // Event triggers are opaque — backend validates.
    if (!input.condition || typeof input.condition !== 'object') {
      errors.condition = 'Event condition is required';
    }
  } else {
    errors.condition = 'Unknown trigger type';
  }

  return errors;
}
