/**
 * ============================================================================
 * Three Column Layout (ThreeColumnLayout.tsx)
 * ============================================================================
 * 
 * 新的三栏布局组件：
 * - 左侧栏：会话管理 (16.67% 宽度)
 * - 中间聊天区：主要聊天界面 (灵活宽度)
 * - 右侧面板：会话信息管理 (16.67% 宽度，与左侧栏同宽)
 * - Widget区域：原来的RightSidebar改为弹窗模式和半屏/全屏模式
 */

import React, { useState, useCallback, useMemo } from 'react';
import { createLogger } from '../../../utils/logger';
import { ChatContentLayout } from './ChatContentLayout';
import { InputAreaLayout } from './InputAreaLayout';
import { RightPanel } from './RightPanel';
import { SmartWidgetSelector } from '../widgets/SmartWidgetSelector';
import { ChatMessage } from '../../../types/chatTypes';
const log = createLogger('ThreeColumnLayout');

export interface ThreeColumnLayoutProps {
  // Header
  headerContent?: React.ReactNode;
  
  // Left Sidebar
  sidebarContent?: React.ReactNode;
  showSidebar?: boolean;
  sidebarWidth?: string;
  
  // Chat Content
  messages?: ChatMessage[];
  isLoading?: boolean;
  isTyping?: boolean;
  conversationProps?: any;
  
  // Input Area
  inputProps?: any;
  onSendMessage?: (message: string) => Promise<void>;
  onSendMultimodal?: (message: string, files: File[]) => Promise<void>;
  
  // Right Panel (新增)
  showRightPanel?: boolean;
  rightPanelWidth?: string;
  onToggleRightPanel?: () => void;
  
  // Widget System
  onWidgetSelect?: (widgetId: string, mode: 'half' | 'full') => void;
  showWidgetSelector?: boolean;
  onCloseWidgetSelector?: () => void;
  onShowWidgetSelector?: () => void;
  onMessageClick?: (message: any) => void; // 为了兼容性添加
  
  // Right Sidebar (现在是半屏模式的widget显示)
  rightSidebarContent?: React.ReactNode;
  showRightSidebar?: boolean;
  rightSidebarWidth?: string;
  
  // Widget Full Screen Mode
  fullScreenWidget?: React.ReactNode;
  showFullScreenWidget?: boolean;
  onCloseFullScreenWidget?: () => void;
  
  className?: string;
}

