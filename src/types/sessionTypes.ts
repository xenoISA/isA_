/**
 * ============================================================================
 * Session Types (sessionTypes.ts) - Session API 相关的类型定义
 * ============================================================================
 * 
 * 【核心职责】
 * - 定义 Session API 的数据结构
 * - 定义 Session 消息的接口类型
 * - 定义 Session 响应格式
 * - Session 管理相关的类型集合
 * 
 * 【关注点分离】
 * ✅ 负责：
 *   - Session API 请求/响应类型
 *   - Session 数据模型定义
 *   - Session 消息和上下文类型
 *   - Session 分页和列表类型
 * 
 * ❌ 不负责：
 *   - 本地聊天会话类型（由chatTypes.ts处理）
 *   - UI组件状态类型（由各组件处理）
 *   - 网络请求基础类型（由BaseApiService处理）
 */

// ================================================================================
// Session 消息类型
// ================================================================================

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'chat' | 'system' | 'notification';

export interface SessionMessage {
  id?: string;
  message_id?: string;
  session_id?: string;
  role: MessageRole | string;
  content: string;
  timestamp?: string;
  created_at?: string;
  metadata?: Record<string, any>;
}

// ================================================================================
// Session 元数据类型
// ================================================================================

export interface SessionMetadata {
  apps_used?: string[];
  total_messages?: number;
  last_activity?: string;
  [key: string]: any;
}

// ================================================================================
// Session 数据模型
// ================================================================================

export interface Session {
  id?: string;
  session_id?: string;
  user_id?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  last_activity?: string;
  message_count?: number;
  status?: 'active' | 'archived' | 'deleted' | string;
  summary?: string;
  tags?: string[];
  metadata?: SessionMetadata;
  messages?: SessionMessage[];
}

// ================================================================================
// Session API 响应类型
// ================================================================================

export interface SessionResponse {
  timestamp?: string;
  success?: boolean;
  message?: string;
  session_id?: string | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  trace_id?: string | null;
  metadata?: Record<string, any>;
  session?: Session;
}

export interface SessionListResponse {
  timestamp?: string;
  success?: boolean;
  message?: string;
  sessions: Session[];
  total?: number;
  has_more?: boolean;
  pagination?: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

export interface SessionMessagesResponse {
  timestamp?: string;
  success?: boolean;
  message?: string;
  messages: SessionMessage[];
  total?: number;
  has_more?: boolean;
  pagination?: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

// ================================================================================
// Session 上下文类型
// ================================================================================

export interface SessionContext {
  project_context?: string;
  user_preferences?: Record<string, any>;
  current_task?: string;
  [key: string]: any;
}

// ================================================================================
// Session 操作选项类型
// ================================================================================

export interface GetSessionsOptions {
  user_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface GetUserSessionsOptions {
  limit?: number;
  offset?: number;
}

export interface GetSessionOptions {
  include_history?: boolean;
  include_stats?: boolean;
}

export interface GetSessionMessagesOptions {
  limit?: number;
  offset?: number;
  role?: 'user' | 'assistant' | 'system';
}

export interface SearchSessionsOptions {
  user_id?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateSessionData {
  title?: string;
  tags?: string[];
  context?: Record<string, unknown>;
  metadata?: SessionMetadata;
}

// ================================================================================
// Session 状态枚举
// ================================================================================

export type SessionStatus = 'active' | 'archived' | 'deleted';

export type SessionExportFormat = 'json' | 'csv' | 'txt';

// ================================================================================
// Session API 错误类型
// ================================================================================

export interface SessionApiError {
  detail: string;
  status?: number;
  code?: string;
}

// ================================================================================
// Session 统计类型
// ================================================================================

export interface SessionStats {
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  system_messages: number;
  total_duration: number;
  avg_response_time: number;
  last_activity: string;
  created_at: string;
  [key: string]: any;
}

// ================================================================================
// Session 导出数据类型
// ================================================================================

export interface SessionExportData {
  session: Session;
  messages: SessionMessage[];
  context?: SessionContext;
  stats?: SessionStats;
  format: SessionExportFormat;
  exported_at: string;
}

// ================================================================================
// Session 搜索结果类型
// ================================================================================

export interface SessionSearchResult {
  session: Session;
  match_score: number;
  matched_fields: string[];
  highlights: Record<string, string[]>;
}

export interface SessionSearchResponse extends SessionListResponse {
  search_results?: SessionSearchResult[];
  query?: string;
  total_matches?: number;
}