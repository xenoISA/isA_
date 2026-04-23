import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  activateCommandPaletteResult,
  buildCommandPaletteSearchRequest,
} from '../CommandPalette';
import { authTokenStore } from '../../../../stores/authTokenStore';

describe('CommandPalette helpers', () => {
  beforeEach(() => {
    authTokenStore.clearToken();
  });

  test('builds an authenticated gateway search request', () => {
    authTokenStore.setToken('test-token');

    const request = buildCommandPaletteSearchRequest('roadmap search');
    const url = new URL(request.url);

    expect(url.pathname).toContain('/sessions/search');
    expect(url.searchParams.get('q')).toBe('roadmap search');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(request.init.credentials).toBe('include');
    expect(request.init.headers).toMatchObject({
      Authorization: 'Bearer test-token',
    });
  });

  test('routes conversation selection before closing the palette', () => {
    const onSelectConversation = vi.fn();
    const onAction = vi.fn();
    const onClose = vi.fn();

    activateCommandPaletteResult(
      { id: 'session-123', title: 'Roadmap', type: 'conversation' },
      { onSelectConversation, onAction, onClose },
    );

    expect(onSelectConversation).toHaveBeenCalledWith(
      'session-123',
      expect.objectContaining({ title: 'Roadmap' }),
    );
    expect(onAction).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('routes action selection through the same activation helper', () => {
    const onSelectConversation = vi.fn();
    const onAction = vi.fn();
    const onClose = vi.fn();

    activateCommandPaletteResult(
      { id: 'settings', title: 'Settings', type: 'action' },
      { onSelectConversation, onAction, onClose },
    );

    expect(onAction).toHaveBeenCalledWith('settings');
    expect(onSelectConversation).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
