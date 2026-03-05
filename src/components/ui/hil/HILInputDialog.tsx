/**
 * ============================================================================
 * HIL Input Dialog - Human Input 对话框  
 * ============================================================================
 * 
 * 【组件职责】
 * - 处理ask_human类型的HIL中断
 * - 提供用户输入界面
 * - 基于2025-08-16实际测试API的格式
 * 
 * 【功能特性】
 * ✅ 问题展示和用户输入
 * ✅ 输入验证和提交
 * ✅ 上下文信息显示
 * ✅ 多行文本支持
 */

import React, { useState, useCallback } from 'react';
import { useHILActions, useCurrentHILInterrupt } from '../../../stores/useChatStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useAuthToken } from '../../../hooks/useAuthToken';

// ================================================================================
// 类型定义
// ================================================================================

export interface HILInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  interruptData: any; // HIL interrupt data from API
}

// ================================================================================
// 主组件
// ================================================================================

export const HILInputDialog: React.FC<HILInputDialogProps> = ({
  isOpen,
  onClose,
  interruptData
}) => {
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { resumeHILExecution } = useHILActions();
  const currentInterrupt = useCurrentHILInterrupt();
  const sessionStore = useSessionStore.getState();
  const { getToken } = useAuthToken();

  // 解析输入数据
  const question = interruptData?.data?.question || interruptData?.message || 'Please provide input';
  const context = interruptData?.data?.context || '';
  const instruction = interruptData?.data?.instruction || '';
  const toolName = interruptData?.data?.tool_name || 'ask_human';

  // 处理提交
  const handleSubmit = useCallback(async () => {
    if (!currentInterrupt || !userInput.trim()) return;
    
    setIsProcessing(true);
    try {
      // 基于实际API格式，ask_human的resumeValue就是字符串
      const resumeValue = userInput.trim();

      const currentSession = sessionStore.getCurrentSession();
      const sessionId = currentSession?.id || 'default';
      
      // 获取真实的authToken
      const authToken = await getToken();

      await resumeHILExecution(sessionId, resumeValue, authToken);
      onClose();
    } catch (error) {
      console.error('❌ HIL input submission failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentInterrupt, userInput, resumeHILExecution, sessionStore, onClose, getToken]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isProcessing) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, isProcessing]);

  if (!isOpen || !interruptData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <span className="text-blue-500">💬</span>
              <span>Human Input Required</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isProcessing}
            >
              <span className="text-xl">×</span>
            </button>
          </div>
          
          {/* Tool info */}
          <div className="mt-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {toolName}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Question */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Question</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-900">{question}</p>
              </div>
            </div>
            
            {/* Context (if available) */}
            {context && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Context</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{context}</p>
              </div>
            )}
            
            {/* Instruction (if available) */}
            {instruction && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Instructions</h3>
                <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 p-3 rounded">
                  {instruction}
                </p>
              </div>
            )}

            {/* User Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Response
              </label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows={4}
                placeholder="Enter your response here..."
                disabled={isProcessing}
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                Tip: Press Ctrl+Enter (or Cmd+Enter) to submit
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !userInput.trim()}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Submitting...
              </>
            ) : (
              <>
                <span className="mr-2">✅</span>
                Submit Response
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};