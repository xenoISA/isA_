/**
 * ============================================================================
 * HIL Authorization Dialog - 授权审批对话框
 * ============================================================================
 * 
 * 【组件职责】
 * - 处理授权请求的审批界面
 * - 支持批准/拒绝工作流
 * - 基于2025-08-16实际测试API的格式
 * 
 * 【功能特性】
 * ✅ 授权请求详情展示
 * ✅ 批准/拒绝操作
 * ✅ 理由输入和记录
 * ✅ 安全级别显示
 * ✅ 过期时间提醒
 */

import React, { useState, useCallback } from 'react';
import { useHILActions, useCurrentHILInterrupt } from '../../../stores/useChatStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useAuthToken } from '../../../hooks/useAuthToken';

// ================================================================================
// 类型定义
// ================================================================================

interface AuthorizationData {
  tool_name: string;
  reason: string;
  security_level?: string;
  request_id?: string;
  expires_at?: string;
  instruction?: string;
}

export interface HILAuthorizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  interruptData: any; // HIL interrupt data from API
}

// ================================================================================
// 主组件
// ================================================================================

export const HILAuthorizationDialog: React.FC<HILAuthorizationDialogProps> = ({
  isOpen,
  onClose,
  interruptData
}) => {
  const [approvalReason, setApprovalReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { resumeHILExecution } = useHILActions();
  const currentInterrupt = useCurrentHILInterrupt();
  const sessionStore = useSessionStore.getState();
  const { getToken } = useAuthToken();

  // 解析授权数据
  const authData: AuthorizationData = interruptData?.data?.original_response?.data || interruptData?.data?.tool_args || {};
  const requestId = authData.request_id || 'unknown';
  const securityLevel = authData.security_level || 'MEDIUM';
  const expiresAt = authData.expires_at;
  const toolName = authData.tool_name || interruptData?.data?.tool_name || 'unknown_tool';
  const reason = authData.reason || interruptData?.data?.question || 'No reason provided';

  // 计算过期时间
  const getTimeUntilExpiry = useCallback(() => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins <= 0) return 'EXPIRED';
    if (diffMins < 60) return `${diffMins} minutes`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  }, [expiresAt]);

  // 处理批准
  const handleApprove = useCallback(async () => {
    if (!currentInterrupt) return;
    
    setIsProcessing(true);
    try {
      const resumeValue = {
        approved: true,
        reason: approvalReason || 'User approved the operation'
      };

      const currentSession = sessionStore.getCurrentSession();
      const sessionId = currentSession?.id || 'default';
      
      // 获取真实的authToken
      const authToken = await getToken();

      await resumeHILExecution(sessionId, resumeValue, authToken);
      onClose();
    } catch (error) {
      console.error('❌ Authorization approval failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentInterrupt, approvalReason, resumeHILExecution, sessionStore, onClose, getToken]);

  // 处理拒绝
  const handleReject = useCallback(async () => {
    if (!currentInterrupt) return;
    
    setIsProcessing(true);
    try {
      const resumeValue = {
        approved: false,
        reason: rejectionReason || 'User denied the operation for security reasons'
      };

      const currentSession = sessionStore.getCurrentSession();
      const sessionId = currentSession?.id || 'default';
      
      // 获取真实的authToken
      const authToken = await getToken();

      await resumeHILExecution(sessionId, resumeValue, authToken);
      onClose();
    } catch (error) {
      console.error('❌ Authorization rejection failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentInterrupt, rejectionReason, resumeHILExecution, sessionStore, onClose, getToken]);

  if (!isOpen || !interruptData) return null;

  const timeUntilExpiry = getTimeUntilExpiry();
  const isExpired = timeUntilExpiry === 'EXPIRED';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <span className="text-amber-500">🔐</span>
              <span>Authorization Required</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isProcessing}
            >
              <span className="text-xl">×</span>
            </button>
          </div>
          
          {/* Security Badge */}
          <div className="mt-3 flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              securityLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
              securityLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {securityLevel} SECURITY
            </span>
            
            {timeUntilExpiry && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isExpired ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isExpired ? 'EXPIRED' : `⏰ ${timeUntilExpiry}`}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Request Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Tool Operation</h3>
              <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                {toolName}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Reason</h3>
              <p className="mt-1 text-sm text-gray-900">{reason}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Request ID</h3>
              <p className="mt-1 text-xs text-gray-500 font-mono">{requestId}</p>
            </div>
          </div>

          {/* Approval Section */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-700">
                Approval Reason (Optional)
              </label>
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                rows={2}
                placeholder="Enter reason for approval..."
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-red-700">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                rows={2}
                placeholder="Enter reason for rejection..."
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3">
          <button
            onClick={handleApprove}
            disabled={isProcessing || isExpired}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Processing...
              </>
            ) : (
              <>
                <span className="mr-2">✅</span>
                Approve
              </>
            )}
          </button>
          
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Processing...
              </>
            ) : (
              <>
                <span className="mr-2">❌</span>
                Reject
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};