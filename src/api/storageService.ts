/**
 * ============================================================================
 * Storage Service (storageService.ts) - Using @isa/core SDK
 * ============================================================================
 * 
 * 文件名：storageService.ts
 * 功能：文件存储服务，支持上传、下载、分享、语义搜索和 RAG 问答
 * 
 * 使用 @isa/core SDK 的 StorageService
 * 
 * Architecture Benefits:
 * ✅ SDK: @isa/core StorageService with standardized API
 * ✅ Transport: @isa/transport HTTP with robust handling
 * ✅ Types: SDK-provided type safety
 * ✅ Error handling: Built-in SDK error management
 * ✅ Features: 文件管理、智能搜索、RAG 问答、版本控制
 */

import { StorageService as CoreStorageService, StorageTypes } from '@isa/core';
import { HttpClient } from '@isa/transport';
import { getAuthHeaders } from '../config/gatewayConfig';
import { getGatewayUrl } from '../config/runtimeEnv';
import { logger, LogCategory } from '../utils/logger';

// Re-export types from SDK for convenience
export type FileUploadRequest = StorageTypes.FileUploadRequest;
export type FileUploadResponse = StorageTypes.FileUploadResponse;
export type FileListRequest = StorageTypes.FileListRequest;
export type FileInfoResponse = StorageTypes.FileInfoResponse;
export type FileShareRequest = StorageTypes.FileShareRequest;
export type FileShareResponse = StorageTypes.FileShareResponse;
export type StorageStatsResponse = StorageTypes.StorageStatsResponse;
export type SavePhotoVersionRequest = StorageTypes.SavePhotoVersionRequest;
export type SavePhotoVersionResponse = StorageTypes.SavePhotoVersionResponse;
export type PhotoWithVersions = StorageTypes.PhotoWithVersions;
export type SemanticSearchRequest = StorageTypes.SemanticSearchRequest;
export type SemanticSearchResponse = StorageTypes.SemanticSearchResponse;
export type RAGQueryRequest = StorageTypes.RAGQueryRequest;
export type RAGQueryResponse = StorageTypes.RAGQueryResponse;
export type FileStatus = StorageTypes.FileStatus;
export type FileAccessLevel = StorageTypes.FileAccessLevel;
export type PhotoVersionType = StorageTypes.PhotoVersionType;

// ================================================================================
// StorageService Wrapper
// ================================================================================

/**
 * StorageService 包装器
 * 
 * 示例用法：
 * ```typescript
 * const storageService = new StorageService();
 * 
 * // 1. 上传文件
 * const file = document.querySelector('input[type="file"]').files[0];
 * const result = await storageService.uploadFile(file, {
 *   user_id: 'user123',
 *   access_level: 'private',
 *   tags: ['document', 'important']
 * });
 * 
 * // 2. 列出文件
 * const files = await storageService.listFiles({
 *   user_id: 'user123',
 *   limit: 20
 * });
 * 
 * // 3. 语义搜索
 * const searchResults = await storageService.semanticSearch({
 *   user_id: 'user123',
 *   query: '关于项目计划的文档',
 *   top_k: 5
 * });
 * 
 * // 4. RAG 问答
 * const answer = await storageService.ragQuery({
 *   user_id: 'user123',
 *   query: '我们的项目截止日期是什么时候？',
 *   mode: 'simple'
 * });
 * ```
 */
export class StorageService {
  private coreStorageService: any;
  private baseUrl: string;

  constructor(baseUrl?: string, getAuthHeadersFn?: () => Record<string, string>) {
    this.baseUrl = baseUrl || getGatewayUrl();

    // Initialize core storage service
    this.coreStorageService = new CoreStorageService(this.baseUrl);

    // Set up authentication if provided
    if (getAuthHeadersFn) {
      const authHeaders = getAuthHeadersFn();
      if (authHeaders.Authorization) {
        const token = authHeaders.Authorization.replace('Bearer ', '');
        this.coreStorageService.setAuthToken(token);
      }
    } else {
      // Use default auth headers
      const authHeaders = getAuthHeaders();
      if (authHeaders.Authorization) {
        const token = authHeaders.Authorization.replace('Bearer ', '');
        this.coreStorageService.setAuthToken(token);
      }
    }

    logger.info(LogCategory.API_REQUEST, 'StorageService initialized with @isa/core SDK', { 
      baseUrl: this.baseUrl
    });
  }

  // ================================================================================
  // File Management Methods
  // ================================================================================

