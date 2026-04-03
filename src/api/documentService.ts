/**
 * ============================================================================
 * Document Service (documentService.ts) - Document Processing API Client
 * ============================================================================
 *
 * Core Responsibilities:
 * - Uses BaseApiService for robust network transport
 * - Provides REST client for document CRUD, export, templates, and AI assist
 * - All requests route through the gateway
 *
 * Architecture:
 * - Transport: BaseApiService with retry/timeout/auth
 * - Types: src/types/documentTypes.ts
 * - Endpoints: GATEWAY_ENDPOINTS.DOCUMENTS.*
 */

import { BaseApiService } from './BaseApiService';
import { GATEWAY_ENDPOINTS, buildUrlWithParams } from '../config/gatewayConfig';
import { createLogger, LogCategory } from '../utils/logger';
import type {
  Document,
  CreateDocumentRequest,
  CreateDocumentResponse,
  UpdateDocumentRequest,
  UpdateDocumentResponse,
  ExportDocumentRequest,
  ExportDocumentResponse,
  SummarizeDocumentRequest,
  SummarizeDocumentResponse,
  AiAssistRequest,
  AiAssistResponse,
  ListDocumentsRequest,
  ListDocumentsResponse,
  DocumentTemplate,
  ListTemplatesResponse,
} from '../types/documentTypes';

const log = createLogger('DocumentService', LogCategory.API_REQUEST);

// ================================================================================
// DocumentService Class
// ================================================================================

export class DocumentService {
  private apiService: BaseApiService;

  constructor(getAuthHeaders?: () => Promise<Record<string, string>>) {
    this.apiService = new BaseApiService(
      GATEWAY_ENDPOINTS.DOCUMENTS.BASE,
      undefined,
      getAuthHeaders
    );
    log.info('DocumentService initialized');
  }

  // ================================================================================
  // Health
  // ================================================================================

