/**
 * ============================================================================
 * useMatePresence Hook — Polls Mate health endpoint for presence status
 * ============================================================================
 *
 * Returns live online/offline status, active channels, and working state.
 *
 * All consumers share a single module-level poller (one /health request
 * every 30s regardless of how many components call this hook). Previously
 * each component spun up its own setInterval, which multiplied the poll
 * rate by the number of mounted consumers (5+).
 *
 * (Note: a frontend-initiated warmup was tried in #276 but removed —
 * Mate pre-warms its RuntimeContextHelper at process startup on the
 * server side, so the frontend has no useful role in warmup.)
 */

import { useState, useEffect } from 'react';
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

const INITIAL_STATE: MatePresenceState = {
  isOnline: false,
  status: 'offline',
  channels: [],
  isWorking: false,
  lastChecked: null,
  error: null,
};

// ----------------------------------------------------------------------------
// Module-level shared poller — one interval, one in-flight request, N subscribers.
// ----------------------------------------------------------------------------

type Listener = (state: MatePresenceState) => void;

let currentState: MatePresenceState = INITIAL_STATE;
const listeners = new Set<Listener>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let delegationUnsub: (() => void) | null = null;
let inFlight: Promise<void> | null = null;

function emit(next: MatePresenceState) {
  currentState = next;
  listeners.forEach((l) => l(next));
}

async function poll() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const health = await getMateService().healthCheck();
      const activeDelegations = useMessageStore.getState().activeDelegations;
      const working = activeDelegations.some(
        (d) => d.status === 'delegating' || d.status === 'working'
      );
      emit({
        isOnline: true,
        status: health.status,
        channels: health.channels ?? [],
        isWorking: working,
        lastChecked: new Date(),
        error: null,
      });
    } catch (err) {
      emit({
        ...currentState,
        isOnline: false,
        status: 'offline',
        channels: [],
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function startPolling() {
  if (intervalId !== null) return;
  void poll();
  intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS);
  delegationUnsub = useMessageStore.subscribe(
    (s) => s.activeDelegations,
    (delegations) => {
      const working = delegations.some(
        (d) => d.status === 'delegating' || d.status === 'working'
      );
      if (working !== currentState.isWorking) {
        emit({ ...currentState, isWorking: working });
      }
    }
  );
}

function stopPolling() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (delegationUnsub) {
    delegationUnsub();
    delegationUnsub = null;
  }
}

export function useMatePresence(): MatePresenceState {
  const [state, setState] = useState<MatePresenceState>(currentState);

  useEffect(() => {
    listeners.add(setState);
    if (listeners.size === 1) {
      startPolling();
    } else {
      setState(currentState);
    }
    return () => {
      listeners.delete(setState);
      if (listeners.size === 0) {
        stopPolling();
      }
    };
  }, []);

  return state;
}
