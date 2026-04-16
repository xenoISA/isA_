/**
 * ProjectSettings — Per-project instructions and knowledge base (#192)
 * Uses activeProject from useProjects hook.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useProjects } from '../../../hooks/useProjects';
import { GATEWAY_ENDPOINTS } from '../../../config/gatewayConfig';

export const ProjectSettings: React.FC = () => {
  const { activeProject, activeProjectId } = useProjects();
  const [instructions, setInstructions] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject?.custom_instructions) {
      setInstructions(activeProject.custom_instructions);
      setSaved(activeProject.custom_instructions);
    } else {
      setInstructions('');
      setSaved('');
    }
  }, [activeProject]);

  const handleSave = useCallback(async () => {
    if (!activeProjectId) return;
    setSaving(true);
    try {
      const url = `${GATEWAY_ENDPOINTS.MODELS.BASE}`.replace('/models', `/projects/${activeProjectId}/instructions`);
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ instructions }),
      });
      if (res.ok) {
        setSaved(instructions);
        setMessage('Saved');
        setTimeout(() => setMessage(null), 2000);
      }
    } catch {} finally { setSaving(false); }
  }, [activeProjectId, instructions]);

  if (!activeProject) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
        Select a project to edit its instructions and knowledge base.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {activeProject.name} — Instructions
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Custom instructions for all conversations in this project.
        </p>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value.slice(0, 8000))}
          placeholder="e.g., Always use TypeScript. Prefer functional components..."
          className="w-full min-h-[120px] p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={5}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{instructions.length}/8000</span>
          <div className="flex items-center gap-2">
            {message && <span className="text-xs text-green-600">{message}</span>}
            <button
              onClick={handleSave}
              disabled={instructions === saved || saving}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Knowledge Base placeholder */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Knowledge Base</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Upload files for Mate to reference in this project.
        </p>
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <svg className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-400">Drag files here or click to upload</p>
          <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, CSV, code files up to 30MB</p>
        </div>
      </div>
    </div>
  );
};
