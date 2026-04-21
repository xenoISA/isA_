/**
 * ============================================================================
 * useMatePresence Hook — Polls Mate health endpoint for presence status
 * ============================================================================
 *
 * Returns live online/offline status, active channels, and working state.
 * Polls every 30 seconds. Handles Mate-offline gracefully.
 *
 * Also fires a fire-and-forget warmup ping on the first successful health
 * check of a session so the user's first message doesn't pay the
 * RuntimeContextHelper cold-start cost (#276).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMateService } from '../api/mateService';
import { useMessageStore } from '../stores/useMessageStore';
import type { MateHealthResponse } from '../types/mateTypes';

const POLL_INTERVAL_MS = 30_000;
export const WARMUP_TTL_MS = 5 * 60 * 1000; // matches RuntimeContextHelper cache TTL

// Module-level debounce so remounts in the same session don't re-fire.
let lastWarmupAt = 0;

/** Pure predicate — exported for unit tests. */
export function shouldTriggerWarmup(now: number, previouslyFiredAt: number, ttlMs: number = WARMUP_TTL_MS): boolean {
  return now - previouslyFiredAt >= ttlMs;
}

/** Test-only: reset module state between test cases. */
export function __resetWarmupForTests(): void {
  lastWarmupAt = 0;
}

/** Test-only: inspect last warmup timestamp. */
export function __getLastWarmupAtForTests(): number {
  return lastWarmupAt;
}

export type WarmupStatus = 'idle' | 'warming' | 'ready';

export interface MatePresenceState {
  isOnline: boolean;
  status: MateHealthResponse['status'] | 'offline';
  channels: string[];
  isWorking: boolean;
  lastChecked: Date | null;
  error: string | null;
  warmupStatus: WarmupStatus;
}

export function useMatePresence(): MatePresenceState {
  const [state, setState] = useState<MatePresenceState>({
    isOnline: false,
    status: 'offline',
    channels: [],
    isWorking: false,
    lastChecked: null,
    error: null,
    warmupStatus: 'idle',
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerWarmupIfNeeded = useCallback(() => {
    const now = Date.now();
    if (!shouldTriggerWarmup(now, lastWarmupAt)) return;
    lastWarmupAt = now;
    setState((prev) => ({ ...prev, warmupStatus: 'warming' }));
    // Fire-and-forget — triggerWarmup never throws
    getMateService()
      .triggerWarmup()
      .finally(() => {
        setState((prev) => ({ ...prev, warmupStatus: 'ready' }));
      });
  }, []);

  const poll = useCallback(async () => {
    try {
      const health = await getMateService().healthCheck();
      const activeDelegations = useMessageStore.getState().activeDelegations;
      const working = activeDelegations.some(
        (d) => d.status === 'delegating' || d.status === 'working'
      );

      setState((prev) => ({
        ...prev,
        isOnline: true,
        status: health.status,
        channels: health.channels ?? [],
        isWorking: working,
        lastChecked: new Date(),
        error: null,
      }));

      // Fire eager warmup on the first successful health check (debounced)
      triggerWarmupIfNeeded();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isOnline: false,
        status: 'offline',
        channels: [],
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [triggerWarmupIfNeeded]);

  useEffect(() => {
    // Initial poll
    poll();

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  // Also subscribe to delegation changes so isWorking updates immediately
  useEffect(() => {
    const unsub = useMessageStore.subscribe(
      (s) => s.activeDelegations,
      (delegations) => {
        const working = delegations.some(
          (d) => d.status === 'delegating' || d.status === 'working'
        );
        setState((prev) => ({ ...prev, isWorking: working }));
      }
    );
    return unsub;
  }, []);

  return state;
}
