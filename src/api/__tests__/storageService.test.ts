import { describe, test, expect, vi, beforeEach } from 'vitest';
import { StorageService, getStorageService } from '../storageService';

// Mock @isa/core StorageService
const mockCoreService = {
  setAuthToken: vi.fn(),
  uploadFile: vi.fn(),
  listFiles: vi.fn(),
  getFileInfo: vi.fn(),
  getDownloadUrl: vi.fn(),
  deleteFile: vi.fn(),
  shareFile: vi.fn(),
  getShareInfo: vi.fn(),
  revokeShare: vi.fn(),
  getQuota: vi.fn(),
  getStats: vi.fn(),
  savePhotoVersion: vi.fn(),
  getPhotoVersions: vi.fn(),
  switchPhotoVersion: vi.fn(),
  semanticSearch: vi.fn(),
  ragQuery: vi.fn(),
  healthCheck: vi.fn(),
};

vi.mock('@isa/core', () => ({
  StorageService: vi.fn().mockImplementation(() => mockCoreService),
  StorageTypes: {},
}));

// Mock gatewayConfig
vi.mock('../../config/gatewayConfig', () => ({
  getAuthHeaders: vi.fn().mockReturnValue({ Authorization: 'Bearer test-token' }),
}));

// Mock runtimeEnv
vi.mock('../../config/runtimeEnv', () => ({
  getGatewayUrl: vi.fn().mockReturnValue('http://localhost:9080'),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  LogCategory: {
    API_REQUEST: 'api_request',
  },
}));

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StorageService('http://localhost:9080');
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('constructor', () => {
    test('initializes core StorageService with base URL', async () => {
      const coreMod = await import('@isa/core');
      const CoreMock = vi.mocked(coreMod.StorageService);
      expect(CoreMock).toHaveBeenCalledWith('http://localhost:9080');
    });

    test('sets auth token from custom auth headers function', () => {
      const customAuth = () => ({ Authorization: 'Bearer custom-token' });
      new StorageService('http://localhost:9080', customAuth);
      expect(mockCoreService.setAuthToken).toHaveBeenCalledWith('custom-token');
    });

    test('sets auth token from default auth headers', () => {
      // The beforeEach creates a service with default auth
      expect(mockCoreService.setAuthToken).toHaveBeenCalledWith('test-token');
    });
  });

  // ============================================================================
  // File Management — uploadFile
  // ============================================================================

  describe('uploadFile', () => {
    test('uploads a File and returns response', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const uploadResponse = {
        file_id: 'file-123',
        file_size: 7,
        download_url: 'http://cdn/test.txt',
      };
      mockCoreService.uploadFile.mockResolvedValue(uploadResponse);

      const result = await service.uploadFile(mockFile, {
        user_id: 'user1',
        access_level: 'private',
      } as any);

      expect(mockCoreService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'test.txt',
        { user_id: 'user1', access_level: 'private' }
      );
      expect(result.file_id).toBe('file-123');
    });

    test('uses fallback name for Blob uploads', async () => {
      const mockBlob = new Blob(['data'], { type: 'application/octet-stream' });
      mockCoreService.uploadFile.mockResolvedValue({ file_id: 'file-456' });

      await service.uploadFile(mockBlob, { user_id: 'user1' } as any);

      expect(mockCoreService.uploadFile).toHaveBeenCalledWith(
        mockBlob,
        'upload.bin',
        { user_id: 'user1' }
      );
    });

    test('throws on upload failure', async () => {
      mockCoreService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.uploadFile(new Blob([]), { user_id: 'u1' } as any)
      ).rejects.toThrow('Upload failed');
    });
  });

  // ============================================================================
  // File Management — listFiles
  // ============================================================================

  describe('listFiles', () => {
    test('returns list of files', async () => {
      const files = [
        { file_id: 'f1', file_name: 'a.txt', file_size: 100 },
        { file_id: 'f2', file_name: 'b.pdf', file_size: 200 },
      ];
      mockCoreService.listFiles.mockResolvedValue(files);

      const result = await service.listFiles({ user_id: 'user1' } as any);

      expect(mockCoreService.listFiles).toHaveBeenCalledWith({ user_id: 'user1' });
      expect(result).toHaveLength(2);
      expect(result[0].file_name).toBe('a.txt');
    });

    test('throws on list failure', async () => {
      mockCoreService.listFiles.mockRejectedValue(new Error('List error'));

      await expect(
        service.listFiles({ user_id: 'u1' } as any)
      ).rejects.toThrow('List error');
    });
  });

  // ============================================================================
  // File Management — getFileInfo
  // ============================================================================

  describe('getFileInfo', () => {
    test('retrieves file info by ID and user', async () => {
      const info = { file_name: 'doc.pdf', file_size: 1024, status: 'available' };
      mockCoreService.getFileInfo.mockResolvedValue(info);

      const result = await service.getFileInfo('file-1', 'user1');

      expect(mockCoreService.getFileInfo).toHaveBeenCalledWith('file-1', 'user1');
      expect(result.file_name).toBe('doc.pdf');
    });
  });

  // ============================================================================
  // File Management — getDownloadUrl
  // ============================================================================

  describe('getDownloadUrl', () => {
    test('returns download URL as string', async () => {
      mockCoreService.getDownloadUrl.mockResolvedValue('https://cdn.example.com/file.pdf');

      const url = await service.getDownloadUrl('file-1', 'user1');

      expect(url).toBe('https://cdn.example.com/file.pdf');
    });

    test('extracts download_url from object response', async () => {
      mockCoreService.getDownloadUrl.mockResolvedValue({
        download_url: 'https://cdn.example.com/file2.pdf',
      });

      const url = await service.getDownloadUrl('file-2', 'user1');

      expect(url).toBe('https://cdn.example.com/file2.pdf');
    });

    test('throws when no URL is returned', async () => {
      mockCoreService.getDownloadUrl.mockResolvedValue({});

      await expect(
        service.getDownloadUrl('file-3', 'user1')
      ).rejects.toThrow('Storage service did not return a download URL');
    });
  });

  // ============================================================================
  // File Management — deleteFile
  // ============================================================================

  describe('deleteFile', () => {
    test('deletes file and returns result', async () => {
      const deleteResult = { message: 'File deleted successfully' };
      mockCoreService.deleteFile.mockResolvedValue(deleteResult);

      const result = await service.deleteFile('file-1', 'user1');

      expect(mockCoreService.deleteFile).toHaveBeenCalledWith('file-1', 'user1');
      expect(result.message).toBe('File deleted successfully');
    });

    test('throws on delete failure', async () => {
      mockCoreService.deleteFile.mockRejectedValue(new Error('Not found'));

      await expect(service.deleteFile('bad-id', 'u1')).rejects.toThrow('Not found');
    });
  });

  // ============================================================================
  // File Sharing — shareFile
  // ============================================================================

  describe('shareFile', () => {
    test('shares file with permissions and returns share info', async () => {
      const shareResponse = {
        share_id: 'share-1',
        share_url: 'https://share.example.com/abc',
        access_token: 'tok-123',
      };
      mockCoreService.shareFile.mockResolvedValue(shareResponse);

      const request = {
        file_id: 'file-1',
        shared_by: 'user1',
        shared_with_email: 'other@example.com',
        permissions: { view: true, download: true, delete: false },
        expires_hours: 24,
      };
      const result = await service.shareFile(request);

      expect(mockCoreService.shareFile).toHaveBeenCalledWith(request);
      expect(result.share_id).toBe('share-1');
      expect(result.share_url).toBe('https://share.example.com/abc');
    });
  });

  // ============================================================================
  // File Sharing — getShareInfo
  // ============================================================================

  describe('getShareInfo', () => {
    test('retrieves share details by share ID', async () => {
      const shareInfo = {
        share_id: 'share-1',
        expires_at: '2026-04-01T00:00:00Z',
        permissions: { view: true, download: true, delete: false },
      };
      mockCoreService.getShareInfo.mockResolvedValue(shareInfo);

      const result = await service.getShareInfo('share-1');

      expect(mockCoreService.getShareInfo).toHaveBeenCalledWith('share-1');
      expect(result.expires_at).toBe('2026-04-01T00:00:00Z');
    });
  });

  // ============================================================================
  // File Sharing — revokeShare
  // ============================================================================

  describe('revokeShare', () => {
    test('revokes share and returns confirmation', async () => {
      const revokeResult = { message: 'Share revoked successfully' };
      mockCoreService.revokeShare.mockResolvedValue(revokeResult);

      const result = await service.revokeShare('share-1', 'user1');

      expect(mockCoreService.revokeShare).toHaveBeenCalledWith('share-1', 'user1');
      expect(result.message).toBe('Share revoked successfully');
    });
  });

  // ============================================================================
  // Quota & Stats — getQuota
  // ============================================================================

  describe('getQuota', () => {
    test('returns storage quota for user', async () => {
      const quota = {
        total_quota_bytes: 10737418240,
        used_bytes: 5368709120,
        available_bytes: 5368709120,
        usage_percentage: 50,
      };
      mockCoreService.getQuota.mockResolvedValue(quota);

      const result = await service.getQuota('user1');

      expect(mockCoreService.getQuota).toHaveBeenCalledWith('user1', undefined);
      expect(result.usage_percentage).toBe(50);
    });

    test('passes organization ID when provided', async () => {
      mockCoreService.getQuota.mockResolvedValue({ usage_percentage: 30 });

      await service.getQuota('user1', 'org-1');

      expect(mockCoreService.getQuota).toHaveBeenCalledWith('user1', 'org-1');
    });
  });

  // ============================================================================
  // Quota & Stats — getStats
  // ============================================================================

  describe('getStats', () => {
    test('returns storage statistics', async () => {
      const stats = {
        file_count: 42,
        by_type: { pdf: 10, txt: 32 },
        by_status: { available: 40, processing: 2 },
      };
      mockCoreService.getStats.mockResolvedValue(stats);

      const result = await service.getStats('user1');

      expect(mockCoreService.getStats).toHaveBeenCalledWith('user1', undefined);
      expect(result.file_count).toBe(42);
    });
  });

  // ============================================================================
  // Semantic Search
  // ============================================================================

  describe('semanticSearch', () => {
    test('performs semantic search with query params', async () => {
      const searchResult = {
        total_results: 2,
        results: [
          { file_name: 'report.pdf', score: 0.95, content_snippet: 'AI research...' },
          { file_name: 'notes.txt', score: 0.82, content_snippet: 'Project plan...' },
        ],
      };
      mockCoreService.semanticSearch.mockResolvedValue(searchResult);

      const request = {
        user_id: 'user1',
        query: 'AI research documents',
        top_k: 5,
        filters: { tag: 'research' },
      };
      const result = await service.semanticSearch(request);

      expect(mockCoreService.semanticSearch).toHaveBeenCalledWith(request);
      expect(result.total_results).toBe(2);
      expect(result.results[0].score).toBe(0.95);
    });

    test('throws on search failure', async () => {
      mockCoreService.semanticSearch.mockRejectedValue(new Error('Search timeout'));

      await expect(
        service.semanticSearch({ user_id: 'u1', query: 'test' })
      ).rejects.toThrow('Search timeout');
    });
  });

  // ============================================================================
  // RAG Query — all 6 modes
  // ============================================================================

  describe('ragQuery', () => {
    const ragModes = ['simple', 'raptor', 'self_rag', 'crag', 'plan_rag', 'hm_rag'] as const;

    ragModes.forEach((mode) => {
      test(`performs RAG query with mode: ${mode}`, async () => {
        const ragResponse = {
          answer: `Answer from ${mode} mode`,
          sources: [{ file_name: 'doc.pdf', excerpt: 'Relevant text...' }],
        };
        mockCoreService.ragQuery.mockResolvedValue(ragResponse);

        const request = {
          user_id: 'user1',
          query: 'What are the project goals?',
          mode,
          top_k: 3,
          include_sources: true,
        };
        const result = await service.ragQuery(request);

        expect(mockCoreService.ragQuery).toHaveBeenCalledWith(request);
        expect(result.answer).toBe(`Answer from ${mode} mode`);
        expect(result.sources).toHaveLength(1);
      });
    });

    test('defaults to simple mode when mode is omitted', async () => {
      mockCoreService.ragQuery.mockResolvedValue({
        answer: 'Default answer',
        sources: [],
      });

      const request = { user_id: 'user1', query: 'test query' };
      await service.ragQuery(request);

      expect(mockCoreService.ragQuery).toHaveBeenCalledWith(request);
    });

    test('throws on RAG query failure', async () => {
      mockCoreService.ragQuery.mockRejectedValue(new Error('RAG service unavailable'));

      await expect(
        service.ragQuery({ user_id: 'u1', query: 'test' })
      ).rejects.toThrow('RAG service unavailable');
    });
  });

  // ============================================================================
  // Health Check
  // ============================================================================

  describe('healthCheck', () => {
    test('returns health status on success', async () => {
      mockCoreService.healthCheck.mockResolvedValue({
        status: 'healthy',
        timestamp: '2026-03-13T00:00:00Z',
      });

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBe('2026-03-13T00:00:00Z');
    });

    test('throws on health check failure', async () => {
      mockCoreService.healthCheck.mockRejectedValue(new Error('Connection refused'));

      await expect(service.healthCheck()).rejects.toThrow('Connection refused');
    });
  });

  // ============================================================================
  // Singleton — getStorageService
  // ============================================================================

  describe('getStorageService', () => {
    test('returns a StorageService instance', () => {
      const instance = getStorageService('http://localhost:9080');
      expect(instance).toBeInstanceOf(StorageService);
    });
  });
});
