import { useState, useEffect, useCallback } from 'react';

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;

interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

interface MCPServerStatus {
  name: string;
  status: 'running' | 'stopped' | 'crashed';
  enabled: boolean;
}

/**
 * Bridge hook for local MCP server management.
 * Only active in Electron — returns empty state in browser.
 */
export function useLocalMCPServers() {
  const [servers, setServers] = useState<MCPServerStatus[]>([]);

  const refresh = useCallback(async () => {
    if (!isElectron || !electronAPI) return;
    const status = await electronAPI.invoke('mcp:get-status');
    setServers(status ?? []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addServer = useCallback(async (config: MCPServerConfig) => {
    if (!isElectron || !electronAPI) return;
    await electronAPI.invoke('mcp:add-server', config);
    refresh();
  }, [refresh]);

  const removeServer = useCallback(async (name: string) => {
    if (!isElectron || !electronAPI) return;
    await electronAPI.invoke('mcp:remove-server', name);
    refresh();
  }, [refresh]);

  const startServer = useCallback(async (name: string) => {
    if (!isElectron || !electronAPI) return;
    await electronAPI.invoke('mcp:start-server', name);
    refresh();
  }, [refresh]);

  const stopServer = useCallback(async (name: string) => {
    if (!isElectron || !electronAPI) return;
    await electronAPI.invoke('mcp:stop-server', name);
    refresh();
  }, [refresh]);

  const getLogs = useCallback(async (name: string): Promise<string[]> => {
    if (!isElectron || !electronAPI) return [];
    return electronAPI.invoke('mcp:get-logs', name);
  }, []);

  return {
    isAvailable: isElectron,
    servers,
    addServer,
    removeServer,
    startServer,
    stopServer,
    getLogs,
    refresh,
  };
}
