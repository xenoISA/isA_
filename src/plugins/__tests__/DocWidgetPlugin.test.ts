import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockCreateDocument,
  mockUpdateDocument,
  mockExportDocument,
  mockListTemplates,
  mockSummarizeDocument,
} = vi.hoisted(() => ({
  mockCreateDocument: vi.fn(),
  mockUpdateDocument: vi.fn(),
  mockExportDocument: vi.fn(),
  mockListTemplates: vi.fn(),
  mockSummarizeDocument: vi.fn(),
}));

vi.mock('../../api/documentService', () => ({
  getDocumentService: () => ({
    createDocument: mockCreateDocument,
    updateDocument: mockUpdateDocument,
    exportDocument: mockExportDocument,
    listTemplates: mockListTemplates,
    summarizeDocument: mockSummarizeDocument,
  }),
}));

describe('DocWidgetPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('fails document creation instead of synthesizing a local document', async () => {
    mockCreateDocument.mockRejectedValue(new Error('gateway unavailable'));
    const { DocWidgetPlugin } = await import('../DocWidgetPlugin');
    const plugin = new DocWidgetPlugin();

    await expect(
      plugin.execute({
        prompt: 'Draft a release summary',
        options: { action: 'create', title: 'Release Summary' },
        context: { sessionId: 'session-1', userId: 'user-1' },
      } as any),
    ).rejects.toThrow('Document operation failed: gateway unavailable');
  });

  test('returns backend export metadata for document exports', async () => {
    mockExportDocument.mockResolvedValue({
      url: 'http://localhost:4100/__artifacts/export.pdf',
      format: 'pdf',
      expiresAt: '2026-04-30T00:00:00Z',
    });
    const { DocWidgetPlugin } = await import('../DocWidgetPlugin');
    const plugin = new DocWidgetPlugin();

    const result = await plugin.execute({
      prompt: 'Export the final draft',
      options: { action: 'export', documentId: 'doc-1', exportFormat: 'pdf' },
      context: { sessionId: 'session-1', userId: 'user-1' },
    } as any);

    expect(mockExportDocument).toHaveBeenCalledWith('doc-1', { format: 'pdf' });
    expect(result.content).toMatchObject({
      action: 'export',
      exportUrl: 'http://localhost:4100/__artifacts/export.pdf',
      exportFormat: 'pdf',
      expiresAt: '2026-04-30T00:00:00Z',
    });
  });
});
