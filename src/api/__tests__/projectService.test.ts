import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockCoreList,
  mockCoreCreate,
  mockCoreDelete,
  mockCoreSetInstructions,
  mockGetAuthHeaders,
} = vi.hoisted(() => ({
  mockCoreList: vi.fn(),
  mockCoreCreate: vi.fn(),
  mockCoreDelete: vi.fn(),
  mockCoreSetInstructions: vi.fn(),
  mockGetAuthHeaders: vi.fn(),
}));

vi.mock('@isa/core', () => ({
  ProjectService: vi.fn().mockImplementation(() => ({
    list: mockCoreList,
    create: mockCoreCreate,
    delete: mockCoreDelete,
    setInstructions: mockCoreSetInstructions,
  })),
}));

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_CONFIG: {
    BASE_URL: 'http://localhost:9080',
  },
  getAuthHeaders: mockGetAuthHeaders,
}));

import { ProjectService as CoreProjectService } from '@isa/core';
import { ProjectService } from '../projectService';

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    mockGetAuthHeaders.mockReturnValue({ Authorization: 'Bearer test-token' });
  });

  test('initializes the SDK project client with the gateway projects path and auth-aware fetch', async () => {
    new ProjectService();

    expect(CoreProjectService).toHaveBeenCalledWith(
      'http://localhost:9080/api/v1/projects',
      expect.any(Function),
    );

    const authorizedFetch = vi.mocked(CoreProjectService).mock.calls[0]?.[1] as typeof fetch;
    await authorizedFetch('http://localhost:9080/api/v1/projects', {
      method: 'GET',
      headers: { 'X-Test': '1' },
      credentials: 'same-origin',
    });

    expect(fetch).toHaveBeenCalledWith('http://localhost:9080/api/v1/projects', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: 'Bearer test-token',
        'X-Test': '1',
      },
    });
  });

  test('lists projects through the SDK client', async () => {
    const response = {
      projects: [{ id: 'project-1', name: 'Alpha', custom_instructions: 'Use TS' }],
      total: 1,
    };
    mockCoreList.mockResolvedValue(response);
    const service = new ProjectService();

    const result = await service.listProjects();

    expect(mockCoreList).toHaveBeenCalledWith(50, 0);
    expect(result).toEqual(response);
  });

  test('creates a project through the SDK client', async () => {
    const created = { id: 'project-2', name: 'Beta', description: 'Docs' };
    mockCoreCreate.mockResolvedValue(created);
    const service = new ProjectService();

    const result = await service.createProject({ name: 'Beta', description: 'Docs' });

    expect(mockCoreCreate).toHaveBeenCalledWith({ name: 'Beta', description: 'Docs' });
    expect(result).toEqual(created);
  });

  test('deletes a project through the SDK client', async () => {
    mockCoreDelete.mockResolvedValue(undefined);
    const service = new ProjectService();

    await service.deleteProject('project-3');

    expect(mockCoreDelete).toHaveBeenCalledWith('project-3');
  });

  test('saves project instructions through the SDK client', async () => {
    mockCoreSetInstructions.mockResolvedValue(undefined);
    const service = new ProjectService();

    await service.setProjectInstructions('project-4', 'Prefer strict TypeScript');

    expect(mockCoreSetInstructions).toHaveBeenCalledWith(
      'project-4',
      'Prefer strict TypeScript',
    );
  });

  test('lists project knowledge files through the gateway wrapper', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          files: [
            {
              id: 'file-1',
              project_id: 'project-1',
              filename: 'architecture.md',
              file_type: 'text/markdown',
              file_size: 512,
              storage_path: 'storage/project-1/architecture.md',
            },
          ],
          total: 1,
        }),
      }),
    );
    const service = new ProjectService();

    const result = await service.listProjectKnowledgeFiles('project-1');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:9080/api/v1/projects/project-1/files',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }),
    );
    expect(result.total).toBe(1);
    expect(result.files[0]?.filename).toBe('architecture.md');
  });

  test('uploads knowledge files through the gateway wrapper without forcing JSON content type', async () => {
    const uploaded = {
      id: 'file-2',
      project_id: 'project-1',
      filename: 'brief.pdf',
      file_type: 'application/pdf',
      file_size: 1024,
      storage_path: 'storage/project-1/brief.pdf',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => uploaded,
      }),
    );
    const service = new ProjectService();
    const file = new File(['brief'], 'brief.pdf', {
      type: 'application/pdf',
    });

    const result = await service.uploadProjectKnowledgeFile('project-1', file);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, request] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:9080/api/v1/projects/project-1/files',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }),
    );
    expect(request.body).toBeInstanceOf(FormData);
    expect((request.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(result).toEqual(uploaded);
  });

  test('removes knowledge files through the gateway wrapper', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      }),
    );
    const service = new ProjectService();

    await service.deleteProjectKnowledgeFile('project-1', 'file-9');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:9080/api/v1/projects/project-1/files/file-9',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Authorization: 'Bearer test-token',
        },
      }),
    );
  });
});
