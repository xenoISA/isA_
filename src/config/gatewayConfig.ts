/**
 * ============================================================================
 * Gateway API Configuration - 统一网关接入配置
 * ============================================================================
 *
 * 【架构说明】
 * 所有API请求通过Gateway (http://localhost:9080) 统一路由
 * Gateway负责：认证验证、权限检查、服务发现、负载均衡
 *
 * 【服务架构】
 * Frontend → Gateway(9080) → Microservices(8xxx)
 *
 * 【认证方式】
 * 1. JWT Token (推荐)
 * 2. API Key (备用)
 */

import { getGatewayUrl } from './runtimeEnv';
import { authTokenStore } from '../stores/authTokenStore';
import { clearAuthCookies, getCredentialsMode, isHttpOnlyCookieMode } from '../utils/authCookieHelper';

// ================================================================================
// 网关基础配置
// ================================================================================

export const GATEWAY_CONFIG = {
  // 网关基础URL
  BASE_URL: getGatewayUrl(),
  
  // API版本
  API_VERSION: 'v1',
  
  // 认证配置
  AUTH: {
    // JWT Token存储key
    TOKEN_KEY: 'isa_auth_token',
    // API Key存储key  
    API_KEY: 'isa_api_key',
    // 认证头名称
    AUTH_HEADER: 'Authorization',
    API_KEY_HEADER: 'X-API-Key',
  },
  
  // Cross-zone SSO cookie config
  COOKIE: {
    /** Domain scope for auth cookies — all zones share the session */
    DOMAIN: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || '.iapro.ai',
    /** Credentials mode for fetch/axios — 'include' sends cookies cross-origin */
    CREDENTIALS_MODE: (process.env.NEXT_PUBLIC_AUTH_CREDENTIALS_MODE as RequestCredentials) || 'include',
  },

  // 超时配置
  TIMEOUT: {
    DEFAULT: 30000,      // 30秒
    CHAT_SSE: 300000,    // 5分钟 (聊天流式响应)
    UPLOAD: 120000,      // 2分钟 (文件上传)
  }
} as const;

// ================================================================================
// 服务名称映射 (Consul注册名)
// ================================================================================

export const GATEWAY_SERVICES = {
  // 核心AI服务 — paths match APISIX routes directly
  AGENTS: 'api/v1/agents',           // Agent聊天服务 (8080)
  MATE: 'mate',                      // isA Mate聊天服务 (18789) — direct, no gateway
  MCP: 'api/v1/mcp',                 // MCP工具服务 (8081)

  // 用户相关服务
  ACCOUNTS: 'api/v1/accounts',       // 账户服务 (8201)
  AUTH: 'api/v1/auth',               // 认证服务 (8202)
  AUTHORIZATION: 'api/v1/authorization', // 授权服务 (8203)
  SESSIONS: 'api/v1/sessions',       // 会话服务 (8205)

  // 业务服务
  PAYMENT: 'api/v1/payment',         // 支付服务 (8207)
  ORDER: 'api/v1/order',             // 订单服务 (8210)
  ORGANIZATION: 'api/v1/organization', // 组织服务 (8212)
  INVITATION: 'api/v1/invitation',   // 邀请服务 (8213)

  // 文档服务
  DOCUMENTS: 'api/v1/documents',     // 文档处理服务 (8214)

  // 基础服务
  NOTIFICATION: 'api/v1/notification', // 通知服务 (8206)
  STORAGE: 'api/v1/storage',         // 存储服务 (8208)
  WALLET: 'api/v1/wallet',           // 钱包服务 (8209)
  TASK: 'api/v1/task_service',       // 任务服务 (8211)
  AUDIT: 'api/v1/audit',             // 审计服务 (8204)

  // 区块链服务
  BLOCKCHAIN: 'api/v1/blockchain',   // 区块链网关

  // AI模型服务
  MODELS: 'api/v1/models',           // 模型管理服务 (8082)

  // 网关管理
  GATEWAY: 'gateway'                 // 网关自身管理
} as const;

// ================================================================================
// API端点配置 - 统一通过网关访问
// ================================================================================

/**
 * Build gateway endpoint URL.
 * Gateway routes: {BASE_URL}/{service}{path}
 * Paths that need /api/v1/ include it explicitly in the path parameter.
 */
const buildEndpoint = (service: string, path: string = '') => {
  return `${GATEWAY_CONFIG.BASE_URL}/${service}${path}`;
};

