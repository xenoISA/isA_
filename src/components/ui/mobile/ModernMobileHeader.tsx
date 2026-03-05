/**
 * Modern Mobile Header Component - Glassmorphism Pro
 * Ultra-modern glass effects inspired by ChatGPT, Claude, Gemini, and Grok
 */
import React from 'react';
import { createLogger } from '../../../utils/logger';
import { GlassButton, GlassCard } from '../../shared';

const log = createLogger('ModernMobileHeader');

// Simple SVG icon components
const Menu = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const Edit = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const User = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export interface ModernMobileHeaderProps {
  title?: string;
  subtitle?: string;
  showNewChatButton?: boolean;
  showUserAvatar?: boolean;
  userAvatarUrl?: string;
  userName?: string;
  onMenuClick?: () => void;
  onNewChatClick?: () => void;
  onUserAvatarClick?: () => void;
  isNativeApp?: boolean;
}

export const ModernMobileHeader: React.FC<ModernMobileHeaderProps> = ({
  title = "AI Assistant",
  subtitle,
  showNewChatButton = true,
  showUserAvatar = true,
  userAvatarUrl,
  userName,
  onMenuClick,
  onNewChatClick,
  onUserAvatarClick,
  isNativeApp = false
}) => {
  return (
    <header 
      className={`
        glass-mobile-header relative
        flex items-center justify-between
        h-16 px-4
        ${isNativeApp ? 'pt-safe' : ''}
      `}
      style={{
        paddingTop: isNativeApp ? 'env(safe-area-inset-top)' : undefined
      }}
    >
      {/* Clean glassmorphism background - matching PC design */}
      <div className="absolute inset-0 bg-white/8 backdrop-blur-md border-b border-white/10" />
      
      <div className="relative z-10 flex items-center justify-between w-full">
        {/* Left section - Brand logo + Menu (matching PC) */}
        <div className="flex items-center gap-3">
          {/* Brand Logo - matching PC design */}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 shadow-lg shadow-indigo-500/25 backdrop-blur-sm border border-white/10">
            <span className="text-sm font-bold text-white drop-shadow-sm">isA</span>
          </div>
          
          {/* Menu Button */}
          <button
            onClick={() => {
              log.debug('Glass menu clicked');
              onMenuClick?.();
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/20 transition-all duration-200"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4 text-white/90" />
          </button>
        </div>

        {/* Center section - Title (matching PC style) */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-4">
          <h1 className="text-white/95 font-bold text-lg truncate drop-shadow-sm tracking-tight">
            {title || 'Intelligent Systems Assistant'}
          </h1>
          {subtitle && (
            <p className="text-white/60 text-xs font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right section - Glassmorphism Actions */}
        <div className="flex items-center gap-3">
          {/* New Chat button - matching PC glassmorphism style */}
          {showNewChatButton && (
            <button
              onClick={onNewChatClick}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/20 transition-all duration-200"
              aria-label="New chat"
            >
              <Edit className="w-4 h-4 text-white/90" />
            </button>
          )}
          
          {/* User avatar - matching PC design */}
          {showUserAvatar && (
            <button
              onClick={() => {
                log.debug('Glass user avatar clicked');
                onUserAvatarClick?.();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border border-white/20 transition-all duration-200 shadow-lg"
              aria-label={`User menu - ${userName || 'Profile'}`}
            >
              {userAvatarUrl ? (
                <img 
                  src={userAvatarUrl} 
                  alt={userName || 'User'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-sm">
                  {userName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};