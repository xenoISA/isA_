/**
 * ============================================================================
 * Right Panel (RightPanel.tsx) - 会话管理面板 - 全新设计
 * ============================================================================
 * 
 * 新的右侧面板，专为窄宽度优化设计：
 * - 当前会话的详细信息 
 * - 任务执行历史和状态
 * - 计费信息和积分消耗
 * - 记忆存储和工具调用历史
 * - SSE事件流监控(开发模式)
 */

import React, { useState, useMemo } from 'react';
import { useCurrentTasks, useTaskProgress, useIsExecutingPlan, useChatMessages } from '../../../stores/useChatStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useUserModule } from '../../../modules/UserModule';
import { TaskProgress, TaskItem } from '../../../types/taskTypes';
import { HILStatusPanel } from '../hil/HILStatusPanel';
import { HILInterruptData, HILCheckpointData, HILExecutionStatusData } from '../../../types/aguiTypes';
import { ContextPanel } from '../sidepanel/ContextPanel';

import { UpcomingSchedulePanel } from './UpcomingSchedulePanel';

export interface RightPanelProps {
  className?: string;
  /** When true, render the contextual ContextPanel instead of the static tabs */
  useContextPanel?: boolean;
  // HIL 相关props
  hilStatus?: HILExecutionStatusData | null;
  hilCheckpoints?: HILCheckpointData[];
  hilInterrupts?: HILInterruptData[];
  hilMonitoringActive?: boolean;
  showHilStatusPanel?: boolean;
  onToggleHilStatusPanel?: () => void;
  onHilRollback?: (checkpointId: string) => void;
  onHilPauseExecution?: () => void;
  onHilResumeExecution?: () => void;
  onHilViewInterrupt?: (interrupt: HILInterruptData) => void;
}

interface SessionMetrics {
  totalMessages: number;
  aiResponses: number;
  toolCalls: number;
  creditsUsed: number;
  memoryUpdates: number;
  lastActivity: string;
}

// 简化的标签配置
const TABS = [
  { id: 'overview', name: 'Overview', icon: '📊', color: '#22c55e' },
  { id: 'tasks', name: 'Tasks', icon: '⚡', color: '#3b82f6' },
  { id: 'schedule', name: 'Schedule', icon: '🕐', color: '#06b6d4' },
  { id: 'billing', name: 'Credits', icon: '💰', color: '#f59e0b' },
  { id: 'memory', name: 'Memory', icon: '🧠', color: '#8b5cf6' },
  { id: 'events', name: 'Events', icon: '📡', color: '#ec4899' },
  { id: 'hil', name: 'HIL', icon: '🎯', color: '#10b981' },
] as const;

type TabId = typeof TABS[number]['id'];