export const GATEWAY_ENDPOINTS = {
  // ==== Agent服务端点 (聊天、执行控制) ====
  AGENTS: {
    BASE: buildEndpoint(GATEWAY_SERVICES.AGENTS),
    CHAT: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/chat'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/health'),
    STATS: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/stats'),
    CAPABILITIES: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/capabilities'),
    
    // 执行控制相关
    EXECUTION: {
      HEALTH: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/execution/health'),
      STATUS: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/execution/status'),
      HISTORY: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/execution/history'),
      ROLLBACK: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/execution/rollback'),
      RESUME: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/execution/resume'),
      RESUME_STREAM: buildEndpoint(GATEWAY_SERVICES.AGENTS, '/execution/resume-stream'),
    }
  },
  
  // ==== Mate服务端点 (isA Mate agentic chat) ====
  // Supports direct URL via NEXT_PUBLIC_MATE_URL env var for local dev
  // without gateway routing. Falls back to gateway path.
  MATE: (() => {
    const mateBase = process.env.NEXT_PUBLIC_MATE_URL || buildEndpoint(GATEWAY_SERVICES.MATE);
    const buildMateEndpoint = (path: string) => `${mateBase}${path}`;
    return {
      BASE: mateBase,
      CHAT: buildMateEndpoint('/v1/chat'),
      QUERY: buildMateEndpoint('/v1/query'),
      TOOLS: buildMateEndpoint('/v1/tools'),
      SKILLS: buildMateEndpoint('/v1/skills'),
      TEAMS: buildMateEndpoint('/v1/teams'),
      MEMORY: {
        SESSIONS: buildMateEndpoint('/v1/memory/sessions'),
        SESSION_MESSAGES: buildMateEndpoint('/v1/memory/sessions/{sessionId}/messages'),
        TURNS: buildMateEndpoint('/v1/memory/turns'),
        KNOWLEDGE: buildMateEndpoint('/v1/memory/knowledge'),
        KNOWLEDGE_ITEM: buildMateEndpoint('/v1/memory/knowledge/{itemId}'),
      },
      SCHEDULER: {
        JOBS: buildMateEndpoint('/v1/scheduler/jobs'),
        JOB: buildMateEndpoint('/v1/scheduler/jobs/{jobId}'),
        JOB_RUN: buildMateEndpoint('/v1/scheduler/jobs/{jobId}/run'),
      },
      HEALTH: buildMateEndpoint('/health'),
      AUTONOMOUS_EVENTS: buildMateEndpoint('/v1/autonomous/events'),
      // Human-in-the-Loop capability router — maps to xenoISA/isA_Mate#404
      // /v1/interactive/*. Replaces the defunct AGENTS.EXECUTION probe that
      // returns 502 through APISIX (→ isA_Mate PR #424).
      INTERACTIVE: {
        HEALTH: buildMateEndpoint('/v1/interactive/health'),
        LIST: buildMateEndpoint('/v1/interactive/interrupts'),
        DETAIL: (id: string) =>
          buildMateEndpoint(
            `/v1/interactive/interrupts/${encodeURIComponent(id)}`,
          ),
        RESPOND: (id: string) =>
          buildMateEndpoint(
            `/v1/interactive/interrupts/${encodeURIComponent(id)}/respond`,
          ),
        TIMEOUT: (id: string, seconds: number) =>
          buildMateEndpoint(
            `/v1/interactive/interrupts/${encodeURIComponent(id)}/timeout/${seconds}`,
          ),
        AUDIT: (id: string) =>
          buildMateEndpoint(
            `/v1/interactive/interrupts/${encodeURIComponent(id)}/audit`,
          ),
      },
      // Proactive capability router — maps to xenoISA/isA_Mate#405 /v1/proactive/*
      // and xenoISA/isA_Mate#425 autonomous SSE events.
      PROACTIVE: {
        TRIGGERS: buildMateEndpoint('/v1/proactive/triggers'),
        TRIGGER: (id: string) =>
          buildMateEndpoint(
            `/v1/proactive/triggers/${encodeURIComponent(id)}`,
          ),
        TEST: (id: string) =>
          buildMateEndpoint(
            `/v1/proactive/triggers/${encodeURIComponent(id)}/test`,
          ),
        RUNS: (id: string) =>
          buildMateEndpoint(
            `/v1/proactive/triggers/${encodeURIComponent(id)}/runs`,
          ),
      },
      // Observability capability router — maps to xenoISA/isA_Mate#406 + #426
      OBSERVABILITY: {
        METRICS: buildMateEndpoint('/v1/observability/metrics'),
        AUDIT: buildMateEndpoint('/v1/observability/audit'),
      },
      // Persistence capability router — maps to xenoISA/isA_Mate#407 + #427
      PERSISTENCE: {
        CHECKPOINTS: buildMateEndpoint('/v1/persistence/checkpoints'),
        CHECKPOINT: (id: string) =>
          buildMateEndpoint(
            `/v1/persistence/checkpoints/${encodeURIComponent(id)}`,
          ),
        RESTORE: buildMateEndpoint('/v1/persistence/restore'),
        KNOWLEDGE: buildMateEndpoint('/v1/persistence/knowledge'),
        KNOWLEDGE_SEARCH: buildMateEndpoint('/v1/persistence/knowledge/search'),
        GRAPH_NODE: (id: string) =>
          buildMateEndpoint(`/v1/persistence/graph/${encodeURIComponent(id)}`),
      },
      // Responsive capability — per-session SSE stream (xenoISA/isA_Mate#408 + #428)
      RESPONSIVE: {
        STREAM: (sessionId: string) =>
          buildMateEndpoint(
            `/v1/responsive/stream/${encodeURIComponent(sessionId)}`,
          ),
      },
    };
  })(),

  // ==== Model服务端点 (模型管理) ====
  MODELS: {
    BASE: buildEndpoint(GATEWAY_SERVICES.MODELS),
    AVAILABLE: buildEndpoint(GATEWAY_SERVICES.MODELS, '/available'),
  },

  // ==== MCP服务端点 (工具调用) ====
  MCP: {
    BASE: buildEndpoint(GATEWAY_SERVICES.MCP),
    SEARCH: buildEndpoint(GATEWAY_SERVICES.MCP, '/search'),
    TOOLS_CALL: buildEndpoint(GATEWAY_SERVICES.MCP, '/mcp/tools/call'),
    PROMPTS_GET: buildEndpoint(GATEWAY_SERVICES.MCP, '/mcp/prompts/get'),
    RESOURCES_READ: buildEndpoint(GATEWAY_SERVICES.MCP, '/mcp/resources/read'),
  },
  
  // ==== 账户服务端点 (原User服务) ====
  // Note: ACCOUNTS paths include /api/v1/users/... because the user-service
  // backend exposes routes under that prefix, unlike AGENTS which uses short paths.
  ACCOUNTS: {
    BASE: buildEndpoint(GATEWAY_SERVICES.ACCOUNTS),
    ME: buildEndpoint(GATEWAY_SERVICES.ACCOUNTS, '/me'),
    ENSURE: buildEndpoint(GATEWAY_SERVICES.ACCOUNTS, '/ensure'),
    CREDITS: buildEndpoint(GATEWAY_SERVICES.ACCOUNTS, '/{userId}/credits/consume'),
    SUBSCRIPTION: buildEndpoint(GATEWAY_SERVICES.ACCOUNTS, '/{userId}/subscription'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.ACCOUNTS, '/health'),
  },
  
  // ==== 会话服务端点 ====
  SESSIONS: {
    BASE: buildEndpoint(GATEWAY_SERVICES.SESSIONS),
    LIST: buildEndpoint(GATEWAY_SERVICES.SESSIONS, '/sessions'),
    CREATE: buildEndpoint(GATEWAY_SERVICES.SESSIONS, '/sessions'),
    GET: buildEndpoint(GATEWAY_SERVICES.SESSIONS, '/sessions/{sessionId}'),
    UPDATE: buildEndpoint(GATEWAY_SERVICES.SESSIONS, '/sessions/{sessionId}'),
    DELETE: buildEndpoint(GATEWAY_SERVICES.SESSIONS, '/sessions/{sessionId}'),
    USER: buildEndpoint(GATEWAY_SERVICES.SESSIONS, '/sessions/user'),
    ACTIVE: buildEndpoint(GATEWAY_SERVICES.SESSIONS, '/sessions/active'),
    SEARCH: buildEndpoint(GATEWAY_SERVICES.SESSIONS, '/sessions/search'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.SESSIONS, '/health'),
  },
  
  // ==== 认证服务端点 ====
  AUTH: {
    BASE: buildEndpoint(GATEWAY_SERVICES.AUTH),
    VERIFY_TOKEN: buildEndpoint(GATEWAY_SERVICES.AUTH, '/verify-token'),
    VERIFY_API_KEY: buildEndpoint(GATEWAY_SERVICES.AUTH, '/verify-api-key'),
    DEV_TOKEN: buildEndpoint(GATEWAY_SERVICES.AUTH, '/dev-token'),
    API_KEYS: buildEndpoint(GATEWAY_SERVICES.AUTH, '/api-keys'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.AUTH, '/health'),
  },
  
  // ==== 授权服务端点 ====
  AUTHORIZATION: {
    BASE: buildEndpoint(GATEWAY_SERVICES.AUTHORIZATION),
    CHECK_ACCESS: buildEndpoint(GATEWAY_SERVICES.AUTHORIZATION, '/check-access'),
    GRANT: buildEndpoint(GATEWAY_SERVICES.AUTHORIZATION, '/grant'),
    REVOKE: buildEndpoint(GATEWAY_SERVICES.AUTHORIZATION, '/revoke'),
    USER_PERMISSIONS: buildEndpoint(GATEWAY_SERVICES.AUTHORIZATION, '/user-permissions'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.AUTHORIZATION, '/health'),
  },
  
  // ==== 通知服务端点 ====
  NOTIFICATION: {
    BASE: buildEndpoint(GATEWAY_SERVICES.NOTIFICATION),
    LIST: buildEndpoint(GATEWAY_SERVICES.NOTIFICATION, '/api/v1/notifications'),
    GET: buildEndpoint(GATEWAY_SERVICES.NOTIFICATION, '/api/v1/notifications/{notificationId}'),
    MARK_READ: buildEndpoint(GATEWAY_SERVICES.NOTIFICATION, '/api/v1/notifications/mark-read'),
    DISMISS: buildEndpoint(GATEWAY_SERVICES.NOTIFICATION, '/api/v1/notifications/dismiss'),
    COUNT: buildEndpoint(GATEWAY_SERVICES.NOTIFICATION, '/api/v1/notifications/count'),
    PREFERENCES: buildEndpoint(GATEWAY_SERVICES.NOTIFICATION, '/api/v1/notifications/preferences'),
    SUBSCRIBE: buildEndpoint(GATEWAY_SERVICES.NOTIFICATION, '/api/v1/notifications/subscribe'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.NOTIFICATION, '/health'),
  },

  // ==== 支付服务端点 ====
  PAYMENT: {
    BASE: buildEndpoint(GATEWAY_SERVICES.PAYMENT),
    CREATE_CHECKOUT: buildEndpoint(GATEWAY_SERVICES.PAYMENT, '/api/v1/payments/create-checkout'),
    WEBHOOK: buildEndpoint(GATEWAY_SERVICES.PAYMENT, '/api/v1/payments/webhook'),
    STATUS: buildEndpoint(GATEWAY_SERVICES.PAYMENT, '/api/v1/payments/{paymentId}/status'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.PAYMENT, '/health'),
  },
  
  // ==== 区块链服务端点 ====
  BLOCKCHAIN: {
    BASE: buildEndpoint(GATEWAY_SERVICES.BLOCKCHAIN),
    STATUS: buildEndpoint(GATEWAY_SERVICES.BLOCKCHAIN, '/status'),
    BALANCE: buildEndpoint(GATEWAY_SERVICES.BLOCKCHAIN, '/balance/{address}'),
    TRANSACTION: buildEndpoint(GATEWAY_SERVICES.BLOCKCHAIN, '/transaction'),
    BLOCK: buildEndpoint(GATEWAY_SERVICES.BLOCKCHAIN, '/block/{number}'),
  },
  
  // ==== 组织服务端点 ====
  ORGANIZATION: {
    BASE: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION),
    LIST: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations'),
    CREATE: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations'),
    GET: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations/{organizationId}'),
    UPDATE: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations/{organizationId}'),
    DELETE: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations/{organizationId}'),
    MEMBERS: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations/{organizationId}/members'),
    MEMBER: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations/{organizationId}/members/{userId}'),
    INVITATIONS: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations/{organizationId}/invitations'),
    INVITATION: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations/{organizationId}/invitations/{invitationId}'),
    ACCEPT_INVITATION: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/invitations/{invitationToken}/accept'),
    STATS: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/organizations/{organizationId}/stats'),
    SWITCH_CONTEXT: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/context/switch'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.ORGANIZATION, '/health'),
  },

  // ==== 文档处理服务端点 ====
  DOCUMENTS: {
    BASE: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS),
    CREATE: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/documents'),
    GET: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/documents/{documentId}'),
    UPDATE: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/documents/{documentId}'),
    DELETE: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/documents/{documentId}'),
    LIST: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/documents'),
    EXPORT: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/documents/{documentId}/export'),
    SUMMARIZE: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/documents/summarize'),
    TEMPLATES: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/templates'),
    TEMPLATE: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/templates/{templateId}'),
    AI_ASSIST: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/documents/{documentId}/ai-assist'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.DOCUMENTS, '/health'),
  },

  // ==== 邀请服务端点 ====
  INVITATION: {
    BASE: buildEndpoint(GATEWAY_SERVICES.INVITATION),
    RESEND: buildEndpoint(GATEWAY_SERVICES.INVITATION, '/invitations/{invitationId}/resend'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.INVITATION, '/health'),
  },

  // ==== 网关管理端点 ====
  GATEWAY: {
    BASE: buildEndpoint(GATEWAY_SERVICES.GATEWAY),
    SERVICES: buildEndpoint(GATEWAY_SERVICES.GATEWAY, '/services'),
    METRICS: buildEndpoint(GATEWAY_SERVICES.GATEWAY, '/metrics'),
    HEALTH: buildEndpoint(GATEWAY_SERVICES.GATEWAY, '/health'),
  },
  
  // ==== 直接网关端点 (不经过服务路由) ====
  HEALTH: `${GATEWAY_CONFIG.BASE_URL}/health`,
  READY: `${GATEWAY_CONFIG.BASE_URL}/ready`,
} as const;

