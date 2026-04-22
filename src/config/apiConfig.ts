/**
 * API 配置管理
 * 统一管理所有 API 相关的配置，避免硬编码
 */

import { getGatewayUrl } from './runtimeEnv';

const gatewayUrl = getGatewayUrl();

// ================================================================================
// API 端点配置
// ================================================================================

export const API_ENDPOINTS = {
  // Resolve once via runtime env helper (includes dev fallback)
  GATEWAY: gatewayUrl,

  // 统一网关入口 - 所有服务通过网关访问
  // 主 API 服务 (通过网关)
  MAIN: gatewayUrl,

  // 聊天服务 (通过网关)
  CHAT: gatewayUrl,

  // 执行控制服务 (通过网关)
  EXECUTION: gatewayUrl,

  // 会话服务 (通过网关)
  SESSION: gatewayUrl,

  // 模型服务 (通过网关)
  MODEL: gatewayUrl,

  // 用户服务 (通过网关)
  USER: gatewayUrl
} as const;

// ================================================================================
// API 路径配置
// ================================================================================

export const API_PATHS = {
  // 聊天相关 (通过网关的agents服务)
  CHAT: '/api/v1/agents/chat',
  
  // 执行控制相关 (通过网关的agents服务)
  EXECUTION: {
    HEALTH: '/api/v1/agents/execution/health',
    STATUS: '/api/v1/agents/execution/status',
    HISTORY: '/api/v1/agents/execution/history',
    ROLLBACK: '/api/v1/agents/execution/rollback',
    RESUME: '/api/v1/agents/execution/resume',
    RESUME_STREAM: '/api/v1/agents/execution/resume-stream'
  },
  
  // 会话相关 (通过网关的sessions服务)
  SESSION: {
    BASE: '/api/v1/sessions',
    HEALTH: '/api/v1/sessions/health',
    SEARCH: '/api/v1/sessions/search'
  },
  
  // 用户相关 (通过网关的accounts服务)
  USER: {
    BASE: '/api/v1/accounts',
    ME: '/api/v1/accounts/me',
    ENSURE: '/api/v1/accounts/ensure',
    CREDITS: '/api/v1/accounts/{userId}/credits/consume',
    SUBSCRIPTION: '/api/v1/accounts/{userId}/subscription',
    CHECKOUT: '/api/v1/payment/create-checkout'
  },
  
  // 模型相关 (通过网关的model服务)
  MODEL: {
    INVOKE: '/api/v1/model/invoke',
    HEALTH: '/api/v1/model/health'
  }
} as const;

// ================================================================================
// 构建完整 URL 的工具函数
// ================================================================================

export const buildApiUrl = (endpoint: string, path: string): string => {
  const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${apiPath}`;
};

export const buildExecutionUrl = (path: string): string => {
  return buildApiUrl(API_ENDPOINTS.EXECUTION, path);
};

export const buildSessionUrl = (path: string): string => {
  return buildApiUrl(API_ENDPOINTS.SESSION, path);
};

export const buildUserUrl = (path: string): string => {
  return buildApiUrl(API_ENDPOINTS.USER, path);
};

export const buildModelUrl = (path: string): string => {
  return buildApiUrl(API_ENDPOINTS.MODEL, path);
};

export const buildChatUrl = (path: string): string => {
  return buildApiUrl(API_ENDPOINTS.CHAT, path);
};

// ================================================================================
// 导出类型
// ================================================================================

export type ApiEndpoint = keyof typeof API_ENDPOINTS;
export type ApiPath = keyof typeof API_PATHS;
