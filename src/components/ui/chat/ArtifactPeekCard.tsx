/**
 * ArtifactPeekCard — Compact inline artifact preview (#251)
 *
 * Unified peek card that replaces ArtifactMessageComponent in the chat
 * message list. Accepts either an ArtifactMessage (from chat stream) or
 * an ArtifactNode (from the manager store).
 *
 * - Compact card with thumbnail/preview, title, type badge, version badge
 * - Click opens the artifact in the side panel via artifactManager.openArtifact
 * - Hover reveals quick actions: copy, download, expand
 * - Keyboard navigable (Tab, Enter/Space)
 * - Consistent glass-dark theme across all widget/content types
 */
import React, { useState, useCallback } from 'react';
import type { ArtifactMessage } from '../../../types/chatTypes';
import type { ArtifactNode } from '../../../types/artifactTypes';
import { getActiveVersion, getVersionCount } from '../../../types/artifactTypes';
import { useArtifactManager } from '../../../stores/useArtifactManager';
import { ContentRenderer, StatusRenderer } from '../../shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Widget-type to icon + accent colour mapping */
const WIDGET_META: Record<string, { icon: string; color: string }> = {
  dream:             { icon: '\uD83C\uDFA8', color: '#a78bfa' },
  hunt:              { icon: '\uD83D\uDD0D', color: '#60a5fa' },
  omni:              { icon: '\u26A1',       color: '#fbbf24' },
  data_scientist:    { icon: '\uD83D\uDCCA', color: '#34d399' },
  knowledge:         { icon: '\uD83E\uDDE0', color: '#f472b6' },
  custom_automation: { icon: '\uD83E\uDD16', color: '#818cf8' },
  digitalhub:        { icon: '\uD83D\uDCC2', color: '#fb923c' },
  doc:               { icon: '\uD83D\uDCDD', color: '#94a3b8' },
};

const DEFAULT_WIDGET_META = { icon: '\uD83D\uDCCE', color: '#94a3b8' };

/** Content-type to human-readable badge label */
const TYPE_LABELS: Record<string, string> = {
  image: 'Image',
  text: 'Text',
  data: 'Data',
  analysis: 'Analysis',
  knowledge: 'Knowledge',
  search_results: 'Search',
  code: 'Code',
  html: 'HTML',
  svg: 'SVG',
  chart: 'Chart',
  form: 'Form',
  dashboard: 'Dashboard',
  a2ui_surface: 'Surface',
};

// ---------------------------------------------------------------------------
// Props — supports both ArtifactMessage and ArtifactNode inputs
// ---------------------------------------------------------------------------

