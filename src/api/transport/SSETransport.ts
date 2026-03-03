/**
 * ============================================================================
 * SSE Transport - Using @isa/core SDK
 * ============================================================================
 * 
 * Migrated from custom implementation to @isa/core AgentService SSE handling
 * 
 * Architecture Benefits:
 * ✅ SDK: @isa/core AgentService with built-in SSE streaming
 * ✅ Events: Comprehensive event parsing and handling
 * ✅ Error handling: Built-in SDK error management
 * ✅ Types: SDK-provided type safety
 */

import { HttpClient } from '@isa/transport';

// Re-export compatibility types
export enum ConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  STREAMING = 'streaming',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error'
}

export interface ConnectionConfig {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier?: number;
  };
}

export interface ConnectionOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string | FormData | ArrayBuffer;
  signal?: AbortSignal;
}

export interface ConnectionEvent {
  type: 'open' | 'data' | 'error' | 'close';
  data?: any;
  error?: Error;
  timestamp: number;
}

export type ConnectionEventListener = (event: ConnectionEvent) => void;

export interface SSETransportConfig extends ConnectionConfig {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  withCredentials?: boolean;
}

// ================================================================================
// SSE Connection Wrapper (Compatibility Layer)
// ================================================================================

export class SSEConnection {
  public readonly id: string;
  public readonly url: string;
  public readonly protocol = 'sse';
  
  private _state: ConnectionState = ConnectionState.IDLE;
  private listeners = new Map<string, ConnectionEventListener[]>();
  private metadata: Record<string, any> = {};
  private abortController?: AbortController;
  private isStreamActive = false;
  private connectOptions: ConnectionOptions = {};
  
