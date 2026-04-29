/**
 * ArtifactSheet — Mobile bottom sheet for artifact interaction (#254)
 *
 * On viewports < 768px, artifacts open as a bottom sheet instead of side panel.
 * Covers 75% of screen, swipe-down or X to close.
 * Shows same tabs as ArtifactPanel.
 */
import React, { useState, useCallback, useRef } from 'react';
import type { ArtifactNode } from '../../../types/artifactTypes';
import { getActiveVersion, getVersionCount } from '../../../types/artifactTypes';
import { useArtifactManager } from '../../../stores/useArtifactManager';
import { shouldDismissFromSwipe } from '../../../utils/swipeDismiss';
import { CodeSandboxPanel } from './CodeSandboxPanel';
import { FileCreationPanel } from './FileCreationPanel';

export const ArtifactSheet: React.FC = () => {
  const openArtifactId = useArtifactManager(s => s.openArtifactId);
  const panelLayout = useArtifactManager(s => s.panelLayout);
  const artifacts = useArtifactManager(s => s.artifacts);
  const closePanel = useArtifactManager(s => s.closePanel);

  const artifact = openArtifactId ? artifacts[openArtifactId] : null;
  const activeVersion = artifact ? getActiveVersion(artifact) : null;
  const generatedFiles = activeVersion?.generatedFiles || artifact?.generatedFiles || [];
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    setDragOffset(0);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    // Only allow downward drag (delta > 0) to produce visual offset.
    setDragOffset(Math.max(0, delta));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current !== null && shouldDismissFromSwipe(dragStartY.current, e.clientY)) {
      closePanel();
    }
    dragStartY.current = null;
    setDragOffset(0);
  }, [closePanel]);

  if (panelLayout === 'closed' || !artifact || !activeVersion) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={closePanel} />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] rounded-t-2xl max-h-[75vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 touch-pan-y"
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined}
      >
        {/* Handle — swipe area */}
        <div
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Drag down to dismiss"
          role="button"
        >
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{artifact.title}</span>
            {getVersionCount(artifact) > 1 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-400 rounded">v{activeVersion.number}</span>
            )}
          </div>
          <button onClick={closePanel} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700/50">
          {(['preview', 'code'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-gray-900 dark:text-gray-100 border-gray-900 dark:border-gray-100'
                  : 'text-gray-400 border-transparent'
              }`}
            >
              {tab === 'preview' ? 'Preview' : 'Code'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {generatedFiles.length > 0 && (
            <FileCreationPanel files={generatedFiles} />
          )}
          {activeTab === 'preview' ? (
            artifact.contentType === 'image' ? (
              <img src={activeVersion.content} alt={artifact.title} className="w-full rounded-lg" />
            ) : artifact.contentType === 'code' ? (
              <div className="min-h-[320px]">
                <CodeSandboxPanel
                  code={activeVersion.content}
                  language={activeVersion.language}
                  filename={activeVersion.filename || artifact.filename}
                  embedded
                />
              </div>
            ) : (
              <div className="text-[15px] leading-[1.6] text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{activeVersion.content}</div>
            )
          ) : (
            <pre className="text-[12px] font-mono leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
              <code>{activeVersion.content}</code>
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700/50">
          <button
            onClick={async () => { await navigator.clipboard.writeText(activeVersion.content); }}
            className="flex-1 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Copy
          </button>
          <button onClick={closePanel} className="flex-1 py-2 text-sm font-medium rounded-lg bg-[#111111] dark:bg-gray-100 text-white dark:text-[#111111] transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
