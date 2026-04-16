import { useState, useEffect, useCallback } from 'react';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

interface LocalModel {
  id: string;
  name: string;
  provider: 'ollama' | 'lmstudio';
  endpoint: string;
}

/**
 * Bridge hook for local model detection (Ollama, LM Studio).
 * Only active in Electron — returns empty state in browser.
 */
export function useLocalModels() {
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const refreshModels = useCallback(async () => {
    if (!isElectron || !electronAPI) return;
    setIsDetecting(true);
    try {
      const models = await electronAPI.invoke('models:detect');
      setLocalModels(models ?? []);
    } catch {
      setLocalModels([]);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  // Initial detection on mount
  useEffect(() => {
    if (!isElectron || !electronAPI) return;
    electronAPI.invoke('models:get-local').then((models: LocalModel[]) => {
      setLocalModels(models ?? []);
    });
  }, []);

  return {
    localModels,
    isLocalAvailable: isElectron && localModels.length > 0,
    isDetecting,
    refreshModels,
  };
}
