import { useCallback } from 'react';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

interface CaptureResult {
  path: string;
  base64: string;
}

/**
 * Bridge hook for desktop screenshot capture.
 * Only available in Electron — returns no-ops in browser.
 */
export function useScreenCapture() {
  const captureScreen = useCallback(async (): Promise<CaptureResult | null> => {
    if (!isElectron || !electronAPI) return null;
    return electronAPI.invoke('screenshot:capture-screen');
  }, []);

  const captureWindow = useCallback(async (): Promise<CaptureResult | null> => {
    if (!isElectron || !electronAPI) return null;
    return electronAPI.invoke('screenshot:capture-window');
  }, []);

  return {
    isAvailable: isElectron,
    captureScreen,
    captureWindow,
  };
}
