/**
 * Modern Mobile Chat Layout
 * Following ChatGPT, Claude, Gemini, Grok mobile UX/UI patterns
 */
import React, { useState, useCallback, useMemo } from 'react';
import { createLogger } from '../../../utils/logger';
import { THEME_COLORS } from '../../../constants/theme';

const log = createLogger('ModernMobileChatLayout');
import { ChatMessage } from '../chat/ChatLayout';
import { ModernMobileHeader } from './ModernMobileHeader';
import { ModernMobileMessageList } from './ModernMobileMessageList';
import { ModernMobileInputArea } from './ModernMobileInputArea';
import { MobileTaskBar } from './MobileTaskBar';
import { MobileLoadingState } from './MobileTaskProgress';

export interface ModernMobileChatLayoutProps {
  messages?: ChatMessage[];
  isLoading?: boolean;
  isTyping?: boolean;
  isStreaming?: boolean;
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>;
  onSendMultimodal?: (content: string, files: File[], metadata?: Record<string, any>) => Promise<void>;
  onNewChat?: () => void;
  isNativeApp?: boolean;
  userAvatarUrl?: string;
  userName?: string;
  // Mobile task optimization props
  activeTasks?: Array<{
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
  }>;
  connectionStatus?: 'online' | 'connecting' | 'offline';
}

