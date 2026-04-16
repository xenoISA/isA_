/**
 * ArtifactCanvas — Full-screen artifact view with metadata sidebar (#253)
 *
 * Triggered by expand button or Cmd+Shift+A.
 * Left sidebar: version history timeline, metadata, parent links
 * Main area: full artifact content at full resolution
 * Escape returns to previous context.
 */
import React, { useEffect, useCallback, useState } from 'react';
import type { ArtifactNode } from '../../../types/artifactTypes';
import { getActiveVersion, getVersionCount } from '../../../types/artifactTypes';
import { useArtifactManager } from '../../../stores/useArtifactManager';

export const ArtifactCanvas: React.FC = () => {
  const openArtifactId = useArtifactManager(s => s.openArtifactId);
  const panelLayout = useArtifactManager(s => s.panelLayout);
  const artifacts = useArtifactManager(s => s.artifacts);
  const { closePanel, setActiveVersion } = useArtifactManager(s => ({
    closePanel: s.closePanel,
    setActiveVersion: s.setActiveVersion,
  }));

  const artifact = openArtifactId ? artifacts[openArtifactId] : null;
  const activeVersion = artifact ? getActiveVersion(artifact) : null;
  const [copied, setCopied] = useState(false);

  // Escape to close
  useEffect(() => {
    if (panelLayout !== 'canvas') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [panelLayout, closePanel]);

  const handleCopy = useCallback(async () => {
    if (!activeVersion) return;
    await navigator.clipboard.writeText(activeVersion.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeVersion]);

  if (panelLayout !== 'canvas' || !artifact || !activeVersion) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-white dark:bg-[#111111]">
      {/* Left Sidebar — version history + metadata */}
      <aside className="w-[260px] border-r border-gray-200 dark:border-gray-700/50 flex flex-col overflow-hidden flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700/50">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{artifact.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            {activeVersion.language && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">{activeVersion.language}</span>
            )}
            <span className="text-[11px] text-gray-400 capitalize">{artifact.contentType}</span>
          </div>
        </div>

        {/* Version timeline */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Version History</h3>
          <div className="space-y-1">
            {artifact.versions.map((v, i) => (
              <button
                key={v.versionId}
                onClick={() => setActiveVersion(artifact.id, i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  i === artifact.activeVersionIndex
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>v{v.number}</span>
                  <span className="text-[10px] text-gray-400">{new Date(v.createdAt).toLocaleTimeString()}</span>
                </div>
                {v.instruction && (
                  <div className="text-[11px] text-gray-400 mt-0.5 truncate">{v.instruction}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700/50 text-[11px] text-gray-400 space-y-1">
          {artifact.widgetType && <div>Source: <span className="capitalize">{artifact.widgetType}</span></div>}
          {artifact.parentId && <div>Forked from: {artifact.parentId.slice(0, 8)}...</div>}
          <div>Created: {new Date(artifact.createdAt).toLocaleDateString()}</div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700/50">
          <div className="text-xs text-gray-400">
            v{activeVersion.number} of {getVersionCount(artifact)}
            {activeVersion.instruction && <span className="ml-2">— {activeVersion.instruction}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleCopy} className="px-2 py-1 text-xs rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {artifact.downloadUrl && (
              <a href={artifact.downloadUrl} download={artifact.filename} className="px-2 py-1 text-xs rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                Download
              </a>
            )}
            <button onClick={closePanel} className="px-2 py-1 text-xs rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Close <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {artifact.contentType === 'image' ? (
            <div className="flex items-center justify-center h-full">
              <img src={activeVersion.content} alt={artifact.title} className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          ) : artifact.contentType === 'html' || artifact.contentType === 'svg' ? (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-700 p-6 min-h-[400px]" dangerouslySetInnerHTML={{ __html: activeVersion.content }} />
          ) : (
            <pre className="text-[14px] font-mono leading-[1.7] text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              <code>{activeVersion.content}</code>
            </pre>
          )}
        </div>
      </main>
    </div>
  );
};
