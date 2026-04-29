/**
 * FileCreationPanel — Download panel for generated files (#201)
 * Shows file type icon, name, size, and download button for Excel/Word/PDF.
 */
import React from 'react';
import type { ArtifactGeneratedFile } from '../../../types/artifactTypes';

export type GeneratedFile = ArtifactGeneratedFile;

const FILE_ICONS: Record<string, string> = {
  xlsx: '📊', docx: '📝', pdf: '📄', csv: '📋',
};

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileCreationPanelProps {
  files: GeneratedFile[];
}

export const FileCreationPanel: React.FC<FileCreationPanelProps> = ({ files }) => {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2 my-3" data-testid="artifact-generated-files">
      {files.map(file => (
        <div
          key={file.id}
          data-testid={`artifact-generated-file-${file.id}`}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <span className="text-2xl">{FILE_ICONS[file.type] || '📎'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{file.filename}</div>
            {file.size && <div className="text-xs text-gray-400">{formatSize(file.size)}</div>}
          </div>
          <a
            href={file.url}
            download={file.filename}
            data-testid={`artifact-generated-file-download-${file.id}`}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
        </div>
      ))}
    </div>
  );
};
