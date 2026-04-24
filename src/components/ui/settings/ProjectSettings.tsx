/**
 * ProjectSettings — Per-project instructions and knowledge base (#192)
 * Uses shared project store state so switcher and settings stay in sync.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProjects } from '../../../hooks/useProjects';

export const ProjectSettings: React.FC = () => {
  const {
    activeProject,
    activeProjectId,
    loading,
    savingInstructions,
    saveProjectInstructions,
    error,
    clearError,
  } = useProjects();
  const [instructions, setInstructions] = useState('');
  const [saved, setSaved] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const previousProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeProject?.custom_instructions) {
      setInstructions(activeProject.custom_instructions);
      setSaved(activeProject.custom_instructions);
    } else {
      setInstructions('');
      setSaved('');
    }

    const nextProjectId = activeProject?.id ?? null;
    if (previousProjectIdRef.current !== nextProjectId) {
      setMessage(null);
      clearError();
      previousProjectIdRef.current = nextProjectId;
    }
  }, [activeProject, clearError]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const handleSave = useCallback(async () => {
    if (!activeProjectId) return;
    clearError();
    setMessage(null);

    const wasSaved = await saveProjectInstructions(instructions);
    if (!wasSaved) {
      return;
    }

    setSaved(instructions);
    setMessage('Project instructions saved');
  }, [activeProjectId, instructions, clearError, saveProjectInstructions]);

  if (loading && !activeProject) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-40 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-28 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

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
            {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
            <button
              onClick={handleSave}
              disabled={instructions === saved || savingInstructions}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {savingInstructions ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Knowledge Base placeholder */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Knowledge Base</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Knowledge file management is landing in the next `#347` slice. This first fix makes project selection and instructions shared across the app.
        </p>
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <svg className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-400">Upload and file management will be enabled in the next subtask.</p>
          <p className="text-xs text-gray-400 mt-1">This slice focuses on shared project state and instruction persistence.</p>
        </div>
      </div>
    </div>
  );
};