export const ModernMobileChatLayout: React.FC<ModernMobileChatLayoutProps> = ({
  messages = [],
  isLoading = false,
  isTyping = false,
  isStreaming = false,
  onSendMessage,
  onSendMultimodal,
  onNewChat,
  isNativeApp = false,
  userAvatarUrl,
  userName,
  activeTasks = [],
  connectionStatus = 'online'
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(false); // Temporarily disabled for debugging

  const handleMenuClick = useCallback(() => {
    log.debug('Menu button clicked! showMenu was:', showMenu);
    setShowMenu(prev => {
      const newValue = !prev;
      log.debug('Setting showMenu to:', newValue);
      return newValue;
    });
  }, [showMenu]);

  const handleNewChat = useCallback(() => {
    log.debug('New chat button clicked! onNewChat function:', onNewChat);
    onNewChat?.();
    setShowMenu(false);
  }, [onNewChat]);

  const handleUserClick = useCallback(() => {
    log.debug('User profile clicked!');
    setShowUserProfile(true);
  }, []);

  // Handle initial load animation
  React.useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Handle escape key for closing modals
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUserProfile) setShowUserProfile(false);
        else if (showMenu) setShowMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMenu, showUserProfile]);


  return (
    <div className={`modern-mobile-chat-layout h-screen flex flex-col transition-all duration-500 ${isInitialLoad ? 'opacity-0' : 'opacity-100'}`}
      style={{ 
        background: THEME_COLORS.primaryGradient 
      }}>
      
      {/* Premium Loading Overlay */}
      {isInitialLoad && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10 flex flex-col items-center justify-center">
          <div className="relative">
            {/* Animated logo */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-3xl flex items-center justify-center mb-6 animate-pulse shadow-2xl shadow-blue-500/25">
              <svg className="w-10 h-10 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            {/* Loading animation */}
            <div className="flex items-center justify-center gap-1 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            
            <p className="text-center text-gray-600 dark:text-gray-400 font-medium">
              Starting AI Assistant...
            </p>
          </div>
        </div>
      )}

      {/* Modern Header with fade-in */}
      <div className={`transition-all duration-700 transform ${isInitialLoad ? 'translate-y-[-20px] opacity-0' : 'translate-y-0 opacity-100'}`} style={{ transitionDelay: '200ms' }}>
        <ModernMobileHeader
          title="AI Assistant"
          subtitle={isTyping ? "Typing..." : "Online"}
          showNewChatButton={true}
          showUserAvatar={true}
          userAvatarUrl={userAvatarUrl}
          userName={userName}
          onMenuClick={handleMenuClick}
          onNewChatClick={handleNewChat}
          onUserAvatarClick={handleUserClick}
          isNativeApp={isNativeApp}
        />
      </div>

      {/* Mobile Task Bar - Shows loading, typing, and task progress */}
      <div className={`transition-all duration-700 transform ${isInitialLoad ? 'translate-y-[-10px] opacity-0' : 'translate-y-0 opacity-100'}`} style={{ transitionDelay: '300ms' }}>
        <MobileTaskBar
          activeTasks={activeTasks}
          isLoading={isLoading}
          isTyping={isTyping}
          isStreaming={isStreaming}
          connectionStatus={connectionStatus}
          position="top"
          compact={true}
          autoCollapse={true}
        />
      </div>

      {/* Messages Area with slide-up animation */}
      <div className={`flex-1 transition-all duration-700 transform ${isInitialLoad ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`} style={{ transitionDelay: '400ms' }}>
        <ModernMobileMessageList
          messages={messages}
          isLoading={false} // Disabled: handled by MobileTaskBar above
          isTyping={false}  // Disabled: handled by MobileTaskBar above
          userAvatarUrl={userAvatarUrl}
        />
      </div>

      {/* Input Area with slide-up animation - Connected seamlessly */}
      <div className={`transition-all duration-700 transform ${isInitialLoad ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`} style={{ transitionDelay: '600ms' }}>
        <ModernMobileInputArea
          onSendMessage={onSendMessage}
          onSendMultimodalMessage={onSendMultimodal}
          isLoading={false} // Disabled: handled by MobileTaskBar above
          isNativeApp={isNativeApp}
          placeholder="Message AI Assistant..."
        />
      </div>

      {/* Left Slide-in Menu - Claude/Grok/Gemini Style */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Left Sidebar Menu - Glassmorphism */}
          <div 
            className={`
              fixed top-0 left-0 bottom-0 w-80 max-w-[85vw]
              bg-white/90 dark:bg-black/50 backdrop-blur-xl
              border-r border-white/20 dark:border-white/10
              z-50
              transform transition-transform duration-300 ease-out
              ${showMenu ? 'translate-x-0' : '-translate-x-full'}
              flex flex-col
              shadow-2xl shadow-black/20
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Assistant</h2>
              <button
                onClick={() => setShowMenu(false)}
                className="w-8 h-8 rounded-lg bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 border border-white/20"
              >
                <svg className="w-5 h-5 text-gray-800 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4">
              {/* New Chat */}
              <button
                onClick={() => {
                  handleNewChat();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 backdrop-blur-sm rounded-lg mx-2"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="font-medium">New Chat</span>
              </button>

              {/* Chat History */}
              <button
                onClick={() => {
                  log.debug('Chat History clicked');
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 backdrop-blur-sm rounded-lg mx-2"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="font-medium">Chat History</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  log.debug('Settings clicked');
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 backdrop-blur-sm rounded-lg mx-2"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="font-medium">Settings</span>
              </button>
            </div>

            {/* User Profile Section */}
            <div className="border-t border-white/20 dark:border-white/10 p-4">
              <button
                onClick={() => {
                  handleUserClick();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-2 py-3 text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt={userName || 'User'} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{userName || 'User'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">View profile</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowUserProfile(false)}
          />
          
          {/* Profile Modal - Glassmorphism */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white/90 dark:bg-black/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 max-w-sm mx-auto animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h2>
              <button
                onClick={() => setShowUserProfile(false)}
                className="w-8 h-8 rounded-lg bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200 border border-white/20"
              >
                <svg className="w-5 h-5 text-gray-800 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6">
              {/* Avatar and Name */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt={userName || 'User'} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {userName || 'User'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI Assistant User</p>
              </div>

              {/* Profile Options */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    log.debug('Edit Profile clicked');
                    setShowUserProfile(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => {
                    log.debug('Account Settings clicked');
                    setShowUserProfile(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Account Settings</span>
                </button>

                <button
                  onClick={() => {
                    log.debug('Privacy clicked');
                    setShowUserProfile(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Privacy & Security</span>
                </button>

                <div className="border-t border-white/20 dark:border-white/10 pt-2 mt-2">
                  <button
                    onClick={() => {
                      log.debug('Sign Out clicked');
                      setShowUserProfile(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-all duration-200 backdrop-blur-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};