/**
 * ============================================================================
 * useMatePresence Hook — Polls Mate health endpoint for presence status
 * ============================================================================
 *
 * Returns live online/offline status, active channels, and working state.
 * Polls every 30 seconds. Handles Mate-offline gracefully.
 *
 * (Note: a frontend-initiated warmup was tried in #276 but removed —
 * Mate pre-warms its RuntimeContextHelper at process startup on the
 * server side, so the frontend has no useful role in warmup.)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMateService } from '../api/mateService';
import { useMessageStore } from '../stores/useMessageStore';
import type { MateHealthResponse } from '../types/mateTypes';

const POLL_INTERVAL_MS = 30_000;

export interface MatePresenceState {
  isOnline: boolean;
  status: MateHealthResponse['status'] | 'offline';
  channels: string[];
  isWorking: boolean;
  lastChecked: Date | null;
  error: string | null;
}

export function useMatePresence(): MatePresenceState {
  const [state, setState] = useState<MatePresenceState>({
    isOnline: false,
    status: 'offline',
    channels: [],
    isWorking: false,
    lastChecked: null,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, []);

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
