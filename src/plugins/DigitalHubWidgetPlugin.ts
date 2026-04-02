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

      // TODO: Integrate with StorageService for actual file operations
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
   * Perform file operation - placeholder for StorageService integration
   * TODO: Replace with actual StorageService calls
   */
  private async performFileOperation(query: string, options: any = {}): Promise<any> {
    // TODO: Integrate with StorageService for real file operations
    // For now, return a scaffold response
    log.info('Performing file operation (scaffold)', { query, options });

    return {
      action: 'search',
      query,
      files: [],
      totalCount: 0,
      currentPath: '/',
      message: 'DigitalHub file operation scaffold - TODO: integrate with StorageService'
    };
  }
}

// ============================================================================
// Default Export
// ============================================================================

// Create plugin instance
export const digitalHubWidgetPlugin = new DigitalHubWidgetPlugin();

export default digitalHubWidgetPlugin;
