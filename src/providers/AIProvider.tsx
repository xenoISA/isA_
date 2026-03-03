/**
 * ============================================================================
 * AI Provider (AIProvider.tsx) - Chat Service Context Management
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Provide global ChatService instance via React Context
 * - Manage service lifecycle and connection state
 * - Unified AI service access point for the application
 * - Handle service initialization and cleanup
 * 
 * Separation of Concerns:
 * ✅ Responsible for:
 *   - ChatService instance creation and management
 *   - React Context provision and state management
 *   - Service lifecycle management (init/cleanup)
 *   - Connection status tracking
 * 
 * ❌ Not responsible for:
 *   - Specific API request logic (handled by ChatService)
 *   - Message parsing and processing (handled by SSEParser)
 *   - Business logic processing (handled by modules)
 *   - UI state management (handled by stores)
 * 
 * Usage:
 * - Wrap component tree with <AIProvider> at app root
 * - Use useChatService() hook to get service instance
 * - Use useConnectionStatus() to get connection state
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ChatService } from '../api/chatService';
import { setChatServiceInstance } from '../hooks/useChatService';

interface AIContextType {
  chatService: ChatService | null;
  isConnected: boolean;
  error: string | null;
}

const AIContext = createContext<AIContextType>({
  chatService: null,
  isConnected: false,
  error: null
});

export const useChatService = () => {
  const context = useContext(AIContext);
  
  if (context === undefined) {
    throw new Error('useChatService must be used within an AIProvider');
  }
  
  return context.chatService;
};

export const useConnectionStatus = () => {
  const context = useContext(AIContext);
  
  if (context === undefined) {
    throw new Error('useConnectionStatus must be used within an AIProvider');
  }
  
  return context.isConnected;
};

export const useAIError = () => {
  const context = useContext(AIContext);
  
  if (context === undefined) {
    throw new Error('useAIError must be used within an AIProvider');
  }
  
  return context.error;
};

// Keep backward compatibility for existing code
export const useAI = () => {
  console.warn('useAI is deprecated, use useChatService instead');
  return useChatService();
};

interface AIProviderProps {
  children: React.ReactNode;
}

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize ChatService (uses GATEWAY_ENDPOINTS internally)
  useEffect(() => {
    try {
      const service = new ChatService();
      setChatService(service);
      setChatServiceInstance(service);
      setIsConnected(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error('AIProvider: ChatService initialization failed', { error: errorMessage });
      setError(errorMessage);
      setIsConnected(false);
      setChatServiceInstance(null);
    }

    return () => {
      setChatServiceInstance(null);
    };
  }, []);

  const contextValue: AIContextType = {
    chatService,
    isConnected,
    error
  };

  // Rendering children with context

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
};
