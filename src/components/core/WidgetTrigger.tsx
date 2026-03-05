import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { AppId } from '../../types/appTypes';
import { logger, LogCategory, createLogger } from '../../utils/logger';
const log = createLogger('AppTriggerHandler');

interface AppTriggerHandlerProps {
  availableApps: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    triggers: string[];
  }>;
  onAppTriggered?: (appId: string, message: string) => void;
}

export const AppTriggerHandler: React.FC<AppTriggerHandlerProps> = ({
  availableApps,
  onAppTriggered
}) => {
  const {
    currentApp,
    showRightSidebar,
    setCurrentApp,
    setShowRightSidebar,
    setTriggeredAppInput
  } = useAppStore();

  const checkForAppTrigger = (message: string): string | null => {
    const lowerMessage = message.toLowerCase();
    
    for (const app of availableApps) {
      const matchingTrigger = app.triggers.find(trigger => lowerMessage.includes(trigger));
      if (matchingTrigger) {
        logger.trackAppTrigger(app.id, matchingTrigger, message);
        log.info('App trigger detected', {
          app: app.name,
          trigger: matchingTrigger,
          currentApp,
          showRightSidebar
        });
        
        // If the app is already open, let chat send normally
        if (currentApp === app.id && showRightSidebar) {
          logger.info(LogCategory.USER_INPUT, 'App already open, chat sends to API', { appId: app.id });
          log.info('App already open, chat will send to API');
          return null;
        }
        
        // Open app and let it handle the request
        logger.info(LogCategory.APP_TRIGGER, 'Opening app, app will handle API request', { 
          appId: app.id, 
          trigger: matchingTrigger 
        });
        log.info('Opening app, blocking chat API request - app will handle');
        
        setTimeout(() => {
          setCurrentApp(app.id as AppId);
          setShowRightSidebar(true);
          setTriggeredAppInput(message);
          logger.info(LogCategory.APP_TRIGGER, 'App opened successfully', { appId: app.id });
          log.info('App opened and will handle API request', app.id);
        }, 1000);
        
        onAppTriggered?.(app.id, message);
        return app.id;
      }
    }
    
    return null;
  };

  // Return the trigger checking function for external use
  React.useImperativeHandle(React.createRef(), () => ({
    checkForAppTrigger
  }));

  return null;
};

