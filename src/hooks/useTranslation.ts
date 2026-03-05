/**
 * ============================================================================
 * Translation Hook (useTranslation.ts) - 多语言钩子
 * ============================================================================
 * 
 * Core Responsibilities:
 * - 提供类型安全的翻译函数
 * - 支持嵌套键值访问
 * - 支持变量插值
 * - 响应语言变化
 * - 提供语言切换功能
 */

import { useCallback, useMemo } from 'react';
import { createLogger } from '../utils/logger';
import { useLanguageStore } from '../stores/useLanguageStore';

const log = createLogger('useTranslation');
import { translations, Translations } from '../locales/translations';

// ================================================================================
// Types
// ================================================================================

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKeys = NestedKeyOf<Translations>;

// ================================================================================
// Translation Hook
// ================================================================================

export interface UseTranslationReturn {
  // Translation function
  t: (key: TranslationKeys, variables?: Record<string, string | number>) => string;
  
  // Current language info
  language: string;
  languageConfig: {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
  } | undefined;
  
  // Language management
  changeLanguage: (language: 'zh-CN' | 'en-US') => void;
  availableLanguages: Array<{
    code: string;
    name: string;
    nativeName: string;
    flag: string;
  }>;
  
  // RTL support
  isRTL: boolean;
}

export const useTranslation = (): UseTranslationReturn => {
  const { 
    currentLanguage, 
    availableLanguages, 
    setLanguage, 
    getLanguageConfig,
    isRTL 
  } = useLanguageStore();

  // Get current translations
  const currentTranslations = useMemo(() => {
    return translations[currentLanguage];
  }, [currentLanguage]);

  // Translation function with nested key support
  const t = useCallback((key: TranslationKeys, variables?: Record<string, string | number>): string => {
    try {
      // Split the key by dots to navigate nested objects
      const keys = key.split('.');
      let value: any = currentTranslations;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          log.warn(`Translation key not found: ${key} for language ${currentLanguage}`);
          return key; // Return the key itself as fallback
        }
      }
      
      if (typeof value !== 'string') {
        log.warn(`Translation value is not a string: ${key} for language ${currentLanguage}`);
        return key;
      }
      
      // Handle variable interpolation
      if (variables && Object.keys(variables).length > 0) {
        return Object.entries(variables).reduce((text, [varKey, varValue]) => {
          return text.replace(new RegExp(`{{${varKey}}}`, 'g'), String(varValue));
        }, value);
      }
      
      return value;
    } catch (error) {
      log.error(`Error translating key ${key}:`, error);
      return key;
    }
  }, [currentTranslations, currentLanguage]);

  return {
    t,
    language: currentLanguage,
    languageConfig: getLanguageConfig(currentLanguage),
    changeLanguage: setLanguage,
    availableLanguages,
    isRTL
  };
};

// ================================================================================
// Component Translation Hook
// ================================================================================

/**
 * Specialized hook for component-specific translations
 * Provides namespaced translations for better organization
 */
export const useComponentTranslation = (namespace: keyof Translations) => {
  const { t, ...rest } = useTranslation();
  
  const componentT = useCallback((key: string, variables?: Record<string, string | number>) => {
    const fullKey = `${namespace}.${key}` as TranslationKeys;
    return t(fullKey, variables);
  }, [t, namespace]);
  
  return {
    t: componentT,
    ...rest
  };
};

// ================================================================================
// Utilities
// ================================================================================

/**
 * Get translation for specific key without React hook
 * Useful for non-component contexts
 */
export const getTranslation = (
  key: TranslationKeys, 
  language: 'zh-CN' | 'en-US' = 'zh-CN',
  variables?: Record<string, string | number>
): string => {
  try {
    const trans = translations[language];
    const keys = key.split('.');
    let value: any = trans;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      return key;
    }
    
    if (variables && Object.keys(variables).length > 0) {
      return Object.entries(variables).reduce((text, [varKey, varValue]) => {
        return text.replace(new RegExp(`{{${varKey}}}`, 'g'), String(varValue));
      }, value);
    }
    
    return value;
  } catch {
    return key;
  }
};