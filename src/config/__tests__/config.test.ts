/**
 * 配置系统测试
 * 验证配置加载、验证和使用的正确性
 */

import { 
  API_ENDPOINTS, 
  API_PATHS, 
  TIMEOUT_CONFIG, 
  RETRY_CONFIG, 
  CACHE_CONFIG,
  ERROR_MESSAGES,
  validateAllConfigs,
  getConfigSummary,
  buildApiUrl,
  buildExecutionUrl,
  buildSessionUrl,
  buildUserUrl,
  buildModelUrl,
  buildChatUrl,
  calculateRetryDelay,
  validateTimeoutConfig,
  validateRetryConfig
} from '../index';

describe('配置系统测试', () => {
  
  describe('API 端点配置', () => {
    test('应该包含所有必需的端点', () => {
      expect(API_ENDPOINTS.MAIN).toBeDefined();
      expect(API_ENDPOINTS.CHAT).toBeDefined();
      expect(API_ENDPOINTS.EXECUTION).toBeDefined();
      expect(API_ENDPOINTS.SESSION).toBeDefined();
      expect(API_ENDPOINTS.MODEL).toBeDefined();
      expect(API_ENDPOINTS.USER).toBeDefined();
    });

    test('端点应该是有效的 URL', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toMatch(/^https?:\/\/.+/);
      });
    });
  });

  describe('API 路径配置', () => {
    test('应该包含所有必需的路径', () => {
      expect(API_PATHS.CHAT).toBeDefined();
      expect(API_PATHS.EXECUTION.HEALTH).toBeDefined();
      expect(API_PATHS.SESSION.BASE).toBeDefined();
      expect(API_PATHS.USER.BASE).toBeDefined();
      expect(API_PATHS.MODEL.INVOKE).toBeDefined();
    });

    test('路径应该以 / 开头', () => {
      expect(API_PATHS.CHAT).toMatch(/^\//);
      expect(API_PATHS.EXECUTION.HEALTH).toMatch(/^\//);
      expect(API_PATHS.SESSION.BASE).toMatch(/^\//);
    });
  });

  describe('超时配置', () => {
    test('所有超时值应该是正数', () => {
      Object.values(TIMEOUT_CONFIG).forEach(timeout => {
        expect(timeout).toBeGreaterThan(0);
      });
    });

    test('聊天流超时应该比默认超时长', () => {
      expect(TIMEOUT_CONFIG.CHAT_STREAM).toBeGreaterThan(TIMEOUT_CONFIG.DEFAULT);
    });

    test('文件上传超时应该比默认超时长', () => {
      expect(TIMEOUT_CONFIG.FILE_UPLOAD).toBeGreaterThan(TIMEOUT_CONFIG.DEFAULT);
    });
  });

  describe('重试配置', () => {
    test('重试次数应该在合理范围内', () => {
      expect(RETRY_CONFIG.MAX_RETRIES).toBeGreaterThanOrEqual(0);
      expect(RETRY_CONFIG.MAX_RETRIES).toBeLessThanOrEqual(10);
    });

    test('退避乘数应该大于 1', () => {
      expect(RETRY_CONFIG.BACKOFF_MULTIPLIER).toBeGreaterThan(1);
    });

    test('计算重试延迟应该正确', () => {
      expect(calculateRetryDelay(1)).toBe(RETRY_CONFIG.BASE_DELAY);
      expect(calculateRetryDelay(2)).toBeGreaterThan(RETRY_CONFIG.BASE_DELAY);
      expect(calculateRetryDelay(10)).toBeLessThanOrEqual(RETRY_CONFIG.MAX_DELAY);
    });
  });

  describe('缓存配置', () => {
    test('缓存持续时间应该是正数', () => {
      expect(CACHE_CONFIG.STATUS_DURATION).toBeGreaterThan(0);
      expect(CACHE_CONFIG.CLEANUP_INTERVAL).toBeGreaterThan(0);
    });

    test('清理间隔应该大于状态持续时间', () => {
      expect(CACHE_CONFIG.CLEANUP_INTERVAL).toBeGreaterThan(CACHE_CONFIG.STATUS_DURATION);
    });
  });

  describe('错误消息配置', () => {
    test('应该包含所有类别的错误消息', () => {
      expect(ERROR_MESSAGES.NETWORK).toBeDefined();
      expect(ERROR_MESSAGES.API).toBeDefined();
      expect(ERROR_MESSAGES.VALIDATION).toBeDefined();
      expect(ERROR_MESSAGES.BUSINESS).toBeDefined();
      expect(ERROR_MESSAGES.SYSTEM).toBeDefined();
    });

    test('错误消息应该是非空字符串', () => {
      Object.values(ERROR_MESSAGES).forEach(category => {
        Object.values(category).forEach(message => {
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('URL 构建工具', () => {
    test('buildApiUrl 应该正确构建 URL', () => {
      const url = buildApiUrl('http://localhost:3000', '/api/test');
      expect(url).toBe('http://localhost:3000/api/test');
    });

    test('buildExecutionUrl 应该使用正确的端点', () => {
      const url = buildExecutionUrl('/health');
      expect(url).toContain(API_ENDPOINTS.EXECUTION);
      expect(url).toContain('/health');
    });

    test('buildSessionUrl 应该使用正确的端点', () => {
      const url = buildSessionUrl('/test');
      expect(url).toContain(API_ENDPOINTS.SESSION);
      expect(url).toContain('/test');
    });

    test('buildUserUrl 应该使用正确的端点', () => {
      const url = buildUserUrl('/test');
      expect(url).toContain(API_ENDPOINTS.USER);
      expect(url).toContain('/test');
    });

    test('buildModelUrl 应该使用正确的端点', () => {
      const url = buildModelUrl('/test');
      expect(url).toContain(API_ENDPOINTS.MODEL);
      expect(url).toContain('/test');
    });

    test('buildChatUrl 应该使用正确的端点', () => {
      const url = buildChatUrl('/test');
      expect(url).toContain(API_ENDPOINTS.CHAT);
      expect(url).toContain('/test');
    });
  });

  describe('配置验证', () => {
    test('validateTimeoutConfig 应该验证超时值', () => {
      expect(validateTimeoutConfig(5000)).toBe(5000);
      expect(validateTimeoutConfig(0)).toBe(1000);
      expect(validateTimeoutConfig(-1000)).toBe(1000);
    });

    test('validateRetryConfig 应该验证重试次数', () => {
      expect(validateRetryConfig(3)).toBe(3);
      expect(validateRetryConfig(0)).toBe(0);
      expect(validateRetryConfig(15)).toBe(10);
      expect(validateRetryConfig(-1)).toBe(0);
    });

    test('validateAllConfigs 应该验证所有配置', () => {
      const result = validateAllConfigs();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('配置摘要', () => {
    test('getConfigSummary 应该返回配置统计', () => {
      const summary = getConfigSummary();
      expect(summary.apiEndpoints).toBeGreaterThan(0);
      expect(summary.timeoutConfigs).toBeGreaterThan(0);
      expect(summary.errorMessages).toBeGreaterThan(0);
      expect(summary.isValid).toBe(true);
    });
  });
});
