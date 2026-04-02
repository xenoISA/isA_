/**
 * ScheduleConfirmationCard — Inline card rendered in assistant messages
 * when a scheduled job has been created.
 *
 * Shows job name, human-readable cron schedule, next run countdown,
 * and a cancel button.
 */

import React, { useState, useEffect } from 'react';
import type { ScheduleConfirmationData } from '../../../types/chatTypes';
import { cronToHuman } from '../../../utils/cronToHuman';
import { getMateService } from '../../../api/mateService';

interface ScheduleConfirmationCardProps {
  data: ScheduleConfirmationData;
}

function useCountdown(targetIso?: string): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!targetIso) {
      setLabel('');
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
      const s = totalSec % 60;

      if (h > 0) {
        setLabel(`${h}h ${m}m`);
      } else if (m > 0) {
        setLabel(`${m}m ${s}s`);
      } else {
        setLabel(`${s}s`);
      }
    }

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return label;
}

export const ScheduleConfirmationCard: React.FC<ScheduleConfirmationCardProps> = ({ data }) => {
  const [cancelled, setCancelled] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const countdown = useCountdown(data.nextRunAt);

  const handleCancel = async () => {
    if (cancelling || cancelled) return;
    setCancelling(true);
    try {
      await getMateService().deleteJob(data.jobId);
      setCancelled(true);
    } catch {
      // Silently fail — the job may already be gone
      setCancelled(true);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="my-3 rounded-2xl border-l-4 border-cyan-400 bg-cyan-500/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-cyan-400 text-sm font-semibold">Schedule created</span>
      </div>

      <div className="text-white text-sm font-medium mb-1">{data.name}</div>
      <div className="text-white/60 text-xs mb-2">{cronToHuman(data.cronExpression)}</div>

      {data.description && (
        <div className="text-white/50 text-xs mb-2">{data.description}</div>
      )}

      {countdown && !cancelled && (
        <div className="text-cyan-300/70 text-xs mb-3">
          Next run in {countdown}
        </div>
      )}

      {cancelled ? (
        <div className="text-white/40 text-xs">Cancelled</div>
      ) : (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          {cancelling ? 'Cancelling...' : 'Cancel schedule'}
        </button>
      )}
    </div>
  );
};
