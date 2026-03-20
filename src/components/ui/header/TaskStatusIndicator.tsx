/**
 * ============================================================================
 * Header任务状态指示器 - 显示当前活跃任务概览
 * ============================================================================
 * 
 * 基于SSE事件显示任务状态：
 * - 活跃任务数量
 * - 当前执行状态
 * - 快速控制按钮
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTaskStore } from '../../../stores/useTaskStore';

// Glass Button Style Creator for Header
const createHeaderGlassButtonStyle = (color: string, size: 'sm' | 'md' = 'sm', isActive: boolean = false) => ({
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: isActive ? `rgba(${color}, 0.2)` : `rgba(${color}, 0.1)`,
  backdropFilter: 'blur(10px)',
  border: `1px solid rgba(${color}, ${isActive ? '0.4' : '0.2'})`,
  boxShadow: `0 2px 8px rgba(${color}, 0.15)`,
  width: size === 'sm' ? '20px' : '24px',
  height: size === 'sm' ? '20px' : '24px',
  color: `rgb(${color})`
});

const createHeaderGlassHoverHandlers = (color: string) => ({
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = `rgba(${color}, 0.2)`;
    e.currentTarget.style.borderColor = `rgba(${color}, 0.4)`;
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.boxShadow = `0 4px 12px rgba(${color}, 0.25)`;
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    const isActive = e.currentTarget.getAttribute('data-active') === 'true';
    e.currentTarget.style.background = isActive ? `rgba(${color}, 0.2)` : `rgba(${color}, 0.1)`;
    e.currentTarget.style.borderColor = isActive ? `rgba(${color}, 0.4)` : `rgba(${color}, 0.2)`;
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = `0 2px 8px rgba(${color}, 0.15)`;
  }
});

// ================================================================================
// 任务状态数据接口（基于SSE事件）
// ================================================================================

export interface TaskStatus {
  id: string;
  name: string; // 如："电动车研究"
  status: 'planning' | 'running' | 'paused' | 'completed' | 'failed';
  currentStep: string; // 如："搜索市场趋势"
  progress: number; // 0-100
  toolsActive: string[]; // 当前活跃的工具 ['web_search', 'data_analysis']
}

export interface TaskStatusIndicatorProps {
  streamingStatus?: string;
  lastSSEEvent?: any;
  onTaskControl?: (action: 'pause_all' | 'resume_all' | 'show_details') => void;
  className?: string;
}

// ================================================================================
// Header任务状态指示器组件
// ================================================================================

export const TaskStatusIndicator: React.FC<TaskStatusIndicatorProps> = ({
  streamingStatus,
  lastSSEEvent,
  onTaskControl,
  className = ''
}) => {
  const [activeTasks, setActiveTasks] = useState<TaskStatus[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Get store actions (stable references, safe to call outside render)
  const { pauseAllTasks, resumeAllTasks, pauseTask, resumeTask, cancelTask, setShowTaskPanel } = useTaskStore.getState();

  // ================================================================================
  // SSE事件解析 - 构建高级任务状态
  // ================================================================================

  useEffect(() => {
    if (!lastSSEEvent) return;

    // 从SSE事件中检测和构建任务状态
    if (lastSSEEvent.type === 'message_stream' && lastSSEEvent.content?.raw_message) {
      const rawMessage = lastSSEEvent.content.raw_message;
      
      // 检测多工具执行模式（类似文档示例）
      if (rawMessage.includes('tool_calls=')) {
        // 这表示AI开始了一个新的任务计划
        const toolCount = (rawMessage.match(/tool_call/g) || []).length;
        
        setActiveTasks(prev => {
          // 创建或更新任务
          const existingTask = prev.find(t => t.status === 'running');
          if (existingTask) {
            return prev.map(t => t.id === existingTask.id ? {
              ...t,
              currentStep: `执行${toolCount}个工具`,
              toolsActive: ['multi_tool']
            } : t);
          } else {
            // 创建新任务
            const newTask: TaskStatus = {
              id: `task_${Date.now()}`,
              name: '智能研究计划',
              status: 'running',
              currentStep: `准备执行${toolCount}个工具`,
              progress: 10,
              toolsActive: []
            };
            return [...prev.filter(t => t.status === 'completed'), newTask];
          }
        });
      }
    }

    // 工具执行进度更新
    if (lastSSEEvent.type === 'custom_stream' && 
        lastSSEEvent.content?.type === 'progress') {
      
      const progressData = lastSSEEvent.content.data;
      const progressMatch = progressData.match(/\[([^\]]+)\]\s+(.+?)(?:\s+\((\d+)\/(\d+)\))?/);
      
      if (progressMatch) {
        const [, toolName, description, current, total] = progressMatch;
        
        setActiveTasks(prev => prev.map(task => {
          if (task.status === 'running') {
            const progress = current && total ? (parseInt(current) / parseInt(total)) * 100 : task.progress;
            return {
              ...task,
              currentStep: `${toolName}: ${description}`,
              progress: Math.max(progress, task.progress),
              toolsActive: [toolName]
            };
          }
          return task;
        }));
      }
    }

    // 任务完成
    if (lastSSEEvent.type === 'end') {
      setActiveTasks(prev => prev.map(task => 
        task.status === 'running' ? {
          ...task,
          status: 'completed',
          progress: 100,
          currentStep: '任务完成',
          toolsActive: []
        } : task
      ));
    }
  }, [lastSSEEvent]);

  // ================================================================================
  // 计算显示状态
  // ================================================================================

  const taskSummary = useMemo(() => {
    const running = activeTasks.filter(t => t.status === 'running');
    const paused = activeTasks.filter(t => t.status === 'paused');
    const total = activeTasks.length;
    
    return {
      total,
      running: running.length,
      paused: paused.length,
      currentTask: running[0] || paused[0] || activeTasks[0]
    };
  }, [activeTasks]);

  // 如果没有活跃任务，不显示
  if (taskSummary.total === 0) {
    return null;
  }

  // ================================================================================
  // 事件处理
  // ================================================================================

  const handleQuickAction = useCallback((action: 'pause_all' | 'resume_all' | 'show_details') => {
    switch (action) {
      case 'pause_all':
        pauseAllTasks();
        // Also pause local SSE-tracked tasks
        setActiveTasks(prev => prev.map(t =>
          t.status === 'running' ? { ...t, status: 'paused' as const } : t
        ));
        break;
      case 'resume_all':
        resumeAllTasks();
        // Also resume local SSE-tracked tasks
        setActiveTasks(prev => prev.map(t =>
          t.status === 'paused' ? { ...t, status: 'running' as const } : t
        ));
        break;
      case 'show_details':
        setShowTaskPanel(true);
        break;
    }
    onTaskControl?.(action);
  }, [onTaskControl, pauseAllTasks, resumeAllTasks, setShowTaskPanel]);

  const handleSingleTaskAction = useCallback((taskId: string, action: 'pause' | 'resume' | 'cancel') => {
    // Apply to store-managed tasks
    const storeTask = useTaskStore.getState().getTask(taskId);
    if (storeTask) {
      switch (action) {
        case 'pause': pauseTask(taskId); break;
        case 'resume': resumeTask(taskId); break;
        case 'cancel': cancelTask(taskId); break;
      }
    }
    // Also update local SSE-tracked tasks
    setActiveTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      switch (action) {
        case 'pause': return t.status === 'running' ? { ...t, status: 'paused' as const } : t;
        case 'resume': return t.status === 'paused' ? { ...t, status: 'running' as const } : t;
        case 'cancel': return { ...t, status: 'completed' as const, currentStep: 'Cancelled' };
        default: return t;
      }
    }));
  }, [pauseTask, resumeTask, cancelTask]);

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  // ================================================================================
  // 渲染函数
  // ================================================================================

  const renderTaskSummary = () => (
    <div className="flex items-center space-x-2">
      {/* 任务状态图标 */}
      <div className="flex items-center space-x-1">
        <button
          style={createHeaderGlassButtonStyle('59, 130, 246', 'sm')}
          {...createHeaderGlassHoverHandlers('59, 130, 246')}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
        {taskSummary.running > 0 && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        )}
        {taskSummary.paused > 0 && (
          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
        )}
      </div>

      {/* 任务信息 */}
      <div className="flex items-center space-x-1 text-xs">
        <span className="text-white font-medium">
          {taskSummary.total}个任务
        </span>
        {taskSummary.running > 0 && (
          <span className="text-green-400">({taskSummary.running}运行中)</span>
        )}
        {taskSummary.paused > 0 && (
          <span className="text-yellow-400">({taskSummary.paused}暂停中)</span>
        )}
      </div>
    </div>
  );

  const renderQuickControls = () => (
    <div className="flex items-center space-x-1">
      {taskSummary.running > 0 && (
        <button
          onClick={() => handleQuickAction('pause_all')}
          style={createHeaderGlassButtonStyle('251, 191, 36', 'sm')}
          className="transition-colors"
          title="暂停所有任务"
          {...createHeaderGlassHoverHandlers('251, 191, 36')}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
          </svg>
        </button>
      )}
      {taskSummary.paused > 0 && (
        <button
          onClick={() => handleQuickAction('resume_all')}
          style={createHeaderGlassButtonStyle('34, 197, 94', 'sm')}
          className="transition-colors"
          title="恢复所有任务"
          {...createHeaderGlassHoverHandlers('34, 197, 94')}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
            <polygon points="5,3 19,12 5,21" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
          </svg>
        </button>
      )}
      <button
        onClick={handleToggleExpand}
        style={createHeaderGlassButtonStyle('107, 114, 128', 'sm')}
        className="transition-colors"
        title="显示详情"
        {...createHeaderGlassHoverHandlers('107, 114, 128')}
      >
        {expanded ? (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
            <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  );

  const renderExpandedView = () => {
    if (!expanded) return null;
    
    return (
      <div className="absolute top-full right-0 mt-1 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
        <div className="p-3">
          <h4 className="text-sm font-medium text-white mb-2">活跃任务</h4>
          <div className="space-y-2">
            {activeTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-300 truncate">{task.name}</span>
                    <span className={`text-xs flex-shrink-0 ${
                      task.status === 'running' ? 'text-green-400' :
                      task.status === 'paused' ? 'text-yellow-400' :
                      task.status === 'completed' ? 'text-gray-400' :
                      'text-red-400'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {task.currentStep}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-gray-600 rounded-full mt-2">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>
                {/* Per-task controls */}
                <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                  {task.status === 'running' && (
                    <button
                      onClick={() => handleSingleTaskAction(task.id, 'pause')}
                      style={createHeaderGlassButtonStyle('251, 191, 36', 'sm')}
                      title="Pause task"
                      {...createHeaderGlassHoverHandlers('251, 191, 36')}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <rect x="6" y="4" width="4" height="16" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                        <rect x="14" y="4" width="4" height="16" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                      </svg>
                    </button>
                  )}
                  {task.status === 'paused' && (
                    <button
                      onClick={() => handleSingleTaskAction(task.id, 'resume')}
                      style={createHeaderGlassButtonStyle('34, 197, 94', 'sm')}
                      title="Resume task"
                      {...createHeaderGlassHoverHandlers('34, 197, 94')}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <polygon points="5,3 19,12 5,21" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                      </svg>
                    </button>
                  )}
                  {(task.status === 'running' || task.status === 'paused') && (
                    <button
                      onClick={() => handleSingleTaskAction(task.id, 'cancel')}
                      style={createHeaderGlassButtonStyle('239, 68, 68', 'sm')}
                      title="Cancel task"
                      {...createHeaderGlassHoverHandlers('239, 68, 68')}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ================================================================================
  // 主渲染
  // ================================================================================

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/60 border border-gray-700 rounded-lg">
        {renderTaskSummary()}
        {renderQuickControls()}
      </div>
      {renderExpandedView()}
    </div>
  );
};