export const ThreeColumnLayout: React.FC<ThreeColumnLayoutProps> = ({
  headerContent,
  sidebarContent,
  showSidebar = true,
  sidebarWidth = '16.67%', // 1/6 宽度
  messages = [],
  isLoading = false,
  isTyping = false,
  conversationProps,
  inputProps,
  onSendMessage,
  onSendMultimodal,
  showRightPanel = false,
  rightPanelWidth = '16.67%', // 与左侧栏同宽
  onToggleRightPanel,
  onWidgetSelect,
  showWidgetSelector = false,
  onCloseWidgetSelector,
  onShowWidgetSelector,
  onMessageClick,
  rightSidebarContent,
  showRightSidebar = false,
  rightSidebarWidth = '50%',
  fullScreenWidget,
  showFullScreenWidget = false,
  onCloseFullScreenWidget,
  className = ''
}) => {
  // 计算布局尺寸
  const layoutConfig = useMemo(() => {
    log.debug('Computing layout config', {
      showSidebar, showRightPanel, showRightSidebar
    });
    // Widget半屏模式时的特殊处理
    if (showRightSidebar) {
      return {
        showLeftSidebar: false, // Widget模式时隐藏左侧栏
        leftWidth: '0%',
        centerWidth: '50%', // Chat占一半
        rightSidebarWidth: '50%', // Widget占一半
        showRightPanel: false, // Widget模式时隐藏右侧panel
        rightPanelWidth: '0%'
      };
    }
    
    // 正常模式 - 计算布局比例
    const leftWidth = showSidebar ? 16.67 : 0; // 1/6 = 16.67%
    const rightWidth = showRightPanel ? 16.67 : 0; // 1/6 = 16.67%  
    const centerWidth = 100 - leftWidth - rightWidth;
    
    const config = {
      showLeftSidebar: showSidebar,
      leftWidth: `${leftWidth}%`,
      centerWidth: `${Math.max(centerWidth, 30)}%`, // 最小保持30%
      rightSidebarWidth: rightSidebarWidth,
      showRightPanel: showRightPanel,
      rightPanelWidth: `${rightWidth}%`
    };
    
    log.debug('Final layout config', config);
    return config;
  }, [showSidebar, showRightPanel, showRightSidebar, rightSidebarWidth]);

  // 渲染全屏Widget模式
  if (showFullScreenWidget && fullScreenWidget) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900">
        {/* 全屏Widget头部 */}
        <div className="h-12 bg-gray-800 border-b border-white/10 flex items-center justify-between px-4">
          <div className="text-white font-medium">Widget Full Screen Mode</div>
          <button
            onClick={onCloseFullScreenWidget}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 全屏Widget内容 */}
        <div className="h-[calc(100%-3rem)] overflow-hidden">
          {fullScreenWidget}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col h-full ${className}`}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      {headerContent && (
        <div className="flex-shrink-0 border-b border-white/10">
          {headerContent}
        </div>
      )}

      {/* Main Content Area */}
      <div 
        className="flex-1 flex overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '100%',
          position: 'relative',
          flex: '1 1 0%'
        }}
      >
        {/* Left Sidebar */}
        {layoutConfig.showLeftSidebar && sidebarContent && (
          <div 
            className="flex-shrink-0 border-r border-white/10"
            style={{ width: layoutConfig.leftWidth }}
          >
            {sidebarContent}
          </div>
        )}

        {/* Center Chat Area */}
        <div 
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            minWidth: 0,
            position: 'relative'
          }}
        >
          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            <ChatContentLayout
              messages={messages}
              isLoading={isLoading}
              isTyping={isTyping}
              onMessageClick={onMessageClick}
              {...conversationProps}
            />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-white/10">
            <InputAreaLayout
              onSendMessage={onSendMessage}
              onSendMultimodal={onSendMultimodal}
              onShowWidgetSelector={onShowWidgetSelector}
              showWidgetSelector={showWidgetSelector}
              {...inputProps}
            />
          </div>
        </div>

        {/* Right Sidebar (半屏Widget模式) */}
        {showRightSidebar && rightSidebarContent && (
          <div 
            className="flex-shrink-0 border-l border-white/10 bg-gray-900/50"
            style={{ width: '50%' }}
          >
            {rightSidebarContent}
          </div>
        )}

        {/* Right Panel (会话管理) */}
        {layoutConfig.showRightPanel && (
          <div 
            className="flex-shrink-0 border-l border-white/10"
            style={{ width: '16.67%' }}
          >
            <RightPanel />
          </div>
        )}

        {/* Right Panel Toggle Arrow - Only show in normal mode (no widget) */}
        {!showRightSidebar && onToggleRightPanel && (
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20">
            <button
              onClick={onToggleRightPanel}
              className={`w-8 h-12 bg-gray-800/80 hover:bg-gray-700/90 border-l border-t border-b border-white/10 rounded-l-lg flex items-center justify-center text-white/70 hover:text-white transition-all shadow-lg hover:shadow-xl ${
                showRightPanel ? 'translate-x-0' : 'translate-x-0 bg-blue-600/80 hover:bg-blue-500/90'
              }`}
              title={showRightPanel ? 'Hide panel' : 'Show panel'}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showRightPanel ? 'rotate-0' : 'rotate-180'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Smart Widget Selector Modal */}
      {showWidgetSelector && (
        <SmartWidgetSelector
          isOpen={showWidgetSelector}
          onClose={onCloseWidgetSelector || (() => {})}
          onWidgetSelect={onWidgetSelect || (() => {})}
        />
      )}
    </div>
  );
};