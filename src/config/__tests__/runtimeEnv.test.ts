import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('runtimeEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_CHAT_BACKEND;
    delete process.env.NEXT_PUBLIC_MATE_URL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('defaults to the agent backend with Mate features disabled', async () => {
    const { getChatBackend, isMateConfigured } = await import('../runtimeEnv');

    expect(getChatBackend()).toBe('agent');
    expect(isMateConfigured()).toBe(false);
  });

  test('enables Mate features when the chat backend is explicitly mate', async () => {
    process.env.NEXT_PUBLIC_CHAT_BACKEND = 'mate';

    const { getChatBackend, isMateConfigured } = await import('../runtimeEnv');

    expect(getChatBackend()).toBe('mate');
    expect(isMateConfigured()).toBe(true);
  });

  test('enables Mate features when a direct Mate URL is configured', async () => {
    process.env.NEXT_PUBLIC_MATE_URL = 'http://localhost:18789';

    const { getChatBackend, isMateConfigured } = await import('../runtimeEnv');

    expect(getChatBackend()).toBe('agent');
    expect(isMateConfigured()).toBe(true);
  });
});
