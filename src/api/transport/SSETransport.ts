/**
 * SSETransport — app compatibility adapter over @isa/transport SSEClient.
 *
 * chatService still consumes the historical createSSETransport().connect().stream()
 * contract. The generic SSE connection mechanics now live in the SDK client.
 */

import { SSEClient } from '@isa/transport';
import { createLogger, LogCategory } from '../../utils/logger';

const log = createLogger('SSETransport', LogCategory.API_REQUEST);

export enum ConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  STREAMING = 'streaming',
  CLOSING = 'closing',
  CLOSED = 'closed',
  ERROR = 'error',
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

type Unsubscribe = () => void;

export class SSEConnection {
  public readonly id: string;
  public readonly url: string;
  public readonly protocol = 'sse';

  private _state: ConnectionState = ConnectionState.IDLE;
  private listeners = new Map<string, ConnectionEventListener[]>();
  private metadata: Record<string, any> = {};
  private client: SSEClient | null = null;
  private unsubs: Unsubscribe[] = [];
  private queue: string[] = [];
  private waiters: Array<(value: IteratorResult<string>) => void> = [];
  private streamClosed = false;

  constructor(private config: SSETransportConfig) {
    this.id = `conn_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.url = config.url;
  }

  get state(): ConnectionState {
    return this._state;
  }

  async connect(options: ConnectionOptions = {}): Promise<void> {
    if (this.isConnected()) return;

    this.setState(ConnectionState.CONNECTING);
    this.streamClosed = false;

    const method = options.method === 'GET' ? 'GET' : 'POST';
    const headers = {
      ...this.config.headers,
      ...options.headers,
    };

    this.client = new SSEClient({
      url: this.config.url,
      headers,
      method,
      body: this.normalizeBody(options.body),
      timeout: this.config.timeout,
      reconnect: Boolean(this.config.maxReconnectAttempts ?? this.config.retryConfig?.maxRetries),
      reconnectInterval: this.config.reconnectInterval ?? this.config.retryConfig?.retryDelay,
      maxReconnectAttempts: this.config.maxReconnectAttempts ?? this.config.retryConfig?.maxRetries,
      withCredentials: this.config.withCredentials,
    });

    this.unsubs = [
      this.client.onEvent(event => {
        const raw = this.formatEvent(event);
        this.emit('data', { data: raw, timestamp: Date.now() });
        this.enqueue(raw);
      }),
      this.client.onConnection(event => {
        if (event.type === 'connected') {
          this.setState(ConnectionState.CONNECTED);
          this.emit('open', { timestamp: Date.now() });
        } else if (event.type === 'disconnected') {
          this.closeQueuedStream();
          this.setState(ConnectionState.CLOSED);
          this.emit('close', { timestamp: Date.now() });
        } else if (event.type === 'error') {
          const error = new Error(String(event.details?.message || 'SSE connection error'));
          this.setState(ConnectionState.ERROR);
          this.emit('error', { error, timestamp: Date.now() });
        }
      }),
    ];

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        this.close().catch(error => log.warn('Failed to close aborted SSE connection', error));
      }, { once: true });
    }

    await this.client.connect();
    if (this._state === ConnectionState.CONNECTING) {
      this.setState(ConnectionState.CONNECTED);
    }
  }

  async close(code?: number, reason?: string): Promise<void> {
    if (this._state === ConnectionState.CLOSED || this._state === ConnectionState.CLOSING) return;

    this.setState(ConnectionState.CLOSING);
    this.setMetadata('closeCode', code);
    this.setMetadata('closeReason', reason);

    for (const unsub of this.unsubs) {
      unsub();
    }
    this.unsubs = [];

    this.client?.disconnect();
    this.client = null;
    this.closeQueuedStream();
    this.setState(ConnectionState.CLOSED);
    this.emit('close', { data: { code, reason }, timestamp: Date.now() });
  }

  async* stream(): AsyncIterable<string> {
    if (!this.isConnected()) {
      throw this.createError('Connection not established', 'NOT_CONNECTED');
    }

    this.setState(ConnectionState.STREAMING);

    try {
      while (true) {
        if (this.queue.length > 0) {
          yield this.queue.shift()!;
          continue;
        }

        if (this.streamClosed) break;

        const result = await new Promise<IteratorResult<string>>(resolve => {
          this.waiters.push(resolve);
        });
        if (result.done) break;
        yield result.value;
      }
    } finally {
      if (this._state === ConnectionState.STREAMING) {
        this.setState(ConnectionState.CONNECTED);
      }
    }
  }

  on(event: string, listener: ConnectionEventListener): void {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.push(listener);
    this.listeners.set(event, eventListeners);
  }

  off(event: string, listener: ConnectionEventListener): void {
    const eventListeners = this.listeners.get(event) || [];
    const index = eventListeners.indexOf(listener);
    if (index >= 0) eventListeners.splice(index, 1);
  }

  isConnected(): boolean {
    return this._state === ConnectionState.CONNECTED || this._state === ConnectionState.STREAMING;
  }

  isStreaming(): boolean {
    return this._state === ConnectionState.STREAMING;
  }

  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  private enqueue(value: string): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value, done: false });
      return;
    }
    this.queue.push(value);
  }

  private closeQueuedStream(): void {
    this.streamClosed = true;
    while (this.waiters.length > 0) {
      this.waiters.shift()?.({ value: undefined as any, done: true });
    }
  }

  private normalizeBody(body?: string | FormData | ArrayBuffer): string | object | undefined {
    if (!body) return undefined;
    if (typeof body === 'string') return body;
    return body as any;
  }

  private formatEvent(event: { event: string; data: string; id?: string }): string {
    const lines: string[] = [];
    if (event.id) lines.push(`id: ${event.id}`);
    if (event.event && event.event !== 'message') lines.push(`event: ${event.event}`);
    lines.push(`data: ${event.data}`);
    return lines.join('\n');
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
      timestamp: Date.now(),
    });
  }

  private emit(event: string, eventData: Omit<ConnectionEvent, 'type'> & { type?: any }): void {
    const listeners = this.listeners.get(event) || [];
    const connectionEvent: ConnectionEvent = {
      type: eventData.type || event as any,
      data: eventData.data,
      error: eventData.error,
      timestamp: eventData.timestamp || Date.now(),
    };

    for (const listener of listeners) {
      try {
        listener(connectionEvent);
      } catch (error) {
        log.error(`Connection ${this.id}: Event listener error`, error);
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

export class SSETransportFactory {
  readonly protocol = 'sse';

  async createConnection(config: ConnectionConfig): Promise<SSEConnection> {
    return new SSEConnection({
      ...config,
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
      withCredentials: true,
    });
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

export class SSETransport {
  private factory = new SSETransportFactory();

  constructor(private config: SSETransportConfig = { url: '' }) {}

  async connect(endpoint: string, options: ConnectionOptions = {}): Promise<SSEConnection> {
    const connection = await this.factory.createConnection({
      ...this.config,
      url: endpoint,
    });
    await connection.connect(options);
    return connection;
  }

  updateConfig(newConfig: Partial<SSETransportConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): Readonly<SSETransportConfig> {
    return { ...this.config };
  }
}

export const createSSETransport = (config: SSETransportConfig = { url: '' }): SSETransport =>
  new SSETransport(config);

export const createSSETransportFactory = (): SSETransportFactory =>
  new SSETransportFactory();

export const StandardSSEConfig: SSETransportConfig = {
  url: '',
  timeout: 300000,
  reconnectInterval: 1000,
  maxReconnectAttempts: 3,
  withCredentials: true,
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 1.5,
  },
};

export const LongLivedSSEConfig: SSETransportConfig = {
  ...StandardSSEConfig,
  timeout: 600000,
  maxReconnectAttempts: 5,
  reconnectInterval: 2000,
};
