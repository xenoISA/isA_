import {
  app,
  BrowserWindow,
  Menu,
  shell,
  type MenuItemConstructorOptions,
} from 'electron';
import path from 'node:path';

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
const IS_DEV = !app.isPackaged;
const isMac = process.platform === 'darwin';

// Vite injects these at build time via electron-forge plugin
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string | undefined;

// ---------- Window creation ----------
function createWindow(): BrowserWindow {
  const preloadPath =
    typeof MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY === 'string'
      ? MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
      : path.join(__dirname, 'preload.js');

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
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the app
  if (IS_DEV) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load from the bundled Next.js standalone output
    // For now, fall back to the dev URL — production loading will be
    // configured when the build pipeline is wired up.
    const prodIndex = path.join(__dirname, '..', 'renderer', 'index.html');
    win.loadFile(prodIndex).catch(() => {
      // Fallback: if no local build exists, try the dev server
      win.loadURL(DEV_URL);
    });
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
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
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

// ---------- App lifecycle ----------
app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
