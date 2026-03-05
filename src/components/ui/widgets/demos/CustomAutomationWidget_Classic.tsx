/**
 * ============================================================================
 * CustomAutomationWidget - Classic Business Style Demo
 * ============================================================================
 * 
 * 经典企业级风格：
 * - 清晰的表单布局和数据表格
 * - 传统的业务流程管理界面
 * - 专业的操作面板和状态指示
 */

import React, { useState } from 'react';
import { BaseWidget } from '../BaseWidget';
import { Button } from '../../../shared/ui/Button';
import { Dropdown } from '../../../shared/widgets/Dropdown';

interface AutomationField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'dropdown' | 'search' | 'date' | 'boolean';
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: any;
  defaultValue?: any;
}

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  fields: AutomationField[];
  status: 'draft' | 'active' | 'paused';
  lastRun?: Date;
  successRate?: number;
}

const ClassicAutomationDemo: React.FC = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('customer-onboarding');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock workflows data
  const workflows: AutomationWorkflow[] = [
    {
      id: 'customer-onboarding',
      name: '客户入住流程',
      description: '自动化新客户注册、验证和系统配置流程',
      status: 'active',
      lastRun: new Date(),
      successRate: 95,
      fields: [
        { id: 'company_name', label: '公司名称', type: 'text', required: true },
        { id: 'industry', label: '行业类型', type: 'dropdown', required: true,
          options: [
            { label: '科技', value: 'tech' },
            { label: '金融', value: 'finance' },
            { label: '制造', value: 'manufacturing' },
            { label: '零售', value: 'retail' }
          ]
        },
        { id: 'contact_person', label: '联系人', type: 'search', required: true },
        { id: 'start_date', label: '开始日期', type: 'date', required: true },
        { id: 'priority', label: '优先级', type: 'dropdown',
          options: [
            { label: '高', value: 'high' },
            { label: '中', value: 'medium' },
            { label: '低', value: 'low' }
          ]
        }
      ]
    },
    {
      id: 'invoice-processing',
      name: '发票处理流程',
      description: '自动发票识别、审核和记账处理',
      status: 'active',
      lastRun: new Date(Date.now() - 3600000),
      successRate: 88,
      fields: [
        { id: 'vendor', label: '供应商', type: 'search', required: true },
        { id: 'amount', label: '金额', type: 'number', required: true },
        { id: 'currency', label: '货币', type: 'dropdown',
          options: [
            { label: 'CNY', value: 'cny' },
            { label: 'USD', value: 'usd' },
            { label: 'EUR', value: 'eur' }
          ]
        },
        { id: 'approve_required', label: '需要审批', type: 'boolean' },
        { id: 'due_date', label: '付款期限', type: 'date' }
      ]
    }
  ];

  const currentWorkflow = workflows.find(w => w.id === selectedWorkflow);

  // Auto-render field based on type
  const renderField = (field: AutomationField) => {
    const value = formData[field.id] || field.defaultValue || '';
    
    switch (field.type) {
      case 'dropdown':
        return (
          <Dropdown
            options={(field.options || []).map(opt => ({ id: opt.value, label: opt.label, value: opt.value }))}
            value={value}
            onChange={(val) => setFormData(prev => ({ ...prev, [field.id]: val }))}
            placeholder={`选择${field.label}`}
          />
        );
      
      case 'search':
        return (
          <div className="relative">
            <input
              type="text"
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
              placeholder={`搜索${field.label}`}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40">🔍</span>
          </div>
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
          />
        );
      
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.checked }))}
              className="w-4 h-4 text-blue-500 rounded focus:ring-blue-400"
            />
            <span className="text-sm text-white/70">是</span>
          </label>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={`输入${field.label}`}
            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
          />
        );
      
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={`输入${field.label}`}
            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
          />
        );
    }
  };

  const handleExecute = async () => {
    setIsProcessing(true);
    // Simulate automation execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
  };

  const managementActions = [
    {
      id: 'execute',
      label: '执行流程',
      icon: '▶️',
      onClick: handleExecute,
      variant: 'primary' as const
    },
    {
      id: 'schedule',
      label: '定时执行',
      icon: '⏰',
      onClick: () => console.log('Schedule'),
      variant: 'secondary' as const
    },
    {
      id: 'test',
      label: '测试运行',
      icon: '🧪',
      onClick: () => console.log('Test'),
      variant: 'secondary' as const
    },
    {
      id: 'history',
      label: '执行历史',
      icon: '📊',
      onClick: () => console.log('History'),
      variant: 'secondary' as const
    }
  ];

  return (
    <BaseWidget
      title="自动化业务流程"
      icon="⚙️"
      isProcessing={isProcessing}
      managementActions={managementActions}
      emptyStateConfig={{
        icon: '🚀',
        title: '智能业务自动化',
        description: '选择工作流程并填写参数，AI将自动执行复杂的业务流程'
      }}
    >
      {/* Input Area */}
      <div className="p-6 space-y-6">
        {/* Workflow Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-white/80">选择自动化流程</label>
          <Dropdown
            options={workflows.map(workflow => ({
              id: workflow.id,
              label: workflow.name,
              icon: workflow.status === 'active' ? '🟢' : workflow.status === 'paused' ? '⏸️' : '⚪'
            }))}
            value={selectedWorkflow}
            onChange={setSelectedWorkflow}
            placeholder="选择工作流程"
          />
        </div>

        {/* Current Workflow Info */}
        {currentWorkflow && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white">{currentWorkflow.name}</h3>
                <p className="text-sm text-white/60 mt-1">{currentWorkflow.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  currentWorkflow.status === 'active' ? 'bg-green-500/20 text-green-300' :
                  currentWorkflow.status === 'paused' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {currentWorkflow.status === 'active' ? '运行中' : 
                   currentWorkflow.status === 'paused' ? '已暂停' : '草稿'}
                </span>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="flex gap-6 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-white/50">成功率:</span>
                <span className="text-green-400 font-medium">{currentWorkflow.successRate}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-white/50">上次执行:</span>
                <span className="text-white/70">{currentWorkflow.lastRun?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Form Fields */}
        {currentWorkflow && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
              <span>🎛️</span>
              流程参数配置
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentWorkflow.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm text-white/70">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execution Preview */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>🔮</span>
            <span className="text-sm font-medium text-blue-300">执行预览</span>
          </div>
          <div className="text-xs text-blue-200/80 space-y-1">
            <p>• 系统将根据您的配置自动执行 {currentWorkflow?.name}</p>
            <p>• 预计执行时间: 2-5分钟</p>
            <p>• 执行完成后将发送通知邮件</p>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
};

export default ClassicAutomationDemo;