// ================================================================================
// 旧配置到新配置的映射 - 用于渐进式迁移
// ================================================================================

export const LEGACY_TO_GATEWAY_MAP = {
  // Agent服务映射 (原8080端口)
  'http://localhost:8080/api/v1/agents/chat': GATEWAY_ENDPOINTS.AGENTS.CHAT,
  'http://localhost:8080/api/execution/health': GATEWAY_ENDPOINTS.AGENTS.EXECUTION.HEALTH,
  'http://localhost:8080/api/execution/status': GATEWAY_ENDPOINTS.AGENTS.EXECUTION.STATUS,
  'http://localhost:8080/api/execution/history': GATEWAY_ENDPOINTS.AGENTS.EXECUTION.HISTORY,
  'http://localhost:8080/api/execution/rollback': GATEWAY_ENDPOINTS.AGENTS.EXECUTION.ROLLBACK,
  'http://localhost:8080/api/execution/resume': GATEWAY_ENDPOINTS.AGENTS.EXECUTION.RESUME,
  'http://localhost:8080/api/execution/resume-stream': GATEWAY_ENDPOINTS.AGENTS.EXECUTION.RESUME_STREAM,
  
  // 用户服务映射 (原9000端口 → 现在8201通过网关)
  'http://localhost:9000/api/v1/users': GATEWAY_ENDPOINTS.ACCOUNTS.BASE,
  'http://localhost:9000/api/v1/users/me': GATEWAY_ENDPOINTS.ACCOUNTS.ME,
  'http://localhost:9000/api/v1/users/ensure': GATEWAY_ENDPOINTS.ACCOUNTS.ENSURE,
  
  // 会话服务映射 (原3000端口 → 现在8205通过网关)
  'http://localhost:3000/api/sessions': GATEWAY_ENDPOINTS.SESSIONS.LIST,
  'http://localhost:3000/api/sessions/health': GATEWAY_ENDPOINTS.SESSIONS.HEALTH,
  'http://localhost:3000/api/sessions/user': GATEWAY_ENDPOINTS.SESSIONS.USER,
  'http://localhost:3000/api/sessions/active': GATEWAY_ENDPOINTS.SESSIONS.ACTIVE,
  'http://localhost:3000/api/sessions/search': GATEWAY_ENDPOINTS.SESSIONS.SEARCH,
} as const;

