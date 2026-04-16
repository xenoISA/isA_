import { useCallback } from 'react';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

/**
 * Bridge hook for desktop filesystem access.
 * All operations are sandboxed — only permitted folders are accessible.
 * No-ops when not running in Electron.
 */
export function useDesktopFilesystem() {
  const pickFolder = useCallback(async (): Promise<string | null> => {
    if (!isElectron || !electronAPI) return null;
    return electronAPI.invoke('fs:pick-folder');
  }, []);

  const getPermittedFolders = useCallback(async (): Promise<string[]> => {
    if (!isElectron || !electronAPI) return [];
    return electronAPI.invoke('fs:get-permitted');
  }, []);

  const removePermittedFolder = useCallback(async (folder: string): Promise<void> => {
    if (!isElectron || !electronAPI) return;
    return electronAPI.invoke('fs:remove-permitted', folder);
  }, []);

  const listFiles = useCallback(async (folder: string, pattern?: string): Promise<string[]> => {
    if (!isElectron || !electronAPI) return [];
    return electronAPI.invoke('fs:list-files', folder, pattern);
  }, []);

  const readFile = useCallback(async (filePath: string): Promise<{ content: string; size: number; warning?: string } | null> => {
    if (!isElectron || !electronAPI) return null;
    return electronAPI.invoke('fs:read-file', filePath);
  }, []);

  const searchFiles = useCallback(async (folder: string, query: string): Promise<Array<{ file: string; line: number; text: string }>> => {
    if (!isElectron || !electronAPI) return [];
    return electronAPI.invoke('fs:search-files', folder, query);
  }, []);

  return {
    isAvailable: isElectron,
    pickFolder,
    getPermittedFolders,
    removePermittedFolder,
    listFiles,
    readFile,
    searchFiles,
  };
}
