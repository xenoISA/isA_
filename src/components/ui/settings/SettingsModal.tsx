/**
 * SettingsModal — Claude-style settings with left nav + content (#196)
 */
import React, { useState } from 'react';
import { AppearanceSettings } from './AppearanceSettings';
import { CustomInstructionsSettings } from './CustomInstructionsSettings';
import { ProjectSettings } from './ProjectSettings';
import { MemoryManager } from './MemoryManager';
import { SkillBuilder } from './SkillBuilder';
import { ConnectorMarketplace } from './ConnectorMarketplace';
import { CalendarSyncSettings } from '../calendar/CalendarSyncSettings';

type SettingsTab = 'general' | 'appearance' | 'project' | 'memory' | 'skills' | 'calendar' | 'integrations';

const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'project', label: 'Project' },
  { id: 'memory', label: 'Memory' },
  { id: 'skills', label: 'Skills' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'integrations', label: 'Integrations' },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex overflow-hidden">
        {/* Left Nav */}
        <nav className="w-[220px] border-r border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Settings</h2>
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                  activeTab === tab.id
                    ? 'bg-gray-100 dark:bg-white/10 font-medium text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'general' && <CustomInstructionsSettings />}
          {activeTab === 'project' && <ProjectSettings />}
          {activeTab === 'memory' && <MemoryManager />}
          {activeTab === 'skills' && <SkillBuilder />}
          {activeTab === 'calendar' && <CalendarSyncSettings />}
          {activeTab === 'integrations' && <ConnectorMarketplace />}
        </div>
      </div>
    </div>
  );
};
