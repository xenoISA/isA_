/**
 * ============================================================================
 * Custom Automation Widget - Modular Version (CustomAutomationWidget_Modular.tsx)
 * ============================================================================
 * 
 * 重构后的模块化自动化Widget
 * 将原来的2200行大文件拆分为专门的模块化组件
 * 
 * Architecture:
 * - TemplateSelector: 模板选择器
 * - ConfigurationPanel: 参数配置面板  
 * - ExecutionViewer: 执行监控查看器
 * - ResultsPanel: 结果展示面板
 * - Dashboard: 综合仪表板
 * 
 * Features:
 * - 清晰的职责分离
 * - 可重用的组件设计
 * - 统一的数据流管理
 * - 灵活的界面切换
 */

import React, { useState, useCallback, useMemo } from 'react';
import { BaseWidget, EditAction, ManagementAction, OutputHistoryItem } from './BaseWidget';
import { useTranslation } from '../../../hooks/useTranslation';
import { logger, LogCategory } from '../../../utils/logger';

// Modular Components
import TemplateSelector from './customAutomation/TemplateSelector';
import ConfigurationPanel from './customAutomation/ConfigurationPanel';
import ExecutionViewer from './customAutomation/ExecutionViewer';
import ResultsPanel from './customAutomation/ResultsPanel';
import Dashboard from './customAutomation/Dashboard';

// Types and Data
import { 
  AutomationTemplate, 
  AutomationRequest, 
  CustomAutomationWidgetProps,
  ActiveMode,
  ActiveMenu,
  ViewMode 
} from './customAutomation/types';
import { AUTOMATION_TEMPLATES } from './customAutomation/data';

