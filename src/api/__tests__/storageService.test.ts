import { describe, test, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '../storageService';

// Mock @isa/core
const mockUploadFile = vi.fn();
const mockListFiles = vi.fn();
const mockGetFileInfo = vi.fn();
const mockDeleteFile = vi.fn();
const mockGetQuota = vi.fn();
const mockHealthCheck = vi.fn();
const mockSetAuthToken = vi.fn();
const mockShareFile = vi.fn();
const mockGetDownloadUrl = vi.fn();
const mockSemanticSearch = vi.fn();
const mockRagQuery = vi.fn();
const mockGetStats = vi.fn();

vi.mock('@isa/core', () => ({
  StorageService: vi.fn().mockImplementation(() => ({
    uploadFile: mockUploadFile,
    listFiles: mockListFiles,
    getFileInfo: mockGetFileInfo,
    deleteFile: mockDeleteFile,
    getQuota: mockGetQuota,
    healthCheck: mockHealthCheck,
    setAuthToken: mockSetAuthToken,
    shareFile: mockShareFile,
    getDownloadUrl: mockGetDownloadUrl,
    semanticSearch: mockSemanticSearch,
    ragQuery: mockRagQuery,
    getStats: mockGetStats,
  })),
  StorageTypes: {},
}));

// Mock @isa/transport
vi.mock('@isa/transport', () => ({
  HttpClient: vi.fn(),
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
    service = new StorageService();
  });

  // ============================================================================
  // uploadFile
  // ============================================================================

  describe('uploadFile', () => {
    test('uploads a File object successfully', async () => {
      const uploadResponse = {
        file_id: 'file-1',
        file_name: 'doc.pdf',
        file_size: 1024,
        download_url: 'http://example.com/doc.pdf',
      };
      mockUploadFile.mockResolvedValue(uploadResponse);

      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const request = { user_id: 'user-1', access_level: 'private' as const };

      const result = await service.uploadFile(file, request);

      expect(mockUploadFile).toHaveBeenCalledWith(file, 'doc.pdf', request);
      expect(result.file_id).toBe('file-1');
    });

    test('uploads a Blob with fallback filename', async () => {
      mockUploadFile.mockResolvedValue({ file_id: 'file-2', file_size: 512 });

      const blob = new Blob(['data'], { type: 'text/plain' });
      const request = { user_id: 'user-1' };

      await service.uploadFile(blob, request as any);

      expect(mockUploadFile).toHaveBeenCalledWith(blob, 'upload.bin', request);
    });

    test('throws when upload fails', async () => {
      mockUploadFile.mockRejectedValue(new Error('Upload failed'));

      const file = new File(['x'], 'test.txt');
      await expect(
        service.uploadFile(file, { user_id: 'user-1' } as any)
      ).rejects.toThrow('Upload failed');
    });
  });

  // ============================================================================
  // listFiles
  // ============================================================================

  describe('listFiles', () => {
    test('lists files for a user', async () => {
      const files = [
        { file_id: 'f1', file_name: 'doc.pdf', file_size: 1024 },
        { file_id: 'f2', file_name: 'img.png', file_size: 2048 },
      ];
      mockListFiles.mockResolvedValue(files);

      const result = await service.listFiles({ user_id: 'user-1', limit: 20 } as any);

      expect(mockListFiles).toHaveBeenCalledWith({ user_id: 'user-1', limit: 20 });
      expect(result).toHaveLength(2);
      expect(result[0].file_name).toBe('doc.pdf');
    });

    test('returns empty array when no files exist', async () => {
      mockListFiles.mockResolvedValue([]);

      const result = await service.listFiles({ user_id: 'user-1' } as any);

      expect(result).toEqual([]);
    });

    test('throws when listing fails', async () => {
      mockListFiles.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        service.listFiles({ user_id: 'user-1' } as any)
      ).rejects.toThrow('Unauthorized');
    });
  });

  // ============================================================================
  // getFileInfo
  // ============================================================================

  describe('getFileInfo', () => {
    test('retrieves file information', async () => {
      const fileInfo = {
        file_id: 'file-1',
        file_name: 'doc.pdf',
        file_size: 1024,
        status: 'available',
      };
      mockGetFileInfo.mockResolvedValue(fileInfo);

      const result = await service.getFileInfo('file-1', 'user-1');

      expect(mockGetFileInfo).toHaveBeenCalledWith('file-1', 'user-1');
      expect(result.file_name).toBe('doc.pdf');
    });

    test('throws when file not found', async () => {
      mockGetFileInfo.mockRejectedValue(new Error('File not found'));

      await expect(
        service.getFileInfo('bad-id', 'user-1')
      ).rejects.toThrow('File not found');
    });
  });

  // ============================================================================
  // deleteFile
  // ============================================================================

  describe('deleteFile', () => {
    test('deletes a file successfully', async () => {
      const deleteResult = { success: true, message: 'File deleted successfully' };
      mockDeleteFile.mockResolvedValue(deleteResult);

      const result = await service.deleteFile('file-1', 'user-1');

      expect(mockDeleteFile).toHaveBeenCalledWith('file-1', 'user-1');
      expect(result.success).toBe(true);
    });

    test('throws when deletion fails', async () => {
      mockDeleteFile.mockRejectedValue(new Error('Permission denied'));

      await expect(
        service.deleteFile('file-1', 'user-1')
      ).rejects.toThrow('Permission denied');
    });
  });

  // ============================================================================
  // getQuota
  // ============================================================================

  describe('getQuota', () => {
    test('retrieves storage quota for a user', async () => {
      const quotaData = {
        total_quota_bytes: 10737418240,
        used_bytes: 1073741824,
        available_bytes: 9663676416,
        usage_percentage: 10,
      };
      mockGetQuota.mockResolvedValue(quotaData);

      const result = await service.getQuota('user-1');

      expect(mockGetQuota).toHaveBeenCalledWith('user-1', undefined);
      expect(result.usage_percentage).toBe(10);
    });

    test('passes organizationId when provided', async () => {
      mockGetQuota.mockResolvedValue({ usage_percentage: 50 });

      await service.getQuota('user-1', 'org-1');

      expect(mockGetQuota).toHaveBeenCalledWith('user-1', 'org-1');
    });

    test('throws when quota retrieval fails', async () => {
      mockGetQuota.mockRejectedValue(new Error('Quota error'));

      await expect(service.getQuota('user-1')).rejects.toThrow('Quota error');
    });
  });

  // ============================================================================
  // healthCheck
  // ============================================================================

  describe('healthCheck', () => {
    test('returns health status on success', async () => {
      const healthData = { status: 'healthy', timestamp: '2026-01-01T00:00:00Z' };
      mockHealthCheck.mockResolvedValue(healthData);

      const result = await service.healthCheck();

      expect(mockHealthCheck).toHaveBeenCalled();
      expect(result.status).toBe('healthy');
    });

    test('throws when health check fails', async () => {
      mockHealthCheck.mockRejectedValue(new Error('Service down'));

      await expect(service.healthCheck()).rejects.toThrow('Service down');
    });
  });

  // ============================================================================
  // Constructor auth
  // ============================================================================

  describe('constructor', () => {
    test('uses custom baseUrl when provided', () => {
      const customService = new StorageService('http://custom:8080');
      // Verifies no error — the service initializes with custom URL
      expect(customService).toBeDefined();
    });

    test('uses custom auth headers function when provided', () => {
      const customAuth = () => ({ Authorization: 'Bearer custom-token' });
      const customService = new StorageService(undefined, customAuth);
      expect(customService).toBeDefined();
      expect(mockSetAuthToken).toHaveBeenCalledWith('custom-token');
    });

    test('falls back to default auth headers', () => {
      // Default constructor uses getAuthHeaders()
      const svc = new StorageService();
      expect(svc).toBeDefined();
      expect(mockSetAuthToken).toHaveBeenCalledWith('test-token');
    });
  });
});
