/**
 * ScheduleResultCard — Rendered for autonomous messages where
 * autonomousSource === 'scheduler'. Shows the result of a scheduled
 * task execution with a distinct visual treatment.
 */

import React, { useState } from 'react';
import type { RegularMessage } from '../../../types/chatTypes';
import { getMateService } from '../../../api/mateService';

interface ScheduleResultCardProps {
  message: RegularMessage;
}

export const ScheduleResultCard: React.FC<ScheduleResultCardProps> = ({ message }) => {
  const [rerunning, setRerunning] = useState(false);

  const jobId = message.jobId;
  const jobName = (message.metadata?.job_name as string) || 'Scheduled Task';
  const completedAt = message.completedAt || message.timestamp;

  const handleRunAgain = async () => {
    if (!jobId || rerunning) return;
    setRerunning(true);
    try {
      await getMateService().triggerJob(jobId);
    } catch {
      // Silently handle — the job may no longer exist
    } finally {
      setRerunning(false);
    }
  };

  const formattedTime = new Date(completedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="my-3 rounded-2xl bg-indigo-500/8 border border-indigo-400/20 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-4 h-4 text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span className="text-indigo-400 text-sm font-semibold">Scheduled Task</span>
        <span className="text-white/40 text-xs ml-auto">{formattedTime}</span>
      </div>

      {/* Job name */}
      <div className="text-white/80 text-xs font-medium mb-2">{jobName}</div>

      {/* Content */}
      <div className="text-white/70 text-sm whitespace-pre-wrap">
        {message.content}
      </div>

      {/* Run again button */}
      {jobId && (
        <button
          onClick={handleRunAgain}
          disabled={rerunning}
          className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
        >
          {rerunning ? 'Running...' : 'Run again'}
        </button>
      )}
    </div>
  );
};
