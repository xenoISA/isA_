/**
 * ArtifactPanel — Unified artifact side panel with versioning, A2UI rendering,
 * and transform actions (#239, #252)
 *
 * Powered by ArtifactNode model with version chain.
 * Shows: header with version selector + actions menu, tabs (Preview/Code/Edit),
 * content area with A2UI surface rendering when available.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ArtifactNode } from '../../../types/artifactTypes';
import { getActiveVersion, getVersionCount } from '../../../types/artifactTypes';
import { useArtifactManager } from '../../../stores/useArtifactManager';
import { RenderArtifact } from './renderers';

// Lazy-load A2UI renderer — only imported when an artifact has a2uiState
let A2UIRendererModule: typeof import('./A2UISurfacePanel') | null = null;
const getA2UIRenderer = () => {
  if (!A2UIRendererModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      A2UIRendererModule = require('./A2UISurfacePanel');
    } catch {
      // @isa/ui-web not available — fall back to raw content
    }
  }
  return A2UIRendererModule;
};

export type ArtifactPanelTab = 'preview' | 'code' | 'edit';

/** @deprecated Use ArtifactNode instead */
export interface ArtifactPanelData {
  id: string;
  title: string;
  type: 'code' | 'text' | 'image' | 'html' | 'svg' | 'data';
  content: string;
  language?: string;
  filename?: string;
  downloadUrl?: string;
}

const TAB_CONFIG: { id: ArtifactPanelTab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'code', label: 'Code' },
  { id: 'edit', label: 'Edit' },
];

interface ArtifactPanelProps {
  /** Called when user submits an edit instruction — sends to Mate for evolution (#256) */
  onEditArtifact?: (artifactId: string, instruction: string, currentContent: string) => void;
  /** A2UI surface events for live rendering */
  surfaceEvents?: import('./A2UISurfacePanel').A2UISurfaceEvent[];
  /** Callback for A2UI user actions */
  onUserAction?: (action: unknown) => void;
}

// ---------------------------------------------------------------------------
// Transform Actions Menu
// ---------------------------------------------------------------------------

