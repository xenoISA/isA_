/**
 * useMateKnowledge — Fetches what Mate knows about the user.
 *
 * - Calls getMateService().listKnowledge() on mount
 * - Groups items by type: facts, preferences, patterns
 * - Supports deletion of individual knowledge items
 * - Handles errors gracefully when Mate is offline
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMateService } from '../api/mateService';
import type { MateKnowledgeItem, MateKnowledgeType } from '../types/mateTypes';
import { createLogger } from '../utils/logger';

const log = createLogger('useMateKnowledge');

export interface KnowledgeGroup {
  type: MateKnowledgeType;
  label: string;
  items: MateKnowledgeItem[];
}

export interface UseMateKnowledgeResult {
  knowledge: KnowledgeGroup[];
  allItems: MateKnowledgeItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  deleteItem: (itemId: string) => Promise<void>;
}

const GROUP_LABELS: Record<MateKnowledgeType, string> = {
  fact: 'Facts',
  preference: 'Preferences',
  pattern: 'Patterns learned',
};

const GROUP_ORDER: MateKnowledgeType[] = ['fact', 'preference', 'pattern'];

export function useMateKnowledge(): UseMateKnowledgeResult {
  const [allItems, setAllItems] = useState<MateKnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKnowledge = useCallback(async () => {
    try {
      setIsLoading(true);
      const mateService = getMateService();
      const items = await mateService.listKnowledge();

      // Sort by learned_at descending (most recent first)
      const sorted = [...items].sort(
        (a, b) => new Date(b.learned_at).getTime() - new Date(a.learned_at).getTime()
      );

      setAllItems(sorted);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn('Failed to fetch knowledge — Mate may be offline', { error: msg });
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteItem = useCallback(async (itemId: string) => {
    try {
      const mateService = getMateService();
      await mateService.deleteKnowledgeItem(itemId);
      // Optimistically remove from local state
      setAllItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('Failed to delete knowledge item', { error: msg, itemId });
      throw new Error(`Failed to delete: ${msg}`);
    }
  }, []);

  // Group items by type
  const knowledge = useMemo<KnowledgeGroup[]>(() => {
    return GROUP_ORDER
      .map((type) => ({
        type,
        label: GROUP_LABELS[type],
        items: allItems.filter((item) => item.type === type),
      }))
      .filter((group) => group.items.length > 0);
  }, [allItems]);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  return { knowledge, allItems, isLoading, error, refetch: fetchKnowledge, deleteItem };
}