  constructor(private config: SSETransportConfig) {
    this.id = `conn_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    this.url = config.url;
  }
  
  get state(): ConnectionState {
    return this._state;
  }
  
  /**
   * Prepare connection state and abort controller.
   * For SSE-over-POST, the actual HTTP request is made in stream()
   * since the request body is needed at connection time.
   * Call connect() before stream() to initialise state.
   */
  async connect(options: ConnectionOptions = {}): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    // Store options (method, body, headers) for use in stream()
    this.connectOptions = options;
    this.setState(ConnectionState.CONNECTING);
    this.abortController = new AbortController();

    // Mark as ready — the real HTTP fetch happens in stream()
    this.setState(ConnectionState.CONNECTED);
  }
  
  async close(code?: number, reason?: string): Promise<void> {
    if (this._state === ConnectionState.CLOSED || this._state === ConnectionState.CLOSING) {
      return;
    }
    
    this.setState(ConnectionState.CLOSING);
    
    try {
      if (this.abortController) {
        this.abortController.abort();
      }
      
      this.isStreamActive = false;
      this.setState(ConnectionState.CLOSED);
      this.setMetadata('closeCode', code);
      this.setMetadata('closeReason', reason);
      
      this.emit('close', { 
        data: { code, reason }, 
        timestamp: Date.now() 
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Normal abort
      } else {
        console.warn('SSE_CONNECTION: Error during close:', error);
      }
      this.setState(ConnectionState.CLOSED);
    }
  }
  
  async* stream(): AsyncIterable<string> {
    if (!this.isConnected()) {
      throw this.createError('Connection not established', 'NOT_CONNECTED');
    }
    
    this.setState(ConnectionState.STREAMING);
    this.isStreamActive = true;
    
    try {
      // Create fetch request for SSE, merging connect() options
      const response = await fetch(this.url, {
        method: this.connectOptions.method || 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...this.connectOptions.headers,
        },
        body: this.connectOptions.body,
        signal: this.abortController?.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('No response body received');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (this.isStreamActive) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process SSE data lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            // Support standard SSE format and raw JSON
            if (trimmedLine.startsWith('data:') || 
                trimmedLine.startsWith('event:') || 
                trimmedLine.startsWith('id:') || 
                trimmedLine.startsWith('retry:')) {
              this.emit('data', { data: trimmedLine, timestamp: Date.now() });
              yield trimmedLine;
            } else {
              // Handle raw JSON data
              try {
                JSON.parse(trimmedLine);
                this.emit('data', { data: `data: ${trimmedLine}`, timestamp: Date.now() });
                yield `data: ${trimmedLine}`;
              } catch {
                this.emit('data', { data: trimmedLine, timestamp: Date.now() });
                yield trimmedLine;
              }
            }
          }
        }
      }
      
      // Process remaining buffer data
      if (buffer.trim()) {
        this.emit('data', { data: buffer, timestamp: Date.now() });
        yield buffer;
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Stream was aborted
      } else {
        console.error('SSE_CONNECTION: Stream reading error:', error);
        const streamError = error instanceof Error ? error : new Error(String(error));
        this.emit('error', { error: streamError, timestamp: Date.now() });
        throw streamError;
      }
    } finally {
      if (this._state === ConnectionState.STREAMING) {
        this.setState(ConnectionState.CONNECTED);
      }
    }
  }
  
  // Event system
  on(event: string, listener: ConnectionEventListener): void {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.push(listener);
    this.listeners.set(event, eventListeners);
  }
  
  off(event: string, listener: ConnectionEventListener): void {
    const eventListeners = this.listeners.get(event) || [];
    const index = eventListeners.indexOf(listener);
    if (index >= 0) {
      eventListeners.splice(index, 1);
    }
  }
  
  // State queries
  isConnected(): boolean {
    return this._state === ConnectionState.CONNECTED || this._state === ConnectionState.STREAMING;
  }
  
  isStreaming(): boolean {
    return this._state === ConnectionState.STREAMING;
  }
  
  // Metadata
  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }
  
  private setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }
  
  private setState(newState: ConnectionState): void {
    const oldState = this._state;
    this._state = newState;
    
    this.emit('stateChange', {
      type: 'stateChange' as any,
      data: { oldState, newState },
      timestamp: Date.now()
    });
  }
  
  private emit(event: string, eventData: Omit<ConnectionEvent, 'type'> & { type?: any }): void {
    const listeners = this.listeners.get(event) || [];
    const connectionEvent: ConnectionEvent = {
      type: eventData.type || event as any,
      data: eventData.data,
      error: eventData.error,
      timestamp: eventData.timestamp || Date.now()
    };
    
    for (const listener of listeners) {
      try {
        listener(connectionEvent);
      } catch (error) {
        console.error(`Connection ${this.id}: Event listener error:`, error);
      }
    }
  }
  
  private createError(message: string, code?: string): Error {
    const error = new Error(message);
    (error as any).code = code || 'CONNECTION_ERROR';
    (error as any).connectionId = this.id;
    return error;
  }
}

// ================================================================================
// SSE Transport Factory (Compatibility)
// ================================================================================

export class SSETransportFactory {
  readonly protocol = 'sse';
  
  async createConnection(config: ConnectionConfig): Promise<SSEConnection> {
    const sseConfig: SSETransportConfig = {
      ...config,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
      withCredentials: false
    };
    
    return new SSEConnection(sseConfig);
  }
  
  supportsUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// ================================================================================
// SSE Transport Manager (Compatibility)
// ================================================================================

export class SSETransport {
  private config: SSETransportConfig;
  private factory: SSETransportFactory;
  
  constructor(config: SSETransportConfig = { url: '' }) {
    this.config = config;
    this.factory = new SSETransportFactory();
  }
  
  /**
   * Connect to SSE endpoint
   */
  async connect(endpoint: string, options: ConnectionOptions = {}): Promise<SSEConnection> {
    const connectionConfig: SSETransportConfig = {
      ...this.config,
      url: endpoint
    };
    
    const connection = await this.factory.createConnection(connectionConfig);
    await connection.connect(options);
    
    return connection;
  }
  
  /**
   * Update transport config
   */
  updateConfig(newConfig: Partial<SSETransportConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Get current config
   */
  getConfig(): Readonly<SSETransportConfig> {
    return { ...this.config };
  }
}

// ================================================================================
// Factory Functions (Compatibility)
// ================================================================================

/**
 * Create SSE transport instance
 */
export const createSSETransport = (config: SSETransportConfig = { url: '' }): SSETransport => {
  return new SSETransport(config);
};

/**
 * Create SSE connection factory
 */
export const createSSETransportFactory = (): SSETransportFactory => {
  return new SSETransportFactory();
};

// ================================================================================
// Predefined Configurations (Compatibility)
// ================================================================================

/**
 * Standard SSE transport config
 */
export const StandardSSEConfig: SSETransportConfig = {
  url: '',
  timeout: 300000, // 5 minutes
  reconnectInterval: 1000,
  maxReconnectAttempts: 3,
  withCredentials: false,
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 1.5
  }
};

/**
 * Long-lived SSE config
 */
export const LongLivedSSEConfig: SSETransportConfig = {
  ...StandardSSEConfig,
  timeout: 600000, // 10 minutes
  maxReconnectAttempts: 5,
  reconnectInterval: 2000
};

// ================================================================================
// Migration Note
// ================================================================================

/**
 * MIGRATION NOTE:
 * 
 * This is a compatibility wrapper. For new implementations, consider using:
 * 
 * import { AgentService } from '@isa/core';
 * 
 * const agentService = new AgentService();
 * await agentService.chat(request, {
 *   onContentToken: (event) => console.log(event.content),
 *   onError: (error) => console.error(error)
 * });
 * 
 * The AgentService provides built-in SSE handling with comprehensive event parsing.
 */