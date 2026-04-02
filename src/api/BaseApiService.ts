/**
 * ============================================================================
 * Base API Service (BaseApiService.ts) - 核心API传输层服务
 * ============================================================================
 * 
 * 【核心职责】
 * - 提供统一的HTTP、SSE、WebSocket传输接口
 * - 支持axios和fetch两种HTTP客户端
 * - 统一的错误处理和响应格式化
 * - 自动重试、超时、拦截器管理
 * 
 * 【传输协议支持】
 * ✅ HTTP - GET, POST, PUT, DELETE, PATCH
 * ✅ SSE - Server-Sent Events 流式数据
 * ✅ WebSocket - 双向实时通信
 * ✅ File Upload - 文件上传支持
 * 
 * 【客户端支持】
 * ✅ Axios - 功能丰富的HTTP客户端
 * ✅ Fetch - 原生浏览器API
 * ✅ 自动降级和兼容性处理
 * 
 * 【关注点分离】
 * ✅ 负责：
 *   - 网络传输层的统一封装
 *   - 请求/响应的标准化处理
 *   - 连接管理和错误重试
 *   - 认证和头部管理
 * 
 * ❌ 不负责：
 *   - 具体业务逻辑（由具体service处理）
 *   - 数据验证和转换（由具体service处理）
 *   - UI状态管理（由hooks和stores处理）
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError 
} from 'axios';
import { config } from '../config';
import { createLogger, LogCategory } from '../utils/logger';
import { getCredentialsMode } from '../utils/authCookieHelper';

const log = createLogger('BaseApiService', LogCategory.API_REQUEST);

// ================================================================================
// 类型定义
// ================================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  timestamp?: string;
}

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  useAxios?: boolean; // 选择使用axios还是fetch
  validateStatus?: (status: number) => boolean;
}

export interface SSEConfig {
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: Event) => void;
  retryInterval?: number;
  maxRetries?: number;
}

export interface WebSocketConfig {
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  protocols?: string | string[];
  retryInterval?: number;
  maxRetries?: number;
}

export interface UploadConfig extends RequestConfig {
  onProgress?: (progressEvent: ProgressEvent) => void;
  multiple?: boolean;
}

// ================================================================================
// Base API Service 类
// ================================================================================

export class BaseApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private axiosInstance: AxiosInstance;
  private abortControllers: Map<string, AbortController>;
  private getAuthHeaders?: () => Promise<Record<string, string>>;

  constructor(baseUrl?: string, timeout?: number, getAuthHeaders?: () => Promise<Record<string, string>>) {
    this.baseUrl = baseUrl || config.api.baseUrl;
    this.timeout = timeout || config.api.timeout;
    this.abortControllers = new Map();
    this.getAuthHeaders = getAuthHeaders;
    
    // 默认请求头
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // 初始化axios实例 — withCredentials sends cookies cross-origin
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: this.defaultHeaders,
      withCredentials: true,
    });

    this.setupAxiosInterceptors();
  }

  // ================================================================================
  // Axios 拦截器配置
  // ================================================================================

  private setupAxiosInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config: any) => {
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        const endTime = Date.now();
        const startTime = (response.config as any).metadata?.startTime || endTime;
        log.debug(`API Request took ${endTime - startTime}ms`);
        return response;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );
  }

  // ================================================================================
  // HTTP 请求方法 (支持 Axios 和 Fetch)
  // ================================================================================

  /**
   * 通用HTTP请求方法
   */
  async request<T = any>(
    endpoint: string, 
    config: RequestConfig & { body?: any } = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      timeout = this.timeout,
      retries = config.retries || 3,
      useAxios = true,
      body,
      validateStatus
    } = config;

    const requestId = `${method}-${endpoint}-${Date.now()}`;
    
    try {
      if (useAxios) {
        return await this.executeAxiosRequest<T>(endpoint, {
          method,
          headers,
          timeout,
          retries,
          body,
          validateStatus
        }, requestId);
      } else {
        return await this.executeFetchRequest<T>(endpoint, {
          method,
          headers,
          timeout,
          retries,
          body
        }, requestId);
      }
    } catch (error) {
      return this.handleRequestError(error);
    }
  }

  /**
   * 使用Axios执行请求
   */
  private async executeAxiosRequest<T>(
    endpoint: string,
    config: any,
    requestId: string
  ): Promise<ApiResponse<T>> {
    const { method, headers, timeout, retries, body, validateStatus } = config;
    
    // 获取认证头部
    let authHeaders = {};
    if (this.getAuthHeaders) {
      try {
        authHeaders = await this.getAuthHeaders();
      } catch (error) {
        log.warn('Failed to get auth headers', error);
      }
    }
    
    const axiosConfig: AxiosRequestConfig = {
      url: endpoint,
      method: method.toLowerCase(),
      headers: { ...this.defaultHeaders, ...authHeaders, ...headers },
      timeout,
      validateStatus: validateStatus || ((status: number) => status < 400),
      data: body
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.axiosInstance.request<T>(axiosConfig);
        
        return {
          success: true,
          data: response.data,
          statusCode: response.status,
          headers: response.headers as Record<string, string>,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * 使用Fetch执行请求
   */
  private async executeFetchRequest<T>(
    endpoint: string,
    config: any,
    requestId: string
  ): Promise<ApiResponse<T>> {
    const { method, headers, timeout, retries, body } = config;
    
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    // 获取认证头部
    let authHeaders = {};
    if (this.getAuthHeaders) {
      try {
        authHeaders = await this.getAuthHeaders();
      } catch (error) {
        log.warn('Failed to get auth headers', error);
      }
    }
    
    const url = this.buildUrl(endpoint);
    const requestHeaders = { ...this.defaultHeaders, ...authHeaders, ...headers };

    // 设置超时
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          credentials: getCredentialsMode(),
        });

        clearTimeout(timeoutId);
        this.abortControllers.delete(requestId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          success: true,
          data,
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw new Error('Max retries exceeded');
  }

  // ================================================================================
  // 便捷HTTP方法
  // ================================================================================

  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async patch<T = any>(endpoint: string, body?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  // ================================================================================
  // 文件上传
  // ================================================================================

  async uploadFile(
    endpoint: string, 
    files: File | File[], 
    additionalData?: Record<string, any>,
    config?: UploadConfig
  ): Promise<ApiResponse> {
    const formData = new FormData();
    
    // 处理单个或多个文件
    if (Array.isArray(files)) {
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
    } else {
      formData.append('file', files);
    }

    // 添加额外数据
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const url = this.buildUrl(endpoint);
    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type']; // 让浏览器自动设置multipart boundary

    try {
      if (config?.useAxios !== false) {
        // 使用Axios上传
        const response = await this.axiosInstance.post(endpoint, formData, {
          headers,
          timeout: config?.timeout || this.timeout * 3, // 上传超时时间更长
          onUploadProgress: config?.onProgress as any
        });

        return {
          success: true,
          data: response.data,
          statusCode: response.status,
          timestamp: new Date().toISOString()
        };
      } else {
        // 使用Fetch上传
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          headers,
          credentials: getCredentialsMode(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          success: true,
          data,
          statusCode: response.status,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return this.handleRequestError(error);
    }
  }

  // ================================================================================
  // Server-Sent Events (SSE)
  // ================================================================================

  createSSEConnection(endpoint: string, config?: SSEConfig): EventSource {
    const url = this.buildUrl(endpoint);
    const eventSource = new EventSource(url);

    // 设置事件监听器
    if (config?.onMessage) {
      eventSource.onmessage = config.onMessage;
    }

    if (config?.onError) {
      eventSource.onerror = config.onError;
    }

    if (config?.onOpen) {
      eventSource.onopen = config.onOpen;
    }

    // 自动重连逻辑
    if (config?.maxRetries && config?.retryInterval) {
      let retryCount = 0;
      
      eventSource.onerror = (error) => {
        if (retryCount < config.maxRetries!) {
          setTimeout(() => {
            retryCount++;
            log.info(`SSE reconnect attempt ${retryCount}`);
          }, config.retryInterval);
        }
        
        config.onError?.(error);
      };
    }

    return eventSource;
  }

  // ================================================================================
  // WebSocket 连接
  // ================================================================================

  createWebSocketConnection(endpoint: string, config?: WebSocketConfig): WebSocket {
    const url = this.buildWSUrl(endpoint);
    const ws = new WebSocket(url, config?.protocols);

    // 设置事件监听器
    if (config?.onMessage) {
      ws.onmessage = config.onMessage;
    }

    if (config?.onError) {
      ws.onerror = config.onError;
    }

    if (config?.onOpen) {
      ws.onopen = config.onOpen;
    }

    if (config?.onClose) {
      ws.onclose = config.onClose;
    }

    // 自动重连逻辑
    if (config?.maxRetries && config?.retryInterval) {
      let retryCount = 0;
      
      ws.onclose = (event) => {
        if (event.code !== 1000 && retryCount < config.maxRetries!) {
          setTimeout(() => {
            retryCount++;
            log.info(`WebSocket reconnect attempt ${retryCount}`);
            return this.createWebSocketConnection(endpoint, config);
          }, config.retryInterval);
        }
        
        config.onClose?.(event);
      };
    }

    return ws;
  }

  // ================================================================================
  // 认证和头部管理
  // ================================================================================

  setAuthToken(token: string, type: 'Bearer' | 'API-Key' | 'Basic' = 'Bearer'): void {
    this.defaultHeaders['Authorization'] = `${type} ${token}`;
    this.axiosInstance.defaults.headers.common['Authorization'] = `${type} ${token}`;
  }

  clearAuth(): void {
    delete this.defaultHeaders['Authorization'];
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }

  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
    this.axiosInstance.defaults.headers.common[key] = value;
  }

  removeHeader(key: string): void {
    delete this.defaultHeaders[key];
    delete this.axiosInstance.defaults.headers.common[key];
  }

  // ================================================================================
  // 连接管理
  // ================================================================================

  cancelRequest(requestId?: string): void {
    if (requestId && this.abortControllers.has(requestId)) {
      this.abortControllers.get(requestId)?.abort();
      this.abortControllers.delete(requestId);
    } else {
      // 取消所有请求
      this.abortControllers.forEach(controller => controller.abort());
      this.abortControllers.clear();
    }
  }

  // ================================================================================
  // 工具方法
  // ================================================================================

  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    const base = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    
    return `${base}${path}`;
  }

  private buildWSUrl(endpoint: string): string {
    const httpUrl = this.buildUrl(endpoint);
    return httpUrl.replace(/^http/, 'ws');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleRequestError(error: any): ApiResponse {
    log.error('API Request Error', error);
    
    let errorMessage = 'Unknown error';
    let statusCode = 0;

    if (axios.isAxiosError(error)) {
      errorMessage = error.message;
      statusCode = error.response?.status || 0;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      statusCode,
      timestamp: new Date().toISOString()
    };
  }
}

// ================================================================================
// 默认实例导出
// ================================================================================

// 预配置的API服务实例
export const apiService = new BaseApiService();

// 专用API服务实例
export const userApiService = new BaseApiService(config.externalApis.userServiceUrl);
export const aiApiService = new BaseApiService(config.externalApis.aiServiceUrl);
export const imageApiService = new BaseApiService(config.externalApis.imageServiceUrl);
export const contentApiService = new BaseApiService(config.externalApis.contentServiceUrl);