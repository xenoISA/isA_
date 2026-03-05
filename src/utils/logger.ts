/**
 * Comprehensive Logging System for Main App
 * Tracks entire data flow from user input to UI render
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export enum LogCategory {
  USER_INPUT = 'USER_INPUT',
  APP_TRIGGER = 'APP_TRIGGER',
  STATE_CHANGE = 'STATE_CHANGE',
  API_CALL = 'API_CALL',
  API_REQUEST = 'API_REQUEST',
  USER_AUTH = 'USER_AUTH',
  AI_MESSAGE = 'AI_MESSAGE',
  ARTIFACT_CREATION = 'ARTIFACT_CREATION',
  COMPONENT_RENDER = 'COMPONENT_RENDER',
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  SIDEBAR_INTERACTION = 'SIDEBAR_INTERACTION',
  EVENT_EMISSION = 'EVENT_EMISSION',
  CHAT_FLOW = 'CHAT_FLOW',
  TASK_MANAGEMENT = 'TASK_MANAGEMENT',
  SYSTEM = 'SYSTEM'
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  sessionId?: string;
  messageId?: string;
  appId?: string;
  component?: string;
  traceId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageSize: number;
  enableTracing: boolean;
}

class MainAppLogger {
  private config: LoggerConfig = {
    level: LogLevel.DEBUG,
    enableConsole: true,
    enableStorage: true,
    maxStorageSize: 1000,
    enableTracing: true
  };

  private logs: LogEntry[] = [];
  private currentTraceId: string | null = null;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.log(LogLevel.INFO, LogCategory.CHAT_FLOW, 'Logger initialized', { sessionId: this.sessionId });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public startTrace(operation: string): string {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentTraceId = traceId;
    this.log(LogLevel.DEBUG, LogCategory.CHAT_FLOW, `Started trace: ${operation}`, { traceId });
    return traceId;
  }

  public endTrace(): void {
    if (this.currentTraceId) {
      this.log(LogLevel.DEBUG, LogCategory.CHAT_FLOW, `Ended trace`, { traceId: this.currentTraceId });
      this.currentTraceId = null;
    }
  }

  public log(level: LogLevel, category: LogCategory, message: string, data?: any): void {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      sessionId: this.sessionId,
      traceId: this.currentTraceId || undefined
    };

    // Add to storage
    if (this.config.enableStorage) {
      this.logs.push(entry);
      if (this.logs.length > this.config.maxStorageSize) {
        this.logs.shift();
      }
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    // 在生产环境中限制console输出
    if (!this.shouldOutputToConsole(entry.level)) {
      return;
    }

    const levelEmoji = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌'
    };

    const categoryEmoji = {
      [LogCategory.USER_INPUT]: '👤',
      [LogCategory.APP_TRIGGER]: '🎯',
      [LogCategory.STATE_CHANGE]: '🔄',
      [LogCategory.API_CALL]: '🌐',
      [LogCategory.API_REQUEST]: '🌐',
      [LogCategory.USER_AUTH]: '🔐',
      [LogCategory.AI_MESSAGE]: '🤖',
      [LogCategory.ARTIFACT_CREATION]: '📦',
      [LogCategory.COMPONENT_RENDER]: '🎨',
      [LogCategory.COMPONENT_ERROR]: '💥',
      [LogCategory.SIDEBAR_INTERACTION]: '📋',
      [LogCategory.EVENT_EMISSION]: '📡',
      [LogCategory.CHAT_FLOW]: '💬',
      [LogCategory.TASK_MANAGEMENT]: '📋',
      [LogCategory.SYSTEM]: '⚙️'
    };

    const timestamp = new Date(entry.timestamp).toISOString().split('T')[1].slice(0, -1);
    const prefix = `${levelEmoji[entry.level]} ${categoryEmoji[entry.category]} [${timestamp}]`;
    
    const logMethod = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error
    }[entry.level];

    if (entry.data) {
      logMethod(`${prefix} ${entry.message}`, entry.data);
    } else {
      logMethod(`${prefix} ${entry.message}`);
    }
  }

  private shouldOutputToConsole(level: LogLevel): boolean {
    // 在生产环境中，只输出 warn 和 error 级别的日志
    if (process.env.NODE_ENV === 'production') {
      return level === LogLevel.WARN || level === LogLevel.ERROR;
    }
    
    // 在开发环境中，根据配置决定
    const enableDebugMode = process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true';
    if (!enableDebugMode && level === LogLevel.DEBUG) {
      return false;
    }
    
    return true;
  }

  // Convenience methods
  public debug(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  public info(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  public warn(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  public error(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  // Data flow tracking methods
  public trackUserInput(input: string, metadata?: any): void {
    this.info(LogCategory.USER_INPUT, 'User input received', { 
      input: input.substring(0, 100) + (input.length > 100 ? '...' : ''), 
      length: input.length,
      ...metadata 
    });
  }

  public trackAppTrigger(appId: string, trigger: string, input: string): void {
    this.info(LogCategory.APP_TRIGGER, 'App trigger detected', { 
      appId, 
      trigger, 
      input: input.substring(0, 50) + (input.length > 50 ? '...' : '') 
    });
  }

  public trackStateChange(stateName: string, oldValue: any, newValue: any, component?: string): void {
    this.debug(LogCategory.STATE_CHANGE, `State changed: ${stateName}`, { 
      stateName,
      oldValue,
      newValue,
      component,
      traceId: this.currentTraceId
    });
  }

  public trackAPICall(endpoint: string, method: string, payload?: any): void {
    this.info(LogCategory.API_CALL, `API call: ${method} ${endpoint}`, { 
      endpoint, 
      method, 
      payload: payload ? JSON.stringify(payload).substring(0, 200) : undefined 
    });
  }

  public trackAIMessage(message: any): void {
    this.info(LogCategory.AI_MESSAGE, 'AI message received', { 
      role: message.role,
      sender: message.metadata?.sender,
      messageId: message.id,
      contentLength: message.content?.length || 0,
      timestamp: message.timestamp
    });
  }

  public trackArtifactCreation(artifact: any): void {
    this.info(LogCategory.ARTIFACT_CREATION, 'Artifact created', { 
      artifactId: artifact.id,
      appId: artifact.appId,
      appName: artifact.appName,
      type: artifact.generatedContent?.type,
      messageId: artifact.generatedContent?.metadata?.messageId
    });
  }

  public trackComponentRender(componentName: string, props?: any): void {
    this.debug(LogCategory.COMPONENT_RENDER, `Component rendered: ${componentName}`, { 
      componentName,
      propsKeys: props ? Object.keys(props) : undefined,
      timestamp: Date.now()
    });
  }

  public trackSidebarInteraction(action: string, appId?: string, data?: any): void {
    this.info(LogCategory.SIDEBAR_INTERACTION, `Sidebar ${action}`, { 
      action,
      appId,
      data
    });
  }

  public trackEventEmission(eventName: string, data?: any): void {
    this.info(LogCategory.EVENT_EMISSION, `Event emitted: ${eventName}`, { 
      eventName,
      data: data ? JSON.stringify(data).substring(0, 100) : undefined
    });
  }

  // Analytics and reporting
  public getFlowSummary(): any {
    const summary = {
      sessionId: this.sessionId,
      totalLogs: this.logs.length,
      timeRange: {
        start: this.logs[0]?.timestamp,
        end: this.logs[this.logs.length - 1]?.timestamp
      },
      categoryCounts: {} as Record<string, number>,
      levelCounts: {} as Record<string, number>,
      errors: this.logs.filter(log => log.level === LogLevel.ERROR),
      traces: this.getTraceAnalysis()
    };

    this.logs.forEach(log => {
      summary.categoryCounts[log.category] = (summary.categoryCounts[log.category] || 0) + 1;
      summary.levelCounts[LogLevel[log.level]] = (summary.levelCounts[LogLevel[log.level]] || 0) + 1;
    });

    return summary;
  }

  private getTraceAnalysis(): any {
    const traces: Record<string, LogEntry[]> = {};
    
    this.logs.forEach(log => {
      if (log.traceId) {
        if (!traces[log.traceId]) {
          traces[log.traceId] = [];
        }
        traces[log.traceId].push(log);
      }
    });

    return Object.entries(traces).map(([traceId, logs]) => ({
      traceId,
      duration: logs[logs.length - 1]?.timestamp - logs[0]?.timestamp,
      stepCount: logs.length,
      categories: Array.from(new Set(logs.map(log => log.category)))
    }));
  }

  public exportLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.info(LogCategory.CHAT_FLOW, 'Logs cleared');
  }

  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.info(LogCategory.CHAT_FLOW, 'Logger configuration updated', config);
  }
}

// Global logger instance
export const logger = new MainAppLogger();

// Development helper to access logger from console
if (typeof window !== 'undefined') {
  (window as any).mainAppLogger = logger;
}

/**
 * Module-scoped logger created via createLogger('ModuleName').
 * Provides a simpler API without requiring LogCategory on every call.
 */
export interface ScopedLogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

/**
 * Create a module-scoped logger with a simpler API.
 *
 * @example
 * const log = createLogger('ChatModule');
 * log.info('Message sent', { id });
 * log.error('Send failed', err);
 */
export function createLogger(module: string, category: LogCategory = LogCategory.SYSTEM): ScopedLogger {
  return {
    debug: (message: string, data?: any) =>
      logger.debug(category, `[${module}] ${message}`, data),
    info: (message: string, data?: any) =>
      logger.info(category, `[${module}] ${message}`, data),
    warn: (message: string, data?: any) =>
      logger.warn(category, `[${module}] ${message}`, data),
    error: (message: string, data?: any) =>
      logger.error(category, `[${module}] ${message}`, data),
  };
}