// ================================================================================
// 工具函数
// ================================================================================

/**
 * Get auth headers from in-memory token store.
 */
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};

  const token = authTokenStore.getToken();
  if (token) {
    headers[GATEWAY_CONFIG.AUTH.AUTH_HEADER] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Save auth token to in-memory store (never localStorage).
 */
export const saveAuthToken = (token: string): void => {
  authTokenStore.setToken(token);
  // Persist in localStorage for dev mode so session survives page refresh.
  // In production, the HttpOnly cookie handles persistence.
  if (typeof window !== 'undefined' && !isHttpOnlyCookieMode()) {
    try { localStorage.setItem('isa_dev_token', token); } catch { /* quota exceeded */ }
  }
};

/**
 * Clear auth credentials from in-memory store and remove any legacy localStorage entries.
 */
export const clearAuth = (): void => {
  authTokenStore.clearToken();
  clearAuthCookies();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GATEWAY_CONFIG.AUTH.TOKEN_KEY);
    localStorage.removeItem(GATEWAY_CONFIG.AUTH.API_KEY);
    localStorage.removeItem('isa_dev_token');
  }
};

/**
 * 映射旧URL到新的网关URL
 */
export const mapLegacyUrl = (legacyUrl: string): string => {
  // 先尝试精确匹配
  const mapped = LEGACY_TO_GATEWAY_MAP[legacyUrl as keyof typeof LEGACY_TO_GATEWAY_MAP];
  if (mapped) return mapped;
  
  // 尝试模糊匹配
  if (legacyUrl.includes('localhost:8080')) {
    return legacyUrl.replace('http://localhost:8080', GATEWAY_ENDPOINTS.AGENTS.BASE);
  }
  if (legacyUrl.includes('localhost:9000')) {
    return legacyUrl.replace('http://localhost:9000', GATEWAY_ENDPOINTS.ACCOUNTS.BASE);
  }
  if (legacyUrl.includes('localhost:3000/api/sessions')) {
    return legacyUrl.replace('http://localhost:3000/api/sessions', GATEWAY_ENDPOINTS.SESSIONS.BASE);
  }
  
  return legacyUrl;
};

