/**
 * Performance telemetry store — holds timing data for the last message send (#277).
 *
 * Kept separate from useStreamingStore (which manages buffer/timer state) because
 * this is pure observability, accessed by future dashboards / dev overlays and
 * not coupled to streaming lifecycle.
 */

import { create } from 'zustand';
import type { MessageTiming } from '../utils/messageTiming';

interface PerformanceStore {
  lastMessageTiming: MessageTiming | null;
  recordTiming: (timing: MessageTiming) => void;
  clear: () => void;
}

export const usePerformanceStore = create<PerformanceStore>((set) => ({
  lastMessageTiming: null,
  recordTiming: (timing) => set({ lastMessageTiming: timing }),
  clear: () => set({ lastMessageTiming: null }),
}));

export const selectLastMessageTiming = (s: PerformanceStore) => s.lastMessageTiming;
