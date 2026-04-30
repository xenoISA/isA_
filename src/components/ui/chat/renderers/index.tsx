/** Registrations + fallback wrapper for the artifact renderer registry (#255).
 *
 *  Side-effecting: importing this module registers the default renderers
 *  (text/code/image/data/html + alias 'svg') and one widget-specific
 *  renderer (Dream → image gallery). Import once from the app root.
 */
import React from 'react';
import {
  registerArtifactRenderer,
  getArtifactRenderer,
  type ArtifactRendererProps,
  type ArtifactRenderer,
} from '../../../../systems/ArtifactRendererRegistry';
import { TextRenderer } from './TextRenderer';
import { CodeRenderer } from './CodeRenderer';
import { ImageRenderer } from './ImageRenderer';
import { DataRenderer } from './DataRenderer';
import { HtmlRenderer } from './HtmlRenderer';
import { DreamRenderer } from './DreamRenderer';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerDefaultRenderers(): void {
  // Content-type defaults
  registerArtifactRenderer('text', TextRenderer);
  registerArtifactRenderer('code', CodeRenderer);
  registerArtifactRenderer('image', ImageRenderer);
  registerArtifactRenderer('data', DataRenderer);
  registerArtifactRenderer('html', HtmlRenderer);

  // Aliases to the closest default
  registerArtifactRenderer('svg', HtmlRenderer);
  registerArtifactRenderer('chart', DataRenderer);
  registerArtifactRenderer('analysis', TextRenderer);
  registerArtifactRenderer('knowledge', TextRenderer);
  registerArtifactRenderer('search_results', DataRenderer);
  registerArtifactRenderer('form', HtmlRenderer);
  registerArtifactRenderer('dashboard', HtmlRenderer);

  // Widget-specific renderers
  registerArtifactRenderer('dream', DreamRenderer);
}

// Register on module load — importing this file once wires the registry.
registerDefaultRenderers();

// ---------------------------------------------------------------------------
// FallbackRenderer — safety net for unknown types
// ---------------------------------------------------------------------------

export const FallbackRenderer: ArtifactRenderer = ({ content, contentType }) => (
  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
    <div className="text-xs uppercase tracking-wide mb-2">
      Unsupported type: {String(contentType ?? 'unknown')}
    </div>
    <div className="font-mono text-xs whitespace-pre-wrap break-all line-clamp-8">
      {content}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// RenderArtifact — component wrapper that resolves + renders with fallback
// ---------------------------------------------------------------------------

export interface RenderArtifactProps extends ArtifactRendererProps {
  widgetType?: string;
}

export const RenderArtifact: React.FC<RenderArtifactProps> = ({ widgetType, ...props }) => {
  const Renderer = getArtifactRenderer(widgetType, props.contentType) ?? FallbackRenderer;
  return <Renderer {...props} />;
};
