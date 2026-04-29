import { useEffect } from 'react';
import type { Project, ProjectFile } from '../api/projectService';
import { useProjectStore } from '../stores/useProjectStore';
import { buildProjectChatContext } from '../utils/projectContext';
import type { ProjectChatContext } from '../utils/projectContext';
import { useAuth } from './useAuth';

export type { Project, ProjectFile, ProjectChatContext };

export function useProjects() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const projects = useProjectStore(state => state.projects);
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const activeProject = useProjectStore(
    state =>
      state.projects.find(project => project.id === state.activeProjectId) ?? null,
  );
  const loading = useProjectStore(state => state.loading);
  const creatingProject = useProjectStore(state => state.creating);
  const savingInstructions = useProjectStore(state => state.savingInstructions);
  const knowledgeFiles = useProjectStore(state => {
    if (!state.activeProjectId) {
      return [];
    }

    return state.knowledgeFilesByProjectId[state.activeProjectId] ?? [];
  });
  const activeProjectContext = useProjectStore(state => {
    const activeProject =
      state.projects.find(project => project.id === state.activeProjectId) ?? null;
    const files = state.activeProjectId
      ? state.knowledgeFilesByProjectId[state.activeProjectId] ?? []
      : [];

    return buildProjectChatContext(activeProject, files);
  });
  const loadingKnowledgeFiles = useProjectStore(
    state => state.loadingKnowledgeFiles,
  );
  const uploadingKnowledgeFile = useProjectStore(
    state => state.uploadingKnowledgeFile,
  );
  const deletingKnowledgeFileId = useProjectStore(
    state => state.deletingKnowledgeFileId,
  );
  const error = useProjectStore(state => state.error);
  const ensureLoaded = useProjectStore(state => state.ensureLoaded);
  const refresh = useProjectStore(state => state.refresh);
  const selectProject = useProjectStore(state => state.selectProject);
  const createProject = useProjectStore(state => state.createProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const saveProjectInstructions = useProjectStore(
    state => state.saveProjectInstructions,
  );
  const loadProjectKnowledgeFiles = useProjectStore(
    state => state.loadProjectKnowledgeFiles,
  );
  const uploadProjectKnowledgeFile = useProjectStore(
    state => state.uploadProjectKnowledgeFile,
  );
  const deleteProjectKnowledgeFile = useProjectStore(
    state => state.deleteProjectKnowledgeFile,
  );
  const clearError = useProjectStore(state => state.clearError);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    void ensureLoaded();
  }, [authLoading, isAuthenticated, ensureLoaded]);

  return {
    projects,
    activeProject,
    activeProjectId,
    loading,
    creatingProject,
    savingInstructions,
    loadingKnowledgeFiles,
    uploadingKnowledgeFile,
    deletingKnowledgeFileId,
    knowledgeFiles,
    error,
    selectProject,
    createProject,
    deleteProject,
    saveProjectInstructions,
    loadProjectKnowledgeFiles,
    uploadProjectKnowledgeFile,
    deleteProjectKnowledgeFile,
    getActiveProjectContext: () => activeProjectContext,
    clearError,
    refresh,
  };
}
