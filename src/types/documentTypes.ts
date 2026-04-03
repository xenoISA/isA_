/**
 * ============================================================================
 * Document Types - TypeScript types for document processing service
 * ============================================================================
 *
 * Covers: document CRUD, export, templates, summarize, AI assist.
 * Used by documentService.ts for type-safe API interactions.
 */

// ================================================================================
// Document Core
// ================================================================================

export type DocumentFormat = 'markdown' | 'richtext' | 'plaintext';
export type ExportFormat = 'pdf' | 'docx' | 'html' | 'txt';
export type DocumentAction = 'create' | 'edit' | 'export' | 'template' | 'summarize';

export interface Document {
  id: string;
  title: string;
  content: string;
  format: DocumentFormat;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  tags: string[];
  userId?: string;
  templateId?: string;
}

// ================================================================================
// Request Types
// ================================================================================

export interface CreateDocumentRequest {
  title?: string;
  content?: string;
  format?: DocumentFormat;
  templateId?: string;
  templateType?: string;
  prompt?: string;
  tags?: string[];
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  format?: DocumentFormat;
  tags?: string[];
  prompt?: string;
}

export interface ExportDocumentRequest {
  format: ExportFormat;
}

export interface SummarizeDocumentRequest {
  content: string;
  prompt?: string;
  format?: DocumentFormat;
}

export interface AiAssistRequest {
  prompt: string;
  content?: string;
  action?: 'rewrite' | 'expand' | 'shorten' | 'proofread' | 'translate';
}

export interface ListDocumentsRequest {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
}

// ================================================================================
// Response Types
// ================================================================================

export interface CreateDocumentResponse {
  document: Document;
}

export interface UpdateDocumentResponse {
  document: Document;
}

export interface ExportDocumentResponse {
  url: string;
  format: ExportFormat;
  expiresAt?: string;
}

export interface SummarizeDocumentResponse {
  summary: string;
  wordCount: number;
}

export interface AiAssistResponse {
  content: string;
  action: string;
}

export interface ListDocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'report' | 'letter' | 'proposal' | 'meeting-notes' | 'blank';
  content: string;
  format: DocumentFormat;
}

export interface ListTemplatesResponse {
  templates: DocumentTemplate[];
}
