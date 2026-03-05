import React, { createContext, useContext, useEffect, useState } from 'react';
import { createLogger } from '@/utils/logger';
import analytics, { AnalyticsService } from '@/services/analytics';

const log = createLogger('AnalyticsProvider');

interface AnalyticsContextType {
  analytics: AnalyticsService;
  isReady: boolean;
  track: (event: string, properties?: Record<string, any>) => void;
  page: (name?: string, properties?: Record<string, any>) => void;
  identify: (userId: string, traits?: Record<string, any>) => void;
  group: (groupId: string, traits?: Record<string, any>) => void;
  reset: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeAnalytics = async () => {
      // 检查是否启用分析功能
      const isAnalyticsEnabled = process.env.REACT_APP_ENABLE_ANALYTICS !== 'false';
      
      if (!isAnalyticsEnabled) {
        log.info('Analytics disabled by feature flag');
        return;
      }

      try {
        await analytics.initialize();
        setIsReady(true);
      } catch (error) {
        log.error('Failed to initialize analytics:', error);
      }
    };

    initializeAnalytics();
  }, []);

  const contextValue: AnalyticsContextType = {
    analytics,
    isReady,
    track: (event: string, properties?: Record<string, any>) => {
      if (isReady) {
        analytics.track(event, properties);
      }
    },
    page: (name?: string, properties?: Record<string, any>) => {
      if (isReady) {
        analytics.page(name, properties);
      }
    },
    identify: (userId: string, traits?: Record<string, any>) => {
      if (isReady) {
        analytics.identify(userId, traits);
      }
    },
    group: (groupId: string, traits?: Record<string, any>) => {
      if (isReady) {
        analytics.group(groupId, traits);
      }
    },
    reset: () => {
      if (isReady) {
        analytics.reset();
      }
    },
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextType {
  const context = useContext(AnalyticsContext);
  
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  
  return context;
}