  /**
   * Check document service health.
   */
  async healthCheck(): Promise<{ status: string }> {
    try {
      log.info('Checking document service health');
      const response = await this.apiService.get<{ status: string }>(
        GATEWAY_ENDPOINTS.DOCUMENTS.HEALTH
      );
      if (!response.success) {
        throw new Error(response.error || 'Health check failed');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Document service health check failed', { error: msg });
      throw new Error(`Document service health check failed: ${msg}`);
    }
  }

  // ================================================================================
  // Document CRUD
  // ================================================================================

  /**
   * Create a new document.
   */
  async createDocument(request: CreateDocumentRequest): Promise<Document> {
    try {
      log.info('Creating document', { title: request.title });
      const response = await this.apiService.post<CreateDocumentResponse>(
        GATEWAY_ENDPOINTS.DOCUMENTS.CREATE,
        request
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to create document');
      }
      return response.data!.document;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to create document', { error: msg });
      throw new Error(`Create document failed: ${msg}`);
    }
  }

  /**
   * Get a document by ID.
   */
  async getDocument(documentId: string): Promise<Document> {
    try {
      log.info('Fetching document', { documentId });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.DOCUMENTS.GET,
        { documentId }
      );
      const response = await this.apiService.get<{ document: Document }>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch document');
      }
      return response.data!.document;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch document', { error: msg, documentId });
      throw new Error(`Fetch document failed: ${msg}`);
    }
  }

  /**
   * Update an existing document.
   */
  async updateDocument(documentId: string, request: UpdateDocumentRequest): Promise<Document> {
    try {
      log.info('Updating document', { documentId });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.DOCUMENTS.UPDATE,
        { documentId }
      );
      const response = await this.apiService.put<UpdateDocumentResponse>(url, request);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update document');
      }
      return response.data!.document;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to update document', { error: msg, documentId });
      throw new Error(`Update document failed: ${msg}`);
    }
  }

  /**
   * Delete a document by ID.
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      log.info('Deleting document', { documentId });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.DOCUMENTS.DELETE,
        { documentId }
      );
      const response = await this.apiService.delete(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete document');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to delete document', { error: msg, documentId });
      throw new Error(`Delete document failed: ${msg}`);
    }
  }

  /**
   * List documents with optional filtering.
   */
  async listDocuments(request?: ListDocumentsRequest): Promise<ListDocumentsResponse> {
    try {
      log.info('Listing documents', { ...request });
      // Build query params
      const params = new URLSearchParams();
      if (request?.page) params.set('page', String(request.page));
      if (request?.limit) params.set('limit', String(request.limit));
      if (request?.search) params.set('search', request.search);
      if (request?.tags?.length) params.set('tags', request.tags.join(','));

      const queryString = params.toString();
      const url = GATEWAY_ENDPOINTS.DOCUMENTS.LIST + (queryString ? `?${queryString}` : '');
      const response = await this.apiService.get<ListDocumentsResponse>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to list documents');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to list documents', { error: msg });
      throw new Error(`List documents failed: ${msg}`);
    }
  }

  // ================================================================================
  // Export
  // ================================================================================

  /**
   * Export a document to the specified format. Returns a download URL.
   */
  async exportDocument(documentId: string, request: ExportDocumentRequest): Promise<ExportDocumentResponse> {
    try {
      log.info('Exporting document', { documentId, format: request.format });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.DOCUMENTS.EXPORT,
        { documentId }
      );
      const response = await this.apiService.post<ExportDocumentResponse>(url, request);
      if (!response.success) {
        throw new Error(response.error || 'Failed to export document');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to export document', { error: msg, documentId });
      throw new Error(`Export document failed: ${msg}`);
    }
  }

  // ================================================================================
  // Summarize
  // ================================================================================

  /**
   * Summarize document content using AI.
   */
  async summarizeDocument(request: SummarizeDocumentRequest): Promise<SummarizeDocumentResponse> {
    try {
      log.info('Summarizing document');
      const response = await this.apiService.post<SummarizeDocumentResponse>(
        GATEWAY_ENDPOINTS.DOCUMENTS.SUMMARIZE,
        request
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to summarize document');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to summarize document', { error: msg });
      throw new Error(`Summarize document failed: ${msg}`);
    }
  }

  // ================================================================================
  // Templates
  // ================================================================================

  /**
   * List available document templates.
   */
  async listTemplates(): Promise<DocumentTemplate[]> {
    try {
      log.info('Fetching document templates');
      const response = await this.apiService.get<ListTemplatesResponse>(
        GATEWAY_ENDPOINTS.DOCUMENTS.TEMPLATES
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch templates');
      }
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.templates ?? [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch document templates', { error: msg });
      throw new Error(`Fetch document templates failed: ${msg}`);
    }
  }

  /**
   * Get a specific template by ID.
   */
  async getTemplate(templateId: string): Promise<DocumentTemplate> {
    try {
      log.info('Fetching document template', { templateId });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.DOCUMENTS.TEMPLATE,
        { templateId }
      );
      const response = await this.apiService.get<{ template: DocumentTemplate }>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch template');
      }
      return response.data!.template;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch document template', { error: msg, templateId });
      throw new Error(`Fetch document template failed: ${msg}`);
    }
  }

  // ================================================================================
  // AI Assist
  // ================================================================================

  /**
   * Use AI to assist with document content (rewrite, expand, shorten, proofread, translate).
   * Requires document processing backend.
   */
  async aiAssist(documentId: string, request: AiAssistRequest): Promise<AiAssistResponse> {
    try {
      log.info('AI assist on document', { documentId, action: request.action });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.DOCUMENTS.AI_ASSIST,
        { documentId }
      );
      const response = await this.apiService.post<AiAssistResponse>(url, request);
      if (!response.success) {
        throw new Error(response.error || 'Failed to run AI assist');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to run AI assist', { error: msg, documentId });
      throw new Error(`AI assist failed: ${msg}`);
    }
  }
}

// ================================================================================
// Export Functions and Default Instance
// ================================================================================

/**
 * Create authenticated DocumentService
 */
export const createAuthenticatedDocumentService = (
  getAuthHeadersFn?: () => Promise<Record<string, string>>
): DocumentService => {
  return new DocumentService(getAuthHeadersFn);
};

// Lazy-initialized default instance
let _defaultInstance: DocumentService | null = null;
export const getDocumentService = (): DocumentService => {
  if (!_defaultInstance) {
    _defaultInstance = createAuthenticatedDocumentService();
  }
  return _defaultInstance;
};

export default DocumentService;
