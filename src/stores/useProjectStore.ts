import { create } from 'zustand';
import {
  type CreateProjectParams,
  type Project,
  type ProjectFile,
  projectService,
  getProjectErrorMessage,
} from '../api/projectService';
import { buildProjectChatContext, type ProjectChatContext } from '../utils/projectContext';

export const PROJECT_ACTIVE_STORAGE_KEY = 'isa_active_project';

export interface ProjectStoreService {
  listProjects: (limit?: number, offset?: number) => Promise<{
    projects: Project[];
    total: number;
  }>;
  createProject: (params: CreateProjectParams) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  setProjectInstructions: (projectId: string, instructions: string) => Promise<void>;
  listProjectKnowledgeFiles: (projectId: string) => Promise<{
    files: ProjectFile[];
    total: number;
  }>;
  uploadProjectKnowledgeFile: (projectId: string, file: File) => Promise<ProjectFile>;
  deleteProjectKnowledgeFile: (projectId: string, fileId: string) => Promise<void>;
}

export interface ProjectStoreState {
  projects: Project[];
  knowledgeFilesByProjectId: Record<string, ProjectFile[]>;
  activeProjectId: string | null;
  loading: boolean;
  creating: boolean;
  savingInstructions: boolean;
  loadingKnowledgeFiles: boolean;
  uploadingKnowledgeFile: boolean;
  deletingKnowledgeFileId: string | null;
  initialized: boolean;
  error: string | null;
  ensureLoaded: () => Promise<void>;
  refresh: () => Promise<void>;
  selectProject: (projectId: string | null) => void;
  createProject: (name: string, description?: string) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<void>;
  saveProjectInstructions: (instructions: string) => Promise<boolean>;
  loadProjectKnowledgeFiles: (projectId?: string | null) => Promise<void>;
  uploadProjectKnowledgeFile: (file: File) => Promise<boolean>;
  deleteProjectKnowledgeFile: (fileId: string) => Promise<boolean>;
  getActiveProjectKnowledgeFiles: () => ProjectFile[];
  getActiveProjectContext: () => ProjectChatContext | null;
  clearError: () => void;
}

const readStoredActiveProjectId = (): string | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(PROJECT_ACTIVE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const persistActiveProjectId = (projectId: string | null) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    if (projectId) {
      localStorage.setItem(PROJECT_ACTIVE_STORAGE_KEY, projectId);
      return;
    }

    localStorage.removeItem(PROJECT_ACTIVE_STORAGE_KEY);
  } catch {
    // Ignore storage failures so project selection still works in-memory.
  }
};

const resolveActiveProjectId = (
  projects: Project[],
  currentActiveProjectId: string | null,
): string | null => {
  if (!currentActiveProjectId) {
    return null;
  }

  return projects.some(project => project.id === currentActiveProjectId)
    ? currentActiveProjectId
    : null;
};

