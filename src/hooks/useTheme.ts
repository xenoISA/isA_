/**
 * ============================================================================
 * Theme Hook (useTheme.ts) - 主题管理 Hook
 * ============================================================================
 * 
 * 功能：
 * - 管理应用主题状态
 * - 同步localStorage
 * - 响应系统主题变化
 */

import { useState, useEffect } from 'react';
import { createLogger } from '../utils/logger';

const log = createLogger('useTheme');

export type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 获取初始主题
    const initializeTheme = () => {
      try {
        // 1. 检查localStorage中的保存值
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        
        // 2. 检查系统偏好
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        
        // 3. 决定最终主题
        const initialTheme = savedTheme || systemPreference;
        
        setTheme(initialTheme);
        applyTheme(initialTheme);
        setIsLoading(false);
      } catch (error) {
        log.warn('Failed to initialize theme:', error);
        setTheme('dark'); // 默认深色主题
        applyTheme('dark');
        setIsLoading(false);
      }
    };

    initializeTheme();

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // 只有当用户没有手动设置主题时才跟随系统
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'light') {
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    } else {
      root.removeAttribute('data-theme');
      root.style.colorScheme = 'dark';
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
    
    try {
      localStorage.setItem('theme', newTheme);
    } catch (error) {
      log.warn('Failed to save theme to localStorage:', error);
    }
  };

  const setThemeDirectly = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    
    try {
      localStorage.setItem('theme', newTheme);
    } catch (error) {
      log.warn('Failed to save theme to localStorage:', error);
    }
  };

  return {
    theme,
    isLoading,
    toggleTheme,
    setTheme: setThemeDirectly,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };
};