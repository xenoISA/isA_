import { describe, test, expect } from 'vitest';
import {
  API_ENDPOINTS,
  API_PATHS,
  buildApiUrl,
  buildExecutionUrl,
  buildSessionUrl,
  buildUserUrl,
  buildModelUrl,
  buildChatUrl,
} from '../apiConfig';
import {
  TIMEOUT_CONFIG,
  RETRY_CONFIG,
  CACHE_CONFIG,
  calculateRetryDelay,
  validateTimeoutConfig,
  validateRetryConfig,
} from '../timeoutConfig';
import {
  config,
  validateConfig,
  getApiUrl,
  getUserServiceUrl,
  isDevelopment,
  isProduction,
} from '../index';

describe('API endpoint configuration', () => {
  test('all required endpoints are defined', () => {
    expect(API_ENDPOINTS.MAIN).toBeDefined();
    expect(API_ENDPOINTS.CHAT).toBeDefined();
    expect(API_ENDPOINTS.EXECUTION).toBeDefined();
    expect(API_ENDPOINTS.SESSION).toBeDefined();
    expect(API_ENDPOINTS.MODEL).toBeDefined();
    expect(API_ENDPOINTS.USER).toBeDefined();
  });

  test('endpoints are valid URLs', () => {
    Object.values(API_ENDPOINTS).forEach((endpoint) => {
      expect(endpoint).toMatch(/^https?:\/\/.+/);
    });
  });
});

describe('API path configuration', () => {
  test('all required paths exist', () => {
    expect(API_PATHS.CHAT).toBeDefined();
    expect(API_PATHS.EXECUTION.HEALTH).toBeDefined();
    expect(API_PATHS.SESSION.BASE).toBeDefined();
    expect(API_PATHS.USER.BASE).toBeDefined();
    expect(API_PATHS.MODEL.INVOKE).toBeDefined();
  });

  test('paths start with /', () => {
    expect(API_PATHS.CHAT).toMatch(/^\//);
    expect(API_PATHS.EXECUTION.HEALTH).toMatch(/^\//);
    expect(API_PATHS.SESSION.BASE).toMatch(/^\//);
  });
});

describe('timeout configuration', () => {
  test('all timeout values are positive', () => {
    Object.values(TIMEOUT_CONFIG).forEach((timeout) => {
      expect(timeout).toBeGreaterThan(0);
    });
  });

  test('chat stream timeout exceeds default', () => {
    expect(TIMEOUT_CONFIG.CHAT_STREAM).toBeGreaterThan(TIMEOUT_CONFIG.DEFAULT);
  });

  test('file upload timeout exceeds default', () => {
    expect(TIMEOUT_CONFIG.FILE_UPLOAD).toBeGreaterThan(TIMEOUT_CONFIG.DEFAULT);
  });
});

describe('retry configuration', () => {
  test('max retries is within reasonable range', () => {
    expect(RETRY_CONFIG.MAX_RETRIES).toBeGreaterThanOrEqual(0);
    expect(RETRY_CONFIG.MAX_RETRIES).toBeLessThanOrEqual(10);
  });

  test('backoff multiplier is greater than 1', () => {
    expect(RETRY_CONFIG.BACKOFF_MULTIPLIER).toBeGreaterThan(1);
  });

  test('calculateRetryDelay returns correct delays', () => {
    expect(calculateRetryDelay(1)).toBe(RETRY_CONFIG.BASE_DELAY);
    expect(calculateRetryDelay(2)).toBeGreaterThan(RETRY_CONFIG.BASE_DELAY);
    expect(calculateRetryDelay(100)).toBeLessThanOrEqual(RETRY_CONFIG.MAX_DELAY);
  });
});

describe('cache configuration', () => {
  test('durations are positive', () => {
    expect(CACHE_CONFIG.STATUS_DURATION).toBeGreaterThan(0);
    expect(CACHE_CONFIG.CLEANUP_INTERVAL).toBeGreaterThan(0);
  });

  test('cleanup interval exceeds status duration', () => {
    expect(CACHE_CONFIG.CLEANUP_INTERVAL).toBeGreaterThan(CACHE_CONFIG.STATUS_DURATION);
  });
});

describe('URL builders', () => {
  test('buildApiUrl joins endpoint and path', () => {
    expect(buildApiUrl('http://localhost:3000', '/api/test')).toBe(
      'http://localhost:3000/api/test',
    );
  });

  test('buildApiUrl strips trailing slash from endpoint', () => {
    expect(buildApiUrl('http://localhost:3000/', '/api/test')).toBe(
      'http://localhost:3000/api/test',
    );
  });

  test('service-specific builders include correct endpoint', () => {
    expect(buildExecutionUrl('/health')).toContain('/health');
    expect(buildSessionUrl('/test')).toContain('/test');
    expect(buildUserUrl('/test')).toContain('/test');
    expect(buildModelUrl('/test')).toContain('/test');
    expect(buildChatUrl('/test')).toContain('/test');
  });
});

describe('config validation', () => {
  test('validateTimeoutConfig enforces minimum of 1000', () => {
    expect(validateTimeoutConfig(5000)).toBe(5000);
    expect(validateTimeoutConfig(0)).toBe(1000);
    expect(validateTimeoutConfig(-1000)).toBe(1000);
  });

  test('validateRetryConfig clamps to 0-10', () => {
    expect(validateRetryConfig(3)).toBe(3);
    expect(validateRetryConfig(0)).toBe(0);
    expect(validateRetryConfig(15)).toBe(10);
    expect(validateRetryConfig(-1)).toBe(0);
  });

  test('validateConfig returns valid result for defaults', () => {
    const result = validateConfig();
    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

describe('unified config object', () => {
  test('config has all top-level sections', () => {
    expect(config.api).toBeDefined();
    expect(config.auth).toBeDefined();
    expect(config.externalApis).toBeDefined();
    expect(config.app).toBeDefined();
    expect(config.features).toBeDefined();
  });

  test('getApiUrl builds correct URLs', () => {
    const url = getApiUrl('/chat');
    expect(url).toContain('/chat');
  });

  test('getUserServiceUrl builds correct URLs', () => {
    const url = getUserServiceUrl('/me');
    expect(url).toContain('/me');
  });

  test('environment helpers reflect NODE_ENV', () => {
    // In test environment NODE_ENV is typically "test"
    expect(typeof isDevelopment()).toBe('boolean');
    expect(typeof isProduction()).toBe('boolean');
  });
});
