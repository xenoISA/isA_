/**
 * ============================================================================
 * DigitalHub Widget Module (DigitalHubWidgetModule.tsx) - Refactored with BaseWidgetModule
 * ============================================================================
 *
 * Core Responsibilities:
 * - Uses BaseWidgetModule for standardized widget management
 * - Provides DigitalHub-specific configuration and customizations
 * - Manages file organization, browsing, and search business logic
 * - Integrates seamlessly with BaseWidget UI components
 *
 * Benefits of BaseWidgetModule integration:
 * - Automatic output history management for file operations
 * - Built-in edit and management actions
 * - Streaming status display
 * - Standard error handling and logging
 * - Consistent UI patterns across all widgets
 */
import React, { ReactNode } from 'react';
import { BaseWidgetModule, createWidgetConfig } from './BaseWidgetModule';
import { EditAction, ManagementAction } from '../../components/ui/widgets/BaseWidget';
import { useAppStore } from '../../stores/useAppStore';
import { createLogger } from '../../utils/logger';
const log = createLogger('DigitalHubWidget');

// DigitalHub file entry interface
interface DigitalHubFile {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'image' | 'document' | 'archive';
  size: number;
  path: string;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

// DigitalHub search result interface
interface DigitalHubSearchResult {
  file: DigitalHubFile;
  relevanceScore: number;
  matchedField: string;
}

// DigitalHub widget parameters
interface DigitalHubWidgetParams {
  action?: 'upload' | 'list' | 'search' | 'organize' | 'delete';
  query?: string;
  path?: string;
  files?: File[];
  tags?: string[];
  sortBy?: 'name' | 'date' | 'size' | 'type';
  sortOrder?: 'asc' | 'desc';
}

// DigitalHub widget result
interface DigitalHubWidgetResult {
  files: DigitalHubFile[];
  searchResults?: DigitalHubSearchResult[];
  totalCount: number;
  currentPath: string;
}

interface DigitalHubWidgetModuleProps {
  triggeredInput?: string;
  onOperationCompleted?: (result: DigitalHubWidgetResult) => void;
  children: ReactNode;
}

/**
 * DigitalHub Widget Module - Template mapping and configuration for file organization
 *
 * Actions:
 * - upload: Upload files to storage
 * - list: Browse and list files in a directory
 * - search: Search files by name, content, or tags
 * - organize: Tag, move, or categorize files
 * - delete: Remove files from storage
 */

// DigitalHub action to MCP template mapping
// TODO: Map to actual MCP prompt templates when StorageService is integrated
const DIGITALHUB_TEMPLATE_MAPPING = {
  'upload': {
    template_id: 'storage_upload_prompt',
  },
  'list': {
    template_id: 'storage_list_prompt',
  },
  'search': {
    template_id: 'storage_search_prompt',
  },
  'organize': {
    template_id: 'storage_organize_prompt',
  },
  'delete': {
    template_id: 'storage_delete_prompt',
  }
};

// DigitalHub-specific template parameter preparation
const prepareDigitalHubTemplateParams = (params: DigitalHubWidgetParams) => {
  const { action = 'list', query, path = '/', tags, sortBy = 'date', sortOrder = 'desc' } = params;

  const mapping = DIGITALHUB_TEMPLATE_MAPPING[action] || DIGITALHUB_TEMPLATE_MAPPING['list'];

  let prompt_args: Record<string, any>;

  switch (action) {
    case 'upload':
      prompt_args = {
        action: 'upload',
        path: path,
        file_count: params.files?.length || 0,
        tags: tags || []
      };
      break;

    case 'search':
      prompt_args = {
        query: query || '',
        path: path,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      break;

    case 'organize':
      prompt_args = {
        action: 'organize',
        path: path,
        tags: tags || [],
        query: query || ''
      };
      break;

    case 'delete':
      prompt_args = {
        action: 'delete',
        path: path
      };
      break;

    case 'list':
    default:
      prompt_args = {
        path: path,
        sort_by: sortBy,
        sort_order: sortOrder
      };
  }

  log.debug('Prepared template params for action', {
    action,
    template_id: mapping.template_id,
    prompt_args
  });

  return {
    template_id: mapping.template_id,
    prompt_args
  };
};

// DigitalHub widget configuration
const digitalHubWidgetConfig = createWidgetConfig({
  type: 'digitalhub',
  title: 'DigitalHub File Manager',
  icon: '📂',
  sessionIdPrefix: 'digitalhub_widget',
  maxHistoryItems: 20,

  // Result extraction configuration
  resultExtractor: {
    outputType: 'data',
    extractResult: (widgetData: any) => {
      if (widgetData?.files && widgetData.files.length > 0) {
        return {
          finalResult: {
            files: widgetData.files,
            totalCount: widgetData.files.length,
            currentPath: widgetData.currentPath || '/'
          },
          outputContent: `${widgetData.files.length} file(s) found`,
          title: 'File Operation Complete'
        };
      }
      return null;
    }
  },

  // Extract parameters from triggered input
  extractParamsFromInput: (input: string) => {
    const lowerInput = input.toLowerCase();

    // Determine action based on keywords
    let action: 'upload' | 'list' | 'search' | 'organize' | 'delete' = 'search';

    if (lowerInput.includes('upload') || lowerInput.includes('add file')) {
      action = 'upload';
    } else if (lowerInput.includes('list') || lowerInput.includes('browse') || lowerInput.includes('show files')) {
      action = 'list';
    } else if (lowerInput.includes('organize') || lowerInput.includes('tag') || lowerInput.includes('categorize')) {
      action = 'organize';
    } else if (lowerInput.includes('delete') || lowerInput.includes('remove')) {
      action = 'delete';
    }

    return {
      action,
      query: input.trim(),
      path: '/'
    };
  },

  editActions: [
    {
      id: 'download_file',
      label: 'Download',
      icon: '💾',
      onClick: (content) => {
        // TODO: Integrate with StorageService for file download
        log.info('Downloading file', { content });
      }
    },
    {
      id: 'copy_path',
      label: 'Copy Path',
      icon: '📋',
      onClick: (content) => {
        const path = typeof content === 'object' ? content?.path : content;
        if (path) {
          navigator.clipboard.writeText(path);
          log.info('File path copied to clipboard');
        }
      }
    },
    {
      id: 'share_file',
      label: 'Share',
      icon: '🔗',
      onClick: (content) => {
        // TODO: Generate sharing link via StorageService
        log.info('Sharing file');
      }
    }
  ],

  managementActions: [
    {
      id: 'upload_files',
      label: 'Upload',
      icon: '📤',
      onClick: () => {
        // TODO: Open file upload dialog
        log.info('Opening file upload dialog');
      },
      variant: 'primary' as const,
      disabled: false
    },
    {
      id: 'browse_files',
      label: 'Browse',
      icon: '📁',
      onClick: () => {
        // TODO: Open file browser
        log.info('Opening file browser');
      },
      disabled: false
    },
    {
      id: 'search_files',
      label: 'Search',
      icon: '🔍',
      onClick: () => {
        // TODO: Focus search input
        log.info('Activating file search');
      },
      disabled: false
    },
    {
      id: 'manage_tags',
      label: 'Tags',
      icon: '🏷️',
      onClick: () => {
        // TODO: Open tag management
        log.info('Opening tag management');
      },
      disabled: true
    }
  ]
});

/**
 * DigitalHub Widget Module - Uses BaseWidgetModule with DigitalHub-specific configuration
 *
 * Provides file organization, browsing, searching, and upload capabilities.
 * Uses StorageService for backend file operations (TODO: integrate).
 */
export const DigitalHubWidgetModule: React.FC<DigitalHubWidgetModuleProps> = ({
  triggeredInput,
  onOperationCompleted,
  children
}) => {
  // Local state for file browser
  const [currentPath, setCurrentPath] = React.useState('/');
  const [files, setFiles] = React.useState<DigitalHubFile[]>([]);
  const [searchResults, setSearchResults] = React.useState<DigitalHubSearchResult[]>([]);

  // Convert files to outputHistory format for BaseWidget display
  const outputHistory = React.useMemo(() => {
    if (files.length === 0) {
      return [];
    }

    return [{
      id: `digitalhub_result_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'data',
      title: `Files in ${currentPath}`,
      content: `${files.length} file(s) found`,
      metadata: {
        fileCount: files.length,
        currentPath,
        fileTypes: [...new Set(files.map(f => f.type))]
      }
    }];
  }, [files, currentPath]);

  log.debug('Converting files to output history', {
    fileCount: files.length,
    outputHistoryCount: outputHistory.length
  });

  return (
    <BaseWidgetModule
      config={digitalHubWidgetConfig}
      triggeredInput={triggeredInput}
      onResultGenerated={onOperationCompleted}
    >
      {(moduleProps) => {
        // Pass state to DigitalHub widget via props with template support
        if (React.isValidElement(children)) {
          return React.cloneElement(children, {
            ...children.props,
            // DigitalHub state
            files,
            currentPath,
            searchResults,
            isProcessing: moduleProps.isProcessing,
            // DigitalHub actions
            onUploadFiles: async (uploadFiles: File[]) => {
              log.info('Uploading files', { count: uploadFiles.length });

              const { recordWidgetUsage } = useAppStore.getState();
              recordWidgetUsage('digitalhub');

              const templateParams = prepareDigitalHubTemplateParams({
                action: 'upload',
                files: uploadFiles,
                path: currentPath
              });

              const enrichedParams = {
                action: 'upload' as const,
                path: currentPath,
                files: uploadFiles,
                templateParams
              };

              // TODO: Integrate with StorageService for actual upload
              log.debug('Sending enriched upload params to store', enrichedParams);
              await moduleProps.startProcessing(enrichedParams);
            },
            onListFiles: async (path: string = '/') => {
              log.info('Listing files', { path });

              setCurrentPath(path);

              const templateParams = prepareDigitalHubTemplateParams({
                action: 'list',
                path
              });

              const enrichedParams = {
                action: 'list' as const,
                path,
                templateParams
              };

              // TODO: Integrate with StorageService for file listing
              await moduleProps.startProcessing(enrichedParams);
            },
            onSearchFiles: async (query: string) => {
              log.info('Searching files', { query });

              const { recordWidgetUsage } = useAppStore.getState();
              recordWidgetUsage('digitalhub');

              const templateParams = prepareDigitalHubTemplateParams({
                action: 'search',
                query,
                path: currentPath
              });

              const enrichedParams = {
                action: 'search' as const,
                query,
                path: currentPath,
                templateParams
              };

              // TODO: Integrate with StorageService for file search
              await moduleProps.startProcessing(enrichedParams);
            },
            onNavigate: (path: string) => {
              setCurrentPath(path);
              log.info('Navigated to path', { path });
            },
            onClearResults: () => {
              log.info('Clearing results');
              setFiles([]);
              setSearchResults([]);
              moduleProps.onClearHistory();
            },
            // BaseWidget state with converted data
            outputHistory: outputHistory,
            currentOutput: moduleProps.currentOutput,
            isStreaming: moduleProps.isStreaming,
            streamingContent: moduleProps.streamingContent,
            onSelectOutput: moduleProps.onSelectOutput,
            onClearHistory: moduleProps.onClearHistory
          });
        }
        return children;
      }}
    </BaseWidgetModule>
  );
};

// Export the config for potential reuse
export { digitalHubWidgetConfig };
