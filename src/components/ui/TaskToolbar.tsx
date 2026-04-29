/**
 * ============================================================================
 * Task Toolbar (TaskToolbar.tsx) - macOS-style Task Management
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Task management interface for header toolbar
 * - Quick task creation, viewing, and management
 * - Integration with assistant for AI-powered task suggestions
 * - Similar to macOS Reminders app in toolbar
 * 
 * Design Philosophy:
 * - Quick access to task management
 * - Clean, focused interface for productivity
 * - Assistant-powered task intelligence
 * - Non-intrusive but highly functional
 */
import React, { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '../../stores/useTaskStore';

// Glass Button Style Creator for Task Toolbar
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

interface TaskToolbarProps {
  className?: string;
}

export const TaskToolbar: React.FC<TaskToolbarProps> = ({ 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tasks = useTaskStore((state) => state.tasks);
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const createBackendTask = useTaskStore((state) => state.createBackendTask);
  const syncTaskStatus = useTaskStore((state) => state.syncTaskStatus);
  const deleteBackendTask = useTaskStore((state) => state.deleteBackendTask);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const toggleTaskPanel = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      void syncTasks();
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;

    const createdTask = await createBackendTask({
      title: newTaskTitle.trim(),
      priority: 'normal',
    });
    if (createdTask) {
      setNewTaskTitle('');
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    await syncTaskStatus(taskId, nextStatus);
  };

  const deleteTask = async (taskId: string) => {
    await deleteBackendTask(taskId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'urgent': return 'text-red-300';
      case 'normal': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    const color =
      priority === 'high' || priority === 'urgent'
        ? '239, 68, 68'
        : priority === 'normal'
          ? '251, 191, 36'
          : '34, 197, 94';
    return (
      <div
        style={createGlassButtonStyle(color, 'sm')}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
        </svg>
      </div>
    );
  };

  const pendingTasksCount = tasks.filter(
    (task) => !['completed', 'failed', 'cancelled'].includes(task.status),
  ).length;
  const hasHighPriorityTasks = tasks.some(
    (task) =>
      !['completed', 'failed', 'cancelled'].includes(task.status)
      && ['high', 'urgent'].includes(task.priority),
  );

  return (
    <div className={`relative ${className}`}>
      {/* Task Toolbar Button */}
      <button
        ref={buttonRef}
        onClick={toggleTaskPanel}
        className="relative flex items-center gap-2 px-3 py-1.5 bg-gray-800/30 border border-gray-700/50 rounded-lg text-white hover:bg-gray-700/50 transition-colors cursor-pointer"
        title="Tasks"
      >
        {/* Task Icon with Badge */}
        <div className="relative">
          <div
            style={createGlassButtonStyle('107, 114, 128', 'md', true)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        
        {/* Label */}
        <span className="text-xs font-medium">Tasks</span>
      </button>

      {/* Task Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" />
          
          {/* Dropdown Content */}
          <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-80 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <div
                  style={createGlassButtonStyle('34, 197, 94', 'md')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Tasks</h3>
                  <p className="text-xs text-gray-400">
                    {pendingTasksCount} pending, {tasks.filter(t => t.status === 'completed').length} completed
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-700/50 rounded text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Add New Task */}
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a new task..."
                  className="flex-1 p-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTask();
                    }
                  }}
                />
                <button
                  onClick={addTask}
                  disabled={!newTaskTitle.trim()}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Task List */}
            <div className="max-h-96 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  <div
                    style={createGlassButtonStyle('107, 114, 128', 'md')}
                    className="mb-2 mx-auto"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>No tasks yet</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {tasks.map((task) => {
                    const completed = task.status === 'completed';
                    const dueAt = task.metadata?.dueAt
                      ? new Date(task.metadata.dueAt as string)
                      : null;
                    const assistantGenerated = Boolean(task.metadata?.assistantGenerated);

                    return (
                    <div
                      key={task.id}
                      className={`p-3 hover:bg-gray-800/30 transition-colors ${
                        completed ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-500 hover:border-gray-400'
                          }`}
                        >
                          {completed && '✓'}
                        </button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getPriorityIcon(task.priority)}
                            <span
                              className={`text-sm ${
                                completed 
                                  ? 'line-through text-gray-400' 
                                  : 'text-white'
                              }`}
                            >
                              {task.title}
                            </span>
                            {assistantGenerated && (
                              <span className="text-xs bg-purple-500/20 text-purple-300 px-1 rounded">
                                AI
                              </span>
                            )}
                          </div>
                          
                          {/* Due Date */}
                          {dueAt && (
                            <div className="text-xs text-gray-400">
                              Due: {dueAt.toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="w-5 h-5 flex items-center justify-center transition-colors rounded hover:bg-red-500/20"
                          title="Delete task"
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="text-red-400 hover:text-red-300">
                            <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-700/50 bg-gray-800/30">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div>
                  {pendingTasksCount > 0 ? (
                    <span className={hasHighPriorityTasks ? 'text-red-400' : 'text-blue-400'}>
                      {pendingTasksCount} task{pendingTasksCount !== 1 ? 's' : ''} remaining
                    </span>
                  ) : (
                    <span className="text-green-400 flex items-center gap-1">
                      All tasks completed!
                      <div
                        style={createGlassButtonStyle('34, 197, 94', 'sm')}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </span>
                  )}
                </div>
                <button className="text-purple-400 hover:text-purple-300 transition-colors">
                  Ask AI for help
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
