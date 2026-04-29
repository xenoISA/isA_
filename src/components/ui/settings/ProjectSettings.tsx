/**
 * ProjectSettings — Per-project instructions and knowledge base (#192)
 * Uses shared project store state so switcher and settings stay in sync.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProjects } from '../../../hooks/useProjects';

export const formatProjectKnowledgeFileSize = (fileSize?: number): string => {
  if (!fileSize || fileSize < 1024) {
    return fileSize ? `${fileSize} B` : 'Unknown size';
  }

  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
};

export const ProjectSettings: React.FC = () => {
  const {
    activeProject,
    activeProjectId,
    loading,
    savingInstructions,
    saveProjectInstructions,
    knowledgeFiles,
    loadingKnowledgeFiles,
    uploadingKnowledgeFile,
    deletingKnowledgeFileId,
    loadProjectKnowledgeFiles,
    uploadProjectKnowledgeFile,
    deleteProjectKnowledgeFile,
    error,
    clearError,
  } = useProjects();
  const [instructions, setInstructions] = useState('');
  const [saved, setSaved] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const previousProjectIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!activeProjectId) {
      return;
    }

    void loadProjectKnowledgeFiles(activeProjectId);
  }, [activeProjectId, loadProjectKnowledgeFiles]);

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

  const handleFileSelection = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);

      if (files.length === 0) {
        return;
      }

      clearError();
      setMessage(null);

      let uploadedCount = 0;
      for (const file of files) {
        const uploaded = await uploadProjectKnowledgeFile(file);
        if (uploaded) {
          uploadedCount += 1;
        }
      }

      if (uploadedCount > 0) {
        setMessage(
          uploadedCount === 1
            ? 'Knowledge file uploaded'
            : `${uploadedCount} knowledge files uploaded`,
        );
      }

      event.target.value = '';
    },
    [clearError, uploadProjectKnowledgeFile],
  );

  const handleDeleteKnowledgeFile = useCallback(
    async (fileId: string) => {
      clearError();
      setMessage(null);

      const deleted = await deleteProjectKnowledgeFile(fileId);
      if (deleted) {
        setMessage('Knowledge file removed');
      }
    },
    [clearError, deleteProjectKnowledgeFile],
  );

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

      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Knowledge Base</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Upload files for Mate to reference in this project. Files stay attached to the active project after reload.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelection}
          accept=".pdf,.txt,.md,.doc,.docx,.csv,.ts,.tsx,.js,.jsx,.json,.py,.sql,.html,.css,.yaml,.yml"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingKnowledgeFile}
          className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center hover:border-blue-300 dark:hover:border-blue-500 transition-colors disabled:opacity-60"
        >
          <svg className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            {uploadingKnowledgeFile ? 'Uploading files...' : 'Click to upload project files'}
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, CSV, and code files up to 30MB</p>
        </button>

        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loadingKnowledgeFiles ? (
            <div className="space-y-3 p-4">
              <div className="h-4 w-1/2 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="h-12 rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse" />
            </div>
          ) : knowledgeFiles.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
              No knowledge files uploaded yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {knowledgeFiles.map(file => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {[file.file_type, formatProjectKnowledgeFileSize(file.file_size)]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteKnowledgeFile(file.id)}
                    disabled={deletingKnowledgeFileId === file.id}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-60"
                  >
                    {deletingKnowledgeFileId === file.id ? 'Removing...' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
