import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  shell,
  type MenuItemConstructorOptions,
} from 'electron';
import path from 'node:path';
import { toggleSpotlight, hideSpotlight, resizeSpotlight } from './spotlight';
import { createTray, updateTrayStatus, setDockBadge } from './tray';
import { showNotification } from './notifications';
import { saveToken, loadToken, clearToken } from './keychain';
import { captureScreen, captureWindow, cleanupOldScreenshots } from './screenshot';
import { initFilesystem, pickFolder, listFiles, readFile, searchFiles, addPermittedFolder, removePermittedFolder, getPermittedFolders } from './filesystem';
import { getLocalModels, refreshLocalModels, startAutoDetect, stopAutoDetect } from './local-models';
import { initMCPHost, addServer as mcpAddServer, removeServer as mcpRemoveServer, startServer as mcpStartServer, stopServer as mcpStopServer, restartServer as mcpRestartServer, getServerStatus, getServerLogs, listServers, shutdownAll as mcpShutdownAll } from './mcp-host';
import { startClipboardWatch, stopClipboardWatch, getClipboardContent } from './clipboard';
import { initOfflineCache, cacheConversation, getCachedConversations, getCachedConversation, clearOfflineCache, isOnline } from './offline-cache';
import { initAutoUpdater, checkForUpdates, quitAndInstall, stopAutoUpdater } from './updater';

// Handle Squirrel installer events on Windows
if (require('electron-squirrel-startup')) app.quit();

// ---------- Single instance lock ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    // Deep link handling on Windows/Linux (protocol URL comes as argv)
    const deepLink = argv.find((a) => a.startsWith('isaapp://'));
    if (deepLink) handleDeepLink(deepLink);
  });
}

// ---------- Constants ----------
const DEV_URL = 'http://localhost:4100';
const isMac = process.platform === 'darwin';

// Vite injects these at build time via electron-forge Vite plugin
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string | undefined;

// ---------- Preload path ----------
function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js');
}

// ---------- Window creation ----------
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the app — use Vite dev server URL in dev, bundled files in prod
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else if (MAIN_WINDOW_VITE_NAME) {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  } else {
    // Fallback for development without forge
    win.loadURL(DEV_URL);
  }

  // Open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

