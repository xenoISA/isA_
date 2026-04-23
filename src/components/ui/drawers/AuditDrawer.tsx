import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { observabilityService } from '../../../api/ObservabilityService';
import type { ObservabilityAuditEntry } from '../../../api/types/observability';
import {
  OBSERVABILITY_REFRESH_EVENT,
  type ObservabilityRefreshDetail,
} from '../../../utils/observabilityEvents';
import { formatUsd } from '../header/CostBadge';

export type AuditActionFilter = 'all' | 'hil' | 'tool' | 'cost' | 'trigger';

export const AUDIT_FILTERS: Array<{ value: AuditActionFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'hil', label: 'HIL' },
  { value: 'tool', label: 'Tools' },
  { value: 'cost', label: 'Cost' },
  { value: 'trigger', label: 'Triggers' },
];

export interface AuditDrawerProps {
  open: boolean;
  sessionId?: string;
  onClose: () => void;
}

export function getAuditCategory(entry: ObservabilityAuditEntry): AuditActionFilter {
  const metadata = entry.metadata || {};
  const haystack = [
    entry.action,
    metadata.type,
    metadata.tool_name,
    metadata.trigger_id,
    metadata.source,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/hil|human|interrupt|approval|reject/.test(haystack)) return 'hil';
  if (/tool|browser|computer|mcp/.test(haystack)) return 'tool';
  if (/cost|billing|credit|model|llm|token/.test(haystack) || (entry.cost_usd ?? 0) > 0) return 'cost';
  if (/trigger|proactive|scheduler|schedule|autonomous/.test(haystack)) return 'trigger';
  return 'all';
}

export function filterAuditEntries(
  entries: ObservabilityAuditEntry[],
  filter: AuditActionFilter,
): ObservabilityAuditEntry[] {
  if (filter === 'all') return entries;
  return entries.filter((entry) => getAuditCategory(entry) === filter);
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function summarizeMetadata(entry: ObservabilityAuditEntry): string {
  const metadata = entry.metadata || {};
  const summary =
    metadata.tool_name ||
    metadata.model ||
    metadata.trigger_id ||
    metadata.interrupt_id ||
    metadata.reason;

  return typeof summary === 'string' ? summary : '';
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({
  open,
  sessionId,
  onClose,
}) => {
  const [entries, setEntries] = useState<ObservabilityAuditEntry[]>([]);
  const [filter, setFilter] = useState<AuditActionFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    if (!open || !sessionId) return;

    setLoading(true);
    try {
      const response = await observabilityService.getAudit({
        session_id: sessionId,
        limit: 100,
      });
      setEntries(response.entries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit unavailable');
    } finally {
      setLoading(false);
    }
  }, [open, sessionId]);

  useEffect(() => {
    if (!open) return;
    void fetchAudit();
  }, [fetchAudit, open]);

  useEffect(() => {
    if (!open) return;

    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent<ObservabilityRefreshDetail>).detail;
      if (detail?.sessionId && detail.sessionId !== sessionId) return;
      void fetchAudit();
    };

    window.addEventListener(OBSERVABILITY_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(OBSERVABILITY_REFRESH_EVENT, onRefresh);
  }, [fetchAudit, open, sessionId]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  const visibleEntries = useMemo(
    () => filterAuditEntries(entries, filter),
    [entries, filter],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close audit drawer overlay"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Session audit drawer"
        className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border-l border-white/10 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl sm:max-w-md"
      >
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/60">Session audit</p>
              <h2 className="mt-1 text-lg font-semibold">Recent actions</h2>
              <p className="mt-1 text-xs text-white/45">{sessionId || 'No active session'}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Close audit drawer"
            >
              x
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {AUDIT_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={[
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  filter === item.value
                    ? 'border-emerald-300/70 bg-emerald-300/15 text-emerald-50'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void fetchAudit()}
              className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && entries.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              Loading audit events...
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {!loading && visibleEntries.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              No audit entries for this filter.
            </div>
          )}

          <div className="space-y-3">
            {visibleEntries.map((entry, index) => {
              const metadataSummary = summarizeMetadata(entry);

              return (
                <article
                  key={`${entry.timestamp}-${entry.action}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/70">
                      {getAuditCategory(entry)}
                    </span>
                    <span className="text-xs text-white/40">{formatTimestamp(entry.timestamp)}</span>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium text-white">{entry.action}</h3>
                      {metadataSummary && (
                        <p className="mt-1 truncate text-xs text-white/50">{metadataSummary}</p>
                      )}
                    </div>
                    {entry.cost_usd != null && (
                      <span className="shrink-0 text-xs font-semibold text-emerald-100">
                        {formatUsd(entry.cost_usd)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                    <span>{entry.result}</span>
                    <span>{entry.user_id}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AuditDrawer;
