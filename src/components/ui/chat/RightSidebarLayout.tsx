/**
 * ============================================================================
 * Right Sidebar Layout (RightSidebarLayout.tsx) - 右侧边栏布局组件
 * ============================================================================
 * 
 * 【核心职责】
 * - 管理右侧边栏的布局和显示逻辑
 * - 根据当前应用显示对应的小部件
 * - 提供统一的小部件容器和导航
 * - 处理小部件的打开/关闭状态
 * 
 * 【关注点分离】
 * ✅ 负责：
 *   - 右侧边栏的UI布局和样式
 *   - 小部件路由和显示逻辑
 *   - 小部件头部和容器管理
 *   - 小部件选择界面
 * 
 * ❌ 不负责：
 *   - 具体小部件的业务逻辑（由各Widget Module处理）
 *   - 小部件内部状态管理（由stores处理）
 *   - 小部件特定的功能实现（由Widget UI组件处理）
 * 
 * 【架构流向】
 * ChatLayout → RightSidebarLayout → WidgetModule → Widget UI
 */
import React, { useCallback, useMemo } from 'react';
import { useSortedWidgets, useGetWidgetUsage } from '../../../stores/useAppStore';

// Import Widget Modules (Business Logic + UI)
import { DreamWidgetModule } from '../../../modules/widgets/DreamWidgetModule';
import { HuntWidgetModule } from '../../../modules/widgets/HuntWidgetModule';
import { OmniWidgetModule } from '../../../modules/widgets/OmniWidgetModule';
import { KnowledgeWidgetModule } from '../../../modules/widgets/KnowledgeWidgetModule';
import { DataScientistWidgetModule } from '../../../modules/widgets/DataScientistWidgetModule';
import { CustomAutomationWidgetModule } from '../../../modules/widgets/CustomAutomationWidgetModule';
import { DreamWidget } from '../widgets/DreamWidget';
import { HuntWidget } from '../widgets/HuntWidget';
import { OmniWidget } from '../widgets/OmniWidget';
import { DataScientistWidget } from '../widgets/DataScientistWidget';
import { KnowledgeWidget } from '../widgets/KnowledgeWidget';
import { CustomAutomationWidget } from '../widgets/CustomAutomationWidget';

import { createLogger, logger, LogCategory } from '../../../utils/logger';
const log = createLogger('RightSidebarLayout');

interface RightSidebarLayoutProps {
  currentApp: string | null;
  showRightSidebar: boolean;
  triggeredAppInput: string;
  onCloseApp: () => void;
  onBackToList?: () => void;
  onAppSelect?: (appId: string) => void;
  onToggleMode?: () => void; // 🆕 模式切换回调
}

/**
 * Right Sidebar Layout - UI component for managing widget display in right sidebar
 * 
 * This component:
 * - Routes to appropriate widget based on currentApp
 * - Provides unified widget container layout
 * - Handles widget lifecycle and display
 * - Shows widget selection interface when no widget is active
 */
