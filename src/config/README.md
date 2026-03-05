# 配置系统使用指南

## 概述

本配置系统旨在解决 API 目录中的硬编码问题，提供统一的配置管理方案。遵循最佳实践，避免过度设计。

## 目录结构

```
src/config/
├── index.ts                 # 主配置入口
├── apiConfig.ts            # API 相关配置
├── timeoutConfig.ts        # 超时和重试配置
├── errorMessages.ts        # 错误消息配置
├── __tests__/              # 配置测试
│   └── config.test.ts
└── README.md               # 本文档
```

## 核心特性

### 1. 环境变量支持
- 支持开发、测试、生产环境配置
- 提供合理的默认值
- 类型安全的配置获取

### 2. 配置验证
- 自动验证配置值的有效性
- 提供配置摘要信息
- 错误配置检测

### 3. 工具函数
- URL 构建工具
- 重试延迟计算
- 配置验证函数

## 使用方法

### 基本使用

```typescript
import { 
  API_ENDPOINTS, 
  API_PATHS, 
  TIMEOUT_CONFIG,
  buildApiUrl 
} from '../config';

// 使用 API 端点
const chatUrl = API_ENDPOINTS.CHAT;

// 使用 API 路径
const healthPath = API_PATHS.EXECUTION.HEALTH;

// 使用超时配置
const timeout = TIMEOUT_CONFIG.DEFAULT;

// 构建完整 URL
const fullUrl = buildApiUrl(API_ENDPOINTS.CHAT, API_PATHS.CHAT);
```

### 环境变量配置

创建 `.env.local` 文件：

```bash
# API 端点
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8080

# 超时配置
API_TIMEOUT=30000
CHAT_STREAM_TIMEOUT=300000
```

### 配置验证

```typescript
import { validateAllConfigs, getConfigSummary } from '../config';

// 验证所有配置
const validation = validateAllConfigs();
if (!validation.isValid) {
  console.error('配置错误:', validation.errors);
}

// 获取配置摘要
const summary = getConfigSummary();
console.log('配置统计:', summary);
```

## 配置项说明

### API 端点配置 (apiConfig.ts)

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| MAIN | NEXT_PUBLIC_API_BASE_URL | http://localhost:3000 | 主 API 服务 |
| CHAT | NEXT_PUBLIC_CHAT_API_URL | http://localhost:8080 | 聊天服务 |
| EXECUTION | NEXT_PUBLIC_EXECUTION_API_URL | http://localhost:8080 | 执行控制服务 |
| SESSION | NEXT_PUBLIC_SESSION_API_URL | http://localhost:3000 | 会话服务 |
| MODEL | NEXT_PUBLIC_MODEL_API_URL | http://localhost:8000 | 模型服务 |
| USER | NEXT_PUBLIC_USER_API_URL | http://localhost:9000 | 用户服务 |

### 超时配置 (timeoutConfig.ts)

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| DEFAULT | API_TIMEOUT | 30000 | 默认超时时间 |
| CHAT_STREAM | CHAT_STREAM_TIMEOUT | 300000 | 聊天流式响应超时 |
| FILE_UPLOAD | FILE_UPLOAD_TIMEOUT | 600000 | 文件上传超时 |
| MODEL_CALL | MODEL_CALL_TIMEOUT | 30000 | 模型调用超时 |
| HEALTH_CHECK | HEALTH_CHECK_TIMEOUT | 5000 | 健康检查超时 |
| POLLING_INTERVAL | POLLING_INTERVAL | 3000 | 轮询间隔 |
| IDLE_POLLING_INTERVAL | IDLE_POLLING_INTERVAL | 10000 | 空闲轮询间隔 |

### 重试配置 (timeoutConfig.ts)

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| MAX_RETRIES | MAX_RETRIES | 3 | 最大重试次数 |
| BASE_DELAY | RETRY_BASE_DELAY | 1000 | 基础重试延迟 |
| BACKOFF_MULTIPLIER | RETRY_BACKOFF_MULTIPLIER | 1.5 | 退避乘数 |
| MAX_DELAY | RETRY_MAX_DELAY | 30000 | 最大重试延迟 |

