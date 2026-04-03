/**
 * ============================================================================
 * DigitalHub Widget Plugin (DigitalHubWidgetPlugin.ts) - DigitalHub Widget Plugin Adapter
 * ============================================================================
 *
 * Core Responsibilities:
 * - Adapts the DigitalHub Widget Store to the plugin interface
 * - Provides unified plugin execution entry point
 * - Maintains compatibility with existing code
 *
 * Design Principles:
 * - Minimal invasiveness, reuse existing logic
 * - Standardized plugin interface implementation
 * - Consistent error handling
 */

import { WidgetPlugin, PluginInput, PluginOutput } from '../types/pluginTypes';
import { AppId } from '../types/appTypes';
import { logger, LogCategory, createLogger } from '../utils/logger';
import { getStorageService } from '../api/storageService';

const log = createLogger('DigitalHubWidgetPlugin', LogCategory.ARTIFACT_CREATION);

/**
 * DigitalHub Widget Plugin Implementation
 */
export class DigitalHubWidgetPlugin implements WidgetPlugin {
  // Plugin basic info
  id: AppId = 'digitalhub';
  name = 'DigitalHub';
  icon = '📂';
  description = 'File organization, browsing, searching, and storage management';
  version = '1.0.0';
  skillLabel = 'File Management';
  conversationalTriggerPrefix = 'Let me find those files...';
  triggers = [
    'upload file',
    'list files',
    'search files',
    'file manager',
    'organize files',
    'browse files',
    'storage',
    'digital hub'
  ];

  // Plugin configuration
  config = {
    maxPromptLength: 500,
    timeout: 30000, // 30 seconds for file operations
    retryAttempts: 2
  };

  constructor() {
    logger.debug(LogCategory.SYSTEM, '📂 DigitalHubWidgetPlugin initialized');
  }

  // ============================================================================
  // Plugin Lifecycle
  // ============================================================================

  async onInit(): Promise<void> {
    logger.debug(LogCategory.SYSTEM, 'DigitalHubWidgetPlugin: Initializing...');
  }

  onDestroy(): void {
    logger.info(LogCategory.SYSTEM, '📂 DigitalHubWidgetPlugin: Destroying...');
  }

  // ============================================================================
  // Core Execution Method
  // ============================================================================

  /**
   * Execute file operation
   */
  async execute(input: PluginInput): Promise<PluginOutput> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateInput(input);

      logger.info(LogCategory.ARTIFACT_CREATION, '📂 DigitalHub Plugin: Starting file operation', {
        prompt: input.prompt?.substring(0, 100) + '...',
        context: input.context
      });

      const operationResult = await this.performFileOperation(input.prompt, {
        ...input.options,
        sessionId: input.context?.sessionId,
        userId: input.context?.userId
      });

      // Build plugin output
      const output: PluginOutput = {
        id: `digitalhub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'data',
        content: operationResult,
        metadata: {
          processingTime: Date.now() - startTime,
          version: 1,
          prompt: input.prompt,
          generatedAt: new Date().toISOString(),
          pluginVersion: this.version
        }
      };

      logger.info(LogCategory.ARTIFACT_CREATION, '📂 DigitalHub Plugin: Operation completed', {
        outputId: output.id,
        processingTime: output.metadata?.processingTime,
        resultType: typeof operationResult
      });

      return output;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(LogCategory.ARTIFACT_CREATION, '📂 DigitalHub Plugin: Operation failed', {
        error: errorMessage,
        prompt: input.prompt,
        processingTime: Date.now() - startTime
      });

      throw new Error(`DigitalHub operation failed: ${errorMessage}`);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Validate input parameters
   */
  private validateInput(input: PluginInput): void {
    if (!input.prompt || typeof input.prompt !== 'string') {
      throw new Error('File operation query is required and must be a string');
    }

    if (input.prompt.trim().length === 0) {
      throw new Error('File operation query cannot be empty');
    }

    if (input.prompt.length > this.config.maxPromptLength) {
      throw new Error(`File operation query too long. Max length: ${this.config.maxPromptLength} characters`);
    }
  }

  /**
   * Perform file operation via StorageService
   */
  private async performFileOperation(query: string, options: any = {}): Promise<any> {
    log.info('Performing file operation via StorageService', { query, options });

    const storageService = getStorageService();
    const userId = options.userId || 'anonymous';
    const action = this.detectAction(query);

    try {
      switch (action) {
        case 'list': {
          const files = await storageService.listFiles({
            user_id: userId,
            prefix: options.path || '/',
            limit: options.limit || 50,
            offset: options.offset || 0,
          });
          return {
            action: 'list',
            query,
            files,
            totalCount: files.length,
            currentPath: options.path || '/',
          };
        }

        case 'search': {
          const searchResults = await storageService.semanticSearch({
            user_id: userId,
            query,
            top_k: options.limit || 10,
          });
          return {
            action: 'search',
            query,
            files: searchResults.results || [],
            totalCount: searchResults.total_results || 0,
            currentPath: options.path || '/',
          };
        }

        case 'upload': {
          // Upload requires files to be provided in options
          if (!options.files || options.files.length === 0) {
            return {
              action: 'upload',
              query,
              files: [],
              totalCount: 0,
              currentPath: options.path || '/',
              message: 'No files provided for upload',
            };
          }
          const uploadResults = await Promise.all(
            options.files.map((file: File) =>
              storageService.uploadFile(file, {
                user_id: userId,
                access_level: 'private',
                tags: options.tags || [],
              } as any)
            )
          );
          return {
            action: 'upload',
            query,
            files: uploadResults,
            totalCount: uploadResults.length,
            currentPath: options.path || '/',
          };
        }

        case 'delete': {
          if (!options.fileId) {
            return {
              action: 'delete',
              query,
              files: [],
              totalCount: 0,
              currentPath: options.path || '/',
              message: 'No file ID provided for deletion',
            };
          }
          const deleteResult = await storageService.deleteFile(options.fileId, userId);
          return {
            action: 'delete',
            query,
            files: [],
            totalCount: 0,
            currentPath: options.path || '/',
            message: deleteResult.message || 'File deleted successfully',
          };
        }

        default:
          // Default to listing files
          const defaultFiles = await storageService.listFiles({
            user_id: userId,
            limit: 50,
          });
          return {
            action: 'list',
            query,
            files: defaultFiles,
            totalCount: defaultFiles.length,
            currentPath: '/',
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('StorageService operation failed', { action, error: errorMessage });
      throw new Error(`StorageService ${action} failed: ${errorMessage}`);
    }
  }

  /**
   * Detect the intended file action from a natural-language query
   */
  private detectAction(query: string): 'upload' | 'list' | 'search' | 'delete' {
    const lower = query.toLowerCase();
    if (lower.includes('upload') || lower.includes('add file')) return 'upload';
    if (lower.includes('delete') || lower.includes('remove')) return 'delete';
    if (lower.includes('list') || lower.includes('browse') || lower.includes('show files')) return 'list';
    return 'search';
  }
}

// ============================================================================
// Default Export
// ============================================================================

// Create plugin instance
export const digitalHubWidgetPlugin = new DigitalHubWidgetPlugin();

export default digitalHubWidgetPlugin;