export interface ArtifactPeekCardProps {
  /** ArtifactMessage from the chat stream */
  artifactMessage?: ArtifactMessage;
  /** ArtifactNode from the manager store (used when rendered outside chat) */
  artifact?: ArtifactNode;
  /** Fallback open handler when the artifact is not in the manager store */
  onFallbackOpen?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ArtifactPeekCard: React.FC<ArtifactPeekCardProps> = ({
  artifactMessage,
  artifact: artifactNodeProp,
  onFallbackOpen,
  className = '',
}) => {
  // --- Resolve data from whichever source was provided --------------------
  const openArtifact = useArtifactManager(s => s.openArtifact);
  const managerArtifacts = useArtifactManager(s => s.artifacts);

  // Determine the managed artifact (from the store) for version info
  const managedArtifact: ArtifactNode | undefined = artifactNodeProp
    ?? (artifactMessage
      ? Object.values(managerArtifacts).find(
          a => a.sourceMessageId === artifactMessage.id || a.id === artifactMessage.artifact.id,
        )
      : undefined);

  // Normalised display values
  const widgetType  = managedArtifact?.widgetType ?? artifactMessage?.artifact.widgetType ?? '';
  const contentType = managedArtifact?.contentType ?? artifactMessage?.artifact.contentType ?? 'text';
  const title       = managedArtifact?.title ?? artifactMessage?.artifact.widgetName ?? widgetType;
  const content     = managedArtifact
    ? getActiveVersion(managedArtifact).content
    : artifactMessage?.artifact.content;
  const versionNumber = managedArtifact
    ? getVersionCount(managedArtifact)
    : (artifactMessage?.artifact.version ?? 1);
  const language    = managedArtifact ? getActiveVersion(managedArtifact).language : undefined;
  const isLoading   = content === 'Loading...' || (artifactMessage?.isStreaming ?? false);

  const meta      = WIDGET_META[widgetType] ?? DEFAULT_WIDGET_META;
  const typeLabel = TYPE_LABELS[contentType] ?? contentType;

  // --- Local state --------------------------------------------------------
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Handlers -----------------------------------------------------------

  const handleOpen = useCallback(() => {
    if (managedArtifact) {
      openArtifact(managedArtifact.id, 'inspect');
    } else {
      onFallbackOpen?.();
    }
  }, [managedArtifact, openArtifact, onFallbackOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
    },
    [handleOpen],
  );

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!content || isLoading) return;
      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [content, isLoading],
  );

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!content || isLoading) return;
      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'artifact'}-v${versionNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [content, isLoading, title, versionNumber],
  );

  // --- Render -------------------------------------------------------------

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open artifact: ${title} version ${versionNumber}`}
      className={`group relative my-3 max-w-sm cursor-pointer select-none rounded-xl transition-all duration-200 ${className}`}
      style={{
        background: 'var(--glass-secondary, rgba(255,255,255,0.04))',
        border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
        boxShadow: hovered
          ? '0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px var(--glass-border, rgba(255,255,255,0.12))'
          : 'none',
      }}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ---- Header ---- */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        {/* Icon circle */}
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
          style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)` }}
          aria-hidden
        >
          {meta.icon}
        </span>

        {/* Title + badges */}
        <div className="min-w-0 flex-1">
          <h4
            className="truncate text-sm font-medium leading-tight"
            style={{ color: 'var(--text-primary, #e2e8f0)' }}
          >
            {title}
          </h4>
          <div className="mt-0.5 flex items-center gap-1.5">
            {/* Type badge */}
            <span
              className="rounded px-1.5 py-px font-medium uppercase tracking-wide"
              style={{
                background: 'var(--glass-primary, rgba(255,255,255,0.06))',
                color: 'var(--text-secondary, #94a3b8)',
                fontSize: '10px',
              }}
            >
              {typeLabel}
            </span>
            {/* Version badge */}
            <span
              className="rounded px-1.5 py-px font-semibold"
              style={{
                background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                color: meta.color,
                fontSize: '10px',
              }}
            >
              v{versionNumber}
            </span>
            {/* Language badge (code artifacts) */}
            {language && (
              <span
                className="rounded px-1.5 py-px font-medium"
                style={{
                  background: 'rgba(96,165,250,0.12)',
                  color: '#60a5fa',
                  fontSize: '10px',
                }}
              >
                {language}
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <span
          className="shrink-0 text-xs transition-transform duration-150 group-hover:translate-x-0.5"
          style={{ color: hovered ? meta.color : 'var(--text-muted, #64748b)' }}
          aria-hidden
        >
          &#x2197;
        </span>
      </div>

      {/* ---- Preview area (max-h-96 per spec) ---- */}
      <div className="relative max-h-96 overflow-hidden rounded-b-xl px-3.5 pb-3">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <StatusRenderer status="loading" message="Generating..." variant="inline" size="sm" />
          </div>
        )}

        {/* Image preview */}
        {!isLoading && contentType === 'image' && content && (
          <div
            className="overflow-hidden rounded-lg"
            style={{ border: '1px solid var(--glass-border, rgba(255,255,255,0.08))' }}
          >
            <ContentRenderer
              content={content}
              type="image"
              variant="widget"
              size="sm"
              features={{ imagePreview: true }}
              className="max-h-48 w-full object-cover"
            />
          </div>
        )}

        {/* Text / data / code / search_results / analysis / knowledge preview */}
        {!isLoading && contentType !== 'image' && content && (
          <div
            className="max-h-32 overflow-hidden rounded-lg px-3 py-2 text-xs"
            style={{
              background: 'var(--glass-primary, rgba(255,255,255,0.06))',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.06))',
              color: 'var(--text-secondary, #94a3b8)',
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
            }}
          >
            <ContentRenderer
              content={content}
              type={contentType === 'search_results' ? 'search_results' : 'markdown'}
              variant="widget"
              size="xs"
              features={{ markdown: true, truncate: 200, wordBreak: true }}
            />
          </div>
        )}

        {/* Empty fallback */}
        {!isLoading && !content && (
          <div className="py-4 text-center text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
            No content available
          </div>
        )}
      </div>

      {/* ---- Hover quick-action bar ---- */}
      <div
        className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg px-1.5 py-1 transition-opacity duration-150"
        style={{
          background: 'var(--glass-primary, rgba(15,15,20,0.85))',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        {/* Copy */}
        <button
          type="button"
          aria-label={copied ? 'Copied' : 'Copy content'}
          className="rounded p-1 text-xs transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-muted, #64748b)' }}
          onClick={handleCopy}
        >
          {copied ? '\u2705' : '\uD83D\uDCCB'}
        </button>

        {/* Download (non-image text content) */}
        {content && contentType !== 'image' && !isLoading && (
          <button
            type="button"
            aria-label="Download artifact"
            className="rounded p-1 text-xs transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-muted, #64748b)' }}
            onClick={handleDownload}
          >
            \u2B07\uFE0F
          </button>
        )}

        {/* Open in panel */}
        <button
          type="button"
          aria-label="Open in panel"
          className="rounded p-1 text-xs transition-colors hover:bg-white/10"
          style={{ color: meta.color }}
          onClick={(e) => { e.stopPropagation(); handleOpen(); }}
        >
          \u2197\uFE0F
        </button>
      </div>
    </div>
  );
};
