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

// Handle Squirrel installer events on Windows
if (require('electron-squirrel-startup')) app.quit();

// ---------- Single instance lock ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
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

// ---------- App lifecycle ----------
app.whenReady().then(() => {
  buildMenu();
  setupIPC();
  registerGlobalShortcut();
  createTray(trayDeps());
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
