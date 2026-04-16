import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script — runs in an isolated context before the renderer.
 *
 * Exposes a safe `window.electronAPI` bridge and sets `window.isElectron`
 * so the Next.js app can detect it is running inside Electron.
 */

// Flag the environment
contextBridge.exposeInMainWorld('isElectron', true);

// Safe IPC bridge — only expose specific channels
contextBridge.exposeInMainWorld('electronAPI', {
  /** Send a one-way message to the main process. */
  send: (channel: string, ...args: unknown[]) => {
    const allowedChannels = [
      'app:ready', 'window:minimize', 'window:close',
      'spotlight:hide', 'spotlight:resize', 'spotlight:open-main',
      'tray:update-status', 'tray:set-badge',
      'notification:show',
    ];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  /** Send a message and wait for a response from the main process. */
  invoke: (channel: string, ...args: unknown[]) => {
    const allowedChannels = [
      'app:version', 'app:platform',
      'auth:save-token', 'auth:load-token', 'auth:clear-token',
      'screenshot:capture-screen', 'screenshot:capture-window',
      'fs:pick-folder', 'fs:list-files', 'fs:read-file', 'fs:search-files',
      'fs:add-permitted', 'fs:remove-permitted', 'fs:get-permitted',
      'models:get-local', 'models:detect',
      'mcp:list-servers', 'mcp:get-status', 'mcp:get-logs',
      'mcp:add-server', 'mcp:remove-server',
      'mcp:start-server', 'mcp:stop-server', 'mcp:restart-server',
    ];
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
  },

  /** Subscribe to messages from the main process. Returns an unsubscribe function. */
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const allowedChannels = ['app:update-available', 'app:deep-link', 'notification:click'];
    if (allowedChannels.includes(channel)) {
      const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
        callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
});
