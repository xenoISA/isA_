/**
 * ResearchModePanel — Multi-step research progress display (#208)
 * Shows queries, sources, analysis steps, and citations during research.
 */
import React from 'react';

export interface ResearchStep {
  id: string;
  type: 'query' | 'source' | 'analysis' | 'citation';
  content: string;
  url?: string;
  status: 'pending' | 'active' | 'complete';
}

interface ResearchModePanelProps {
  steps: ResearchStep[];
  isActive: boolean;
  onStop?: () => void;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  query: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  source: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  analysis: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  citation: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-300 dark:text-gray-600',
  active: 'text-blue-500 animate-pulse',
  complete: 'text-green-500',
};

export const ResearchModePanel: React.FC<ResearchModePanelProps> = ({ steps, isActive, onStop }) => {
  const completed = steps.filter(s => s.status === 'complete').length;
  const progress = steps.length > 0 ? (completed / steps.length) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden my-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {isActive ? 'Researching...' : 'Research Complete'}
          </span>
          <span className="text-xs text-gray-400">{completed}/{steps.length} steps</span>
        </div>
        {isActive && onStop && (
          <button onClick={onStop} className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            Stop
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Steps */}
      <div className="px-4 py-3 space-y-2 max-h-[300px] overflow-y-auto">
        {steps.map(step => (
          <div key={step.id} className="flex items-start gap-2">
            <div className={`mt-0.5 ${STATUS_COLORS[step.status]}`}>
              {STEP_ICONS[step.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{step.content}</p>
              {step.url && (
                <a href={step.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">
                  {step.url}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
