/**
 * 错误消息配置管理
 * 统一管理所有错误消息，支持国际化
 */

// ================================================================================
// 错误消息配置
// ================================================================================

export const ERROR_MESSAGES = {
  // 网络相关错误
  NETWORK: {
    CONNECTION_FAILED: 'Network connection failed',
    TIMEOUT: 'Request timeout',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    SERVER_ERROR: 'Internal server error',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
  },
  
  // API 相关错误
  API: {
    INVALID_RESPONSE: 'Invalid API response',
    PARSE_ERROR: 'Failed to parse response',
    VALIDATION_ERROR: 'Request validation failed',
    RATE_LIMITED: 'Rate limit exceeded',
    QUOTA_EXCEEDED: 'Quota exceeded'
  },
  
  // 验证相关错误
  VALIDATION: {
    INVALID_INPUT: 'Invalid input parameters',
    MISSING_REQUIRED_FIELD: 'Missing required field',
    INVALID_FORMAT: 'Invalid format',
    OUT_OF_RANGE: 'Value out of range'
  },
  
  // 业务逻辑错误
  BUSINESS: {
    USER_NOT_FOUND: 'User not found',
    SESSION_NOT_FOUND: 'Session not found',
    INSUFFICIENT_CREDITS: 'Insufficient credits',
    OPERATION_NOT_ALLOWED: 'Operation not allowed',
    RESOURCE_LOCKED: 'Resource is locked'
  },
  
  // 系统错误
  SYSTEM: {
    CONFIGURATION_ERROR: 'Configuration error',
    DEPENDENCY_UNAVAILABLE: 'Dependency service unavailable',
    INTERNAL_ERROR: 'Internal system error',
    MAINTENANCE_MODE: 'System is under maintenance'
  }
} as const;

// ================================================================================
// 错误代码映射
// ================================================================================

export const ERROR_CODES = {
  // HTTP 状态码
  HTTP: {
    400: ERROR_MESSAGES.VALIDATION.INVALID_INPUT,
    401: ERROR_MESSAGES.NETWORK.UNAUTHORIZED,
    403: ERROR_MESSAGES.NETWORK.FORBIDDEN,
    404: ERROR_MESSAGES.NETWORK.NOT_FOUND,
    408: ERROR_MESSAGES.NETWORK.TIMEOUT,
    429: ERROR_MESSAGES.API.RATE_LIMITED,
    500: ERROR_MESSAGES.NETWORK.SERVER_ERROR,
    503: ERROR_MESSAGES.NETWORK.SERVICE_UNAVAILABLE
  },
  
  // 自定义错误代码
  CUSTOM: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    PARSE_ERROR: 'PARSE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    BUSINESS_ERROR: 'BUSINESS_ERROR',
    SYSTEM_ERROR: 'SYSTEM_ERROR'
  }
} as const;

// ================================================================================
// 错误消息获取工具函数
// ================================================================================

export const getErrorMessage = (code: string | number, fallback?: string): string => {
  // 尝试从 HTTP 状态码获取
  if (typeof code === 'number' && ERROR_CODES.HTTP[code as keyof typeof ERROR_CODES.HTTP]) {
    return ERROR_CODES.HTTP[code as keyof typeof ERROR_CODES.HTTP];
  }
  
  // 尝试从自定义错误代码获取
  if (typeof code === 'string') {
    const errorPath = code.split('.');
    let current: any = ERROR_MESSAGES;
    
    for (const key of errorPath) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        break;
      }
    }
    
    if (typeof current === 'string') {
      return current;
    }
  }
  
  // 返回回退消息或默认消息
  return fallback || ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR;
};

// ================================================================================
// 错误消息格式化工具
// ================================================================================

export const formatErrorMessage = (message: string, ...args: any[]): string => {
  return message.replace(/\{(\d+)\}/g, (match, index) => {
    const argIndex = parseInt(index, 10);
    return args[argIndex] !== undefined ? String(args[argIndex]) : match;
  });
};

// ================================================================================
// 特定服务的错误消息
// ================================================================================

export const SERVICE_ERROR_MESSAGES = {
  CHAT: {
    STREAM_FAILED: 'Chat stream failed',
    CONNECTION_LOST: 'Chat connection lost',
    INVALID_MESSAGE: 'Invalid message format',
    SESSION_EXPIRED: 'Chat session expired'
  },
  
  EXECUTION: {
    THREAD_NOT_FOUND: 'Execution thread not found',
    ROLLBACK_FAILED: 'Rollback operation failed',
    RESUME_FAILED: 'Resume operation failed',
    MONITORING_FAILED: 'Execution monitoring failed'
  },
  
  SESSION: {
    CREATE_FAILED: 'Failed to create session',
    UPDATE_FAILED: 'Failed to update session',
    DELETE_FAILED: 'Failed to delete session',
    MESSAGES_FETCH_FAILED: 'Failed to fetch session messages'
  },
  
  USER: {
    AUTH_FAILED: 'User authentication failed',
    CREDITS_INSUFFICIENT: 'Insufficient user credits',
    SUBSCRIPTION_INVALID: 'Invalid subscription',
    CHECKOUT_FAILED: 'Checkout process failed'
  },
  
  MODEL: {
    CALL_FAILED: 'Model call failed',
    TIMEOUT: 'Model call timeout',
    INVALID_INPUT: 'Invalid model input',
    RATE_LIMITED: 'Model rate limit exceeded'
  }
} as const;

// ================================================================================
// 导出类型
// ================================================================================

export type ErrorMessages = typeof ERROR_MESSAGES;
export type ErrorCodes = typeof ERROR_CODES;
export type ServiceErrorMessages = typeof SERVICE_ERROR_MESSAGES;
