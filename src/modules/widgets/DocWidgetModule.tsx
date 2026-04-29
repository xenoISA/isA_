/**
 * ============================================================================
 * Doc Widget Module (DocWidgetModule.tsx) - Refactored with BaseWidgetModule
 * ============================================================================
 *
 * Core Responsibilities:
 * - Uses BaseWidgetModule for standardized widget management
 * - Provides Doc-specific configuration and customizations
 * - Manages document creation, editing, and export business logic
 * - Integrates seamlessly with BaseWidget UI components
 *
 * Benefits of BaseWidgetModule integration:
 * - Automatic output history management for document operations
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
import { getDocumentService } from '../../api/documentService';
import type { ExportFormat } from '../../types/documentTypes';
const log = createLogger('DocWidget');

// Document interface
interface DocDocument {
  id: string;
  title: string;
  content: string;
  format: 'markdown' | 'richtext' | 'plaintext';
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  tags: string[];
}

// Doc widget parameters
interface DocWidgetParams {
  action?: 'create' | 'edit' | 'export' | 'template' | 'summarize';
  prompt?: string;
  documentId?: string;
  title?: string;
  content?: string;
  format?: 'markdown' | 'richtext' | 'plaintext';
  exportFormat?: 'pdf' | 'docx' | 'html' | 'txt';
  templateType?: 'report' | 'letter' | 'proposal' | 'meeting-notes' | 'blank';
  templateParams?: { template_id: string; prompt_args: Record<string, any> };
  [key: string]: any;
}

// Doc widget result
interface DocWidgetResult {
  document: DocDocument;
  exportUrl?: string;
  exportFormat?: string;
}

interface DocWidgetModuleProps {
  triggeredInput?: string;
  onDocumentCompleted?: (result: DocWidgetResult) => void;
  children: ReactNode;
}

/**
 * Doc Widget Module - Template mapping and configuration for document processing
 *
 * Actions:
 * - create: Create a new document from prompt or template
 * - edit: Edit an existing document (AI-assisted rewrite, expand, summarize)
 * - export: Export document to PDF, DOCX, HTML, or TXT
 * - template: Generate document from a predefined template
 * - summarize: Create a summary of an existing document
 */

// Doc action to MCP template mapping
// Maps widget actions to prompt template IDs used by the document processing service
const DOC_TEMPLATE_MAPPING = {
  'create': {
    template_id: 'doc_create_prompt',
  },
  'edit': {
    template_id: 'doc_edit_prompt',
  },
  'export': {
    template_id: 'doc_export_prompt',
  },
  'template': {
    template_id: 'doc_template_prompt',
  },
  'summarize': {
    template_id: 'doc_summarize_prompt',
  }
};

