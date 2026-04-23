import { describe, expect, test } from 'vitest';
import {
  filterAuditEntries,
  getAuditCategory,
  type AuditActionFilter,
} from '../AuditDrawer';
import type { ObservabilityAuditEntry } from '../../../../api/types/observability';

function entry(action: string, metadata: Record<string, unknown> = {}, cost_usd: number | null = null): ObservabilityAuditEntry {
  return {
    timestamp: '2026-04-23T00:00:00.000Z',
    action,
    user_id: 'user-1',
    result: 'success',
    cost_usd,
    session_id: 'session-1',
    metadata,
  };
}

describe('AuditDrawer helpers', () => {
  test.each<Array<[string, ObservabilityAuditEntry, AuditActionFilter]>>([
    ['approval', entry('hil_approval_required'), 'hil'],
    ['tool', entry('tool_call_end', { tool_name: 'browser' }), 'tool'],
    ['cost', entry('model_completed', {}, 0.002), 'cost'],
    ['trigger', entry('proactive_trigger_run'), 'trigger'],
  ])('categorizes %s entries', (_name, auditEntry, expected) => {
    expect(getAuditCategory(auditEntry)).toBe(expected);
  });

  test('filters entries by category', () => {
    const entries = [
      entry('hil_interrupt_detected'),
      entry('tool_call_end', { tool_name: 'search' }),
      entry('billing_update', {}, 0.01),
    ];

    expect(filterAuditEntries(entries, 'all')).toHaveLength(3);
    expect(filterAuditEntries(entries, 'hil')).toEqual([entries[0]]);
    expect(filterAuditEntries(entries, 'tool')).toEqual([entries[1]]);
    expect(filterAuditEntries(entries, 'cost')).toEqual([entries[2]]);
  });
});
