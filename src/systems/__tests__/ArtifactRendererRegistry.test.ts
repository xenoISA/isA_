import { describe, test, expect, beforeEach } from 'vitest';
import React from 'react';
import {
  registerArtifactRenderer,
  getArtifactRenderer,
  getRegisteredRenderers,
  clearRegistry,
} from '../ArtifactRendererRegistry';

const StubRenderer = () => null;

describe('ArtifactRendererRegistry — fallback chain', () => {
  beforeEach(() => {
    clearRegistry();
  });

  test('returns null when nothing is registered', () => {
    expect(getArtifactRenderer('dream', 'image')).toBeNull();
    expect(getArtifactRenderer(undefined, undefined)).toBeNull();
  });

  test('widget:content wins over widget alone', () => {
    const Widget = () => null;
    const WidgetContent = () => null;
    registerArtifactRenderer('dream', Widget);
    registerArtifactRenderer('dream:image', WidgetContent);
    expect(getArtifactRenderer('dream', 'image')).toBe(WidgetContent);
  });

  test('widget wins over contentType-only', () => {
    const ContentOnly = () => null;
    const Widget = () => null;
    registerArtifactRenderer('image', ContentOnly);
    registerArtifactRenderer('dream', Widget);
    expect(getArtifactRenderer('dream', 'image')).toBe(Widget);
  });

  test('contentType is used when no widget match', () => {
    const ContentOnly = () => null;
    registerArtifactRenderer('image', ContentOnly);
    expect(getArtifactRenderer('unknown_widget', 'image')).toBe(ContentOnly);
  });

  test('returns null when neither widget nor content matches', () => {
    registerArtifactRenderer('dream', StubRenderer);
    expect(getArtifactRenderer('hunt', 'image')).toBeNull();
  });

  test('getRegisteredRenderers returns all keys', () => {
    registerArtifactRenderer('a', StubRenderer);
    registerArtifactRenderer('b', StubRenderer);
    registerArtifactRenderer('c:d', StubRenderer);
    expect(getRegisteredRenderers().sort()).toEqual(['a', 'b', 'c:d']);
  });

  test('register overwrites an existing key', () => {
    const First = () => null;
    const Second = () => null;
    registerArtifactRenderer('text', First);
    registerArtifactRenderer('text', Second);
    expect(getArtifactRenderer(undefined, 'text')).toBe(Second);
  });
});

describe('Default renderer registration (side-effect import)', () => {
  beforeEach(() => {
    clearRegistry();
  });

  test('registerDefaultRenderers populates all advertised types', async () => {
    const { registerDefaultRenderers } = await import('../../components/ui/chat/renderers');
    registerDefaultRenderers();

    const required = ['text', 'code', 'image', 'data', 'html', 'dream', 'svg', 'chart', 'analysis', 'search_results'];
    for (const key of required) {
      expect(getArtifactRenderer(undefined, key as any)).not.toBeNull();
    }
  });

  test('DreamRenderer wins for widgetType=dream regardless of contentType', async () => {
    const { registerDefaultRenderers } = await import('../../components/ui/chat/renderers');
    registerDefaultRenderers();

    const renderer = getArtifactRenderer('dream', 'image');
    expect(renderer).not.toBeNull();
    expect(renderer?.name).toBe('DreamRenderer');
  });
});
