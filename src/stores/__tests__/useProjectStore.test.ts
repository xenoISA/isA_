import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PROJECT_ACTIVE_STORAGE_KEY, createProjectStore } from '../useProjectStore';

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
});
