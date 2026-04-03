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
import { useUserStore } from '../../stores/useUserStore';
import { getStorageService } from '../../api/storageService';
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
  templateParams?: { template_id: string; prompt_args: Record<string, any> };
  [key: string]: any;
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
const digitalHubWidgetConfig = createWidgetConfig<DigitalHubWidgetParams, DigitalHubWidgetResult>({
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
  extractParamsFromInput: (input: string): DigitalHubWidgetParams | null => {
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
      onClick: async (content) => {
        try {
          const fileId = typeof content === 'object' ? content?.id || content?.file_id : content;
          const userId = useUserStore.getState().externalUser?.auth0_id || '';
          if (!fileId || !userId) {
            log.warn('Cannot download: missing fileId or userId');
            return;
          }
          const storageService = getStorageService();
          const downloadUrl = await storageService.getDownloadUrl(fileId, userId);
          window.open(downloadUrl, '_blank');
          log.info('File download initiated', { fileId });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('File download failed', { error: msg });
        }
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
      onClick: async (content) => {
        try {
          const fileId = typeof content === 'object' ? content?.id || content?.file_id : content;
          const userId = useUserStore.getState().externalUser?.auth0_id || '';
          if (!fileId || !userId) {
            log.warn('Cannot share: missing fileId or userId');
            return;
          }
          const storageService = getStorageService();
          const shareResult = await storageService.shareFile({
            file_id: fileId,
            shared_by: userId,
            permissions: { view: true, download: true, delete: false },
            expires_hours: 24,
          });
          if (shareResult.share_url) {
            await navigator.clipboard.writeText(shareResult.share_url);
            log.info('Share link copied to clipboard', { shareId: shareResult.share_id });
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('File sharing failed', { error: msg });
        }
      }
    }
  ],

  managementActions: [
    {
      id: 'upload_files',
      label: 'Upload',
      icon: '📤',
      onClick: () => {
        // Trigger hidden file input for upload
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = async (e) => {
          const target = e.target as HTMLInputElement;
          const files = target.files;
          if (!files || files.length === 0) return;
          const userId = useUserStore.getState().externalUser?.auth0_id || '';
          if (!userId) {
            log.warn('Cannot upload: user not authenticated');
            return;
          }
          try {
            const storageService = getStorageService();
            const uploadPromises = Array.from(files).map(file =>
              storageService.uploadFile(file, {
                user_id: userId,
                access_level: 'private',
                tags: [],
              } as any)
            );
            const results = await Promise.all(uploadPromises);
            log.info('Files uploaded successfully', { count: results.length });
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            log.error('File upload failed', { error: msg });
          }
        };
        input.click();
        log.info('Opening file upload dialog');
      },
      variant: 'primary' as const,
      disabled: false
    },
    {
      id: 'browse_files',
      label: 'Browse',
      icon: '📁',
      onClick: async () => {
        // List files at root path via StorageService
        const userId = useUserStore.getState().externalUser?.auth0_id || '';
        if (!userId) {
          log.warn('Cannot browse: user not authenticated');
          return;
        }
        try {
          const storageService = getStorageService();
          const files = await storageService.listFiles({
            user_id: userId,
            prefix: '/',
            limit: 50,
          });
          log.info('Files listed for browse', { count: files.length });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error('File browse failed', { error: msg });
        }
      },
      disabled: false
    },
    {
      id: 'search_files',
      label: 'Search',
      icon: '🔍',
      onClick: () => {
        // Focus the widget search input if available
        const searchInput = document.querySelector<HTMLInputElement>('[data-digitalhub-search]');
        if (searchInput) {
          searchInput.focus();
        }
        log.info('Activating file search');
      },
      disabled: false
    },
    {
      id: 'manage_tags',
      label: 'Tags',
      icon: '🏷️',
      onClick: () => {
        // Requires StorageService backend tag management endpoints
        log.info('Tag management not yet available');
      },
      disabled: true
    }
  ]
});

/**
 * DigitalHub Widget Module - Uses BaseWidgetModule with DigitalHub-specific configuration
 *
 * Provides file organization, browsing, searching, and upload capabilities.
 * Uses StorageService for backend file operations.
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

              const userId = useUserStore.getState().externalUser?.auth0_id || '';

              try {
                const storageService = getStorageService();
                const uploadResults = await Promise.all(
                  uploadFiles.map(file =>
                    storageService.uploadFile(file, {
                      user_id: userId,
                      access_level: 'private',
                      tags: [],
                    } as any)
                  )
                );

                log.info('Files uploaded via StorageService', { count: uploadResults.length });

                // Refresh file listing after upload
                const updatedFiles = await storageService.listFiles({
                  user_id: userId,
                  prefix: currentPath,
                  limit: 50,
                });
                setFiles(updatedFiles.map((f: any) => ({
                  id: f.file_id || f.id,
                  name: f.file_name || f.name,
                  type: f.file_type || 'file',
                  size: f.file_size || 0,
                  path: f.file_path || currentPath,
                  mimeType: f.mime_type,
                  createdAt: f.created_at || new Date().toISOString(),
                  updatedAt: f.updated_at || new Date().toISOString(),
                  tags: f.tags || [],
                })));
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                log.error('Upload via StorageService failed', { error: msg });
              }

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

              await moduleProps.startProcessing(enrichedParams);
            },
            onListFiles: async (path: string = '/') => {
              log.info('Listing files', { path });

              setCurrentPath(path);
              const userId = useUserStore.getState().externalUser?.auth0_id || '';

              try {
                const storageService = getStorageService();
                const listedFiles = await storageService.listFiles({
                  user_id: userId,
                  prefix: path,
                  limit: 50,
                });
                setFiles(listedFiles.map((f: any) => ({
                  id: f.file_id || f.id,
                  name: f.file_name || f.name,
                  type: f.file_type || 'file',
                  size: f.file_size || 0,
                  path: f.file_path || path,
                  mimeType: f.mime_type,
                  createdAt: f.created_at || new Date().toISOString(),
                  updatedAt: f.updated_at || new Date().toISOString(),
                  tags: f.tags || [],
                })));
                log.info('Files listed via StorageService', { count: listedFiles.length });
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                log.error('List files via StorageService failed', { error: msg });
              }

              const templateParams = prepareDigitalHubTemplateParams({
                action: 'list',
                path
              });

              const enrichedParams = {
                action: 'list' as const,
                path,
                templateParams
              };

              await moduleProps.startProcessing(enrichedParams);
            },
            onSearchFiles: async (query: string) => {
              log.info('Searching files', { query });

              const { recordWidgetUsage } = useAppStore.getState();
              recordWidgetUsage('digitalhub');

              const userId = useUserStore.getState().externalUser?.auth0_id || '';

              try {
                const storageService = getStorageService();
                const searchResponse = await storageService.semanticSearch({
                  user_id: userId,
                  query,
                  top_k: 20,
                });
                const results = (searchResponse.results || []).map((r: any) => ({
                  file: {
                    id: r.file_id || r.id,
                    name: r.file_name || r.name,
                    type: r.file_type || 'file',
                    size: r.file_size || 0,
                    path: r.file_path || currentPath,
                    mimeType: r.mime_type,
                    createdAt: r.created_at || new Date().toISOString(),
                    updatedAt: r.updated_at || new Date().toISOString(),
                    tags: r.tags || [],
                  },
                  relevanceScore: r.score || 0,
                  matchedField: r.content_snippet || 'name',
                }));
                setSearchResults(results);
                setFiles(results.map((r: any) => r.file));
                log.info('Search completed via StorageService', { count: results.length });
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                log.error('Search via StorageService failed', { error: msg });
              }

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
