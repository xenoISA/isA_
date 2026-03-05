import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger, LogCategory, createLogger } from '../../utils/logger';

const log = createLogger('ErrorBoundary');
import { GlassButton } from '../shared';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * 全局错误边界组件
 * 捕获React组件树中的JavaScript错误，防止整个应用崩溃
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新state，下次渲染时显示错误UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    logger.error(LogCategory.COMPONENT_ERROR, 'Component error caught by ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({ error, errorInfo });

    // 调用可选的错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 使用自定义fallback或默认错误UI
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // 默认错误UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-6">
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-400 text-2xl">⚠️</span>
              </div>
              
              <h2 className="text-xl font-bold text-red-400 mb-4">
                Something went wrong
              </h2>
              
              <p className="text-gray-300 mb-6">
                An unexpected error occurred. You can try refreshing the page or contact support if the problem persists.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="text-sm text-gray-400 cursor-pointer mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="bg-black/30 rounded p-3 text-xs text-red-300 font-mono overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
              
              <div className="flex gap-3">
                <GlassButton
                  onClick={this.handleRetry}
                  variant="danger"
                  size="md"
                  className="flex-1 text-white"
                >
                  Try Again
                </GlassButton>
                <GlassButton
                  onClick={() => window.location.reload()}
                  variant="ghost"
                  size="md"
                  className="flex-1 text-white border-gray-500/30 hover:bg-gray-500/20"
                >
                  Refresh Page
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 用于函数组件的错误边界Hook
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    logger.error(LogCategory.COMPONENT_ERROR, 'Error handled by useErrorHandler', {
      error: error.message,
      context,
      stack: error.stack
    });

    // 在开发环境中抛出错误，让ErrorBoundary捕获
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }

    // 生产环境中只记录错误，不中断用户体验
    log.error('Error handled:', error);
  }, []);

  return { handleError };
};