  /**
   * 上传文件
   * 
   * 示例：
   * ```typescript
   * const file = event.target.files[0];
   * const result = await storageService.uploadFile(file, {
   *   user_id: 'user123',
   *   access_level: 'private',
   *   metadata: { project: 'AI-Project' },
   *   tags: ['document', 'report']
   * });
   * console.log('文件已上传:', result.file_id);
   * console.log('下载链接:', result.download_url);
   * ```
   */
  async uploadFile(
    file: File | Blob,
    request: FileUploadRequest
  ): Promise<FileUploadResponse> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Uploading file', {
        fileName: file instanceof File ? file.name : 'blob',
        size: file.size,
        userId: request.user_id
      });

      const fileName = file instanceof File ? file.name : 'upload.bin';
      const result = await this.coreStorageService.uploadFile(file, fileName, request);

      logger.info(LogCategory.API_REQUEST, 'File uploaded successfully', {
        fileId: result.file_id,
        size: result.file_size
      });

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to upload file', { error });
      throw error;
    }
  }

  /**
   * 列出用户的文件
   * 
   * 示例：
   * ```typescript
   * const files = await storageService.listFiles({
   *   user_id: 'user123',
   *   prefix: 'documents/',
   *   status: 'available',
   *   limit: 50,
   *   offset: 0
   * });
   * files.forEach(file => {
   *   console.log(`${file.file_name} - ${file.file_size} bytes`);
   * });
   * ```
   */
  async listFiles(request: FileListRequest): Promise<FileInfoResponse[]> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Listing files', { request });

      const files = await this.coreStorageService.listFiles(request);

      logger.info(LogCategory.API_REQUEST, 'Files listed successfully', {
        count: files.length
      });

      return files;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to list files', { error });
      throw error;
    }
  }

  /**
   * 获取文件信息
   * 
   * 示例：
   * ```typescript
   * const fileInfo = await storageService.getFileInfo('file-id-123', 'user123');
   * console.log('文件名:', fileInfo.file_name);
   * console.log('大小:', fileInfo.file_size);
   * console.log('下载链接:', fileInfo.download_url);
   * ```
   */
  async getFileInfo(fileId: string, userId: string): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting file info', { fileId, userId });

      const fileInfo = await this.coreStorageService.getFileInfo(fileId, userId);

      logger.info(LogCategory.API_REQUEST, 'File info retrieved successfully', {
        fileName: fileInfo.file_name
      });

      return fileInfo;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get file info', { error });
      throw error;
    }
  }

  /**
   * 获取文件下载 URL
   * 
   * 示例：
   * ```typescript
   * const downloadUrl = await storageService.getDownloadUrl('file-id-123', 'user123');
   * window.open(downloadUrl, '_blank'); // 在新窗口打开下载链接
   * ```
   */
  async getDownloadUrl(fileId: string, userId: string): Promise<string> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting download URL', { fileId, userId });

      const result = await this.coreStorageService.getDownloadUrl(fileId, userId);
      const url =
        typeof result === 'string'
          ? result
          : (result as any)?.download_url || '';

      if (!url) {
        throw new Error('Storage service did not return a download URL');
      }

      logger.info(LogCategory.API_REQUEST, 'Download URL retrieved successfully');

      return url;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get download URL', { error });
      throw error;
    }
  }

  /**
   * 删除文件
   * 
   * 示例：
   * ```typescript
   * const result = await storageService.deleteFile('file-id-123', 'user123');
   * console.log(result.message); // "File deleted successfully"
   * ```
   */
  async deleteFile(fileId: string, userId: string): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Deleting file', { fileId, userId });

      const result = await this.coreStorageService.deleteFile(fileId, userId);

      logger.info(LogCategory.API_REQUEST, 'File deleted successfully');

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to delete file', { error });
      throw error;
    }
  }

  // ================================================================================
  // File Sharing Methods
  // ================================================================================

  /**
   * 分享文件
   * 
   * 示例：
   * ```typescript
   * const shareResult = await storageService.shareFile({
   *   file_id: 'file-id-123',
   *   shared_by: 'user123',
   *   shared_with_email: 'colleague@example.com',
   *   permissions: { view: true, download: true, delete: false },
   *   expires_hours: 24,
   *   password: 'secret123'
   * });
   * console.log('分享链接:', shareResult.share_url);
   * console.log('访问令牌:', shareResult.access_token);
   * ```
   */
  async shareFile(request: {
    file_id: string;
    shared_by: string;
    shared_with?: string;
    shared_with_email?: string;
    permissions?: {
      view: boolean;
      download: boolean;
      delete: boolean;
    };
    password?: string;
    expires_hours?: number;
    max_downloads?: number;
  }): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Sharing file', { fileId: request.file_id });

      const result = await this.coreStorageService.shareFile(request);

      logger.info(LogCategory.API_REQUEST, 'File shared successfully', {
        shareId: result.share_id
      });

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to share file', { error });
      throw error;
    }
  }

  /**
   * 获取分享信息
   * 
   * 示例：
   * ```typescript
   * const shareInfo = await storageService.getShareInfo('share-id-123');
   * console.log('过期时间:', shareInfo.expires_at);
   * console.log('权限:', shareInfo.permissions);
   * ```
   */
  async getShareInfo(shareId: string): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting share info', { shareId });

      const result = await this.coreStorageService.getShareInfo(shareId);

      logger.info(LogCategory.API_REQUEST, 'Share info retrieved successfully');

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get share info', { error });
      throw error;
    }
  }

  /**
   * 撤销分享
   * 
   * 示例：
   * ```typescript
   * const result = await storageService.revokeShare('share-id-123', 'user123');
   * console.log(result.message); // "Share revoked successfully"
   * ```
   */
  async revokeShare(shareId: string, userId: string): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Revoking share', { shareId, userId });

      const result = await this.coreStorageService.revokeShare(shareId, userId);

      logger.info(LogCategory.API_REQUEST, 'Share revoked successfully');

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to revoke share', { error });
      throw error;
    }
  }

  // ================================================================================
  // Storage Quota Methods
  // ================================================================================

  /**
   * 获取存储配额
   * 
   * 示例：
   * ```typescript
   * const quota = await storageService.getQuota('user123');
   * console.log('总配额:', quota.total_quota_bytes);
   * console.log('已使用:', quota.used_bytes);
   * console.log('剩余:', quota.available_bytes);
   * console.log('使用率:', quota.usage_percentage + '%');
   * ```
   */
  async getQuota(userId: string, organizationId?: string): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting storage quota', { userId });

      const quota = await this.coreStorageService.getQuota(userId, organizationId);

      logger.info(LogCategory.API_REQUEST, 'Storage quota retrieved successfully', {
        usagePercentage: quota.usage_percentage
      });

      return quota;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get storage quota', { error });
      throw error;
    }
  }

  /**
   * 获取存储统计
   * 
   * 示例：
   * ```typescript
   * const stats = await storageService.getStats('user123');
   * console.log('文件数量:', stats.file_count);
   * console.log('按类型统计:', stats.by_type);
   * console.log('按状态统计:', stats.by_status);
   * ```
   */
  async getStats(userId: string, organizationId?: string): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting storage stats', { userId });

      const stats = await this.coreStorageService.getStats(userId, organizationId);

      logger.info(LogCategory.API_REQUEST, 'Storage stats retrieved successfully', {
        fileCount: stats.file_count
      });

      return stats;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get storage stats', { error });
      throw error;
    }
  }

  // ================================================================================
  // Photo Version Management Methods
  // ================================================================================

  /**
   * 保存照片版本（AI 处理后）
   * 
   * 示例：
   * ```typescript
   * const versionResult = await storageService.savePhotoVersion({
   *   photo_id: 'photo-123',
   *   user_id: 'user123',
   *   version_name: 'AI Enhanced',
   *   version_type: 'ai_enhanced',
   *   source_url: 'https://ai-result.com/image.jpg',
   *   set_as_current: true
   * });
   * console.log('版本 ID:', versionResult.version_id);
   * console.log('云存储 URL:', versionResult.cloud_url);
   * ```
   */
  async savePhotoVersion(request: SavePhotoVersionRequest): Promise<SavePhotoVersionResponse> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Saving photo version', {
        photoId: request.photo_id,
        versionName: request.version_name
      });

      const result = await this.coreStorageService.savePhotoVersion(request);

      logger.info(LogCategory.API_REQUEST, 'Photo version saved successfully', {
        versionId: result.version_id
      });

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to save photo version', { error });
      throw error;
    }
  }

  /**
   * 获取照片的所有版本
   * 
   * 示例：
   * ```typescript
   * const photoVersions = await storageService.getPhotoVersions({
   *   photo_id: 'photo-123',
   *   user_id: 'user123',
   *   include_metadata: true
   * });
   * console.log('版本数量:', photoVersions.version_count);
   * photoVersions.versions.forEach(v => {
   *   console.log(`${v.version_name} - ${v.is_current ? '当前' : ''}`);
   * });
   * ```
   */
  async getPhotoVersions(request: {
    photo_id: string;
    user_id: string;
    include_metadata?: boolean;
  }): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Getting photo versions', {
        photoId: request.photo_id
      });

      const result = await this.coreStorageService.getPhotoVersions(request);

      logger.info(LogCategory.API_REQUEST, 'Photo versions retrieved successfully', {
        versionCount: result.version_count
      });

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get photo versions', { error });
      throw error;
    }
  }

  /**
   * 切换照片当前版本
   * 
   * 示例：
   * ```typescript
   * const result = await storageService.switchPhotoVersion({
   *   photo_id: 'photo-123',
   *   version_id: 'version-456',
   *   user_id: 'user123'
   * });
   * console.log(result.message); // "Version switched successfully"
   * ```
   */
  async switchPhotoVersion(request: {
    photo_id: string;
    version_id: string;
    user_id: string;
  }): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Switching photo version', {
        photoId: request.photo_id,
        versionId: request.version_id
      });

      const result = await this.coreStorageService.switchPhotoVersion(request);

      logger.info(LogCategory.API_REQUEST, 'Photo version switched successfully');

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to switch photo version', { error });
      throw error;
    }
  }

  // ================================================================================
  // Intelligent Search & RAG Methods
  // ================================================================================

  /**
   * 语义搜索文件
   * 
   * 示例：
   * ```typescript
   * const searchResults = await storageService.semanticSearch({
   *   user_id: 'user123',
   *   query: '关于人工智能的研究报告',
   *   top_k: 5
   * });
   * searchResults.results.forEach(result => {
   *   console.log(`${result.file_name} - 相关度: ${result.score}`);
   *   console.log(`摘要: ${result.content_snippet}`);
   * });
   * ```
   */
  async semanticSearch(request: {
    user_id: string;
    organization_id?: string;
    query: string;
    top_k?: number;
    filters?: Record<string, any>;
  }): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Performing semantic search', {
        userId: request.user_id,
        query: request.query
      });

      const result = await this.coreStorageService.semanticSearch(request);

      logger.info(LogCategory.API_REQUEST, 'Semantic search completed successfully', {
        totalResults: result.total_results
      });

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to perform semantic search', { error });
      throw error;
    }
  }

  /**
   * RAG 问答
   * 
   * 支持多种 RAG 模式：
   * - simple: 标准 RAG
   * - raptor: 递归摘要树 RAG
   * - self_rag: 自我反思 RAG
   * - crag: 校正式 RAG
   * - plan_rag: 计划式 RAG
   * - hm_rag: 混合记忆 RAG
   * 
   * 示例：
   * ```typescript
   * const answer = await storageService.ragQuery({
   *   user_id: 'user123',
   *   query: '根据我的文档，项目的主要目标是什么？',
   *   mode: 'simple',
   *   top_k: 3,
   *   include_sources: true
   * });
   * console.log('回答:', answer.answer);
   * console.log('来源:');
   * answer.sources.forEach(source => {
   *   console.log(`- ${source.file_name}: ${source.excerpt}`);
   * });
   * ```
   */
  async ragQuery(request: {
    user_id: string;
    organization_id?: string;
    query: string;
    mode?: 'simple' | 'raptor' | 'self_rag' | 'crag' | 'plan_rag' | 'hm_rag';
    top_k?: number;
    include_sources?: boolean;
  }): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Performing RAG query', {
        userId: request.user_id,
        query: request.query,
        mode: request.mode || 'simple'
      });

      const result = await this.coreStorageService.ragQuery(request);

      logger.info(LogCategory.API_REQUEST, 'RAG query completed successfully', {
        sourcesCount: result.sources.length
      });

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to perform RAG query', { error });
      throw error;
    }
  }

  // ================================================================================
  // Health Check
  // ================================================================================

  /**
   * 健康检查
   * 
   * 示例：
   * ```typescript
   * const health = await storageService.healthCheck();
   * console.log('状态:', health.status);
   * console.log('时间:', health.timestamp);
   * ```
   */
  async healthCheck(): Promise<any> {
    try {
      logger.info(LogCategory.API_REQUEST, 'Performing storage service health check');

      const result = await this.coreStorageService.healthCheck();

      logger.info(LogCategory.API_REQUEST, 'Health check completed successfully', {
        status: result.status
      });

      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Health check failed', { error });
      throw error;
    }
  }
}

// ================================================================================
// Export singleton instance
// ================================================================================

let storageServiceInstance: StorageService | null = null;

/**
 * 获取 StorageService 单例实例
 * 
 * 示例：
 * ```typescript
 * import { getStorageService } from '@/api/storageService';
 * 
 * const storageService = getStorageService();
 * const files = await storageService.listFiles({ user_id: 'user123' });
 * ```
 */
export function getStorageService(baseUrl?: string): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService(baseUrl);
  }
  return storageServiceInstance;
}

// Default export
export default StorageService;
