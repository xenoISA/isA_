/**
 * ============================================================================
 * Language Store (useLanguageStore.ts) - 多语言状态管理
 * ============================================================================
 * 
 * Core Responsibilities:
 * - 管理当前选择的语言
 * - 存储用户语言偏好设置
 * - 提供语言切换功能
 * - 持久化语言设置到localStorage
 * 
 * Supported Languages:
 * - zh-CN: 简体中文
 * - en-US: English (US)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createLogger, LogCategory } from '../utils/logger';

const log = createLogger('LanguageStore', LogCategory.SYSTEM);

// ================================================================================
// Types
// ================================================================================

export type SupportedLanguage = 'zh-CN' | 'en-US';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export interface LanguageState {
  // Current language
  currentLanguage: SupportedLanguage;
  
  // Available languages
  availableLanguages: LanguageConfig[];
  
  // Actions
  setLanguage: (language: SupportedLanguage) => void;
  getLanguageConfig: (code: SupportedLanguage) => LanguageConfig | undefined;
  
  // Utilities
  isRTL: boolean;
}

// ================================================================================
// Utilities (defined before store so they can be used in initialization)
// ================================================================================

/**
 * Get browser preferred language, fallback to English
 */
export const getBrowserLanguage = (): SupportedLanguage => {
  if (typeof navigator === 'undefined') return 'en-US';

  const browserLang = navigator.language || navigator.languages?.[0];

  if (browserLang?.startsWith('zh')) {
    return 'zh-CN';
  }

  return 'en-US'; // Default fallback
};

// ================================================================================
// Language Configuration
// ================================================================================

const AVAILABLE_LANGUAGES: LanguageConfig[] = [
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    flag: '🇨🇳'
  },
  {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English',
    flag: '🇺🇸'
  }
];

// ================================================================================
// Store Implementation
// ================================================================================

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      // Default to browser language (detected synchronously before first render)
      currentLanguage: getBrowserLanguage(),
      
      // Available languages
      availableLanguages: AVAILABLE_LANGUAGES,
      
      // Actions
      setLanguage: (language: SupportedLanguage) => {
        log.info('Language changed', { language });
        
        set({ currentLanguage: language });
        
        // Update document language attribute
        if (typeof document !== 'undefined') {
          document.documentElement.lang = language;
        }
        
        // Emit custom event for components that need to react to language changes
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language } 
          }));
        }
      },
      
      getLanguageConfig: (code: SupportedLanguage) => {
        return AVAILABLE_LANGUAGES.find(lang => lang.code === code);
      },
      
      // RTL support (none of our current languages are RTL)
      get isRTL() {
        return false;
      }
    }),
    {
      name: 'language-settings',
      partialize: (state) => ({
        currentLanguage: state.currentLanguage
      }),
    }
  )
);

// ================================================================================
// Utilities
// ================================================================================

/**
 * Initialize language based on browser preference
 */
export const initializeLanguage = () => {
  const store = useLanguageStore.getState();
  const browserLang = getBrowserLanguage();
  
  // Only set browser language if user hasn't manually set a preference
  const hasStoredPreference = localStorage.getItem('language-settings');
  if (!hasStoredPreference) {
    store.setLanguage(browserLang);
  }
};