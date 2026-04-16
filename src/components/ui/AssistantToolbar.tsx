/**
 * ============================================================================
 * Assistant Toolbar (AssistantToolbar.tsx) - Voice-First Chat Interface
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Voice-first Chat UI with SSE support
 * - Chat API integration through gateway (/api/v1/agents/chat)
 * - macOS-style toolbar dropdown experience
 * - Agent handles Event Service through tool calls
 * 
 * Design Philosophy:
 * - Voice input + Chat API = Assistant experience
 * - Same as other chat UIs, just different input method
 * - Agent uses tools (Event Service) automatically
 * - Simple, focused interface for productivity
 */
import React, { useState, useRef, useEffect } from 'react';
import { createLogger } from '../../utils/logger';
import { GATEWAY_CONFIG, GATEWAY_ENDPOINTS } from '../../config/gatewayConfig';
import { authTokenStore } from '../../stores/authTokenStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
const log = createLogger('AssistantToolbar');

// Glass Button Style Creator
const createGlassButtonStyle = (color: string, size: 'sm' | 'md' = 'md', isDisabled: boolean = false) => ({
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: `rgba(${color}, 0.1)`,
  backdropFilter: 'blur(10px)',
  border: `1px solid rgba(${color}, 0.2)`,
  opacity: isDisabled ? 0.4 : 1,
  boxShadow: `0 2px 8px rgba(${color}, 0.15)`,
  width: size === 'sm' ? '20px' : '24px',
  height: size === 'sm' ? '20px' : '24px',
  color: `rgb(${color})`
});

const createGlassButtonHoverHandlers = (color: string, isDisabled: boolean = false) => ({
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      e.currentTarget.style.background = `rgba(${color}, 0.2)`;
      e.currentTarget.style.borderColor = `rgba(${color}, 0.4)`;
      e.currentTarget.style.transform = 'scale(1.05)';
      e.currentTarget.style.boxShadow = `0 4px 12px rgba(${color}, 0.25)`;
    }
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      e.currentTarget.style.background = `rgba(${color}, 0.1)`;
      e.currentTarget.style.borderColor = `rgba(${color}, 0.2)`;
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = `0 2px 8px rgba(${color}, 0.15)`;
    }
  }
});

// Chat message interface
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AssistantToolbarProps {
  className?: string;
}

