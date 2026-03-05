/**
 * ============================================================================
 * HIL Interaction Manager - HIL交互管理器
 * ============================================================================
 * 
 * 【组件职责】
 * - 统一管理不同类型的HIL中断
 * - 自动选择合适的对话框组件
 * - 基于2025-08-16实际测试API的格式
 * 
 * 【功能特性】
 * ✅ 自动检测中断类型
 * ✅ 路由到正确的对话框
 * ✅ 统一的状态管理
 * ✅ 错误处理和回退
 */

import React, { useState, useEffect } from 'react';
import { createLogger } from '../../../utils/logger';
import { useHILStatus, useCurrentHILInterrupt } from '../../../stores/useChatStore';

const log = createLogger('HILInteractionManager');
import { HILAuthorizationDialog } from './HILAuthorizationDialog';
import { HILInputDialog } from './HILInputDialog';

// ================================================================================
// 类型定义
// ================================================================================

export interface HILInteractionManagerProps {
  className?: string;
}

// ================================================================================
// 主组件
// ================================================================================

export const HILInteractionManager: React.FC<HILInteractionManagerProps> = ({
  className = ""
}) => {
  const [dialogType, setDialogType] = useState<'authorization' | 'input' | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const hilStatus = useHILStatus();
  const currentInterrupt = useCurrentHILInterrupt();

  // 监听HIL状态变化，自动打开相应的对话框
  useEffect(() => {
    if (hilStatus === 'waiting_for_human' && currentInterrupt) {
      const interruptType = currentInterrupt.interrupt?.data?.raw_interrupt?.type || currentInterrupt.interrupt?.interrupt_type;
      
      log.info('HIL interrupt detected:', {
        type: interruptType,
        hilStatus,
        interruptData: currentInterrupt
      });

      // 根据中断类型选择对话框
      if (interruptType === 'authorization') {
        setDialogType('authorization');
        setIsDialogOpen(true);
      } else if (interruptType === 'ask_human') {
        setDialogType('input');
        setIsDialogOpen(true);
      } else {
        // 未知类型，默认使用输入对话框
        log.warn('Unknown interrupt type, defaulting to input dialog:', interruptType);
        setDialogType('input');
        setIsDialogOpen(true);
      }
    } else if (hilStatus === 'idle' || hilStatus === 'processing_response') {
      // HIL状态变为空闲或处理中时，关闭对话框
      setIsDialogOpen(false);
      setDialogType(null);
    }
  }, [hilStatus, currentInterrupt]);

  // 关闭对话框
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setDialogType(null);
  };

  // 渲染对应的对话框
  const renderDialog = () => {
    if (!isDialogOpen || !currentInterrupt || !dialogType) return null;

    switch (dialogType) {
      case 'authorization':
        return (
          <HILAuthorizationDialog
            isOpen={isDialogOpen}
            onClose={handleCloseDialog}
            interruptData={currentInterrupt}
          />
        );
        
      case 'input':
        return (
          <HILInputDialog
            isOpen={isDialogOpen}
            onClose={handleCloseDialog}
            interruptData={currentInterrupt}
          />
        );
        
      default:
        log.warn('Unknown dialog type:', dialogType);
        return null;
    }
  };

  return (
    <div className={className}>
      {/* 状态指示器 */}
      {hilStatus === 'waiting_for_human' && (
        <div className="fixed bottom-4 right-4 bg-amber-100 border border-amber-400 text-amber-700 px-4 py-2 rounded-lg shadow-lg z-40 flex items-center space-x-2">
          <span className="animate-pulse">⏸️</span>
          <span className="text-sm font-medium">Waiting for human input...</span>
        </div>
      )}
      
      {hilStatus === 'processing_response' && (
        <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded-lg shadow-lg z-40 flex items-center space-x-2">
          <span className="animate-spin">⟳</span>
          <span className="text-sm font-medium">Processing your response...</span>
        </div>
      )}

      {/* 对话框 */}
      {renderDialog()}
    </div>
  );
};