/**
 * ============================================================================
 * Branch Store (useBranchStore.ts) — Conversation branching state
 * ============================================================================
 *
 * Tracks branches created when users edit messages (#190).
 *
 * Model:
 *   - A "branch point" is the user message that was edited.
 *   - Each branch is the full message chain (user msg + all subsequent messages)
 *     that existed from that point onward before the edit occurred.
 *   - The currently visible branch index is tracked per branch point.
 *
 * The store is intentionally minimal — it only stores message IDs per branch,
 * not full message objects, to avoid duplication with useMessageStore.
 */

import { create } from 'zustand';
import { ChatMessage } from '../types/chatTypes';

/** A single branch: the messages from the edit point onward. */
export interface Branch {
  /** The user message content for this branch variant */
  userContent: string;
  /** Full message chain (user msg + responses) stored as snapshots */
  messages: ChatMessage[];
}

/** State for a single branch point (one user message that was edited). */
export interface BranchPoint {
  /** All branches at this point (index 0 = original, 1 = first edit, ...) */
  branches: Branch[];
  /** Currently displayed branch index (0-based) */
  activeBranchIndex: number;
}

export interface BranchStoreState {
  /** Map of original user message ID -> branch point data */
  branchPoints: Record<string, BranchPoint>;
}

export interface BranchActions {
  /**
   * Save the current message chain as a new branch before an edit.
   * Called by handleEditMessage before removing messages.
   *
   * @param originalMessageId - The user message being edited
   * @param messagesFromPoint - All messages from that point onward (inclusive)
   * @param isFirstEdit - Whether this is the first edit (need to save original too)
   */
  saveBranch: (
    originalMessageId: string,
    messagesFromPoint: ChatMessage[],
    isFirstEdit: boolean,
  ) => void;

  /**
   * Record the new branch after re-send completes.
   * Called after the edited message + new response are in the store.
   *
   * @param originalMessageId - The original user message ID (branch point key)
   * @param newMessages - The new message chain from the edit point
   */
  addNewBranch: (originalMessageId: string, newMessages: ChatMessage[]) => void;

  /** Navigate to a specific branch */
  setActiveBranch: (originalMessageId: string, branchIndex: number) => void;

  /** Get branch point data (convenience selector) */
  getBranchPoint: (originalMessageId: string) => BranchPoint | undefined;

  /** Clear all branch data (e.g. on session switch) */
  clearBranches: () => void;
}

export type BranchStore = BranchStoreState & BranchActions;

export const useBranchStore = create<BranchStore>()((set, get) => ({
  branchPoints: {},

  saveBranch: (originalMessageId, messagesFromPoint, isFirstEdit) => {
    set((state) => {
      const existing = state.branchPoints[originalMessageId];

      if (isFirstEdit) {
        // First edit: save the original chain as branch 0
        const userMsg = messagesFromPoint[0];
        const branch: Branch = {
          userContent: 'content' in userMsg ? (userMsg as any).content : '',
          messages: [...messagesFromPoint],
        };
        return {
          branchPoints: {
            ...state.branchPoints,
            [originalMessageId]: {
              branches: [branch],
              activeBranchIndex: 0,
            },
          },
        };
      }

      // Subsequent edit: the current active branch is already saved,
      // no extra work needed here — addNewBranch will append.
      return state;
    });
  },

  addNewBranch: (originalMessageId, newMessages) => {
    set((state) => {
      const existing = state.branchPoints[originalMessageId];
      if (!existing) return state;

      const userMsg = newMessages[0];
      const branch: Branch = {
        userContent: 'content' in userMsg ? (userMsg as any).content : '',
        messages: [...newMessages],
      };

      const newBranches = [...existing.branches, branch];
      return {
        branchPoints: {
          ...state.branchPoints,
          [originalMessageId]: {
            branches: newBranches,
            activeBranchIndex: newBranches.length - 1, // switch to newest
          },
        },
      };
    });
  },

  setActiveBranch: (originalMessageId, branchIndex) => {
    set((state) => {
      const existing = state.branchPoints[originalMessageId];
      if (!existing) return state;
      const clamped = Math.max(0, Math.min(branchIndex, existing.branches.length - 1));
      return {
        branchPoints: {
          ...state.branchPoints,
          [originalMessageId]: {
            ...existing,
            activeBranchIndex: clamped,
          },
        },
      };
    });
  },

  getBranchPoint: (originalMessageId) => {
    return get().branchPoints[originalMessageId];
  },

  clearBranches: () => {
    set({ branchPoints: {} });
  },
}));
