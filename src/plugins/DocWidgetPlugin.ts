/**
 * ============================================================================
 * Doc Widget Plugin (DocWidgetPlugin.ts) - Doc Widget Plugin Adapter
 * ============================================================================
 *
 * Core Responsibilities:
 * - Adapts the Doc Widget Store to the plugin interface
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
import { getDocumentService } from '../api/documentService';
import type { CreateDocumentRequest, ExportFormat } from '../types/documentTypes';

const log = createLogger('DocWidgetPlugin', LogCategory.ARTIFACT_CREATION);

/**
 * Doc Widget Plugin Implementation
 */
export class DocWidgetPlugin implements WidgetPlugin {
  // Plugin basic info
  id: AppId = 'doc';
  name = 'Document Studio';
  icon = '📝';
  description = 'Create, edit, and export documents with AI assistance';
  version = '1.0.0';
  skillLabel = 'Document Studio';
  conversationalTriggerPrefix = 'Let me draft that document...';
  triggers = [
    'create document',
    'write document',
    'edit document',
    'export document',
    'export pdf',
    'export docx',
    'document',
    'write report',
    'draft letter',
    'meeting notes'
  ];

  // Plugin configuration
  config = {
    maxPromptLength: 2000,
    timeout: 60000, // 60 seconds for document generation
    retryAttempts: 2
  };

  constructor() {
    logger.debug(LogCategory.SYSTEM, '📝 DocWidgetPlugin initialized');
  }

  // ============================================================================
  // Plugin Lifecycle
  // ============================================================================

  async onInit(): Promise<void> {
    logger.debug(LogCategory.SYSTEM, 'DocWidgetPlugin: Initializing...');
  }

  onDestroy(): void {
    logger.info(LogCategory.SYSTEM, '📝 DocWidgetPlugin: Destroying...');
  }

  // ============================================================================
  // Core Execution Method
  // ============================================================================

  /**
   * Execute document operation
   */
  async execute(input: PluginInput): Promise<PluginOutput> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateInput(input);

      logger.info(LogCategory.ARTIFACT_CREATION, '📝 Doc Plugin: Starting document operation', {
        prompt: input.prompt?.substring(0, 100) + '...',
        context: input.context
      });

      const docResult = await this.performDocumentOperation(input.prompt, {
        ...input.options,
        sessionId: input.context?.sessionId,
        userId: input.context?.userId
      });

      // Build plugin output
      const output: PluginOutput = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'text',
        content: docResult,
        metadata: {
          processingTime: Date.now() - startTime,
          version: 1,
          prompt: input.prompt,
          generatedAt: new Date().toISOString(),
          pluginVersion: this.version
        }
      };

      logger.info(LogCategory.ARTIFACT_CREATION, '📝 Doc Plugin: Operation completed', {
        outputId: output.id,
        processingTime: output.metadata?.processingTime,
        resultType: typeof docResult
      });

      return output;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(LogCategory.ARTIFACT_CREATION, '📝 Doc Plugin: Operation failed', {
        error: errorMessage,
        prompt: input.prompt,
        processingTime: Date.now() - startTime
      });

      throw new Error(`Document operation failed: ${errorMessage}`);
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
      throw new Error('Document prompt is required and must be a string');
    }

    if (input.prompt.trim().length === 0) {
      throw new Error('Document prompt cannot be empty');
    }

    if (input.prompt.length > this.config.maxPromptLength) {
      throw new Error(`Document prompt too long. Max length: ${this.config.maxPromptLength} characters`);
    }
  }

  /**
   * Perform document operation via document processing service.
   *
   * Routes to the appropriate DocumentService method based on the action.
   * Falls back to a local-only response when the document processing backend
   * is unreachable so the UI remains functional during development.
   */
  private async performDocumentOperation(prompt: string, options: any = {}): Promise<any> {
    const action: string = options.action || 'create';
    const documentService = getDocumentService();

    log.info('Performing document operation', { action, prompt: prompt.substring(0, 80) });

    try {
      switch (action) {
        case 'create': {
          const request: CreateDocumentRequest = {
            title: options.title || 'Untitled Document',
            content: prompt,
            format: options.format || 'markdown',
            templateId: options.templateId,
            templateType: options.templateType,
            prompt,
            tags: options.tags || [],
          };
          const document = await documentService.createDocument(request);
          return { action, document };
        }

        case 'edit': {
          if (!options.documentId) {
            throw new Error('documentId is required for edit operations');
          }
          const document = await documentService.updateDocument(options.documentId, {
            title: options.title,
            content: options.content || prompt,
            format: options.format,
            prompt,
          });
          return { action, document };
        }

        case 'export': {
          if (!options.documentId) {
            throw new Error('documentId is required for export operations');
          }
          const exportFormat: ExportFormat = options.exportFormat || 'pdf';
          const exportResult = await documentService.exportDocument(options.documentId, {
            format: exportFormat,
          });
          return {
            action,
            exportUrl: exportResult.url,
            exportFormat: exportResult.format,
            expiresAt: exportResult.expiresAt,
          };
        }

        case 'template': {
          const templates = await documentService.listTemplates();
          return { action, templates };
        }

        case 'summarize': {
          const result = await documentService.summarizeDocument({
            content: options.content || prompt,
            prompt,
            format: options.format || 'markdown',
          });
          return { action, summary: result.summary, wordCount: result.wordCount };
        }

        default: {
          log.warn('Unknown document action, falling back to create', { action });
          const document = await documentService.createDocument({
            title: options.title || 'Untitled Document',
            content: prompt,
            format: options.format || 'markdown',
            prompt,
          });
          return { action: 'create', document };
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.warn('Document service call failed, using local fallback', { action, error: msg });

      // Local fallback so the widget stays usable without the backend
      return {
        action,
        document: {
          id: `doc_local_${Date.now()}`,
          title: options.title || 'Untitled Document',
          content: prompt,
          format: options.format || 'markdown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          wordCount: prompt.split(/\s+/).filter(Boolean).length,
          tags: [],
        },
        _fallback: true,
        message: 'Document service unavailable — created locally',
      };
    }
  }
}

// ============================================================================
// Default Export
// ============================================================================

// Create plugin instance
export const docWidgetPlugin = new DocWidgetPlugin();

export default docWidgetPlugin;
