/**
 * Smoke tests for core modules
 * Verifies that key modules can be imported and initialized without errors
 */

import { describe, test, expect } from 'vitest';

// ================================================================================
// Config module smoke tests
// ================================================================================

describe('Config module', () => {
  test('apiConfig exports all endpoint constants', async () => {
    const { API_ENDPOINTS, API_PATHS } = await import('../config/apiConfig');

    expect(API_ENDPOINTS).toBeDefined();
    expect(API_ENDPOINTS.GATEWAY).toBeDefined();
    expect(API_ENDPOINTS.CHAT).toBeDefined();
    expect(API_ENDPOINTS.SESSION).toBeDefined();
    expect(API_ENDPOINTS.USER).toBeDefined();

    expect(API_PATHS).toBeDefined();
    expect(API_PATHS.CHAT).toMatch(/^\//);
    expect(API_PATHS.SESSION.BASE).toMatch(/^\//);
    expect(API_PATHS.USER.BASE).toMatch(/^\//);
  });

  test('timeoutConfig exports valid timeout values', async () => {
    const { TIMEOUT_CONFIG, RETRY_CONFIG, CACHE_CONFIG } = await import('../config/timeoutConfig');

    expect(TIMEOUT_CONFIG.DEFAULT).toBeGreaterThan(0);
    expect(TIMEOUT_CONFIG.CHAT_STREAM).toBeGreaterThan(TIMEOUT_CONFIG.DEFAULT);
    expect(RETRY_CONFIG.MAX_RETRIES).toBeGreaterThanOrEqual(0);
    expect(CACHE_CONFIG.STATUS_DURATION).toBeGreaterThan(0);
  });

  test('errorMessages exports all categories', async () => {
    const { ERROR_MESSAGES } = await import('../config/errorMessages');

    expect(ERROR_MESSAGES.NETWORK).toBeDefined();
    expect(ERROR_MESSAGES.API).toBeDefined();
    expect(ERROR_MESSAGES.VALIDATION).toBeDefined();
    expect(ERROR_MESSAGES.BUSINESS).toBeDefined();
    expect(ERROR_MESSAGES.SYSTEM).toBeDefined();
  });

  test('barrel index re-exports all sub-modules', async () => {
    const configIndex = await import('../config/index');

    // From apiConfig
    expect(configIndex.API_ENDPOINTS).toBeDefined();
    expect(configIndex.buildApiUrl).toBeTypeOf('function');

    // From timeoutConfig
    expect(configIndex.TIMEOUT_CONFIG).toBeDefined();
    expect(configIndex.calculateRetryDelay).toBeTypeOf('function');

    // From errorMessages
    expect(configIndex.ERROR_MESSAGES).toBeDefined();
    expect(configIndex.getErrorMessage).toBeTypeOf('function');

    // Own exports
    expect(configIndex.config).toBeDefined();
    expect(configIndex.validateConfig).toBeTypeOf('function');
  });
});

// ================================================================================
// Store initialization smoke tests
// ================================================================================

describe('Zustand stores', () => {
  test('useLanguageStore initializes with default language', async () => {
    const { useLanguageStore } = await import('../stores/useLanguageStore');

    const state = useLanguageStore.getState();
    expect(state.currentLanguage).toBeDefined();
    expect(['zh-CN', 'en-US']).toContain(state.currentLanguage);
    expect(state.availableLanguages).toBeInstanceOf(Array);
    expect(state.availableLanguages.length).toBeGreaterThan(0);
  });

  test('useLanguageStore can switch languages', async () => {
    const { useLanguageStore } = await import('../stores/useLanguageStore');

    useLanguageStore.getState().setLanguage('en-US');
    expect(useLanguageStore.getState().currentLanguage).toBe('en-US');

    useLanguageStore.getState().setLanguage('zh-CN');
    expect(useLanguageStore.getState().currentLanguage).toBe('zh-CN');
  });
});

// ================================================================================
// Event parser smoke tests
// ================================================================================

describe('AGUI Event Parser types', () => {
  test('RealAPIEvent interface is importable and usable', async () => {
    const { RealAPIEventMapper } = await import('../api/parsing/RealAPIEventMapping');

    expect(RealAPIEventMapper).toBeDefined();
    expect(RealAPIEventMapper.analyzeCustomEvent).toBeTypeOf('function');
    expect(RealAPIEventMapper.extractLLMChunk).toBeTypeOf('function');
    expect(RealAPIEventMapper.extractToolCalls).toBeTypeOf('function');
    expect(RealAPIEventMapper.extractToolResult).toBeTypeOf('function');
  });

  test('RealAPIToAGUIMapper maps start event correctly', async () => {
    const { RealAPIToAGUIMapper } = await import('../api/parsing/RealAPIEventMapping');

    const startEvent = {
      type: 'start',
      content: 'Starting',
      timestamp: new Date().toISOString(),
      session_id: 'test-session',
    };

    const mapped = RealAPIToAGUIMapper.mapToAGUI(startEvent);
    expect(mapped).toBeInstanceOf(Array);
    expect(mapped.length).toBeGreaterThan(0);
    expect(mapped[0].type).toBe('run_started');
  });

  test('ResponseExtractor accumulates chunks', async () => {
    const { ResponseExtractor } = await import('../api/parsing/RealAPIEventMapping');

    const extractor = new ResponseExtractor();
    expect(extractor).toBeDefined();
    expect(extractor.getReconstructedResponse()).toBe('');
    expect(extractor.getToolResults()).toEqual([]);
  });
});

// ================================================================================
// Type exports smoke tests
// ================================================================================

describe('Type exports', () => {
  test('userTypes exports are accessible', async () => {
    const userTypes = await import('../types/userTypes');

    // Enum should be importable
    expect(userTypes.UserAction).toBeDefined();
    expect(userTypes.UserAction.FETCH_USER).toBe('FETCH_USER');
    expect(userTypes.UserAction.CONSUME_CREDITS).toBe('CONSUME_CREDITS');
  });
});
