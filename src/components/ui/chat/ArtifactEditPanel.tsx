/**
 * ArtifactEditPanel — Iterative artifact editing (#202)
 *
 * Shows artifact content with a "Request changes" input. User describes edits,
 * agent applies them inline without full regeneration. Tracks edit history.
 */
import React, { useState, useCallback } from 'react';

interface ArtifactEdit {
  id: string;
  request: string;
  timestamp: string;
}

interface ArtifactEditPanelProps {
  artifactId: string;
  content: string;
  language?: string;
  onRequestEdit?: (editInstruction: string) => void;
  editHistory?: ArtifactEdit[];
}

export const ArtifactEditPanel: React.FC<ArtifactEditPanelProps> = ({
  artifactId, content, language, onRequestEdit, editHistory = [],
}) => {
  const [editRequest, setEditRequest] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!editRequest.trim() || !onRequestEdit) return;
    setIsRequesting(true);
    onRequestEdit(editRequest.trim());
    setEditRequest('');
    setTimeout(() => setIsRequesting(false), 500);
  }, [editRequest, onRequestEdit]);

  return (
    <div className="flex flex-col h-full">
      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-sm font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 min-h-full">
          <code>{content}</code>
        </pre>
      </div>

      {/* Edit history */}
      {editHistory.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 max-h-[120px] overflow-y-auto">
          <div className="text-xs text-gray-400 mb-1">Edit History</div>
          {editHistory.map(edit => (
            <div key={edit.id} className="text-xs text-gray-500 dark:text-gray-400 py-0.5 truncate">
              {edit.request}
            </div>
          ))}
        </div>
      )}

      {/* Edit request input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex gap-2">
          <input
            value={editRequest}
            onChange={e => setEditRequest(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Describe changes to make..."
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRequesting}
          />
          <button
            onClick={handleSubmit}
            disabled={!editRequest.trim() || isRequesting}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isRequesting ? '...' : 'Edit'}
          </button>
        </div>
      </div>
    </div>
  );
};
