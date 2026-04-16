import { clipboard, BrowserWindow, nativeImage } from 'electron';

let watchInterval: ReturnType<typeof setInterval> | null = null;
let lastText = '';
let lastImageHash = '';
let enabled = false;

export type ClipboardContentType = 'code' | 'url' | 'text' | 'image' | 'empty';

interface ClipboardContent {
  type: ClipboardContentType;
  text?: string;
  imageBase64?: string;
}

function detectContentType(text: string): ClipboardContentType {
  if (!text.trim()) return 'empty';
  // URL detection
  if (/^https?:\/\/\S+$/i.test(text.trim())) return 'url';
  // Code detection: has indentation + brackets/semicolons, or starts with import/function/const/class
  if (/^(import |from |function |const |let |var |class |export |#include|def |async )/.test(text.trim())) return 'code';
  if ((text.includes('{') && text.includes('}')) || (text.includes('(') && text.includes(');'))) return 'code';
  return 'text';
}

function getImageHash(img: Electron.NativeImage): string {
  if (img.isEmpty()) return '';
  const buf = img.toPNG();
  // Simple hash: first 32 bytes as hex
  return buf.subarray(0, 32).toString('hex');
}

function checkClipboard(mainWindow: () => BrowserWindow | undefined): void {
  // Check text
  const text = clipboard.readText();
  if (text && text !== lastText) {
    lastText = text;
    const type = detectContentType(text);
    const win = mainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('clipboard:changed', { type, text } as ClipboardContent);
    }
    return;
  }

  // Check image
  const img = clipboard.readImage();
  const hash = getImageHash(img);
  if (hash && hash !== lastImageHash) {
    lastImageHash = hash;
    const win = mainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('clipboard:changed', {
        type: 'image',
        imageBase64: img.toPNG().toString('base64'),
      } as ClipboardContent);
    }
  }
}

export function startClipboardWatch(mainWindow: () => BrowserWindow | undefined): void {
  if (watchInterval) return;
  enabled = true;
  // Initialize with current clipboard to avoid firing on existing content
  lastText = clipboard.readText();
  lastImageHash = getImageHash(clipboard.readImage());
  watchInterval = setInterval(() => checkClipboard(mainWindow), 2000);
}

export function stopClipboardWatch(): void {
  enabled = false;
  if (watchInterval) {
    clearInterval(watchInterval);
    watchInterval = null;
  }
}

export function isClipboardWatchEnabled(): boolean {
  return enabled;
}

export function getClipboardContent(): ClipboardContent {
  const text = clipboard.readText();
  if (text) return { type: detectContentType(text), text };
  const img = clipboard.readImage();
  if (!img.isEmpty()) return { type: 'image', imageBase64: img.toPNG().toString('base64') };
  return { type: 'empty' };
}
