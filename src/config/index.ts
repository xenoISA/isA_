/**
 * ============================================================================
 * Configuration Management (config/index.ts) - 统一配置管理
 * ============================================================================
 * 
 * 【核心功能】
 * - 环境变量统一管理
 * - 配置类型安全
 * - 默认值和验证
 * - 开发/生产环境区分
 * 
 * 【配置分类】
 * ✅ API配置 - 基础URL、超时、重试等
 * ✅ Auth配置 - Auth0相关配置
 * ✅ App配置 - 应用级别设置
 * ✅ Feature配置 - 功能开关
 */

// ================================================================================
// 环境变量接口定义
// ================================================================================

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  maxFileSize: number;
  supportedFileTypes: string[];
}

export interface Auth0Config {
  domain: string;
  clientId: string;
  audience?: string;
  redirectUri: string;
  scope: string;
}

export interface ExternalApiConfig {
  userServiceUrl: string;
  aiServiceUrl: string;
  imageServiceUrl: string;
  contentServiceUrl: string;
}

export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface FeatureFlags {
  enableAuth: boolean;
  enableFileUpload: boolean;
  enableRealTimeChat: boolean;
  enableWidgets: boolean;
  enableDebugPanel: boolean;
}

export interface AppConfiguration {
  api: ApiConfig;
  auth0: Auth0Config;
  externalApis: ExternalApiConfig;
  app: AppConfig;
  features: FeatureFlags;
}

// ================================================================================
// 环境变量读取和验证
// ================================================================================

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    console.warn(`⚠️  Environment variable ${key} is not set`);
    return '';
  }
  return value.trim();
};

const getBoolEnvVar = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

const getNumberEnvVar = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// ================================================================================
// 配置对象构建
// ================================================================================

export const config: AppConfiguration = {
  // API基础配置
  api: {
    baseUrl: process.env.REACT_APP_AGENT_SERVICE_URL || 'http://localhost:8080',
    timeout: getNumberEnvVar('REACT_APP_API_TIMEOUT', 30000),
    retries: getNumberEnvVar('REACT_APP_API_RETRIES', 3),
    maxFileSize: getNumberEnvVar('REACT_APP_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    supportedFileTypes: (getEnvVar('REACT_APP_SUPPORTED_FILE_TYPES', 'jpg,jpeg,png,pdf,txt,md,json') || '').split(',')
  },

  // Auth0配置 (使用现有的环境变量)
  auth0: {
    domain: getEnvVar('REACT_APP_AUTH0_DOMAIN', 'dev-47zcqarlxizdkads.us.auth0.com').trim(),
    clientId: getEnvVar('REACT_APP_AUTH0_CLIENT_ID', 'Vsm0s23JTKzDrq9bq0foKyYieOCyeoQJ').trim(),
    audience: getEnvVar('REACT_APP_AUTH0_AUDIENCE', 'https://dev-47zcqarlxizdkads.us.auth0.com/api/v2/').trim(),
    redirectUri: getEnvVar('REACT_APP_AUTH0_REDIRECT_URI', `${getEnvVar('REACT_APP_BASE_URL', typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')}/api/auth/callback`).trim(),
    scope: getEnvVar('REACT_APP_AUTH0_SCOPE', 'openid profile email read:users update:users create:users offline_access').trim()
  },

  // 外部API配置 (使用现有的环境变量结构)
  externalApis: {
    userServiceUrl: process.env.REACT_APP_USER_SERVICE_URL || 'http://localhost:8100',
    aiServiceUrl: process.env.REACT_APP_MODEL_SERVICE_URL || 'http://localhost:8082',
    imageServiceUrl: getEnvVar('REACT_APP_IMAGE_SERVICE_URL', 'https://api.replicate.com'),
    contentServiceUrl: getEnvVar('REACT_APP_CONTENT_SERVICE_URL', 'https://api.openai.com')
  },

  // 应用配置
  app: {
    name: getEnvVar('REACT_APP_NAME', 'isA_'),
    version: getEnvVar('REACT_APP_VERSION', '1.0.0'),
    environment: (getEnvVar('NODE_ENV', 'development') as any) || 'development',
    debugMode: getBoolEnvVar('REACT_APP_DEBUG_MODE', process.env.NODE_ENV === 'development'),
    logLevel: (getEnvVar('REACT_APP_LOG_LEVEL', 'info') as any) || 'info'
  },

  // 功能开关
  features: {
    enableAuth: getBoolEnvVar('REACT_APP_ENABLE_AUTH', true),
    enableFileUpload: getBoolEnvVar('REACT_APP_ENABLE_FILE_UPLOAD', true),
    enableRealTimeChat: getBoolEnvVar('REACT_APP_ENABLE_REAL_TIME_CHAT', true),
    enableWidgets: getBoolEnvVar('REACT_APP_ENABLE_WIDGETS', true),
    enableDebugPanel: getBoolEnvVar('REACT_APP_ENABLE_DEBUG_PANEL', process.env.NODE_ENV === 'development')
  }
};

// ================================================================================
// 配置验证
// ================================================================================

export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 验证必需的配置项
  if (!config.auth0.domain || config.auth0.domain === 'your-domain.auth0.com') {
    errors.push('Auth0 domain is not configured properly');
  }

  if (!config.auth0.clientId || config.auth0.clientId === 'your-client-id') {
    errors.push('Auth0 client ID is not configured properly');
  }

  if (config.api.timeout < 5000) {
    errors.push('API timeout should be at least 5 seconds');
  }

  if (config.api.maxFileSize > 100 * 1024 * 1024) {
    errors.push('Max file size should not exceed 100MB');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ================================================================================
// 配置工具函数
// ================================================================================

export const isDevelopment = () => config.app.environment === 'development';
export const isProduction = () => config.app.environment === 'production';
export const isDebugMode = () => config.app.debugMode;

export const getApiUrl = (endpoint: string = '') => {
  const baseUrl = config.api.baseUrl.endsWith('/') 
    ? config.api.baseUrl 
    : `${config.api.baseUrl}/`;
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}${path}`;
};

export const getUserServiceUrl = (endpoint: string = '') => {
  const baseUrl = config.externalApis.userServiceUrl.endsWith('/') 
    ? config.externalApis.userServiceUrl 
    : `${config.externalApis.userServiceUrl}/`;
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}${path}`;
};

// ================================================================================
// 配置日志输出 (开发模式)
// ================================================================================

if (isDevelopment()) {
  console.group('🔧 Application Configuration');
  console.log('API Base URL:', config.api.baseUrl);
  console.log('Environment:', config.app.environment);
  console.log('Debug Mode:', config.app.debugMode);
  console.log('Features:', config.features);
  
  const validation = validateConfig();
  if (!validation.isValid) {
    console.warn('⚠️  Configuration Issues:', validation.errors);
  } else {
    console.log('✅ Configuration is valid');
  }
  console.groupEnd();
}

export default config;
