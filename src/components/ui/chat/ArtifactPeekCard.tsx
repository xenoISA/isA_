/**
 * ArtifactPeekCard — Compact inline artifact preview (#251)
 *
 * Replaces both ArtifactMessageComponent and ArtifactComponent with a unified
 * peek card. Renders consistently across all content types.
 *
 * Design: flat card, 1px border, 8px radius, type badge, version indicator,
 * hover actions (copy, expand). Click opens in artifact panel.
 */
import React, { useCallback } from 'react';
import type { ArtifactNode } from '../../../types/artifactTypes';
import { getActiveVersion, getVersionCount } from '../../../types/artifactTypes';
import { useArtifactManager } from '../../../stores/useArtifactManager';

const TYPE_ICONS: Record<string, string> = {
  code: '\u{1F4BB}',        // laptop
  text: '\u{1F4DD}',        // memo
  image: '\u{1F5BC}',       // frame with picture
  html: '\u{1F310}',        // globe
  svg: '\u{1F3A8}',         // palette
  data: '\u{1F4CA}',        // bar chart
  chart: '\u{1F4C8}',       // chart increasing
  form: '\u{1F4CB}',        // clipboard
  dashboard: '\u{1F4CA}',   // bar chart
  search_results: '\u{1F50D}', // magnifying glass
  analysis: '\u{1F9EA}',    // test tube
  a2ui_surface: '\u{2728}', // sparkles
};

interface ArtifactPeekCardProps {
  artifact: ArtifactNode;
  className?: string;
}

export const ArtifactPeekCard: React.FC<ArtifactPeekCardProps> = ({ artifact, className = '' }) => {
  const openArtifact = useArtifactManager(s => s.openArtifact);
  const activeVersion = getActiveVersion(artifact);
  const versionCount = getVersionCount(artifact);

  const handleClick = useCallback(() => {
    openArtifact(artifact.id, 'inspect');
  }, [artifact.id, openArtifact]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(activeVersion.content);
  }, [activeVersion.content]);

  // Truncate content for preview
  const preview = activeVersion.content.length > 200
    ? activeVersion.content.slice(0, 200) + '...'
    : activeVersion.content;

  return (
    <div
      onClick={handleClick}
      className={`group cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-150 overflow-hidden max-w-md ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') handleClick(); }}
      aria-label={`Artifact: ${artifact.title}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <span className="text-base">{TYPE_ICONS[artifact.contentType] || '\u{1F4CE}'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {artifact.title}
          </div>
        </div>
        {/* Version badge */}
        {versionCount > 1 && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
            v{activeVersion.number}
          </span>
        )}
        {/* Language badge */}
        {activeVersion.language && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
            {activeVersion.language}
          </span>
        )}
      </div>

      {/* Content Preview */}
      <div className="px-3 py-2 relative">
        {artifact.contentType === 'image' ? (
          <img
            src={activeVersion.content}
            alt={artifact.title}
            className="w-full h-32 object-cover rounded"
          />
        ) : (
          <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-4 overflow-hidden">
            {preview}
          </pre>
        )}

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-white/80 dark:bg-[#1a1a1a]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Copy
          </button>
          <span className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#111111] dark:bg-gray-100 text-white dark:text-[#111111]">
            Open
          </span>
        </div>
      </div>

      {/* Footer */}
      {artifact.widgetType && (
        <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 capitalize">{artifact.widgetType}</span>
        </div>
      )}
    </div>
  );
};
