import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { observabilityService } from '../../../api/ObservabilityService';
import type { ExecutionMetrics } from '../../../api/types/observability';
import {
  OBSERVABILITY_REFRESH_EVENT,
  type ObservabilityRefreshDetail,
} from '../../../utils/observabilityEvents';

export interface CostBadgeProps {
  sessionId?: string;
  onClick?: () => void;
  className?: string;
}

export function totalTokens(metrics: ExecutionMetrics | null): number {
  if (!metrics) return 0;
  return (metrics.tokens_used?.input ?? 0) + (metrics.tokens_used?.output ?? 0);
}

export function formatUsd(value: number | null | undefined): string {
  const amount = value ?? 0;
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M tok`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}k tok`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k tok`;
  return `${value} tok`;
}

export const CostBadge: React.FC<CostBadgeProps> = ({
  sessionId,
  onClick,
  className = '',
}) => {
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const pulseTimerRef = useRef<number | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!sessionId) {
      setMetrics(null);
      return;
    }

    setLoading(true);
    try {
      const next = await observabilityService.getMetrics({ session_id: sessionId });
      setMetrics(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Metrics unavailable');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchMetrics();
    const timer = window.setInterval(() => {
      void fetchMetrics();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [fetchMetrics]);

  useEffect(() => {
    const onRefresh = (event: Event) => {
      const detail = (event as CustomEvent<ObservabilityRefreshDetail>).detail;
      if (detail?.sessionId && detail.sessionId !== sessionId) return;

      setPulse(true);
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = window.setTimeout(() => setPulse(false), 450);
      void fetchMetrics();
    };

    window.addEventListener(OBSERVABILITY_REFRESH_EVENT, onRefresh);
    return () => {
      window.removeEventListener(OBSERVABILITY_REFRESH_EVENT, onRefresh);
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, [fetchMetrics, sessionId]);

  const tokens = useMemo(() => totalTokens(metrics), [metrics]);
  const title = error
    ? `Session cost unavailable: ${error}`
    : 'Open session audit drawer';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!sessionId}
      title={title}
      aria-label="Open session cost and audit drawer"
      className={[
        'inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-all',
        'border-emerald-300/25 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70',
        pulse ? 'scale-[1.03] shadow-[0_0_24px_rgba(52,211,153,0.28)]' : '',
        !sessionId ? 'cursor-not-allowed opacity-50' : '',
        className,
      ].join(' ')}
    >
      <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]" />
      <span>{loading && !metrics ? 'Syncing' : formatUsd(metrics?.cost_usd)}</span>
      <span className="hidden sm:inline text-emerald-100/70">
        {formatTokenCount(tokens)}
      </span>
    </button>
  );
};

export default CostBadge;
