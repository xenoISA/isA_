import React from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

describe('CodeSandboxPanel', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('detects the correct sandbox template from the file type', async () => {
    vi.doMock('@isa/ui-web', () => ({}));

    const { detectTemplate } = await import('../CodeSandboxPanel');
    expect(detectTemplate('react', '/App.tsx')).toBe('react-ts');
    expect(detectTemplate('html', 'index.html')).toBe('vanilla');
    expect(detectTemplate('vue', 'App.vue')).toBe('vue');
  });

  test('renders a fallback error state when the SDK sandbox is unavailable', async () => {
    vi.doMock('@isa/ui-web', () => ({}));

    const { CodeSandboxPanel } = await import('../CodeSandboxPanel');
    const html = renderToStaticMarkup(
      <CodeSandboxPanel code={'const answer = 42;'} filename="answer.js" embedded />,
    );

    expect(html).toContain('artifact-code-sandbox-fallback');
    expect(html).toContain('Live preview unavailable');
    expect(html).toContain('const answer = 42;');
  });
});
