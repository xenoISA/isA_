/**
 * useModelSelection — Fetch available models and manage selection (#194)
 */
import { useState, useEffect, useCallback } from 'react';
import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { gatewayFetch } from '../config/gatewayConfig';

export interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  capabilities: {
    vision: boolean;
    thinking: boolean;
    code: boolean;
  };
  context_window: number;
  max_output_tokens: number;
}

const STORAGE_KEY = 'isa_selected_model';

export function useModelSelection() {
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY) || '';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchModels() {
      try {
        const res = await fetch(GATEWAY_ENDPOINTS.MODELS.AVAILABLE);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          const list = Array.isArray(data) ? data : data.models || [];
          setModels(list);
          // Default to first model if none selected
          if (!selectedModelId && list.length > 0) {
            setSelectedModelId(list[0].id);
          }
        }
      } catch {
        // Silently fail — model selector just won't show
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchModels();
    return () => { cancelled = true; };
  }, []);

  const selectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    try { localStorage.setItem(STORAGE_KEY, modelId); } catch {}
  }, []);

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0] || null;

  return { models, selectedModel, selectedModelId, selectModel, loading };
}