export const createProjectStore = (
  service: ProjectStoreService = projectService,
) =>
  create<ProjectStoreState>()((set, get) => ({
    projects: [],
    knowledgeFilesByProjectId: {},
    activeProjectId: readStoredActiveProjectId(),
    loading: false,
    creating: false,
    savingInstructions: false,
    loadingKnowledgeFiles: false,
    uploadingKnowledgeFile: false,
    deletingKnowledgeFileId: null,
    initialized: false,
    error: null,

    ensureLoaded: async () => {
      if (get().initialized || get().loading) {
        return;
      }

      await get().refresh();
    },

    refresh: async () => {
      set({ loading: true, error: null });

      try {
        const { projects } = await service.listProjects();
        const nextActiveProjectId = resolveActiveProjectId(
          projects,
          get().activeProjectId,
        );

        persistActiveProjectId(nextActiveProjectId);
        set({
          projects,
          activeProjectId: nextActiveProjectId,
          initialized: true,
        });
      } catch (error) {
        set({
          error: getProjectErrorMessage(error, 'Failed to load projects'),
          initialized: true,
        });
      } finally {
        set({ loading: false });
      }
    },

    selectProject: (projectId) => {
      persistActiveProjectId(projectId);
      set({ activeProjectId: projectId, error: null });
    },

    createProject: async (name, description) => {
      set({ creating: true, error: null });

      try {
        const project = await service.createProject({ name, description });
        persistActiveProjectId(project.id);
        set(state => ({
          projects: [project, ...state.projects],
          activeProjectId: project.id,
          initialized: true,
        }));
        return project;
      } catch (error) {
        set({
          error: getProjectErrorMessage(error, 'Failed to create project'),
        });
        return null;
      } finally {
        set({ creating: false });
      }
    },

    deleteProject: async (projectId) => {
      try {
        await service.deleteProject(projectId);
        set(state => {
          const nextActiveProjectId =
            state.activeProjectId === projectId ? null : state.activeProjectId;

          persistActiveProjectId(nextActiveProjectId);

          return {
            projects: state.projects.filter(project => project.id !== projectId),
            knowledgeFilesByProjectId: Object.fromEntries(
              Object.entries(state.knowledgeFilesByProjectId).filter(
                ([existingProjectId]) => existingProjectId !== projectId,
              ),
            ),
            activeProjectId: nextActiveProjectId,
            error: null,
          };
        });
      } catch (error) {
        set({
          error: getProjectErrorMessage(error, 'Failed to delete project'),
        });
      }
    },

    saveProjectInstructions: async (instructions) => {
      const activeProjectId = get().activeProjectId;

      if (!activeProjectId) {
        return false;
      }

      set({ savingInstructions: true, error: null });

      try {
        await service.setProjectInstructions(activeProjectId, instructions);
        set(state => ({
          projects: state.projects.map(project =>
            project.id === activeProjectId
              ? { ...project, custom_instructions: instructions }
              : project,
          ),
        }));
        return true;
      } catch (error) {
        set({
          error: getProjectErrorMessage(
            error,
            'Failed to save project instructions',
          ),
        });
        return false;
      } finally {
        set({ savingInstructions: false });
      }
    },

    loadProjectKnowledgeFiles: async (projectId) => {
      const targetProjectId = projectId ?? get().activeProjectId;

      if (!targetProjectId) {
        return;
      }

      set({ loadingKnowledgeFiles: true, error: null });

      try {
        const { files } = await service.listProjectKnowledgeFiles(targetProjectId);
        set(state => ({
          knowledgeFilesByProjectId: {
            ...state.knowledgeFilesByProjectId,
            [targetProjectId]: files,
          },
        }));
      } catch (error) {
        set({
          error: getProjectErrorMessage(
            error,
            'Failed to load project knowledge files',
          ),
        });
      } finally {
        set({ loadingKnowledgeFiles: false });
      }
    },

    uploadProjectKnowledgeFile: async (file) => {
      const targetProjectId = get().activeProjectId;

      if (!targetProjectId) {
        return false;
      }

      set({ uploadingKnowledgeFile: true, error: null });

      try {
        const uploadedFile = await service.uploadProjectKnowledgeFile(
          targetProjectId,
          file,
        );
        set(state => ({
          knowledgeFilesByProjectId: {
            ...state.knowledgeFilesByProjectId,
            [targetProjectId]: [
              uploadedFile,
              ...(state.knowledgeFilesByProjectId[targetProjectId] ?? []),
            ],
          },
        }));
        return true;
      } catch (error) {
        set({
          error: getProjectErrorMessage(
            error,
            'Failed to upload project knowledge file',
          ),
        });
        return false;
      } finally {
        set({ uploadingKnowledgeFile: false });
      }
    },

    deleteProjectKnowledgeFile: async (fileId) => {
      const targetProjectId = get().activeProjectId;

      if (!targetProjectId) {
        return false;
      }

      set({ deletingKnowledgeFileId: fileId, error: null });

      try {
        await service.deleteProjectKnowledgeFile(targetProjectId, fileId);
        set(state => ({
          knowledgeFilesByProjectId: {
            ...state.knowledgeFilesByProjectId,
            [targetProjectId]: (
              state.knowledgeFilesByProjectId[targetProjectId] ?? []
            ).filter(file => file.id !== fileId),
          },
        }));
        return true;
      } catch (error) {
        set({
          error: getProjectErrorMessage(
            error,
            'Failed to delete project knowledge file',
          ),
        });
        return false;
      } finally {
        set({ deletingKnowledgeFileId: null });
      }
    },

    getActiveProjectKnowledgeFiles: () => {
      const activeProjectId = get().activeProjectId;

      if (!activeProjectId) {
        return [];
      }

      return get().knowledgeFilesByProjectId[activeProjectId] ?? [];
    },

    getActiveProjectContext: () => {
      const state = get();
      const activeProject =
        state.projects.find(project => project.id === state.activeProjectId) ?? null;
      const knowledgeFiles = state.getActiveProjectKnowledgeFiles();

      return buildProjectChatContext(activeProject, knowledgeFiles);
    },

    clearError: () => {
      set({ error: null });
    },
  }));

export const useProjectStore = createProjectStore();
