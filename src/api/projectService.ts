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

  constructor(baseUrl: string = buildProjectsBaseUrl()) {
    this.coreProjectService = new CoreProjectService(
      baseUrl,
      buildAuthorizedFetch(),
    );
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
}

export const projectService = new ProjectService();
