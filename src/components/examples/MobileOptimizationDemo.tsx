/**
 * Mobile Optimization Demo Component
 * Demonstrates the new mobile-optimized task progress, loading, and status components
 */
import React, { useState, useEffect } from 'react';
import { createLogger } from '../../utils/logger';
import { MobileTaskBar } from '../ui/mobile/MobileTaskBar';

const log = createLogger('MobileOptimizationDemo');
import { MobileTaskProgress, MobileTypingIndicator, MobileLoadingState } from '../ui/mobile/MobileTaskProgress';
import { MobileStatusBar, MobileConnectionStatus, MobileNetworkQuality } from '../ui/mobile/MobileStatusBar';

export const MobileOptimizationDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<'idle' | 'loading' | 'typing' | 'processing' | 'completed'>('idle');
  const [progress, setProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'connecting' | 'offline'>('online');

  // Simulate different states
  useEffect(() => {
    if (demoState === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setDemoState('completed');
            return 100;
          }
          return prev + 10;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [demoState]);

  const simulateDemoFlow = () => {
    setProgress(0);
    setDemoState('loading');
    
    setTimeout(() => setDemoState('typing'), 1500);
    setTimeout(() => setDemoState('processing'), 3000);
  };

  const mockTasks = [
    {
      id: '1',
      title: 'Analyzing code structure',
      status: demoState === 'processing' ? 'running' as const : 'completed' as const,
      progress: demoState === 'processing' ? progress : 100,
    },
    {
      id: '2', 
      title: 'Optimizing mobile layout',
      status: progress > 50 ? 'running' as const : 'pending' as const,
      progress: Math.max(0, progress - 50),
    }
  ];

  return (
    <div className="mobile-optimization-demo min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-4 space-y-6">
        
        {/* Demo Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Mobile Optimization Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Mobile-optimized loading, status, and task progress components
          </p>
          
          <button
            onClick={simulateDemoFlow}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors active:scale-95"
          >
            Start Demo Flow
          </button>
        </div>

        {/* Connection Status Demo */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connection Status Components
          </h2>
          
          <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Connection Status:
              </label>
              <select 
                value={connectionStatus}
                onChange={(e) => setConnectionStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="online">Online</option>
                <option value="connecting">Connecting</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <MobileConnectionStatus isOnline={connectionStatus === 'online'} showText />
              <MobileNetworkQuality quality="excellent" showLabel />
            </div>
          </div>

          <MobileStatusBar
            status={connectionStatus}
            message={
              connectionStatus === 'online' ? 'Connected to AI service' :
              connectionStatus === 'connecting' ? 'Reconnecting...' :
              'Connection lost'
            }
            showTime
            autoHide={false}
          />
        </div>

        {/* Loading States Demo */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Loading States
          </h2>
          
          <MobileLoadingState
            type="processing"
            show={demoState === 'loading'}
            message="Initializing mobile optimizations..."
          />

          <MobileTypingIndicator
            show={demoState === 'typing'}
            message="Optimizing for mobile..."
            variant="dots"
          />
        </div>

        {/* Task Progress Demo */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Task Progress Components
          </h2>

          {/* Individual Task Progress */}
          <div className="space-y-3">
            <MobileTaskProgress
              status={demoState === 'processing' ? 'processing' : demoState === 'completed' ? 'completed' : 'idle'}
              taskTitle="Mobile UI Optimization"
              progress={progress}
              isStreaming={demoState === 'processing'}
              onTap={() => log.debug('Task tapped')}
              compact={false}
            />

            <MobileTaskProgress
              status="completed"
              taskTitle="Component Analysis"
              progress={100}
              compact={true}
            />
          </div>
        </div>

        {/* Mobile Task Bar Demo */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mobile Task Bar (Consolidated)
          </h2>
          
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 min-h-[200px]">
            <MobileTaskBar
              activeTasks={demoState === 'processing' || demoState === 'completed' ? mockTasks : []}
              isLoading={demoState === 'loading'}
              isTyping={demoState === 'typing'}
              isStreaming={demoState === 'processing'}
              connectionStatus={connectionStatus}
              position="top"
              compact={false}
              autoCollapse={false}
              onTaskClick={(taskId) => log.debug('Task clicked:', taskId)}
              onClearCompleted={() => log.debug('Clear completed tasks')}
              onRetryFailed={() => log.debug('Retry failed tasks')}
            />
          </div>
        </div>

        {/* Current State Display */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
            Current Demo State
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>State:</strong> {demoState}
            </div>
            <div>
              <strong>Progress:</strong> {progress}%
            </div>
            <div>
              <strong>Connection:</strong> {connectionStatus}
            </div>
            <div>
              <strong>Tasks:</strong> {mockTasks.length}
            </div>
          </div>
        </div>

        {/* Usage Notes */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Mobile Optimization Features
          </h3>
          <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
            <li>• Touch-friendly 48px+ target sizes</li>
            <li>• Modern ChatGPT/Claude/Gemini inspired design</li>
            <li>• Smooth animations and transitions</li>
            <li>• Auto-collapsing when inactive</li>
            <li>• Consolidated task management</li>
            <li>• Native app safe area support</li>
            <li>• Gesture-friendly interactions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};