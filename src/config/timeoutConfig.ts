/**
 * 超时和重试配置管理
 * 统一管理所有超时、重试相关的配置
 */

// ================================================================================
// 环境变量获取工具
// ================================================================================

const getEnvNumber = (key: string, defaultValue: number): number => {
  if (typeof window !== 'undefined') {
    const value = process.env[key];
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return defaultValue;
};

// ================================================================================
// 超时配置
// ================================================================================

export const TIMEOUT_CONFIG = {
  // 默认超时时间 (30秒)
  DEFAULT: getEnvNumber('API_TIMEOUT', 30000),
  
  // 聊天流式响应超时 (5分钟)
  CHAT_STREAM: getEnvNumber('CHAT_STREAM_TIMEOUT', 300000),
  
  // 文件上传超时 (10分钟)
  FILE_UPLOAD: getEnvNumber('FILE_UPLOAD_TIMEOUT', 600000),
  
  // 模型调用超时 (30秒)
  MODEL_CALL: getEnvNumber('MODEL_CALL_TIMEOUT', 30000),
  
  // 健康检查超时 (5秒)
  HEALTH_CHECK: getEnvNumber('HEALTH_CHECK_TIMEOUT', 5000),
  
  // 轮询间隔 (3秒)
  POLLING_INTERVAL: getEnvNumber('POLLING_INTERVAL', 3000),
  
  // 空闲轮询间隔 (10秒)
  IDLE_POLLING_INTERVAL: getEnvNumber('IDLE_POLLING_INTERVAL', 10000)
} as const;

// ================================================================================
// 重试配置
// ================================================================================

export const RETRY_CONFIG = {
  // 最大重试次数
  MAX_RETRIES: getEnvNumber('MAX_RETRIES', 3),
  
  // 基础重试延迟 (1秒)
  BASE_DELAY: getEnvNumber('RETRY_BASE_DELAY', 1000),
  
  // 退避乘数
  BACKOFF_MULTIPLIER: getEnvNumber('RETRY_BACKOFF_MULTIPLIER', 1.5),
  
  // 最大重试延迟 (30秒)
  MAX_DELAY: getEnvNumber('RETRY_MAX_DELAY', 30000)
} as const;

// ================================================================================
// 缓存配置
// ================================================================================

export const CACHE_CONFIG = {
  // 状态缓存持续时间 (2秒)
  STATUS_DURATION: getEnvNumber('CACHE_STATUS_DURATION', 2000),
  
  // 缓存清理间隔 (1分钟)
  CLEANUP_INTERVAL: getEnvNumber('CACHE_CLEANUP_INTERVAL', 60000),
  
  // 缓存保留倍数 (5倍)
  RETENTION_MULTIPLIER: getEnvNumber('CACHE_RETENTION_MULTIPLIER', 5)
} as const;

// ================================================================================
// 计算重试延迟的工具函数
// ================================================================================

export const calculateRetryDelay = (attempt: number): number => {
  const delay = RETRY_CONFIG.BASE_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY);
};

// ================================================================================
// 验证配置的工具函数
// ================================================================================

export const validateTimeoutConfig = (timeout: number): number => {
  return Math.max(timeout, 1000); // 最小1秒
};

export const validateRetryConfig = (retries: number): number => {
  return Math.min(Math.max(retries, 0), 10); // 0-10次
};

// ================================================================================
// 导出类型
// ================================================================================

export type TimeoutConfig = typeof TIMEOUT_CONFIG;
export type RetryConfig = typeof RETRY_CONFIG;
export type CacheConfig = typeof CACHE_CONFIG;
