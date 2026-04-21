/**
 * useProgressiveStage — drives the time-based synthetic warmup stages (#278).
 *
 * Phase 1: before the backend exposes stage_latency_ms, we reduce perceived
 * wait by rotating status text based on how long the send has been in flight.
 * Phase 2 (future): consume real stage events from SSE metadata.
 */

import { useEffect, useState } from 'react';

export type ProgressiveStage = {
  /** Matches StreamingStatusLine phase prop. */
  phase: 'connecting' | 'preparing' | 'generating' | 'idle';
  /** User-visible label. */
  label: string;
};

export interface StageThreshold {
  /** Elapsed milliseconds at which this stage kicks in. */
  atMs: number;
  phase: ProgressiveStage['phase'];
  label: string;
}

/** Default thresholds — tuned to feel responsive under normal and cold paths. */
export const DEFAULT_STAGES: readonly StageThreshold[] = [
  { atMs: 0,     phase: 'connecting', label: 'Connecting...' },
  { atMs: 1_000, phase: 'preparing',  label: 'Preparing...' },
  { atMs: 3_000, phase: 'preparing',  label: 'Thinking...' },
  { atMs: 5_000, phase: 'preparing',  label: 'Still working... (complex query)' },
] as const;

/** Pure: pick the stage that applies given elapsed time. */
export function pickStage(
  elapsedMs: number,
  stages: readonly StageThreshold[] = DEFAULT_STAGES,
): ProgressiveStage {
  // Walk backwards so the highest-matching threshold wins.
  for (let i = stages.length - 1; i >= 0; i--) {
    if (elapsedMs >= stages[i].atMs) {
      return { phase: stages[i].phase, label: stages[i].label };
    }
  }
  return { phase: 'idle', label: '' };
}

/**
 * Hook: returns the current progressive stage while a send is in flight.
 * - When `sendStartedAt` is null, returns null (no in-flight send).
 * - Otherwise ticks once per `tickMs` (default 500ms) to recompute elapsed time.
 */
export function useProgressiveStage(
  sendStartedAt: number | null,
  tickMs: number = 500,
): ProgressiveStage | null {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (sendStartedAt === null) return;
    const id = setInterval(() => forceTick((n) => n + 1), tickMs);
    return () => clearInterval(id);
  }, [sendStartedAt, tickMs]);

  if (sendStartedAt === null) return null;
  return pickStage(Date.now() - sendStartedAt);
}
