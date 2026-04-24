import { useEffect } from 'react';
import type { Project } from '../api/projectService';
import { useProjectStore } from '../stores/useProjectStore';

export type { Project };

export function useProjects() {
  const projects = useProjectStore(state => state.projects);
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const activeProject = useProjectStore(
    state =>
      state.projects.find(project => project.id === state.activeProjectId) ?? null,
  );
  const loading = useProjectStore(state => state.loading);
  const creatingProject = useProjectStore(state => state.creating);
  const savingInstructions = useProjectStore(state => state.savingInstructions);
  const error = useProjectStore(state => state.error);
  const ensureLoaded = useProjectStore(state => state.ensureLoaded);
  const refresh = useProjectStore(state => state.refresh);
  const selectProject = useProjectStore(state => state.selectProject);
  const createProject = useProjectStore(state => state.createProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const saveProjectInstructions = useProjectStore(
    state => state.saveProjectInstructions,
  );
  const clearError = useProjectStore(state => state.clearError);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  return {
    projects,
    activeProject,
    activeProjectId,
    loading,
    creatingProject,
    savingInstructions,
    error,
    selectProject,
    createProject,
    deleteProject,
    saveProjectInstructions,
    clearError,
    refresh,
  };
}
