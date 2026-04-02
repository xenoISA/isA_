/**
 * UpcomingSchedulePanel — Lightweight panel showing the next 5 scheduled tasks.
 * Rendered inside the RightPanel "Schedule" tab.
 */

import React, { useState, useEffect } from 'react';
import { useSchedulerJobs } from '../../../hooks/useSchedulerJobs';
import { cronToHuman } from '../../../utils/cronToHuman';
import { getMateService } from '../../../api/mateService';

function Countdown({ targetIso }: { targetIso?: string }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!targetIso) {
      setLabel('--');
      return;
    }

    function update() {
      const diff = new Date(targetIso!).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('now');
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);

      if (h > 24) {
        const d = Math.floor(h / 24);
        setLabel(`${d}d ${h % 24}h`);
      } else if (h > 0) {
        setLabel(`${h}h ${m}m`);
      } else {
        setLabel(`${m}m`);
      }
    }

    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [targetIso]);

  return <span>{label}</span>;
}

export const UpcomingSchedulePanel: React.FC = () => {
  const { jobs, isLoading, error, refetch } = useSchedulerJobs();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (jobId: string) => {
    setDeletingId(jobId);
    try {
      await getMateService().deleteJob(jobId);
      refetch();
    } catch {
      // Silently handle
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-white/40 text-sm">Loading schedules...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
        <div className="text-amber-400 text-xs mb-1">Mate may be offline</div>
        <div className="text-white/50 text-xs">{error}</div>
        <button
          onClick={refetch}
          className="mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-2xl mb-2">&#128337;</div>
        <div className="text-white/40 text-sm">No scheduled tasks</div>
        <div className="text-white/30 text-xs mt-1">
          Ask Mate to schedule something.
        </div>
      </div>
    );
  }

  const visible = jobs.slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white font-medium text-sm">Upcoming</h4>
        <span className="text-white/40 text-xs">{jobs.length} total</span>
      </div>

      {visible.map((job) => (
        <div
          key={job.job_id}
          className="bg-white/5 rounded-lg p-3 border border-white/10"
        >
          <div className="flex items-start justify-between mb-1">
            <div className="text-white text-sm font-medium flex-1 mr-2 truncate">
              {job.name}
            </div>
            <button
              onClick={() => handleDelete(job.job_id)}
              disabled={deletingId === job.job_id}
              className="text-red-400/60 hover:text-red-400 text-xs transition-colors disabled:opacity-50 flex-shrink-0"
              title="Delete schedule"
            >
              {deletingId === job.job_id ? '...' : '\u2715'}
            </button>
          </div>

          <div className="text-white/50 text-xs mb-1">
            {job.cron_expression ? cronToHuman(job.cron_expression) : 'One-time'}
          </div>

          <div className="text-cyan-400/70 text-xs">
            Next: <Countdown targetIso={job.next_run_at} />
          </div>
        </div>
      ))}

      {jobs.length > 5 && (
        <div className="text-center py-1">
          <span className="text-white/40 text-xs">+{jobs.length - 5} more</span>
        </div>
      )}
    </div>
  );
};
