/**
 * ============================================================================
 * Base API Service - Using @isa/transport SDK
 * ============================================================================
 * 
 * Migrated from custom implementation to @isa/transport HttpClient
 * 
 * Architecture Benefits:
 * ✅ SDK: @isa/transport HttpClient with standardized HTTP handling
 * ✅ Types: SDK-provided type safety
 * ✅ Error handling: Built-in SDK error management
 * ✅ Retry logic: Built-in request retry and timeout
 */

import { HttpClient } from '@isa/transport';
import { getAuthHeaders } from '../config/gatewayConfig';
import { getGatewayUrl } from '../config/runtimeEnv';

// Re-export common types for compatibility
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ================================================================================
// BaseApiService Class (Compatibility Wrapper)
// ================================================================================

export class BaseApiService {
  private httpClient: HttpClient;
  private getAuthHeadersFn?: () => Promise<Record<string, string>>;

  constructor(
    baseUrl?: string,
    timeout?: number,
    getAuthHeadersFn?: () => Promise<Record<string, string>>
  ) {
    this.httpClient = new HttpClient({
      baseURL: baseUrl || getGatewayUrl(),
      timeout: timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Set up auth headers if provided
    if (getAuthHeadersFn) {
      this.setAuthProvider(getAuthHeadersFn);
    }
  }

  // ================================================================================
  // HTTP Methods
  // ================================================================================

  async get<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    try {
      const mergedConfig = await this.mergeAuthHeaders(config);
      const data = await this.httpClient.get<T>(url, mergedConfig);
      return { success: true, data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    try {
      const mergedConfig = await this.mergeAuthHeaders(config);
      const responseData = await this.httpClient.post<T>(url, data, mergedConfig);
      return { success: true, data: responseData };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    try {
      const mergedConfig = await this.mergeAuthHeaders(config);
      const responseData = await this.httpClient.put<T>(url, data, mergedConfig);
      return { success: true, data: responseData };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    try {
      const mergedConfig = await this.mergeAuthHeaders(config);
      const responseData = await this.httpClient.patch<T>(url, data, mergedConfig);
      return { success: true, data: responseData };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    try {
      const mergedConfig = await this.mergeAuthHeaders(config);
      const responseData = await this.httpClient.delete<T>(url, mergedConfig);
      return { success: true, data: responseData };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================================================================================
  // Utility Methods
  // ================================================================================

  private handleError(error: any): ApiResponse {
    console.error('API Error:', error);
    
    return {
      success: false,
      error: error.message || 'An unknown error occurred',
      data: null
    };
  }

  setAuthProvider(getAuthHeadersFn: () => Promise<Record<string, string>>): void {
    this.getAuthHeadersFn = getAuthHeadersFn;
  }

  private async mergeAuthHeaders(config?: any): Promise<any> {
    if (!this.getAuthHeadersFn) return config || {};
    try {
      const authHeaders = await this.getAuthHeadersFn();
      return {
        ...config,
        headers: { ...authHeaders, ...config?.headers }
      };
    } catch {
      return config || {};
    }
  }

  // ================================================================================
  // Legacy Compatibility Methods
  // ================================================================================

  /**
   * Create SSE connection (compatibility method)
   */
  createSSEConnection(url: string, options?: any): EventSource {
    // For now, create a basic EventSource
    // In a full implementation, this would use @isa/transport SSE client
    const eventSource = new EventSource(url);
    return eventSource;
  }

  /**
   * Upload file (compatibility method)
   */
  async uploadFile(url: string, file: File, config?: any): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const mergedConfig = await this.mergeAuthHeaders(config);
      // Do NOT set Content-Type — the browser must set it with the multipart boundary
      const { 'Content-Type': _, ...headersWithoutCT } = mergedConfig?.headers || {};

      const responseData = await this.httpClient.post(url, formData, {
        ...mergedConfig,
        headers: headersWithoutCT
      });

      return { success: true, data: responseData };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await this.get('/health');
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Health check failed',
        data: null
      };
    }
  }
}

// For backwards compatibility, also export as default
export default BaseApiService;