export const AssistantToolbar: React.FC<AssistantToolbarProps> = ({ 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Wire real Web Speech API via useVoiceInput hook
  const {
    isListening,
    transcript,
    toggle: toggleVoiceInput,
    supported: voiceSupported,
  } = useVoiceInput();

  // Get user info (replace with actual auth)
  const userId = 'assistant_user_001';
  const sessionId = `assistant_session_${Date.now()}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === '/')) {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current && inputMode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, inputMode]);

  // Sync voice transcript into chat input
  useEffect(() => {
    if (transcript) {
      setCurrentInput(transcript);
    }
  }, [transcript]);

  // Send message to Chat API
  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setCurrentResponse('');
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');

    try {
      // Call Chat API
      const token = authTokenStore.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(GATEWAY_ENDPOINTS.AGENTS.CHAT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          message, 
          user_id: userId,
          session_id: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle Server-Sent Events
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let completeResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const eventData = JSON.parse(line.slice(6));
                handleSSEEvent(eventData, completeResponse, setCurrentResponse, (response) => {
                  completeResponse = response;
                });
              } catch (e) {
                log.error('Failed to parse SSE data', e);
              }
            }
          }
        }

        // Add final assistant message
        if (completeResponse) {
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: completeResponse,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
    } catch (error) {
      log.error('Failed to send message', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'system',
        content: `Error: ${error}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentResponse('');
    }
  };

  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentInput);
    }
  };

  const toggleAssistant = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Assistant Toolbar Button */}
      <button
        ref={buttonRef}
        onClick={toggleAssistant}
        className="relative flex items-center gap-2 px-3 py-1.5 bg-gray-800/30 border border-gray-700/50 rounded-lg text-white hover:bg-gray-700/50 transition-colors"
        title="Assistant (Cmd+K)"
      >
        <div className="relative">
          <div style={createGlassButtonStyle('107, 114, 128', 'md', true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 1v6m0 6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M21 12h-6m-6 0H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium">Assistant</span>
          <svg 
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Assistant Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" />
          
          <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-96 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <button style={createGlassButtonStyle('139, 92, 246', 'md')} {...createGlassButtonHoverHandlers('139, 92, 246')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 1v6m0 6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M21 12h-6m-6 0H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <div>
                  <h3 className="text-sm font-semibold text-white">Voice Assistant</h3>
                  <p className="text-xs text-gray-400">AI automation companion</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-700/50 rounded text-gray-400 hover:text-white transition-colors"
                title="Close (Esc)"
                style={createGlassButtonStyle('239, 68, 68', 'sm')}
                {...createGlassButtonHoverHandlers('239, 68, 68')}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <div className="mb-2">🎙️</div>
                  <div>Start by speaking or typing</div>
                  <div className="text-xs mt-1">I can help automate tasks, set reminders, and more</div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`p-2 rounded text-sm ${
                    message.role === 'user' ? 'bg-purple-500/20 ml-8' :
                    message.role === 'system' ? 'bg-red-500/20' :
                    'bg-gray-700/30 mr-8'
                  }`}>
                    <div className="text-xs text-gray-400 mb-1">
                      {message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Assistant' : 'System'}
                    </div>
                    <div className="text-gray-200">{message.content}</div>
                  </div>
                ))
              )}
              
              {/* Current streaming response */}
              {currentResponse && (
                <div className="p-2 rounded text-sm bg-gray-700/30 mr-8 border border-purple-500/30">
                  <div className="text-xs text-gray-400 mb-1">Assistant</div>
                  <div className="text-gray-200">{currentResponse}</div>
                  <div className="text-xs text-purple-400 mt-1">Typing...</div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-gray-700/50 bg-gray-800/30">
              {/* Input Mode Toggle */}
              <div className="flex justify-center mb-3">
                <div className="flex bg-gray-700/30 rounded-lg p-1">
                  <button
                    onClick={() => setInputMode('voice')}
                    className={`px-3 py-1 text-xs rounded transition-all ${
                      inputMode === 'voice'
                        ? 'bg-purple-500/30 text-purple-300'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🎙️ Voice
                  </button>
                  <button
                    onClick={() => setInputMode('text')}
                    className={`px-3 py-1 text-xs rounded transition-all ${
                      inputMode === 'text'
                        ? 'bg-purple-500/30 text-purple-300'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    ⌨️ Text
                  </button>
                </div>
              </div>

              {/* Voice Input */}
              {inputMode === 'voice' && (
                <div className="text-center space-y-3">
                  {!voiceSupported && (
                    <div className="text-xs text-yellow-400 mb-2">
                      Speech recognition is not supported in this browser.
                    </div>
                  )}
                  <button
                    onClick={() => { if (inputMode === 'voice') toggleVoiceInput(); }}
                    disabled={isLoading || !voiceSupported}
                    className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all ${
                      isListening 
                        ? 'border-red-500 bg-red-500/20 animate-pulse' 
                        : 'border-purple-500 bg-purple-500/20 hover:bg-purple-500/30'
                    } disabled:opacity-50`}
                  >
                    {isListening ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-400">
                        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="currentColor"/>
                        <path d="M8 11a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 19v3m-6 0h12" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-purple-400">
                        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="currentColor"/>
                        <path d="M8 11a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 19v3m-6 0h12" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>
                  
                  <div className="text-sm font-medium text-white">
                    {isLoading ? '🤖 Processing...' : isListening ? '🎙️ Listening...' : 'Tap to speak'}
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    {isLoading ? 'AI is working on your request' :
                     isListening ? 'Speak clearly for best results' : 
                     'Say something like "Remind me to call mom at 3pm"'}
                  </div>

                  {/* Voice Input Result */}
                  {currentInput && !isListening && (
                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded text-xs">
                      <div className="text-purple-300 mb-1">Heard:</div>
                      <div className="text-gray-300">"{currentInput}"</div>
                      <button
                        onClick={() => sendMessage(currentInput)}
                        disabled={isLoading}
                        className="mt-2 px-3 py-1 bg-purple-500/30 hover:bg-purple-500/40 rounded text-purple-300 transition-colors disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Text Input */}
              {inputMode === 'text' && (
                <div className="space-y-3">
                  <textarea
                    ref={inputRef}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your request... (e.g., 'Monitor my GitHub repo for new issues')"
                    className="w-full p-3 bg-white/5 border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none text-sm"
                    rows={3}
                    disabled={isLoading}
                  />
                  
                  <button
                    onClick={() => sendMessage(currentInput)}
                    disabled={!currentInput.trim() || isLoading}
                    className="w-full p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded text-white font-medium transition-all text-sm hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '🤖 Processing...' : '✨ Send Message'}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-700/50 bg-gray-800/30">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-4">
                  <span>⌘K to toggle</span>
                  <span>⌘Enter to send</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Chat API Ready</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Handle Server-Sent Events from Chat API
const handleSSEEvent = (
  event: any,
  currentCompleteResponse: string,
  setCurrentResponse: (response: string) => void,
  updateCompleteResponse: (response: string) => void
) => {
  switch (event.type) {
    case 'start':
      log.info('Chat processing started');
      break;
    
    case 'custom_stream':
      // Handle LLM token streaming
      if (event.content?.custom_llm_chunk) {
        const newResponse = currentCompleteResponse + event.content.custom_llm_chunk;
        updateCompleteResponse(newResponse);
        setCurrentResponse(newResponse);
      }
      
      // Handle tool execution progress
      if (event.content?.type === 'progress') {
        log.debug('Tool progress', event.content.data);
      }
      break;
    
    case 'message_stream':
      // Handle complete message from agent
      if (event.content?.raw_message) {
        const match = event.content.raw_message.match(/content='([^']+)'/);
        if (match) {
          const completeResponse = match[1];
          updateCompleteResponse(completeResponse);
          setCurrentResponse(completeResponse);
        }
      }
      break;
    
    case 'billing':
      log.debug('Billing info', event.data);
      break;
    
    case 'memory_update':
      log.debug('Memory updated', event.content);
      break;
    
    case 'end':
      log.info('Chat processing completed');
      break;
    
    case 'error':
      log.error('Chat error', event.content);
      break;
    
    default:
      log.debug('Unknown event type', event);
  }
};

/**
 * Wrapped Assistant Toolbar (no store provider needed)
 */
export const AssistantToolbarWithProvider: React.FC<{ className?: string }> = ({ className }) => {
  return <AssistantToolbar className={className} />;
};
