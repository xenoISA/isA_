/**
 * ArtifactRendererRegistry — Plugin system for custom artifact renderers (#255)
 */
import type { ArtifactContentType, ArtifactLayout } from '../types/artifactTypes';

export interface ArtifactRendererProps {
  content: string;
  contentType: ArtifactContentType;
  language?: string;
  layout: ArtifactLayout;
  metadata?: Record<string, unknown>;
}

export type ArtifactRenderer = React.ComponentType<ArtifactRendererProps>;

const registry = new Map<string, ArtifactRenderer>();

/** Register a custom renderer. Key: "{widgetType}" or "{widgetType}:{contentType}" */
export function registerArtifactRenderer(key: string, renderer: ArtifactRenderer): void {
  registry.set(key, renderer);
}

/** Get best matching renderer: widget:content → widget → content → null */
export function getArtifactRenderer(
  widgetType?: string,
  contentType?: ArtifactContentType,
): ArtifactRenderer | null {
  if (widgetType && contentType) {
    const specific = registry.get(`${widgetType}:${contentType}`);
    if (specific) return specific;
  }
  if (widgetType) {
    const widget = registry.get(widgetType);
    if (widget) return widget;
  }
  if (contentType) {
    const content = registry.get(contentType);
    if (content) return content;
  }
  return null;
}

export function getRegisteredRenderers(): string[] {
  return [...registry.keys()];
}

export function clearRegistry(): void {
  registry.clear();
}
