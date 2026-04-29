import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PROJECT_ACTIVE_STORAGE_KEY, createProjectStore } from '../useProjectStore';
import type { ProjectFile } from '../../api/projectService';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

const createProject = (overrides: Partial<{ id: string; name: string; custom_instructions: string }> = {}) => ({
  id: overrides.id ?? 'project-1',
  name: overrides.name ?? 'Alpha',
  custom_instructions: overrides.custom_instructions,
});

const createService = () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  setProjectInstructions: vi.fn(),
  listProjectKnowledgeFiles: vi.fn(),
  uploadProjectKnowledgeFile: vi.fn(),
  deleteProjectKnowledgeFile: vi.fn(),
});

const createProjectFile = (
  overrides: Partial<ProjectFile> = {},
): ProjectFile => ({
  id: overrides.id ?? 'file-1',
  project_id: overrides.project_id ?? 'project-1',
  filename: overrides.filename ?? 'architecture.md',
  file_type: overrides.file_type ?? 'text/markdown',
  file_size: overrides.file_size ?? 512,
  storage_path: overrides.storage_path ?? 'storage/project-1/architecture.md',
  created_at: overrides.created_at ?? '2026-04-24T00:00:00Z',
});

describe('useProjectStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('hydrates projects once and keeps a persisted active project when it still exists', async () => {
    localStorageMock.setItem(PROJECT_ACTIVE_STORAGE_KEY, 'project-2');
    const service = createService();
    service.listProjects.mockResolvedValue({
      projects: [
        createProject(),
        createProject({ id: 'project-2', name: 'Bravo' }),
      ],
      total: 2,
    });
    const store = createProjectStore(service);

    await store.getState().ensureLoaded();
    await store.getState().ensureLoaded();

    expect(service.listProjects).toHaveBeenCalledTimes(1);
    expect(store.getState().projects).toHaveLength(2);
    expect(store.getState().activeProjectId).toBe('project-2');
  });

  test('clears a persisted active project when refresh no longer returns it', async () => {
    localStorageMock.setItem(PROJECT_ACTIVE_STORAGE_KEY, 'missing-project');
    const service = createService();
    service.listProjects.mockResolvedValue({
      projects: [createProject()],
      total: 1,
    });
    const store = createProjectStore(service);

    await store.getState().refresh();

    expect(store.getState().activeProjectId).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(PROJECT_ACTIVE_STORAGE_KEY);
  });

  test('creates and auto-selects a new project', async () => {
    const created = createProject({ id: 'project-9', name: 'New Project' });
    const service = createService();
    service.createProject.mockResolvedValue(created);
    const store = createProjectStore(service);

    const result = await store.getState().createProject('New Project', 'Scope the refactor');

    expect(service.createProject).toHaveBeenCalledWith({
      name: 'New Project',
      description: 'Scope the refactor',
    });
    expect(result).toEqual(created);
    expect(store.getState().projects).toEqual([created]);
    expect(store.getState().activeProjectId).toBe('project-9');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      PROJECT_ACTIVE_STORAGE_KEY,
      'project-9',
    );
  });

  test('deletes the active project and clears the persisted selection', async () => {
    const service = createService();
    service.deleteProject.mockResolvedValue(undefined);
    const store = createProjectStore(service);
    store.setState({
      projects: [createProject()],
      activeProjectId: 'project-1',
    });

    await store.getState().deleteProject('project-1');

    expect(service.deleteProject).toHaveBeenCalledWith('project-1');
    expect(store.getState().projects).toEqual([]);
    expect(store.getState().activeProjectId).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(PROJECT_ACTIVE_STORAGE_KEY);
  });

  test('saves instructions into the active project state', async () => {
    const service = createService();
    service.setProjectInstructions.mockResolvedValue(undefined);
    const store = createProjectStore(service);
    store.setState({
      projects: [createProject({ custom_instructions: 'Old' })],
      activeProjectId: 'project-1',
    });

    const result = await store.getState().saveProjectInstructions('Use strict TypeScript');

    expect(result).toBe(true);
    expect(service.setProjectInstructions).toHaveBeenCalledWith(
      'project-1',
      'Use strict TypeScript',
    );
    expect(store.getState().projects[0]?.custom_instructions).toBe('Use strict TypeScript');
    expect(store.getState().error).toBeNull();
  });

  test('captures actionable errors when saving instructions fails', async () => {
    const service = createService();
    service.setProjectInstructions.mockRejectedValue(new Error('Gateway unavailable'));
    const store = createProjectStore(service);
    store.setState({
      projects: [createProject()],
      activeProjectId: 'project-1',
    });

    const result = await store.getState().saveProjectInstructions('Use strict TypeScript');

    expect(result).toBe(false);
    expect(store.getState().error).toBe('Gateway unavailable');
    expect(store.getState().savingInstructions).toBe(false);
  });

  test('loads active project knowledge files and exposes project chat context', async () => {
    const service = createService();
    service.listProjectKnowledgeFiles.mockResolvedValue({
      files: [
        createProjectFile(),
        createProjectFile({
          id: 'file-2',
          filename: 'brief.pdf',
          file_type: 'application/pdf',
          file_size: 2048,
          storage_path: 'storage/project-1/brief.pdf',
        }),
      ],
      total: 2,
    });
    const store = createProjectStore(service);
    store.setState({
      projects: [
        createProject({
          id: 'project-1',
          name: 'Alpha',
          custom_instructions: 'Use strict TypeScript',
        }),
      ],
      activeProjectId: 'project-1',
    });

    await store.getState().loadProjectKnowledgeFiles();

    expect(service.listProjectKnowledgeFiles).toHaveBeenCalledWith('project-1');
    expect(store.getState().getActiveProjectKnowledgeFiles()).toHaveLength(2);
    expect(store.getState().getActiveProjectContext()).toEqual({
      project_id: 'project-1',
      project_name: 'Alpha',
      custom_instructions: 'Use strict TypeScript',
      knowledge_file_ids: ['file-1', 'file-2'],
      knowledge_files: [
        {
          id: 'file-1',
          filename: 'architecture.md',
          file_type: 'text/markdown',
          file_size: 512,
        },
        {
          id: 'file-2',
          filename: 'brief.pdf',
          file_type: 'application/pdf',
          file_size: 2048,
        },
      ],
    });
  });

  test('refresh hydrates knowledge files for the persisted active project', async () => {
    localStorageMock.setItem(PROJECT_ACTIVE_STORAGE_KEY, 'project-1');
    const service = createService();
    service.listProjects.mockResolvedValue({
      projects: [createProject({ id: 'project-1', name: 'Alpha' })],
      total: 1,
    });
    service.listProjectKnowledgeFiles.mockResolvedValue({
      files: [createProjectFile()],
      total: 1,
    });
    const store = createProjectStore(service);

    await store.getState().refresh();

    expect(service.listProjectKnowledgeFiles).toHaveBeenCalledWith('project-1');
    expect(store.getState().getActiveProjectKnowledgeFiles()).toEqual([
      createProjectFile(),
    ]);
  });

  test('selecting a project loads its knowledge files for chat context', async () => {
    const service = createService();
    service.listProjectKnowledgeFiles.mockResolvedValue({
      files: [createProjectFile()],
      total: 1,
    });
    const store = createProjectStore(service);
    store.setState({
      projects: [createProject({ id: 'project-1', name: 'Alpha' })],
      activeProjectId: null,
    });

    store.getState().selectProject('project-1');
    await Promise.resolve();

    expect(service.listProjectKnowledgeFiles).toHaveBeenCalledWith('project-1');
    expect(store.getState().getActiveProjectContext()).toEqual({
      project_id: 'project-1',
      project_name: 'Alpha',
      knowledge_file_ids: ['file-1'],
      knowledge_files: [
        {
          id: 'file-1',
          filename: 'architecture.md',
          file_type: 'text/markdown',
          file_size: 512,
        },
      ],
    });
  });

  test('uploads a knowledge file into the active project state', async () => {
    const uploadedFile = createProjectFile({
      id: 'file-9',
      filename: 'roadmap.txt',
      file_type: 'text/plain',
      file_size: 128,
      storage_path: 'storage/project-1/roadmap.txt',
    });
    const service = createService();
    service.uploadProjectKnowledgeFile.mockResolvedValue(uploadedFile);
    const store = createProjectStore(service);
    store.setState({
      projects: [createProject()],
      activeProjectId: 'project-1',
    });

    const file = new File(['roadmap'], 'roadmap.txt', { type: 'text/plain' });
    const result = await store.getState().uploadProjectKnowledgeFile(file);

    expect(result).toBe(true);
    expect(service.uploadProjectKnowledgeFile).toHaveBeenCalledWith(
      'project-1',
      file,
    );
    expect(store.getState().getActiveProjectKnowledgeFiles()).toEqual([uploadedFile]);
    expect(store.getState().uploadingKnowledgeFile).toBe(false);
  });

  test('captures actionable errors when knowledge upload fails', async () => {
    const service = createService();
    service.uploadProjectKnowledgeFile.mockRejectedValue(new Error('Upload failed'));
    const store = createProjectStore(service);
    store.setState({
      projects: [createProject()],
      activeProjectId: 'project-1',
    });

    const file = new File(['roadmap'], 'roadmap.txt', { type: 'text/plain' });
    const result = await store.getState().uploadProjectKnowledgeFile(file);

    expect(result).toBe(false);
    expect(store.getState().error).toBe('Upload failed');
    expect(store.getState().uploadingKnowledgeFile).toBe(false);
  });

  test('removes a knowledge file from the active project state', async () => {
    const service = createService();
    service.deleteProjectKnowledgeFile.mockResolvedValue(undefined);
    const store = createProjectStore(service);
    store.setState({
      projects: [createProject()],
      activeProjectId: 'project-1',
      knowledgeFilesByProjectId: {
        'project-1': [createProjectFile(), createProjectFile({ id: 'file-2' })],
      },
    });

    const result = await store.getState().deleteProjectKnowledgeFile('file-2');

    expect(result).toBe(true);
    expect(service.deleteProjectKnowledgeFile).toHaveBeenCalledWith(
      'project-1',
      'file-2',
    );
    expect(store.getState().getActiveProjectKnowledgeFiles()).toEqual([
      createProjectFile(),
    ]);
    expect(store.getState().deletingKnowledgeFileId).toBeNull();
  });
});