// ---------- Menu ----------
function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Quick Chat',
          accelerator: isMac ? 'CmdOrCtrl+Shift+Space' : 'Ctrl+Shift+Space',
          click: () => toggleSpotlight(getPreloadPath()),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'isA Documentation',
          click: () =>
            shell.openExternal('https://github.com/xenoISA/isA_'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- IPC handlers ----------
function setupIPC(): void {
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:platform', () => process.platform);

  // Spotlight IPC
  ipcMain.on('spotlight:hide', () => hideSpotlight());
  ipcMain.on('spotlight:resize', (_e, height: number) => resizeSpotlight(height));
  ipcMain.on('spotlight:open-main', (_e, route?: string) => {
    hideSpotlight();
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      if (route) {
        win.webContents.executeJavaScript(`window.location.hash = '${route}'`);
      }
    }
  });

  // Tray IPC
  ipcMain.on('tray:update-status', (_e, status: 'online' | 'offline' | 'busy') => {
    updateTrayStatus(status, trayDeps());
  });
  ipcMain.on('tray:set-badge', (_e, count: number) => {
    setDockBadge(count);
  });

  // Notification IPC
  ipcMain.on('notification:show', (_e, title: string, body: string, route?: string) => {
    showNotification({ title, body, route }, getMainWindow);
  });

  // Auth keychain IPC
  ipcMain.handle('auth:save-token', (_e, token: string) => saveToken(token));
  ipcMain.handle('auth:load-token', () => loadToken());
  ipcMain.handle('auth:clear-token', () => clearToken());

  // Screenshot IPC
  ipcMain.handle('screenshot:capture-screen', () => captureScreen());
  ipcMain.handle('screenshot:capture-window', () => captureWindow());

  // Filesystem IPC
  ipcMain.handle('fs:pick-folder', () => pickFolder());
  ipcMain.handle('fs:list-files', (_e, folder: string, pattern?: string) => listFiles(folder, pattern));
  ipcMain.handle('fs:read-file', (_e, filePath: string) => readFile(filePath));
  ipcMain.handle('fs:search-files', (_e, folder: string, query: string) => searchFiles(folder, query));
  ipcMain.handle('fs:add-permitted', (_e, folder: string) => { addPermittedFolder(folder); });
  ipcMain.handle('fs:remove-permitted', (_e, folder: string) => { removePermittedFolder(folder); });
  ipcMain.handle('fs:get-permitted', () => getPermittedFolders());

  // Local models IPC
  ipcMain.handle('models:get-local', () => getLocalModels());
  ipcMain.handle('models:detect', () => refreshLocalModels());

  // MCP host IPC
  ipcMain.handle('mcp:list-servers', () => listServers());
  ipcMain.handle('mcp:get-status', () => getServerStatus());
  ipcMain.handle('mcp:get-logs', (_e, name: string) => getServerLogs(name));
  ipcMain.handle('mcp:add-server', (_e, config: any) => { mcpAddServer(config); });
  ipcMain.handle('mcp:remove-server', (_e, name: string) => { mcpRemoveServer(name); });
  ipcMain.handle('mcp:start-server', (_e, name: string) => mcpStartServer(name));
  ipcMain.handle('mcp:stop-server', (_e, name: string) => { mcpStopServer(name); });
  ipcMain.handle('mcp:restart-server', (_e, name: string) => { mcpRestartServer(name); });

  // Clipboard IPC
  ipcMain.on('clipboard:start-watch', () => startClipboardWatch(getMainWindow));
  ipcMain.on('clipboard:stop-watch', () => stopClipboardWatch());
  ipcMain.handle('clipboard:get-content', () => getClipboardContent());

  // Offline cache IPC
  ipcMain.handle('offline:is-online', () => isOnline());
  ipcMain.handle('offline:cache-conversation', (_e, id: string, title: string, messages: any[]) => {
    cacheConversation(id, title, messages);
  });
  ipcMain.handle('offline:get-conversations', () => getCachedConversations());
  ipcMain.handle('offline:get-conversation', (_e, id: string) => getCachedConversation(id));
  ipcMain.handle('offline:clear-cache', () => { clearOfflineCache(); });

  // Auto-updater IPC
  ipcMain.on('updater:check-now', () => checkForUpdates());
  ipcMain.on('updater:quit-and-install', () => quitAndInstall());

  // Calendar IPC (#230)
  ipcMain.handle('calendar:get-today', async () => {
    const win = getMainWindow();
    if (!win) return [];
    return win.webContents.executeJavaScript(
      `fetch((window.__NEXT_DATA__?.runtimeConfig?.GATEWAY_URL || 'http://localhost:9080') + '/api/v1/calendar/events?start=' + new Date(new Date().setHours(0,0,0,0)).toISOString() + '&end=' + new Date(new Date().setHours(23,59,59,999)).toISOString(), { credentials: 'include' }).then(r => r.json()).catch(() => [])`
    );
  });
  ipcMain.handle('calendar:get-tasks', async () => {
    const win = getMainWindow();
    if (!win) return [];
    return win.webContents.executeJavaScript(
      `fetch((window.__NEXT_DATA__?.runtimeConfig?.GATEWAY_URL || 'http://localhost:9080') + '/api/v1/tasks?status=pending&limit=10', { credentials: 'include' }).then(r => r.json()).catch(() => [])`
    );
  });
}

// Helper to get the main (non-spotlight) window
function getMainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows().find(
    (w) => !w.isDestroyed() && w.webContents.getURL().includes('localhost:4100') && !w.webContents.getURL().includes('/spotlight'),
  );
}

function trayDeps() {
  return {
    toggleSpotlight: () => toggleSpotlight(getPreloadPath()),
    getMainWindow,
  };
}

// ---------- Global shortcut ----------
function registerGlobalShortcut(): void {
  const accelerator = isMac ? 'CommandOrControl+Shift+Space' : 'Ctrl+Shift+Space';
  const registered = globalShortcut.register(accelerator, () => {
    toggleSpotlight(getPreloadPath());
  });

  if (!registered) {
    console.warn(`[isA Desktop] Failed to register global shortcut: ${accelerator}`);
  }
}

// ---------- Deep link handler ----------
function handleDeepLink(url: string): void {
  try {
    // Parse isaapp://chat/session-123 → /app?session=session-123
    const parsed = new URL(url);
    const pathParts = parsed.pathname.replace(/^\/+/, '').split('/');
    let route = '/app';

    if (pathParts[0] === 'chat' && pathParts[1]) {
      route = `/app?session=${pathParts[1]}`;
    } else if (pathParts[0] === 'settings') {
      route = '/app?view=settings';
    }

    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      win.webContents.send('app:deep-link', route);
    }
  } catch (err) {
    console.warn('[isA Desktop] Invalid deep link:', url, err);
  }
}

// ---------- App lifecycle ----------
app.setAsDefaultProtocolClient('isaapp');

// macOS: deep link via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.whenReady().then(() => {
  buildMenu();
  setupIPC();
  registerGlobalShortcut();
  createTray(trayDeps());
  initFilesystem();
  initOfflineCache();
  initMCPHost();
  startAutoDetect();
  initAutoUpdater(getMainWindow);
  cleanupOldScreenshots();
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopAutoDetect();
  stopAutoUpdater();
  mcpShutdownAll();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
