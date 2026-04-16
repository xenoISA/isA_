import { app } from 'electron';
import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CONFIG_FILE = 'mcp-servers.json';
const MAX_LOG_LINES = 100;
const MAX_RESTARTS = 3;
const RESTART_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

interface ServerState {
  config: MCPServerConfig;
  process: ChildProcess | null;
  status: 'running' | 'stopped' | 'crashed';
  logs: string[];
  restartTimestamps: number[];
}

const servers = new Map<string, ServerState>();

// ---------- Config persistence ----------

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

function loadConfigs(): MCPServerConfig[] {
  try {
    const filePath = getConfigPath();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return [];
}

function saveConfigs(): void {
  const configs = [...servers.values()].map((s) => s.config);
  fs.writeFileSync(getConfigPath(), JSON.stringify(configs, null, 2));
}

// ---------- Public API ----------

export function initMCPHost(): void {
  const configs = loadConfigs();
  for (const config of configs) {
    servers.set(config.name, {
      config,
      process: null,
      status: 'stopped',
      logs: [],
      restartTimestamps: [],
    });
    if (config.enabled) {
      startServer(config.name);
    }
  }
}

export function addServer(config: MCPServerConfig): void {
  servers.set(config.name, {
    config,
    process: null,
    status: 'stopped',
    logs: [],
    restartTimestamps: [],
  });
  saveConfigs();
  if (config.enabled) startServer(config.name);
}

export function removeServer(name: string): void {
  stopServer(name);
  servers.delete(name);
  saveConfigs();
}

export function startServer(name: string): boolean {
  const state = servers.get(name);
  if (!state) return false;
  if (state.process) return true; // Already running

  try {
    const child = spawn(state.config.command, state.config.args, {
      env: { ...process.env, ...state.config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    state.process = child;
    state.status = 'running';

    child.stdout?.on('data', (data: Buffer) => {
      appendLog(state, `[stdout] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data: Buffer) => {
      appendLog(state, `[stderr] ${data.toString().trim()}`);
    });

    child.on('exit', (code) => {
      state.process = null;
      appendLog(state, `[exit] Process exited with code ${code}`);

      if (code !== 0 && state.config.enabled) {
        // Auto-restart with rate limiting
        const now = Date.now();
        state.restartTimestamps = state.restartTimestamps.filter(
          (t) => now - t < RESTART_WINDOW_MS,
        );

        if (state.restartTimestamps.length < MAX_RESTARTS) {
          state.restartTimestamps.push(now);
          appendLog(state, '[auto-restart] Restarting...');
          setTimeout(() => startServer(name), 2000);
        } else {
          state.status = 'crashed';
          appendLog(state, '[crashed] Max restarts exceeded');
        }
      } else {
        state.status = 'stopped';
      }
    });

    return true;
  } catch (err) {
    state.status = 'crashed';
    appendLog(state, `[error] Failed to start: ${err}`);
    return false;
  }
}

export function stopServer(name: string): void {
  const state = servers.get(name);
  if (!state?.process) return;

  state.config.enabled = false;
  const child = state.process;

  child.kill('SIGTERM');
  const forceKill = setTimeout(() => {
    if (!child.killed) child.kill('SIGKILL');
  }, 5000);

  child.on('exit', () => clearTimeout(forceKill));
}

export function restartServer(name: string): void {
  stopServer(name);
  const state = servers.get(name);
  if (state) {
    state.config.enabled = true;
    setTimeout(() => startServer(name), 1000);
  }
}

export function getServerStatus(): Array<{ name: string; status: string; enabled: boolean }> {
  return [...servers.entries()].map(([name, state]) => ({
    name,
    status: state.status,
    enabled: state.config.enabled,
  }));
}

export function getServerLogs(name: string): string[] {
  return servers.get(name)?.logs ?? [];
}

export function listServers(): MCPServerConfig[] {
  return [...servers.values()].map((s) => s.config);
}

/**
 * Graceful shutdown all servers. Call on app quit.
 */
export function shutdownAll(): void {
  for (const [name] of servers) {
    stopServer(name);
  }
}

// ---------- Internal ----------

function appendLog(state: ServerState, line: string): void {
  const timestamped = `[${new Date().toISOString()}] ${line}`;
  state.logs.push(timestamped);
  if (state.logs.length > MAX_LOG_LINES) {
    state.logs.shift();
  }
}