// Main Widget Component
export const CustomAutomationWidget_Modular: React.FC<CustomAutomationWidgetProps> = ({
  isProcessing,
  currentTemplate,
  automationResults,
  processStatus,
  triggeredInput,
  outputHistory = [],
  currentOutput,
  isStreaming = false,
  streamingContent = '',
  onStartAutomation,
  onClearData,
  onSelectOutput,
  onClearHistory,
  onBack,
  onToggleMode
}) => {
  // Core State Management
  const [activeMode, setActiveMode] = useState<ActiveMode>('template_select');
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('templates');
  const [viewMode, setViewMode] = useState<ViewMode>('modern');
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [configurationData, setConfigurationData] = useState<Record<string, any>>({});
  const [isConfigValid, setIsConfigValid] = useState(false);
  const [executionData, setExecutionData] = useState<any>(null);

  const { t } = useTranslation();

  // Template Selection Handler
  const handleTemplateSelect = useCallback((template: AutomationTemplate) => {
    setSelectedTemplate(template);
    setActiveMode('configure');
    setConfigurationData({}); // Reset configuration
  }, []);

  // Template Preview Handler
  const handleTemplatePreview = useCallback((template: AutomationTemplate) => {
    // Show template preview modal or side panel
  }, []);

  // Configuration Handlers
  const handleConfigurationChange = useCallback((config: Record<string, any>) => {
    setConfigurationData(config);
  }, []);

  const handleValidationChange = useCallback((isValid: boolean) => {
    setIsConfigValid(isValid);
  }, []);

  // Automation Start Handler
  const handleConfigurationSubmit = useCallback(async (request: AutomationRequest) => {
    try {
      setActiveMode('running');
      await onStartAutomation(request);
      logger.info(LogCategory.ARTIFACT_CREATION, 'Automation started', { templateId: request.templateId });
    } catch (error) {
      logger.error(LogCategory.ARTIFACT_CREATION, 'Failed to start automation', error);
      setActiveMode('configure'); // Return to configuration on error
    }
  }, [onStartAutomation]);

  // Execution Control Handlers
  const handleExecutionCancel = useCallback(() => {
    // Cancel current execution
    setActiveMode('results');
    logger.info(LogCategory.ARTIFACT_CREATION, 'Execution cancelled');
  }, []);

  const handleExecutionRetry = useCallback((stepId?: string) => {
    // Retry execution or specific step
    logger.info(LogCategory.ARTIFACT_CREATION, 'Execution retry', { stepId });
  }, []);

  const handleStepIntervention = useCallback((step: any) => {
    // Handle manual intervention for a step
    logger.info(LogCategory.ARTIFACT_CREATION, 'Step intervention', { stepId: step.id });
  }, []);

  // Navigation Handlers
  const handleBackToTemplates = useCallback(() => {
    setActiveMode('template_select');
    setSelectedTemplate(null);
    setConfigurationData({});
  }, []);

  const handleBackToConfiguration = useCallback(() => {
    setActiveMode('configure');
  }, []);

  const handleViewResults = useCallback(() => {
    setActiveMode('results');
  }, []);

  const handleReturnToDashboard = useCallback(() => {
    setActiveMode('template_select');
    setActiveMenu('dashboard');
  }, []);

  // Menu Navigation
  const handleMenuChange = useCallback((menu: ActiveMenu) => {
    setActiveMenu(menu);
    if (menu === 'templates') {
      setActiveMode('template_select');
    }
  }, []);

  // Create New Automation from Dashboard
  const handleCreateNewAutomation = useCallback(() => {
    setActiveMenu('templates');
    setActiveMode('template_select');
    setSelectedTemplate(null);
    setConfigurationData({});
  }, []);

  // Management Actions
  const managementActions: ManagementAction[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      onClick: () => handleMenuChange('dashboard'),
      variant: 'secondary'
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: '🎯',
      onClick: () => handleMenuChange('templates'),
      variant: 'secondary'
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      icon: '⏰',
      onClick: () => handleMenuChange('scheduled'),
      variant: 'secondary'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      onClick: () => handleMenuChange('settings'),
      variant: 'secondary'
    },
    {
      id: 'clear',
      label: 'Clear',
      icon: '🗑️',
      onClick: onClearData,
      variant: 'secondary'
    }
  ], [handleMenuChange, onClearData]);

  // Edit Actions
  const editActions: EditAction[] = useMemo(() => [
    {
      id: 'toggle_mode',
      label: viewMode === 'modern' ? 'Classic View' : 'Modern View',
      icon: viewMode === 'modern' ? '📋' : '🎨',
      onClick: () => setViewMode(viewMode === 'modern' ? 'classic' : 'modern'),
      variant: 'secondary'
    }
  ], [viewMode]);

  // Dynamic Title
  const getWidgetTitle = () => {
    switch (activeMode) {
      case 'configure':
        return selectedTemplate ? `配置 ${selectedTemplate.name}` : '配置自动化';
      case 'running':
        return selectedTemplate ? `执行 ${selectedTemplate.name}` : '执行中';
      case 'results':
        return selectedTemplate ? `${selectedTemplate.name} 结果` : '执行结果';
      default:
        return activeMenu === 'dashboard' ? '自动化控制台' : '自动化模板';
    }
  };

  // Dynamic Icon
  const getWidgetIcon = () => {
    switch (activeMode) {
      case 'configure':
        return selectedTemplate?.icon || '⚙️';
      case 'running':
        return '🔄';
      case 'results':
        return '📊';
      default:
        return activeMenu === 'dashboard' ? '📊' : '🎯';
    }
  };

  // Main Content Renderer
  const renderMainContent = () => {
    // Dashboard View
    if (activeMenu === 'dashboard' && activeMode === 'template_select') {
      return (
        <Dashboard
          onCreateNewAutomation={handleCreateNewAutomation}
          onViewTask={(taskId) => {
            logger.info(LogCategory.ARTIFACT_CREATION, 'View task', { taskId });
          }}
          onManageConnectors={() => {
            logger.info(LogCategory.ARTIFACT_CREATION, 'Manage connectors');
          }}
          onViewSettings={() => handleMenuChange('settings')}
        />
      );
    }

    // Template Selection
    if (activeMode === 'template_select') {
      return (
        <TemplateSelector
          selectedTemplate={selectedTemplate}
          onTemplateSelect={handleTemplateSelect}
          onTemplatePreview={handleTemplatePreview}
        />
      );
    }

    // Configuration Phase
    if (activeMode === 'configure' && selectedTemplate) {
      return (
        <ConfigurationPanel
          template={selectedTemplate}
          initialValues={configurationData}
          mode="guided"
          isProcessing={isProcessing}
          onConfigurationChange={handleConfigurationChange}
          onValidationChange={handleValidationChange}
          onSubmit={handleConfigurationSubmit}
          onBack={handleBackToTemplates}
          onPreview={(config) => {
            logger.info(LogCategory.ARTIFACT_CREATION, 'Preview configuration', { config });
          }}
        />
      );
    }

    // Execution Phase
    if (activeMode === 'running' && selectedTemplate) {
      return (
        <ExecutionViewer
          template={selectedTemplate}
          currentExecution={executionData}
          isProcessing={isProcessing}
          currentStep={currentTemplate || undefined}
          steps={selectedTemplate.steps}
          onStepClick={(step) => {
            logger.info(LogCategory.ARTIFACT_CREATION, 'Step clicked', { stepId: step.id });
          }}
          onCancel={handleExecutionCancel}
          onRetry={handleExecutionRetry}
          onInterventionNeeded={handleStepIntervention}
          onBack={handleBackToConfiguration}
        />
      );
    }

    // Results Phase
    if (activeMode === 'results' && selectedTemplate && automationResults.length > 0) {
      // Mock result data - in real implementation this would come from props
      const mockResult = {
        id: 'result_1',
        templateId: selectedTemplate.id,
        status: 'completed' as const,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 15000,
        totalSteps: selectedTemplate.steps.length,
        completedSteps: selectedTemplate.steps.length,
        errorSteps: 0,
        outputs: [],
        summary: {
          successRate: 100,
          totalProcessed: 1,
          totalErrors: 0,
          averageProcessingTime: 15000
        }
      };

      return (
        <ResultsPanel
          template={selectedTemplate}
          result={mockResult}
          onExport={(format) => {
            logger.info(LogCategory.ARTIFACT_CREATION, 'Export results', { format });
          }}
          onRetryFromResult={() => {
            setActiveMode('configure');
          }}
          onCreateNewFromResult={handleCreateNewAutomation}
          onBack={handleReturnToDashboard}
        />
      );
    }

    // Fallback to template selection
    return (
      <TemplateSelector
        selectedTemplate={selectedTemplate}
        onTemplateSelect={handleTemplateSelect}
        onTemplatePreview={handleTemplatePreview}
      />
    );
  };

  return (
    <BaseWidget
      title={getWidgetTitle()}
      icon={getWidgetIcon()}
      managementActions={managementActions}
      editActions={editActions}
      outputHistory={outputHistory}
      currentOutput={currentOutput}
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      onSelectOutput={onSelectOutput}
      onClearHistory={onClearHistory}
      emptyStateConfig={{
        icon: '🚀',
        title: '开始自动化',
        description: '选择一个模板开始你的自动化流程',
        onAction: handleCreateNewAutomation
      }}
      className={`custom-automation-widget ${viewMode}`}
    >
      {renderMainContent()}
    </BaseWidget>
  );
};

export default CustomAutomationWidget_Modular;