export const RightPanel: React.FC<RightPanelProps> = ({
  className = '',
  useContextPanel = true,
  hilStatus,
  hilCheckpoints = [],
  hilInterrupts = [],
  hilMonitoringActive = false,
  showHilStatusPanel = false,
  onToggleHilStatusPanel,
  onHilRollback,
  onHilPauseExecution,
  onHilResumeExecution,
  onHilViewInterrupt
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Store状态
  const currentTasks = useCurrentTasks();
  const taskProgress = useTaskProgress();
  const isExecutingPlan = useIsExecutingPlan();
  const messages = useChatMessages();
  const { getCurrentSession } = useSessionStore();
  const currentSession = getCurrentSession();
  const { credits } = useUserModule();

  // 计算会话指标
  const sessionMetrics = useMemo((): SessionMetrics => {
    const aiMessages = messages.filter(m => m.role === 'assistant').length;
    
    return {
      totalMessages: messages.length,
      aiResponses: aiMessages,
      toolCalls: currentTasks.length,
      creditsUsed: aiMessages * 1 + currentTasks.length * 2,
      memoryUpdates: Math.floor(aiMessages / 3),
      lastActivity: messages[messages.length - 1]?.timestamp || new Date().toISOString()
    };
  }, [messages, currentTasks]);

  // 渲染简洁的数据卡片
  const DataCard = ({ label, value, color = '#6b7280' }: { label: string; value: string | number; color?: string }) => (
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <div className="text-white/60 text-xs mb-1">{label}</div>
      <div className="text-white font-semibold" style={{ color }}>{value}</div>
    </div>
  );

  // 渲染状态指示器
  const StatusBadge = ({ status, label }: { status: 'active' | 'idle' | 'error'; label: string }) => {
    const colors = {
      active: 'bg-green-500/20 text-green-400',
      idle: 'bg-gray-500/20 text-gray-400',
      error: 'bg-red-500/20 text-red-400'
    };
    
    return (
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {label}
      </div>
    );
  };

  // 渲染Overview标签页 - 上下功能分区设计
  const renderOverviewTab = () => (
    <div className="h-full flex flex-col w-full max-w-full overflow-hidden">
      {/* === 上半部分：实时状态监控 === */}
      <div className="flex-none space-y-3">
        {/* 当前会话实时状态 */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium text-sm">Session Status</h4>
            <StatusBadge 
              status={isExecutingPlan ? 'active' : 'idle'} 
              label={isExecutingPlan ? 'Active' : 'Idle'} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="min-w-0 text-center">
              <div className="text-white/60 mb-1">Messages</div>
              <div className="text-white font-bold text-base">{sessionMetrics.totalMessages}</div>
            </div>
            <div className="min-w-0 text-center">
              <div className="text-white/60 mb-1">AI Calls</div>
              <div className="text-white font-bold text-base">{sessionMetrics.aiResponses}</div>
            </div>
          </div>
        </div>

        {/* 当前任务进度 - 紧凑显示 */}
        {taskProgress && (
          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <div className="text-blue-400 text-xs mb-1">Current Task</div>
            <div className="text-white text-sm font-medium mb-1 truncate">{taskProgress.currentStepName || 'AI Assistant'}</div>
            {taskProgress.currentStep && taskProgress.totalSteps && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Progress</span>
                  <span className="text-white/60">{taskProgress.currentStep}/{taskProgress.totalSteps}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full">
                  <div 
                    className="h-1.5 bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${(taskProgress.currentStep / taskProgress.totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* === 中间：分隔线 === */}
      <div className="flex-none my-4">
        <div className="border-t border-white/10"></div>
      </div>

      {/* === 下半部分：资源管理与统计 === */}
      <div className="flex-1 flex flex-col space-y-3">
        {/* 积分管理 */}
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20 text-center">
          <div className="text-green-400 text-sm mb-2">Available Credits</div>
          <div className="text-white text-3xl font-bold mb-1">{credits}</div>
          <div className="text-green-400/70 text-xs">credits remaining</div>
        </div>

        {/* 会话统计 */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 flex-1">
          <h4 className="text-white font-medium text-sm mb-3">Session Stats</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Tool Calls</span>
              <span className="text-white">{sessionMetrics.toolCalls}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Credits Used</span>
              <span className="text-orange-400">{sessionMetrics.creditsUsed}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Memory Updates</span>
              <span className="text-purple-400">{sessionMetrics.memoryUpdates}</span>
            </div>
          </div>
        </div>

        {/* 最近活动 */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <h4 className="text-white font-medium text-sm mb-2">Recent Activity</h4>
          <div className="text-xs text-white/60">
            Last message: {new Date(sessionMetrics.lastActivity).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染Tasks标签页 - 上下分区：当前任务 + 历史记录
  const renderTasksTab = () => (
    <div className="h-full flex flex-col w-full max-w-full overflow-hidden">
      {/* === 上半部分：当前执行任务 === */}
      <div className="flex-none space-y-3">
        <h4 className="text-white font-medium text-sm">Current Tasks</h4>
        
        {isExecutingPlan ? (
          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-400 text-sm font-medium">Task Executing</span>
            </div>
            {taskProgress && (
              <>
                <div className="text-white text-sm mb-1 truncate">{taskProgress.currentStepName || 'AI Assistant'}</div>
                {taskProgress.currentStep && taskProgress.totalSteps && (
                  <div className="text-xs text-white/60">
                    Step {taskProgress.currentStep} of {taskProgress.totalSteps}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
            <div className="text-white/40 text-sm">No active tasks</div>
          </div>
        )}
      </div>

      {/* === 中间：分隔线 === */}
      <div className="flex-none my-4">
        <div className="border-t border-white/10"></div>
        <div className="flex items-center justify-between mt-3">
          <h4 className="text-white font-medium text-sm">Task History</h4>
          <span className="text-white/60 text-xs">{currentTasks.length} total</span>
        </div>
      </div>
      
      {/* === 下半部分：任务历史记录 === */}
      <div className="flex-1 overflow-y-auto">
        {currentTasks.length > 0 ? (
          <div className="space-y-2">
            {currentTasks.slice(0, 10).map((task) => (
              <div key={task.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-start justify-between mb-1">
                  <div className="text-white text-sm font-medium flex-1 mr-2 truncate">{task.title}</div>
                  <StatusBadge 
                    status={task.status === 'completed' ? 'active' : task.status === 'failed' ? 'error' : 'idle'}
                    label={task.status}
                  />
                </div>
                {task.description && (
                  <div className="text-white/60 text-xs truncate">{task.description}</div>
                )}
                {task.result && (
                  <div className="text-green-400 text-xs bg-green-500/10 px-2 py-1 rounded mt-1 truncate">
                    ✓ {typeof task.result === 'string' ? task.result : 
                      task.result.success ? (task.result.data ? JSON.stringify(task.result.data) : 'Success') :
                      (task.result.error || 'Failed')}
                  </div>
                )}
              </div>
            ))}
            
            {currentTasks.length > 10 && (
              <div className="text-center py-2">
                <span className="text-white/40 text-xs">
                  +{currentTasks.length - 10} more tasks
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center flex-1 flex items-center justify-center">
            <div className="text-white/40">
              <div className="text-2xl mb-2">📝</div>
              <div className="text-sm">No task history</div>
              <div className="text-xs mt-1">Tasks will appear here when executed</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染Billing标签页
  const renderBillingTab = () => (
    <div className="space-y-3">
      {/* 积分余额 */}
      <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20 text-center">
        <div className="text-green-400 text-sm mb-2">Available Credits</div>
        <div className="text-white text-3xl font-bold mb-1">{credits}</div>
        <div className="text-green-400/70 text-xs">credits remaining</div>
      </div>

      {/* 本次会话消耗 */}
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <h4 className="text-white font-medium text-sm mb-3">Session Usage</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">Model Calls</span>
            <span className="text-white">{sessionMetrics.aiResponses}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Tool Calls</span>
            <span className="text-white">{sessionMetrics.toolCalls}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2">
            <span className="text-white font-medium">Total Used</span>
            <span className="text-orange-400 font-medium">{sessionMetrics.creditsUsed}</span>
          </div>
        </div>
      </div>

      {/* 计费规则 */}
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <h4 className="text-white font-medium text-sm mb-2">Billing Rules</h4>
        <div className="space-y-1 text-xs text-white/70">
          <div>• Model Call: 1 credit</div>
          <div>• Tool Call: 2 credits</div>
          <div>• Minimum: 1 credit/request</div>
        </div>
      </div>
    </div>
  );

  // 渲染Memory标签页
  const renderMemoryTab = () => (
    <div className="space-y-3">
      <DataCard label="Memory Updates" value={sessionMetrics.memoryUpdates} color="#8b5cf6" />
      
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <h4 className="text-white font-medium text-sm mb-3">Recent Context</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {messages.slice(-3).map((message, index) => (
            <div key={index} className="bg-white/5 rounded p-2">
              <div className="text-white/60 text-xs mb-1 capitalize">{message.role}:</div>
              <div className="text-white/80 text-xs break-words">
                {(message as any).content && typeof (message as any).content === 'string' 
                  ? ((message as any).content as string).substring(0, 120) + (((message as any).content as string).length > 120 ? '...' : '')
                  : 'Non-text content'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 渲染Events标签页
  const renderEventsTab = () => {
    const eventStats = [
      { type: 'start', count: 1 },
      { type: 'message', count: sessionMetrics.aiResponses },
      { type: 'tool', count: sessionMetrics.toolCalls },
      { type: 'memory', count: sessionMetrics.memoryUpdates },
    ].filter(stat => stat.count > 0);

    return (
      <div className="space-y-3">
        <h4 className="text-white font-medium text-sm">SSE Event Stream</h4>
        
        <div className="space-y-2">
          {eventStats.map((stat) => (
            <div key={stat.type} className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-sm font-mono">{stat.type}</span>
                <span className="text-white font-semibold">{stat.count}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
          <div className="text-amber-400 text-xs">
            💡 Event monitoring for development
          </div>
        </div>
      </div>
    );
  };

  // 渲染HIL标签页
  const renderHILTab = () => {
    if (!hilMonitoringActive) {
      return (
        <div className="bg-gray-500/10 rounded-lg p-4 border border-gray-500/20 text-center">
          <div className="text-gray-400 text-sm mb-2">HIL Service Inactive</div>
          <div className="text-gray-400 text-xs">
            Human-in-the-Loop features are not currently active.
          </div>
        </div>
      );
    }

    return (
      <div>
        <HILStatusPanel
          status={hilStatus || null}
          checkpoints={hilCheckpoints || []}
          interrupts={hilInterrupts || []}
          isVisible={true}
          onToggleVisibility={() => {}}
          onRollback={onHilRollback || (() => {})}
          onPauseExecution={onHilPauseExecution || (() => {})}
          onResumeExecution={onHilResumeExecution || (() => {})}
          onViewInterrupt={onHilViewInterrupt || (() => {})}
          inRightPanel={true}
        />
      </div>
    );
  };

  // Contextual side panel mode — replaces the static tab system
  if (useContextPanel) {
    return (
      <div className={`h-full w-full max-w-full flex flex-col bg-gray-900/50 border-l border-white/10 overflow-hidden ${className}`} style={{ minWidth: 0, maxWidth: '100%' }}>
        <ContextPanel className="flex-1" />
      </div>
    );
  }

  return (
    <div className={`h-full w-full max-w-full flex flex-col bg-gray-900/50 border-l border-r border-white/10 overflow-hidden ${className}`} style={{ minWidth: 0, maxWidth: '100%' }}>
      {/* 标题和状态栏 */}
      <div className="flex-shrink-0 p-3 border-b border-white/10 bg-gray-900/30 w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-base">Session Panel</h3>
          <div className={`w-2 h-2 rounded-full ${isExecutingPlan ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
        </div>
        
        {/* 标签导航 - 紧凑设计避免文字截断 */}
        <div className="grid grid-cols-3 gap-1">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center px-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 text-primary border border-primary/20'
                  : 'text-white/60 hover:text-white/80 hover:bg-white/5'
              }`}
              style={activeTab === tab.id ? { borderColor: tab.color + '40', color: tab.color } : {}}
            >
              <span className="text-sm mb-0.5">{tab.icon}</span>
              <span className="text-xs leading-none">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 p-3 overflow-y-auto w-full max-w-full">
        <div className="w-full max-w-full overflow-hidden">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'tasks' && renderTasksTab()}
          {activeTab === 'schedule' && <UpcomingSchedulePanel />}
          {activeTab === 'billing' && renderBillingTab()}
          {activeTab === 'memory' && renderMemoryTab()}
          {activeTab === 'events' && renderEventsTab()}
          {activeTab === 'hil' && renderHILTab()}
        </div>
      </div>
    </div>
  );
};