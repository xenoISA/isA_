/**
 * ArtifactPanel — Claude-style side panel for viewing artifacts (#239)
 *
 * Opens when user clicks an artifact in the chat. Shows:
 * - Header with title, close, copy, download actions
 * - Tab bar: Preview / Code / Edit
 * - Content area with appropriate rendering
 *
 * Design ref (docs/design/claude-ui-reference.md):
 * - Side panel slides in from right, chat area shrinks (50/50 or 40/60)
 * - Border-left divider, smooth transition
 * - Tabs with bottom border active indicator
 */
import React, { useState, useCallback } from 'react';

export type ArtifactPanelTab = 'preview' | 'code' | 'edit';

export interface ArtifactPanelData {
  id: string;
  title: string;
  type: 'code' | 'text' | 'image' | 'html' | 'svg' | 'data';
  content: string;
  language?: string;
  filename?: string;
  downloadUrl?: string;
}

interface ArtifactPanelProps {
  open: boolean;
  artifact: ArtifactPanelData | null;
  onClose: () => void;
  onRequestEdit?: (instruction: string) => void;
}

const TAB_CONFIG: { id: ArtifactPanelTab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'code', label: 'Code' },
  { id: 'edit', label: 'Edit' },
];

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  open, artifact, onClose, onRequestEdit,
}) => {
  const [activeTab, setActiveTab] = useState<ArtifactPanelTab>('preview');
  const [editInstruction, setEditInstruction] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!artifact) return;
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [artifact]);

  const handleEdit = useCallback(() => {
    if (!editInstruction.trim() || !onRequestEdit) return;
    onRequestEdit(editInstruction.trim());
    setEditInstruction('');
  }, [editInstruction, onRequestEdit]);

  if (!open || !artifact) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {artifact.title || artifact.filename || 'Artifact'}
          </span>
          {artifact.language && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
              {artifact.language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          {/* Download */}
          {artifact.downloadUrl && (
            <a
              href={artifact.downloadUrl}
              download={artifact.filename}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          )}
          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
            {artifact.type === 'image' ? (
              <img src={artifact.content} alt={artifact.title} className="max-w-full rounded-lg" />
            ) : artifact.type === 'html' || artifact.type === 'svg' ? (
              <div
                className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 p-4 min-h-[200px]"
                dangerouslySetInnerHTML={{ __html: artifact.content }}
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none text-[15px] leading-[1.6]">
                <pre className="whitespace-pre-wrap">{artifact.content}</pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <pre className="p-4 text-[13px] font-mono leading-relaxed text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#111111] min-h-full overflow-x-auto">
            <code>{artifact.content}</code>
          </pre>
        )}

        {activeTab === 'edit' && (
          <div className="flex flex-col h-full">
            <pre className="flex-1 p-4 text-[13px] font-mono leading-relaxed text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#111111] overflow-auto">
              <code>{artifact.content}</code>
            </pre>
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