interface ActionsMenuProps {
  artifact: ArtifactNode;
  activeContent: string;
  onCopy: () => void;
  onDownload: () => void;
  onFork: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({
  artifact,
  activeContent,
  onCopy,
  onDownload,
  onFork,
  onDelete,
  onEdit,
}) => {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const menuItem = "w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setOpen(o => !o); setConfirmDelete(false); }}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Actions"
        aria-label="Transform actions"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] shadow-lg z-50 py-1">
          <button onClick={() => { onCopy(); setOpen(false); }} className={menuItem}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Copy content
          </button>
          <button onClick={() => { onDownload(); setOpen(false); }} className={menuItem}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download as file
          </button>
          <button onClick={() => { /* placeholder */ setOpen(false); }} className={menuItem + ' opacity-50 cursor-not-allowed'} disabled>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Share
          </button>
          <button onClick={() => { onEdit(); setOpen(false); }} className={menuItem}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit
          </button>
          <button onClick={() => { onFork(); setOpen(false); }} className={menuItem}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" /></svg>
            Fork (copy)
          </button>
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          {confirmDelete ? (
            <button
              onClick={() => { onDelete(); setOpen(false); setConfirmDelete(false); }}
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Confirm delete
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full text-left px-3 py-1.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// A2UI Preview Renderer
// ---------------------------------------------------------------------------

interface A2UIPreviewProps {
  a2uiState: Record<string, unknown>;
  surfaceEvents?: import('./A2UISurfacePanel').A2UISurfaceEvent[];
  onUserAction?: (action: unknown) => void;
}

const A2UIPreview: React.FC<A2UIPreviewProps> = ({ a2uiState, surfaceEvents, onUserAction }) => {
  const mod = getA2UIRenderer();
  if (!mod) {
    return (
      <div className="p-4 text-xs text-gray-400">
        <p className="mb-2 font-medium text-gray-500">A2UI Surface</p>
        <pre className="whitespace-pre-wrap text-[12px] bg-gray-50 dark:bg-[#111111] rounded-lg p-3 overflow-auto max-h-96">
          {JSON.stringify(a2uiState, null, 2)}
        </pre>
      </div>
    );
  }

  const { A2UISurfacePanel } = mod;
  return (
    <A2UISurfacePanel
      surfaceEvents={surfaceEvents ?? []}
      onUserAction={onUserAction as any}
      className="h-full overflow-y-auto p-4"
    />
  );
};

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

interface ArtifactPanelInternalProps extends ArtifactPanelProps {}

/**
 * ArtifactPanel — reads from useArtifactManager store
 */
export const ArtifactPanel: React.FC<ArtifactPanelInternalProps> = ({
  onEditArtifact,
  surfaceEvents,
  onUserAction,
}) => {
  const openArtifactId = useArtifactManager(s => s.openArtifactId);
  const panelLayout = useArtifactManager(s => s.panelLayout);
  const artifacts = useArtifactManager(s => s.artifacts);
  const { closePanel, setActiveVersion, addVersion, forkArtifact, removeArtifact, openArtifact } =
    useArtifactManager(s => ({
      closePanel: s.closePanel,
      setActiveVersion: s.setActiveVersion,
      addVersion: s.addVersion,
      forkArtifact: s.forkArtifact,
      removeArtifact: s.removeArtifact,
      openArtifact: s.openArtifact,
    }));

  const artifact = openArtifactId ? artifacts[openArtifactId] : null;

  const [activeTab, setActiveTab] = useState<ArtifactPanelTab>('preview');
  const [editInstruction, setEditInstruction] = useState('');
  const [copied, setCopied] = useState(false);

  const activeVersion = artifact ? getActiveVersion(artifact) : null;
  const versionCount = artifact ? getVersionCount(artifact) : 0;

  // --- Transform action handlers ---

  const handleCopy = useCallback(async () => {
    if (!activeVersion) return;
    await navigator.clipboard.writeText(activeVersion.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeVersion]);

  const handleDownload = useCallback(() => {
    if (!activeVersion || !artifact) return;
    const ext = activeVersion.language
      ? `.${activeVersion.language}`
      : artifact.contentType === 'html' ? '.html'
      : artifact.contentType === 'svg' ? '.svg'
      : artifact.contentType === 'image' ? '.png'
      : '.txt';
    const filename = artifact.filename || `${artifact.title.replace(/\s+/g, '_')}${ext}`;
    const blob = new Blob([activeVersion.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeVersion, artifact]);

  const handleFork = useCallback(() => {
    if (!artifact) return;
    const forkedId = forkArtifact(artifact.id);
    if (forkedId) openArtifact(forkedId);
  }, [artifact, forkArtifact, openArtifact]);

  const handleDelete = useCallback(() => {
    if (!artifact) return;
    removeArtifact(artifact.id);
  }, [artifact, removeArtifact]);

  const handleSwitchToEdit = useCallback(() => {
    setActiveTab('edit');
  }, []);

  const handleEdit = useCallback(() => {
    if (!editInstruction.trim() || !artifact || !activeVersion) return;
    if (onEditArtifact) {
      // Send to Mate for evolution — new version created from response (#256)
      onEditArtifact(artifact.id, editInstruction.trim(), activeVersion.content);
    } else {
      // Fallback: create local version (no backend)
      addVersion(artifact.id, activeVersion.content, editInstruction.trim());
    }
    setEditInstruction('');
  }, [editInstruction, artifact, activeVersion, addVersion, onEditArtifact]);

  if (panelLayout === 'closed' || !artifact || !activeVersion) return null;

  // Detect A2UI surface availability
  const hasA2UI = Boolean(activeVersion.a2uiState) || artifact.contentType === 'a2ui_surface';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {artifact.title}
          </span>
          {activeVersion.language && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
              {activeVersion.language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Version selector (#252) */}
          {versionCount > 1 && (
            <select
              value={artifact.activeVersionIndex}
              onChange={e => setActiveVersion(artifact.id, Number(e.target.value))}
              className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
              aria-label="Select version"
            >
              {artifact.versions.map((v, i) => (
                <option key={v.versionId} value={i}>
                  v{v.number}{v.instruction ? ` — ${v.instruction.slice(0, 30)}` : ''}
                </option>
              ))}
            </select>
          )}
          {versionCount === 1 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-400 rounded">v1</span>
          )}
          {/* Copy (inline shortcut) */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            )}
          </button>
          {/* Transform actions menu (#252) */}
          <ActionsMenu
            artifact={artifact}
            activeContent={activeVersion.content}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onFork={handleFork}
            onDelete={handleDelete}
            onEdit={handleSwitchToEdit}
          />
          {/* Close */}
          <button onClick={closePanel} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Close">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700/50">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-gray-900 dark:text-gray-100 border-gray-900 dark:border-gray-100'
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'preview' && (
          <div className="p-4">
            {/* A2UI surface rendering (#252) — takes priority when available */}
            {hasA2UI ? (
              <A2UIPreview
                a2uiState={activeVersion.a2uiState ?? {}}
                surfaceEvents={surfaceEvents}
                onUserAction={onUserAction}
              />
            ) : (
              // ArtifactRendererRegistry dispatch with widget + content fallback chain (#255)
              <RenderArtifact
                widgetType={artifact.widgetType}
                content={activeVersion.content}
                contentType={artifact.contentType}
                language={activeVersion.language}
                layout="inspect"
                metadata={artifact.metadata}
              />
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <pre className="p-4 text-[13px] font-mono leading-relaxed text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#111111] min-h-full overflow-x-auto">
            <code>{activeVersion.content}</code>
          </pre>
        )}

        {activeTab === 'edit' && (
          <div className="flex flex-col h-full">
            <pre className="flex-1 p-4 text-[13px] font-mono leading-relaxed text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#111111] overflow-auto">
              <code>{activeVersion.content}</code>
            </pre>
            {/* Version instruction (what created this version) */}
            {activeVersion.instruction && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                Created by: &quot;{activeVersion.instruction}&quot;
              </div>
            )}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700/50">
              <div className="flex gap-2">
                <input
                  value={editInstruction}
                  onChange={e => setEditInstruction(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } }}
                  placeholder="Describe changes to make..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#222222] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                />
                <button
                  onClick={handleEdit}
                  disabled={!editInstruction.trim()}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-[#111111] dark:bg-gray-100 text-white dark:text-[#111111] hover:bg-[#333333] dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