// Doc-specific template parameter preparation
const prepareDocTemplateParams = (params: DocWidgetParams) => {
  const { action = 'create', prompt, title, content, format = 'markdown', exportFormat, templateType } = params;

  const mapping = DOC_TEMPLATE_MAPPING[action] || DOC_TEMPLATE_MAPPING['create'];

  let prompt_args: Record<string, any>;

  switch (action) {
    case 'create':
      prompt_args = {
        prompt: prompt || 'Create a new document',
        title: title || 'Untitled Document',
        format: format,
        template_type: templateType || 'blank'
      };
      break;

    case 'edit':
      prompt_args = {
        prompt: prompt || 'Edit the document',
        document_id: params.documentId,
        content: content || '',
        format: format
      };
      break;

    case 'export':
      prompt_args = {
        document_id: params.documentId,
        export_format: exportFormat || 'pdf',
        content: content || ''
      };
      break;

    case 'template':
      prompt_args = {
        template_type: templateType || 'report',
        title: title || 'New Document',
        prompt: prompt || ''
      };
      break;

    case 'summarize':
      prompt_args = {
        content: content || '',
        prompt: prompt || 'Summarize this document',
        format: 'markdown'
      };
      break;

    default:
      prompt_args = {
        prompt: prompt || 'Create a document',
        format: format
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

// Doc widget configuration
const docWidgetConfig = createWidgetConfig<DocWidgetParams, DocWidgetResult>({
  type: 'doc',
  title: 'Document Studio',
  icon: '📝',
  sessionIdPrefix: 'doc_widget',
  maxHistoryItems: 25,

  // Result extraction configuration
  resultExtractor: {
    outputType: 'text',
    extractResult: (widgetData: any) => {
      if (widgetData?.document) {
        return {
          finalResult: {
            document: widgetData.document,
            exportUrl: widgetData.exportUrl
          },
          outputContent: widgetData.document.content || 'Document ready',
          title: widgetData.document.title || 'Document Created'
        };
      }
      return null;
    }
  },

  // Extract parameters from triggered input
  extractParamsFromInput: (input: string) => {
    const lowerInput = input.toLowerCase();

    // Determine action based on keywords
    let action: 'create' | 'edit' | 'export' | 'template' | 'summarize' = 'create';
    let exportFormat: 'pdf' | 'docx' | 'html' | 'txt' | undefined;
    let templateType: 'report' | 'letter' | 'proposal' | 'meeting-notes' | 'blank' | undefined;

    if (lowerInput.includes('edit') || lowerInput.includes('modify') || lowerInput.includes('rewrite')) {
      action = 'edit';
    } else if (lowerInput.includes('export') || lowerInput.includes('download') || lowerInput.includes('convert')) {
      action = 'export';
      if (lowerInput.includes('pdf')) exportFormat = 'pdf';
      else if (lowerInput.includes('docx') || lowerInput.includes('word')) exportFormat = 'docx';
      else if (lowerInput.includes('html')) exportFormat = 'html';
      else exportFormat = 'pdf'; // Default export format
    } else if (lowerInput.includes('template')) {
      action = 'template';
      if (lowerInput.includes('report')) templateType = 'report';
      else if (lowerInput.includes('letter')) templateType = 'letter';
      else if (lowerInput.includes('proposal')) templateType = 'proposal';
      else if (lowerInput.includes('meeting') || lowerInput.includes('notes')) templateType = 'meeting-notes';
    } else if (lowerInput.includes('summarize') || lowerInput.includes('summary')) {
      action = 'summarize';
    }

    return {
      action,
      prompt: input.trim(),
      format: 'markdown' as const,
      exportFormat,
      templateType
    };
  },

  editActions: [
    {
      id: 'copy_content',
      label: 'Copy',
      icon: '📋',
      onClick: (content) => {
        const text = typeof content === 'object' ? content?.content || JSON.stringify(content) : content;
        navigator.clipboard.writeText(text);
        log.info('Document content copied to clipboard');
      }
    },
    {
      id: 'export_pdf',
      label: 'PDF',
      icon: '📄',
      onClick: (content) => {
        log.info('Exporting document as PDF');
        const docId = typeof content === 'object' && content?.id ? content.id : null;
        if (!docId) {
          log.warn('No document ID available for PDF export');
          return;
        }
        getDocumentService().exportDocument(docId, { format: 'pdf' }).then((result) => {
          window.open(result.url, '_blank');
          log.info('PDF export URL opened', { url: result.url });
        }).catch((error) => {
          log.error('PDF export failed', { error: error instanceof Error ? error.message : String(error) });
        });
      }
    },
    {
      id: 'export_docx',
      label: 'DOCX',
      icon: '📝',
      onClick: (content) => {
        log.info('Exporting document as DOCX');
        const docId = typeof content === 'object' && content?.id ? content.id : null;
        if (!docId) {
          log.warn('No document ID available for DOCX export');
          return;
        }
        getDocumentService().exportDocument(docId, { format: 'docx' }).then((result) => {
          window.open(result.url, '_blank');
          log.info('DOCX export URL opened', { url: result.url });
        }).catch((error) => {
          log.error('DOCX export failed', { error: error instanceof Error ? error.message : String(error) });
        });
      }
    }
  ],

  managementActions: [
    {
      id: 'new_doc',
      label: 'New Doc',
      icon: '📄',
      onClick: () => {
        log.info('Creating new document via service');
        getDocumentService().createDocument({
          title: 'Untitled Document',
          content: '',
          format: 'markdown',
        }).then((doc) => {
          log.info('New document created', { id: doc.id, title: doc.title });
        }).catch((error) => {
          log.error('Failed to create new document', { error: error instanceof Error ? error.message : String(error) });
        });
      },
      variant: 'primary' as const,
      disabled: false
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: '📋',
      onClick: () => {
        log.info('Fetching document templates');
        getDocumentService().listTemplates().then((templates) => {
          log.info('Templates fetched', { count: templates.length });
          // Requires document processing backend for template selector UI
        }).catch((error) => {
          log.error('Failed to fetch templates', { error: error instanceof Error ? error.message : String(error) });
        });
      },
      disabled: false
    },
    {
      id: 'export',
      label: 'Export',
      icon: '📤',
      onClick: () => {
        log.info('Opening export dialog');
        // Requires document processing backend for export format selection UI
      },
      disabled: false
    },
    {
      id: 'ai_assist',
      label: 'AI Assist',
      icon: '🤖',
      onClick: () => {
        log.info('Activating AI writing assistant');
        // Requires document processing backend for AI assist streaming
      },
      disabled: true
    }
  ]
});

/**
 * Doc Widget Module - Uses BaseWidgetModule with Doc-specific configuration
 *
 * Provides document creation, editing, and export capabilities.
 * Calls the document processing service for all operations and surfaces
 * backend failures instead of synthesizing local-only documents.
 */
export const DocWidgetModule: React.FC<DocWidgetModuleProps> = ({
  triggeredInput,
  onDocumentCompleted,
  children
}) => {
  // Local state for document management
  const [currentDocument, setCurrentDocument] = React.useState<DocDocument | null>(null);
  const [documents, setDocuments] = React.useState<DocDocument[]>([]);

  // Convert current document to outputHistory format for BaseWidget display
  const outputHistory = React.useMemo(() => {
    if (!currentDocument) {
      return [];
    }

    return [{
      id: `doc_result_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'text',
      title: currentDocument.title || 'Untitled Document',
      content: currentDocument.content,
      metadata: {
        format: currentDocument.format,
        wordCount: currentDocument.wordCount,
        tags: currentDocument.tags
      }
    }];
  }, [currentDocument]);

  log.debug('Converting document to output history', {
    hasDocument: !!currentDocument,
    outputHistoryCount: outputHistory.length
  });

  return (
    <BaseWidgetModule
      config={docWidgetConfig}
      triggeredInput={triggeredInput}
      onResultGenerated={onDocumentCompleted}
    >
      {(moduleProps) => {
        // Pass state to Doc widget via props with template support
        if (React.isValidElement(children)) {
          return React.cloneElement(children, {
            ...children.props,
            // Doc state
            currentDocument,
            documents,
            isProcessing: moduleProps.isProcessing,
            // Doc actions
            onCreateDocument: async (params: DocWidgetParams) => {
              log.info('Creating document', { title: params.title });

              const { recordWidgetUsage } = useAppStore.getState();
              recordWidgetUsage('doc');

              const templateParams = prepareDocTemplateParams({
                ...params,
                action: 'create'
              });

              const enrichedParams = {
                action: 'create' as const,
                prompt: params.prompt || '',
                title: params.title || 'Untitled Document',
                format: params.format || 'markdown',
                ...params,
                templateParams
              };

              log.debug('Sending enriched create params to store', enrichedParams);
              await moduleProps.startProcessing(enrichedParams);

              try {
                const doc = await getDocumentService().createDocument({
                  title: params.title || 'Untitled Document',
                  content: params.prompt || '',
                  format: params.format || 'markdown',
                  templateType: params.templateType,
                  prompt: params.prompt,
                  tags: [],
                });
                const { markWidgetWithArtifacts } = useAppStore.getState();
                markWidgetWithArtifacts('doc');
                setCurrentDocument(doc);
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                log.error('Document creation failed', { error: msg });
              }
            },
            onEditDocument: async (params: DocWidgetParams) => {
              log.info('Editing document', { documentId: params.documentId });

              const { recordWidgetUsage } = useAppStore.getState();
              recordWidgetUsage('doc');

              const templateParams = prepareDocTemplateParams({
                ...params,
                action: 'edit'
              });

              const enrichedParams = {
                action: 'edit' as const,
                ...params,
                templateParams
              };

              await moduleProps.startProcessing(enrichedParams);

              if (params.documentId) {
                try {
                  const doc = await getDocumentService().updateDocument(params.documentId, {
                    title: params.title,
                    content: params.content || params.prompt,
                    format: params.format,
                    prompt: params.prompt,
                  });
                  setCurrentDocument(doc);
                } catch (error) {
                  const msg = error instanceof Error ? error.message : String(error);
                  log.warn('Document edit service unavailable', { error: msg });
                }
              }
            },
            onExportDocument: async (format: 'pdf' | 'docx' | 'html' | 'txt') => {
              log.info('Exporting document', { format, documentId: currentDocument?.id });

              if (!currentDocument) {
                log.warn('No document to export');
                return;
              }

              const templateParams = prepareDocTemplateParams({
                action: 'export',
                documentId: currentDocument.id,
                content: currentDocument.content,
                exportFormat: format
              });

              const enrichedParams = {
                action: 'export' as const,
                documentId: currentDocument.id,
                content: currentDocument.content,
                exportFormat: format,
                templateParams
              };

              await moduleProps.startProcessing(enrichedParams);

              try {
                const result = await getDocumentService().exportDocument(
                  currentDocument.id,
                  { format: format as ExportFormat }
                );
                window.open(result.url, '_blank');
                log.info('Export download initiated', { url: result.url, format });
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                log.error('Document export failed', { error: msg, format });
              }
            },
            onSummarize: async (content: string) => {
              log.info('Summarizing document content');

              const templateParams = prepareDocTemplateParams({
                action: 'summarize',
                content
              });

              const enrichedParams = {
                action: 'summarize' as const,
                content,
                prompt: 'Summarize this document',
                templateParams
              };

              await moduleProps.startProcessing(enrichedParams);
            },
            onClearDocument: () => {
              log.info('Clearing document');
              setCurrentDocument(null);
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
export { docWidgetConfig };