/**
 * 构建带参数的URL
 */
export const buildUrlWithParams = (template: string, params: Record<string, string>): string => {
  let url = template;
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, encodeURIComponent(value));
  });
  return url;
};

/**
 * 检查是否需要认证的端点
 */
export const requiresAuth = (url: string): boolean => {
  // 健康检查不需要认证
  if (url.includes('/health') || url.includes('/ready')) {
    return false;
  }
  // 其他都需要认证
  return true;
};

// ================================================================================
// SSE (Server-Sent Events) 配置
// ================================================================================

export const SSE_CONFIG = {
  // SSE支持的服务
  SSE_SERVICES: ['agents', 'mate', 'mcp'],

  // SSE端点
  SSE_ENDPOINTS: {
    CHAT: GATEWAY_ENDPOINTS.AGENTS.CHAT,
    MATE_CHAT: GATEWAY_ENDPOINTS.MATE.CHAT,
    EXECUTION_RESUME: GATEWAY_ENDPOINTS.AGENTS.EXECUTION.RESUME_STREAM,
    MCP_TOOLS: GATEWAY_ENDPOINTS.MCP.TOOLS_CALL,
  },

  // 检查是否为SSE端点 (reference GATEWAY_ENDPOINTS directly to avoid self-reference)
  isSSEEndpoint: (url: string): boolean => {
    return [
      GATEWAY_ENDPOINTS.AGENTS.CHAT,
      GATEWAY_ENDPOINTS.MATE.CHAT,
      GATEWAY_ENDPOINTS.AGENTS.EXECUTION.RESUME_STREAM,
      GATEWAY_ENDPOINTS.MCP.TOOLS_CALL,
    ].some(endpoint => url.startsWith(endpoint));
  }
};

// ================================================================================
// 类型定义
// ================================================================================

export type GatewayService = keyof typeof GATEWAY_SERVICES;
export type GatewayEndpoint = typeof GATEWAY_ENDPOINTS;

// ================================================================================
// 默认导出
// ================================================================================

export default {
  config: GATEWAY_CONFIG,
  services: GATEWAY_SERVICES,
  endpoints: GATEWAY_ENDPOINTS,
  legacy: LEGACY_TO_GATEWAY_MAP,
  auth: {
    getHeaders: getAuthHeaders,
    saveToken: saveAuthToken,
    clear: clearAuth,
  },
  utils: {
    mapLegacyUrl,
    buildUrlWithParams,
    requiresAuth,
  },
  sse: SSE_CONFIG,
};