### 缓存配置 (timeoutConfig.ts)

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|----------|--------|------|
| STATUS_DURATION | CACHE_STATUS_DURATION | 2000 | 状态缓存持续时间 |
| CLEANUP_INTERVAL | CACHE_CLEANUP_INTERVAL | 60000 | 缓存清理间隔 |
| RETENTION_MULTIPLIER | CACHE_RETENTION_MULTIPLIER | 5 | 缓存保留倍数 |

## 工具函数

### URL 构建工具

```typescript
// 构建通用 API URL
const url = buildApiUrl('http://localhost:3000', '/api/test');

// 构建特定服务 URL
const executionUrl = buildExecutionUrl('/health');
const sessionUrl = buildSessionUrl('/test');
const userUrl = buildUserUrl('/me');
const modelUrl = buildModelUrl('/invoke');
const chatUrl = buildChatUrl('/stream');
```

### 重试延迟计算

```typescript
import { calculateRetryDelay } from '../config';

// 计算第 1 次重试延迟
const delay1 = calculateRetryDelay(1); // 1000ms

// 计算第 2 次重试延迟
const delay2 = calculateRetryDelay(2); // 1500ms

// 计算第 3 次重试延迟
const delay3 = calculateRetryDelay(3); // 2250ms
```

### 配置验证

```typescript
import { validateTimeoutConfig, validateRetryConfig } from '../config';

// 验证超时配置
const validTimeout = validateTimeoutConfig(5000); // 5000
const minTimeout = validateTimeoutConfig(0); // 1000 (最小值)

// 验证重试配置
const validRetries = validateRetryConfig(3); // 3
const maxRetries = validateRetries(15); // 10 (最大值)
```

## 最佳实践

### 1. 配置使用
- 优先使用配置常量，避免硬编码
- 使用工具函数构建 URL
- 定期验证配置有效性

### 2. 环境变量
- 为不同环境设置不同的配置值
- 提供合理的默认值
- 使用有意义的变量名

### 3. 错误处理
- 使用统一的错误消息配置
- 提供详细的错误信息
- 支持错误消息国际化

### 4. 测试
- 为配置系统编写单元测试
- 测试配置验证逻辑
- 测试工具函数的正确性

## 迁移指南

### 从硬编码迁移

**之前：**
```typescript
const endpoint = 'http://localhost:8080/api/chat';
const timeout = 300000;
```

**之后：**
```typescript
import { API_ENDPOINTS, API_PATHS, TIMEOUT_CONFIG, buildChatUrl } from '../config';

const endpoint = buildChatUrl(API_PATHS.CHAT);
const timeout = TIMEOUT_CONFIG.CHAT_STREAM;
```

### 服务类更新

**之前：**
```typescript
export class ChatService {
  private baseUrl = 'http://localhost:8080';
  private timeout = 300000;
}
```

**之后：**
```typescript
import { API_ENDPOINTS, TIMEOUT_CONFIG } from '../config';

export class ChatService {
  private baseUrl = API_ENDPOINTS.CHAT;
  private timeout = TIMEOUT_CONFIG.CHAT_STREAM;
}
```

## 故障排除

### 常见问题

1. **配置未生效**
   - 检查环境变量是否正确设置
   - 确认配置文件的导入路径
   - 验证配置验证结果

2. **URL 构建错误**
   - 检查端点和路径配置
   - 确认工具函数的使用
   - 验证构建结果

3. **超时配置问题**
   - 检查超时值的合理性
   - 确认环境变量设置
   - 验证配置验证结果

### 调试技巧

```typescript
import { getConfigSummary, validateAllConfigs } from '../config';

// 获取配置摘要
console.log('配置摘要:', getConfigSummary());

// 验证配置
const validation = validateAllConfigs();
if (!validation.isValid) {
  console.error('配置错误:', validation.errors);
}
```

## 贡献指南

1. 添加新配置时，请同时更新文档
2. 为新增配置编写测试用例
3. 确保配置验证逻辑正确
4. 遵循现有的命名约定

## 更新日志

### v1.0.0
- 初始版本
- 支持 API 端点配置
- 支持超时和重试配置
- 支持错误消息配置
- 提供配置验证工具
