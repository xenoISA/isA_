import { dialog, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const PERMITTED_FILE = 'permitted-folders.json';
let permittedFolders: Set<string> = new Set();

// Load permitted folders from disk
function loadPermitted(): void {
  const filePath = path.join(app.getPath('userData'), PERMITTED_FILE);
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      permittedFolders = new Set(Array.isArray(data) ? data : []);
    }
  } catch {
    permittedFolders = new Set();
  }
}

function savePermitted(): void {
  const filePath = path.join(app.getPath('userData'), PERMITTED_FILE);
  fs.writeFileSync(filePath, JSON.stringify([...permittedFolders], null, 2));
}

function isPermitted(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  for (const folder of permittedFolders) {
    if (resolved.startsWith(path.resolve(folder))) return true;
  }
  return false;
}

function isBinary(filePath: string): boolean {
  try {
    const buf = Buffer.alloc(512);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}

const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const WARN_SIZE = 10 * 1024 * 1024; // 10MB

// ---------- Public API ----------

export function initFilesystem(): void {
  loadPermitted();
}

export async function pickFolder(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Grant isA_ access to this folder',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folder = result.filePaths[0];
  addPermittedFolder(folder);
  return folder;
}

export function addPermittedFolder(folder: string): void {
  permittedFolders.add(path.resolve(folder));
  savePermitted();
}

export function removePermittedFolder(folder: string): void {
  permittedFolders.delete(path.resolve(folder));
  savePermitted();
}

export function getPermittedFolders(): string[] {
  return [...permittedFolders];
}

export function listFiles(folderPath: string, pattern?: string): string[] {
  if (!isPermitted(folderPath)) throw new Error('Folder not permitted');

  const results: string[] = [];
  const regex = pattern ? new RegExp(pattern.replace(/\*/g, '.*'), 'i') : null;

  function walk(dir: string) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (!regex || regex.test(entry.name)) {
          results.push(fullPath);
        }
        if (results.length >= 1000) return; // Cap results
      }
    } catch { /* skip inaccessible dirs */ }
  }

  walk(folderPath);
  return results;
}

export function readFile(filePath: string): { content: string; size: number; warning?: string } {
  if (!isPermitted(filePath)) throw new Error('File not in a permitted folder');

  const stat = fs.statSync(filePath);
  if (stat.size > MAX_SIZE) throw new Error(`File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB > 100MB limit)`);
  if (isBinary(filePath)) throw new Error('Binary file — cannot read as text');

  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    content,
    size: stat.size,
    warning: stat.size > WARN_SIZE ? `Large file (${(stat.size / 1024 / 1024).toFixed(1)}MB)` : undefined,
  };
}

export function searchFiles(folderPath: string, query: string): Array<{ file: string; line: number; text: string }> {
  if (!isPermitted(folderPath)) throw new Error('Folder not permitted');

  const files = listFiles(folderPath);
  const results: Array<{ file: string; line: number; text: string }> = [];
  const lowerQuery = query.toLowerCase();

  for (const file of files) {
    try {
      const stat = fs.statSync(file);
      if (stat.size > WARN_SIZE || isBinary(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lowerQuery)) {
          results.push({ file, line: i + 1, text: lines[i].trim().substring(0, 200) });
          if (results.length >= 200) return results;
        }
      }
    } catch { /* skip unreadable files */ }
  }

  return results;
}
