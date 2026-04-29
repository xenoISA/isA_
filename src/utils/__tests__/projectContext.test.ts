import { describe, expect, test } from 'vitest';

import {
  buildProjectChatContext,
  buildProjectSessionMetadata,
  mergeProjectPromptArgs,
} from '../projectContext';

describe('projectContext helpers', () => {
  test('builds a compact project chat context from project metadata and knowledge files', () => {
    const context = buildProjectChatContext(
      {
        id: 'project-1',
        name: 'Alpha',
        custom_instructions: 'Use strict TypeScript',
      },
      [
        {
          id: 'file-1',
          project_id: 'project-1',
          filename: 'architecture.md',
          file_type: 'text/markdown',
          file_size: 512,
          storage_path: 'storage/project-1/architecture.md',
        },
      ],
    );

    expect(context).toEqual({
      project_id: 'project-1',
      project_name: 'Alpha',
      custom_instructions: 'Use strict TypeScript',
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

  test('merges project context into prompt args without dropping existing values', () => {
    const promptArgs = mergeProjectPromptArgs(
      { template_id: 'knowledge_prompt', depth: 'high' },
      {
        project_id: 'project-1',
        project_name: 'Alpha',
        knowledge_file_ids: ['file-1'],
        knowledge_files: [],
      },
    );

    expect(promptArgs).toEqual({
      template_id: 'knowledge_prompt',
      depth: 'high',
      project_context: {
        project_id: 'project-1',
        project_name: 'Alpha',
        knowledge_file_ids: ['file-1'],
        knowledge_files: [],
      },
    });
  });

  test('adds project metadata to new session metadata', () => {
    const metadata = buildProjectSessionMetadata(
      { title: 'New Chat' },
      {
        project_id: 'project-1',
        project_name: 'Alpha',
        custom_instructions: 'Use strict TypeScript',
        knowledge_file_ids: ['file-1'],
        knowledge_files: [],
      },
    );

    expect(metadata).toEqual({
      title: 'New Chat',
      project_id: 'project-1',
      project_name: 'Alpha',
      custom_instructions: 'Use strict TypeScript',
      knowledge_file_ids: ['file-1'],
      project_context: {
        project_id: 'project-1',
        project_name: 'Alpha',
        custom_instructions: 'Use strict TypeScript',
        knowledge_file_ids: ['file-1'],
        knowledge_files: [],
      },
    });
  });
});
