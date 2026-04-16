import http from 'node:http';

export interface LocalModel {
  id: string;
  name: string;
  provider: 'ollama' | 'lmstudio';
  endpoint: string;
}

let cachedModels: LocalModel[] = [];
let detectInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Detect Ollama models on localhost:11434.
 */
async function detectOllama(): Promise<LocalModel[]> {
  try {
    const data = await httpGet('http://localhost:11434/api/tags');
    const parsed = JSON.parse(data);
    if (!parsed.models || !Array.isArray(parsed.models)) return [];
    return parsed.models.map((m: any) => ({
      id: `ollama:${m.name}`,
      name: m.name,
      provider: 'ollama' as const,
      endpoint: 'http://localhost:11434',
    }));
  } catch {
    return [];
  }
}

/**
 * Detect LM Studio models on localhost:1234.
 */
async function detectLMStudio(): Promise<LocalModel[]> {
  try {
    const data = await httpGet('http://localhost:1234/v1/models');
    const parsed = JSON.parse(data);
    if (!parsed.data || !Array.isArray(parsed.data)) return [];
    return parsed.data.map((m: any) => ({
      id: `lmstudio:${m.id}`,
      name: m.id,
      provider: 'lmstudio' as const,
      endpoint: 'http://localhost:1234',
    }));
  } catch {
    return [];
  }
}

/**
 * Get all detected local models (cached).
 */
export function getLocalModels(): LocalModel[] {
  return cachedModels;
}

/**
 * Re-detect local models from all providers.
 */
export async function refreshLocalModels(): Promise<LocalModel[]> {
  const [ollama, lmstudio] = await Promise.all([detectOllama(), detectLMStudio()]);
  cachedModels = [...ollama, ...lmstudio];
  return cachedModels;
}

/**
 * Start periodic detection (every 60 seconds).
 */
export function startAutoDetect(): void {
  refreshLocalModels(); // Initial detection
  if (detectInterval) return;
  detectInterval = setInterval(refreshLocalModels, 60_000);
}

/**
 * Stop periodic detection.
 */
export function stopAutoDetect(): void {
  if (detectInterval) {
    clearInterval(detectInterval);
    detectInterval = null;
  }
}

// Simple HTTP GET helper (no external deps)
function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}
