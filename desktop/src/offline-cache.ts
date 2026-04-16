import { app } from 'electron';
import { net } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const CACHE_FILE = 'offline-cache.json';
const MAX_CONVERSATIONS = 50;

interface CachedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface CachedConversation {
  id: string;
  title: string;
  messages: CachedMessage[];
  cachedAt: string;
}

let cache: CachedConversation[] = [];

function getCachePath(): string {
  return path.join(app.getPath('userData'), CACHE_FILE);
}

function loadCache(): void {
  try {
    const filePath = getCachePath();
    if (fs.existsSync(filePath)) {
      cache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    cache = [];
  }
}

function saveCache(): void {
  fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2));
}

export function initOfflineCache(): void {
  loadCache();
}

/**
 * Cache a conversation for offline access.
 * Keeps only the last MAX_CONVERSATIONS entries (LRU).
 */
export function cacheConversation(id: string, title: string, messages: CachedMessage[]): void {
  // Remove existing entry if present
  cache = cache.filter((c) => c.id !== id);

  // Add to front (most recent)
  cache.unshift({
    id,
    title,
    messages,
    cachedAt: new Date().toISOString(),
  });

  // Trim to max
  if (cache.length > MAX_CONVERSATIONS) {
    cache = cache.slice(0, MAX_CONVERSATIONS);
  }

  saveCache();
}

/**
 * Get list of cached conversations (without full messages for speed).
 */
export function getCachedConversations(): Array<{ id: string; title: string; messageCount: number; cachedAt: string }> {
  return cache.map((c) => ({
    id: c.id,
    title: c.title,
    messageCount: c.messages.length,
    cachedAt: c.cachedAt,
  }));
}

/**
 * Get a specific cached conversation with full messages.
 */
export function getCachedConversation(id: string): CachedConversation | null {
  return cache.find((c) => c.id === id) ?? null;
}

/**
 * Clear all cached conversations.
 */
export function clearOfflineCache(): void {
  cache = [];
  saveCache();
}

/**
 * Check if the device is currently online.
 */
export function isOnline(): boolean {
  return net.isOnline();
}
