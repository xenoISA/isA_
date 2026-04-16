/**
 * Custom Instructions Store
 *
 * Caches the user's custom instructions so they are available at message-send
 * time without an extra API round-trip.  Populated on app init and whenever
 * the user saves new instructions in Settings.
 */

import { create } from 'zustand';
import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { createLogger } from '../utils/logger';

const log = createLogger('CustomInstructionsStore');

export interface CustomInstructionsStore {
  /** The cached instructions text (empty string = none set). */
  instructions: string;
  /** Whether the initial fetch has completed. */
  loaded: boolean;

  /** Replace the cached value (called after save or fetch). */
  setInstructions: (text: string) => void;

  /**
   * Fetch instructions from GET /api/v1/users/me/instructions and cache them.
   * Safe to call multiple times — subsequent calls are no-ops once loaded.
   */
  fetchInstructions: () => Promise<void>;
}

export const useCustomInstructionsStore = create<CustomInstructionsStore>()((set, get) => ({
  instructions: '',
  loaded: false,

  setInstructions: (text: string) => {
    set({ instructions: text, loaded: true });
  },

  fetchInstructions: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch(
        `${GATEWAY_ENDPOINTS.ACCOUNTS.BASE}/../users/me/instructions`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json();
        set({ instructions: data.instructions || '', loaded: true });
        log.info('Custom instructions loaded');
      } else {
        set({ loaded: true });
      }
    } catch {
      // Network error — mark as loaded so we don't retry every render.
      set({ loaded: true });
      log.warn('Failed to fetch custom instructions');
    }
  },
}));
