/**
 * 安全工具函数
 * 提供输入验证、XSS防护和内容清理功能
 */

// 输入验证配置
interface ValidationConfig {
  maxLength?: number;
  minLength?: number;
  allowedChars?: RegExp;
  blockedPatterns?: RegExp[];
}

// 默认验证配置
const DEFAULT_VALIDATION: ValidationConfig = {
  maxLength: 10000,
  minLength: 1,
  allowedChars: /^[\w\s\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff.,!?'"()\-@#$%^&*+=\[\]{}|\\:";'<>?,./`~]*$/,
  blockedPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // 脚本标签
    /javascript:/gi, // JavaScript URL
    /vbscript:/gi, // VBScript URL
    /onload|onclick|onerror|onmouseover/gi, // 事件处理器
    /data:text\/html/gi, // HTML数据URL
  ]
};

/**
 * 验证用户输入
 */
export function validateUserInput(
  input: string, 
  config: ValidationConfig = DEFAULT_VALIDATION
): { isValid: boolean; error?: string; sanitized?: string } {
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a string' };
  }

  // 长度检查
  if (config.maxLength && input.length > config.maxLength) {
    return { 
      isValid: false, 
      error: `Input too long. Maximum ${config.maxLength} characters allowed.` 
    };
  }

  if (config.minLength && input.length < config.minLength) {
    return { 
      isValid: false, 
      error: `Input too short. Minimum ${config.minLength} characters required.` 
    };
  }

  // 字符检查
  if (config.allowedChars && !config.allowedChars.test(input)) {
    return { 
      isValid: false, 
      error: 'Input contains invalid characters' 
    };
  }

  // 恶意模式检查
  if (config.blockedPatterns) {
    for (const pattern of config.blockedPatterns) {
      if (pattern.test(input)) {
        return { 
          isValid: false, 
          error: 'Input contains potentially dangerous content' 
        };
      }
    }
  }

  // 基本清理
  const sanitized = sanitizeInput(input);

  return { isValid: true, sanitized };
}

/**
 * 清理用户输入
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    // 移除HTML标签
    .replace(/<[^>]*>/g, '')
    // 转义特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // 移除控制字符
    .replace(/[\x00-\x1F\x7F]/g, '')
    // 规范化空白字符
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 验证API端点URL
 */
export function validateApiEndpoint(url: string): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: false, error: 'API endpoint is required' };
  }

  try {
    const parsedUrl = new URL(url);
    
    // 只允许HTTP和HTTPS协议
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // 在生产环境中只允许HTTPS
    if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
      return { isValid: false, error: 'HTTPS is required in production' };
    }

    // 阻止私有IP地址在生产环境中使用
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsedUrl.hostname;
      const privateIpPatterns = [
        /^127\./, // 127.x.x.x
        /^10\./, // 10.x.x.x
        /^192\.168\./, // 192.168.x.x
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.x.x - 172.31.x.x
        /^localhost$/i,
        /^0\.0\.0\.0$/
      ];

      if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
        return { isValid: false, error: 'Private IP addresses not allowed in production' };
      }
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * 生成随机会话ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${randomPart}`;
}

/**
 * 验证文件类型
 */
export function validateFileType(file: File, allowedTypes: string[] = []): { isValid: boolean; error?: string } {
  const defaultAllowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'text/plain',
    'application/pdf',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ];

  const allowed = allowedTypes.length > 0 ? allowedTypes : defaultAllowedTypes;

  if (!allowed.includes(file.type)) {
    return { 
      isValid: false, 
      error: `File type ${file.type} is not allowed. Allowed types: ${allowed.join(', ')}` 
    };
  }

  // 文件大小检查 (默认最大 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` 
    };
  }

  return { isValid: true };
}

/**
 * 限制请求频率 (简单实现)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests: number = 10, timeWindowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  checkLimit(identifier: string): { allowed: boolean; remaining?: number } {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // 移除过期的请求记录
    const validRequests = requests.filter(time => now - time < this.timeWindow);
    
    if (validRequests.length >= this.maxRequests) {
      return { allowed: false };
    }

    // 记录新请求
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return { 
      allowed: true, 
      remaining: this.maxRequests - validRequests.length 
    };
  }

  // 清理过期记录 (定期调用)
  cleanup(): void {
    const now = Date.now();
    Array.from(this.requests.entries()).forEach(([identifier, requests]) => {
      const validRequests = requests.filter(time => now - time < this.timeWindow);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    });
  }
}

// Client-side rate limiter — UX guard only.
// Real rate limiting is enforced server-side by APISIX (see deployment/apisix/rate-limiting.yaml).
export const globalRateLimiter = new RateLimiter(30, 60000);

if (typeof window !== 'undefined') {
  setInterval(() => globalRateLimiter.cleanup(), 300000);
}