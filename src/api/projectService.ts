import { ProjectService as CoreProjectService } from '@isa/core';
import { GATEWAY_CONFIG, getAuthHeaders } from '../config/gatewayConfig';

export interface Project {
  id: string;
  name: string;
  description?: string;
  custom_instructions?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
  custom_instructions?: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  file_type?: string;
  file_size?: number;
  storage_path: string;
  created_at?: string;
}

export interface ProjectFileListResponse {
  files: ProjectFile[];
  total: number;
}

const buildProjectsBaseUrl = () =>
  `${GATEWAY_CONFIG.BASE_URL.replace(/\/$/, '')}/api/v1/projects`;

const buildAuthorizedFetch = (): typeof fetch => {
  return (input, init) =>
    fetch(input, {
      ...init,
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        ...(init?.headers ?? {}),
      },
    });
};

export const getProjectErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong while saving the project.',
): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

export class ProjectService {
  private coreProjectService: CoreProjectService;
  private baseUrl: string;
  private authorizedFetch: typeof fetch;

  constructor(baseUrl: string = buildProjectsBaseUrl()) {
    this.baseUrl = baseUrl;
    this.authorizedFetch = buildAuthorizedFetch();
    this.coreProjectService = new CoreProjectService(
      baseUrl,
      this.authorizedFetch,
    );
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.authorizedFetch(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      let detail = response.statusText;

      try {
        const body = await response.json();
        detail = body?.detail ?? body?.error ?? detail;
      } catch {
        // response may not be JSON
      }

      throw new Error(detail || 'Project request failed');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async listProjects(limit = 50, offset = 0): Promise<ProjectListResponse> {
    return this.coreProjectService.list(limit, offset) as Promise<ProjectListResponse>;
  }

  async createProject(params: CreateProjectParams): Promise<Project> {
    return this.coreProjectService.create(params) as Promise<Project>;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.coreProjectService.delete(projectId);
  }

  async setProjectInstructions(projectId: string, instructions: string): Promise<void> {
    await this.coreProjectService.setInstructions(projectId, instructions);
  }

  async listProjectKnowledgeFiles(projectId: string): Promise<ProjectFileListResponse> {
    return this.request<ProjectFileListResponse>(`/${projectId}/files`, {
      method: 'GET',
    });
  }

  async uploadProjectKnowledgeFile(projectId: string, file: File): Promise<ProjectFile> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<ProjectFile>(`/${projectId}/files`, {
      method: 'POST',
      body: formData,
    });
  }

  async deleteProjectKnowledgeFile(projectId: string, fileId: string): Promise<void> {
    await this.request<void>(`/${projectId}/files/${fileId}`, {
      method: 'DELETE',
    });
  }
}

export const projectService = new ProjectService();