export const RightSidebarLayout: React.FC<RightSidebarLayoutProps> = ({
  currentApp,
  showRightSidebar,
  triggeredAppInput,
  onCloseApp,
  onBackToList,
  onAppSelect,
  onToggleMode
}) => {
  // ⚠️ 必须在所有条件性 return 之前调用所有 hooks
  const sortedWidgets = useSortedWidgets();
  
  logger.trackComponentRender('RightSidebarLayout', { 
    currentApp, 
    showRightSidebar, 
    hasTriggeredInput: !!triggeredAppInput
  });
  
  log.debug('Rendering right sidebar', { currentApp, showRightSidebar });
  
  // Use useMemo to cache widget content and prevent unnecessary re-renders
  const widgetContent = useMemo(() => {
    if (!currentApp) return null;
    
    log.debug('Creating widget content for app', currentApp);
    
    // Use Widget Modules that manage business logic + UI
    switch (currentApp) {
      case 'dream':
        return (
          <DreamWidgetModule 
            triggeredInput={triggeredAppInput}
          >
            {(moduleProps: any) => (
              <DreamWidget 
                isGenerating={moduleProps.isGenerating}
                generatedImage={moduleProps.generatedImage}
                lastParams={moduleProps.lastParams}
                onGenerateImage={moduleProps.onGenerateImage}
                onClearImage={moduleProps.onClearImage}
                triggeredInput={triggeredAppInput}
                // Add missing BaseWidget props for output display
                outputHistory={moduleProps.outputHistory}
                currentOutput={moduleProps.currentOutput}
                isStreaming={moduleProps.isStreaming}
                streamingContent={moduleProps.streamingContent}
                onSelectOutput={moduleProps.onSelectOutput}
                onClearHistory={moduleProps.onClearHistory}
                onBack={() => {
                  logger.trackSidebarInteraction('widget_back_to_list_clicked', currentApp || undefined, { 
                    widgetTitle: 'DreamForge AI' 
                  });
                  if (onBackToList) {
                    onBackToList();
                  } else {
                    onCloseApp();
                  }
                }}
                {...(onToggleMode && { onToggleMode })}
              />
            )}
          </DreamWidgetModule>
        );
      
      case 'hunt':
        return (
          <HuntWidgetModule 
            triggeredInput={triggeredAppInput}
            onSearchCompleted={(result) => {
              log.info('Hunt search completed', result);
            }}
          >
            <HuntWidget 
              triggeredInput={triggeredAppInput}
              onBack={() => {
                logger.trackSidebarInteraction('widget_back_to_list_clicked', currentApp || undefined, { 
                  widgetTitle: 'HuntAI' 
                });
                // Use onBackToList if available, otherwise fall back to onCloseApp
                if (onBackToList) {
                  onBackToList();
                } else {
                  onCloseApp();
                }
              }}
            />
          </HuntWidgetModule>
        );
      
      case 'omni':
        return (
          <OmniWidgetModule 
            triggeredInput={triggeredAppInput}
            onContentGenerated={(result) => {
              log.info('Omni content generated', result);
            }}
          >
            <OmniWidget 
              triggeredInput={triggeredAppInput}
              onBack={() => {
                logger.trackSidebarInteraction('widget_back_to_list_clicked', currentApp || undefined, { 
                  widgetTitle: 'Omni Content' 
                });
                if (onBackToList) {
                  onBackToList();
                } else {
                  onCloseApp();
                }
              }}
            />
          </OmniWidgetModule>
        );
      
      case 'knowledge':
        return (
          <KnowledgeWidgetModule 
            triggeredInput={triggeredAppInput}
            onAnalysisCompleted={(result) => {
              log.info('Knowledge analysis completed', result);
            }}
          >
            <KnowledgeWidget 
              triggeredInput={triggeredAppInput}
              onBack={() => {
                logger.trackSidebarInteraction('widget_back_to_list_clicked', currentApp || undefined, { 
                  widgetTitle: 'Knowledge Hub' 
                });
                if (onBackToList) {
                  onBackToList();
                } else {
                  onCloseApp();
                }
              }}
            />
          </KnowledgeWidgetModule>
        );
      
      case 'data-scientist':
        return (
          <DataScientistWidgetModule 
            triggeredInput={triggeredAppInput}
            onAnalysisCompleted={(result) => {
              log.info('DataScientist analysis completed', result);
            }}
          >
            <DataScientistWidget 
              triggeredInput={triggeredAppInput}
              onBack={() => {
                logger.trackSidebarInteraction('widget_back_to_list_clicked', currentApp || undefined, { 
                  widgetTitle: 'DataWise Analytics' 
                });
                if (onBackToList) {
                  onBackToList();
                } else {
                  onCloseApp();
                }
              }}
            />
          </DataScientistWidgetModule>
        );
      
      case 'custom_automation':
        return (
          <CustomAutomationWidgetModule 
            triggeredInput={triggeredAppInput}
            onAutomationCompleted={(result) => {
              log.info('Custom Automation completed', result);
            }}
          >
            {(moduleProps: any) => (
              <CustomAutomationWidget 
                isProcessing={moduleProps.isProcessing}
                currentTemplate={null}
                automationResults={[]}
                processStatus="idle"
                triggeredInput={triggeredAppInput}
                outputHistory={moduleProps.outputHistory}
                currentOutput={moduleProps.currentOutput}
                isStreaming={moduleProps.isStreaming}
                streamingContent={moduleProps.streamingContent}
                onStartAutomation={moduleProps.startProcessing}
                onClearData={moduleProps.clearData}
                onSelectOutput={moduleProps.onSelectOutput}
                onClearHistory={moduleProps.onClearHistory}
                onBack={() => {
                  logger.trackSidebarInteraction('widget_back_to_list_clicked', currentApp || undefined, { 
                    widgetTitle: 'Custom Automation' 
                  });
                  if (onBackToList) {
                    onBackToList();
                  } else {
                    onCloseApp();
                  }
                }}
                {...(onToggleMode && { onToggleMode })}
              />
            )}
          </CustomAutomationWidgetModule>
        );
      
      default:
        logger.warn(LogCategory.COMPONENT_RENDER, 'Unknown widget type', { currentApp });
        return <div className="p-4 text-gray-400">Unknown widget: {currentApp}</div>;
    }
  }, [currentApp, triggeredAppInput]); // Only recreate when currentApp or triggeredAppInput changes
  
  // Simple widget configs (no hooks needed)
  const getWidgetInfo = (appId: string) => {
    const configs: Record<string, { icon: string; title: string }> = {
      dream: { icon: '🎨', title: 'DreamForge AI' },
      hunt: { icon: '🔍', title: 'HuntAI' },
      omni: { icon: '⚡', title: 'Omni Content' },
      'data-scientist': { icon: '📊', title: 'DataWise Analytics' },
      knowledge: { icon: '🧠', title: 'Knowledge Hub' },
      custom_automation: { icon: '🤖', title: 'Custom Automation' }
    };
    return configs[appId] || { icon: '❓', title: 'Unknown Widget' };
  };
  
  // Render widget in container if we have content
  if (widgetContent && currentApp) {
    const widgetInfo = getWidgetInfo(currentApp);
    return (
      <div className="h-full flex flex-col isa-right-sidebar">
        {/* Widget Content - Full Height */}
        <div className="flex-1 overflow-hidden">
          {widgetContent}
        </div>
      </div>
    );
  }
  
  // Show widget selection screen if no specific widget is open
  return (
    <div className="p-6 h-full flex flex-col isa-widget-selector">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🚀</span>
          AI Widgets
        </h2>
        <button
          onClick={onCloseApp}
          className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-all"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-4">
        <p className="text-white/60 text-sm mb-4">Choose an AI widget to get started:</p>
        
        {(() => {
          const widgetInfo = {
            dream: { title: 'DreamForge AI', icon: '🎨', desc: 'AI-powered image generation' },
            hunt: { title: 'HuntAI', icon: '🔍', desc: 'Product search and comparison' },
            omni: { title: 'Omni Content', icon: '⚡', desc: 'Multi-purpose content creation' },
            'data-scientist': { title: 'DataWise Analytics', icon: '📊', desc: 'Data analysis and insights' },
            knowledge: { title: 'Knowledge Hub', icon: '🧠', desc: 'Advanced document analysis with vector and graph RAG' },
            custom_automation: { title: 'Custom Automation', icon: '🤖', desc: 'Intelligent business process automation' }
          };
          
          // 使用已经在组件顶部获取的 sortedWidgets
          const activeWidgets = sortedWidgets.filter(w => w.usage.hasArtifacts);
          const otherWidgets = sortedWidgets.filter(w => !w.usage.hasArtifacts);
          
          const formatLastUsed = (timestamp: string | null) => {
            if (!timestamp) return null;
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (minutes < 1) return 'just now';
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            return date.toLocaleDateString();
          };
          
          const renderWidget = ({ id: appId, usage }: { id: string; usage: any }, isActive = false, isFeatured = false) => {
            const app = widgetInfo[appId as keyof typeof widgetInfo];
            if (!app) return null;
            
            return (
              <button
                key={appId}
                onClick={() => {
                  logger.trackSidebarInteraction('widget_selected_from_list', appId);
                  log.info('Widget selected', appId);
                  onAppSelect?.(appId);
                }}
                className={`border rounded-xl transition-all text-left group overflow-hidden ${
                  isFeatured ? 'p-6 col-span-2' : 'p-4'
                } ${
                  isActive 
                    ? 'bg-gradient-to-br from-purple-500/15 via-blue-500/10 to-purple-500/5 border-purple-400/40 hover:border-purple-400/60 shadow-lg shadow-purple-500/10'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                }`}
              >
                <div className={`flex ${isFeatured ? 'flex-col items-start' : 'items-center'} gap-3`}>
                  <div className={`${isFeatured ? 'text-4xl' : 'text-2xl'} relative flex-shrink-0`}>
                    {app.icon}
                    {usage.hasArtifacts && (
                      <div className={`absolute -top-1 -right-1 ${isFeatured ? 'w-4 h-4' : 'w-3 h-3'} bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className={`text-white font-semibold ${isFeatured ? 'text-lg' : 'text-sm'}`}>{app.title}</div>
                      {usage.hasArtifacts && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/25 text-purple-200 rounded-full border border-purple-400/40 font-medium">
                          ✨ Active
                        </span>
                      )}
                      {usage.usageCount > 0 && !usage.hasArtifacts && (
                        <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-300 rounded-full border border-gray-500/30">
                          {usage.usageCount}x used
                        </span>
                      )}
                    </div>
                    <div className={`text-white/60 ${isFeatured ? 'text-sm mb-3' : 'text-xs mb-2'} ${isFeatured ? 'leading-relaxed' : ''}`}>
                      {app.desc}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      {usage.lastUsed && (
                        <div className="text-white/40 flex items-center gap-1">
                          <span className="opacity-60">📅</span>
                          {formatLastUsed(usage.lastUsed)}
                        </div>
                      )}
                      {usage.usageCount > 0 && (
                        <div className="text-white/40 flex items-center gap-1">
                          <span className="opacity-60">🔥</span>
                          {usage.usageCount} uses
                        </div>
                      )}
                    </div>
                  </div>
                  {!isFeatured && (
                    <div className="text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0">
                      →
                    </div>
                  )}
                </div>
              </button>
            );
          };
          
          return (
            <div className="space-y-6">
              {/* Featured/Active Widgets */}
              {activeWidgets.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-white/80 text-sm font-semibold">✨ Active Tools</div>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {activeWidgets.slice(0, 2).map((widget, index) => 
                      renderWidget(widget, true, index === 0 && activeWidgets.length === 1)
                    )}
                  </div>
                  {activeWidgets.length > 2 && (
                    <div className="grid grid-cols-1 gap-3 mt-3">
                      {activeWidgets.slice(2).map(widget => renderWidget(widget, true, false))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Other Widgets */}
              {otherWidgets.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-white/60 text-sm font-medium">
                      {activeWidgets.length > 0 ? '🛠️ Available Tools' : '🚀 AI Tools'}
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {otherWidgets.map(widget => renderWidget(widget, false, false))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/20 rounded-xl">
          <div className="text-blue-300 text-sm font-medium mb-2 flex items-center gap-2">
            <span className="text-base">💡</span>
            Pro Tips
          </div>
          <div className="text-blue-200/80 text-xs space-y-1">
            <div>• Type keywords like <code className="px-1 py-0.5 bg-white/10 rounded text-blue-200">"create image"</code> to trigger widgets</div>
            <div>• ✨ Active tools have generated content and appear first</div>
            <div>• Tools are sorted by recent usage for quick access</div>
          </div>
        </div>
      </div>
    </div>
  );
};