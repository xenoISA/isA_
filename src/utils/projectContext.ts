import type { Project, ProjectFile } from '../api/projectService';

export interface ProjectChatContext {
  project_id: string;
  project_name: string;
  custom_instructions?: string;
  knowledge_file_ids: string[];
  knowledge_files: Array<{
    id: string;
    filename: string;
    file_type?: string;
    file_size?: number;
  }>;
}

export const buildProjectChatContext = (
  project: Project | null,
  knowledgeFiles: ProjectFile[],
): ProjectChatContext | null => {
  if (!project) {
    return null;
  }

  const normalizedInstructions = project.custom_instructions?.trim();

  return {
    project_id: project.id,
    project_name: project.name,
    ...(normalizedInstructions
      ? { custom_instructions: normalizedInstructions }
      : {}),
    knowledge_file_ids: knowledgeFiles.map(file => file.id),
    knowledge_files: knowledgeFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      file_type: file.file_type,
      file_size: file.file_size,
    })),
  };
};

export const mergeProjectPromptArgs = (
  promptArgs: Record<string, unknown> | undefined,
  projectContext: ProjectChatContext | null,
): Record<string, unknown> => {
  if (!projectContext) {
    return promptArgs ?? {};
  }

  return {
    ...(promptArgs ?? {}),
    project_context: projectContext,
  };
};

export const buildProjectSessionMetadata = (
  metadata: Record<string, unknown> | undefined,
  projectContext: ProjectChatContext | null,
): Record<string, unknown> => {
  if (!projectContext) {
    return metadata ?? {};
  }

  return {
    ...(metadata ?? {}),
    project_id: projectContext.project_id,
    project_name: projectContext.project_name,
    ...(projectContext.custom_instructions
      ? { custom_instructions: projectContext.custom_instructions }
      : {}),
    knowledge_file_ids: projectContext.knowledge_file_ids,
    project_context: projectContext,
  };
};
