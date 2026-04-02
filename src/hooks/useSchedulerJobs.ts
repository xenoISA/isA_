/**
 * useSchedulerJobs — Fetches and polls scheduled jobs from Mate.
 *
 * - Calls getMateService().listJobs() on mount and every 60 seconds
 * - Sorts jobs by next_run_at ascending
 * - Handles errors gracefully when Mate is offline
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMateService } from '../api/mateService';
import type { MateSchedulerJob } from '../types/mateTypes';
import { createLogger } from '../utils/logger';

const log = createLogger('useSchedulerJobs');

const POLL_INTERVAL_MS = 60_000;

export interface UseSchedulerJobsResult {
  jobs: MateSchedulerJob[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSchedulerJobs(): UseSchedulerJobsResult {
  const [jobs, setJobs] = useState<MateSchedulerJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const mateService = getMateService();
      const fetched = await mateService.listJobs();

      // Sort by next_run_at ascending (soonest first), nulls last
      const sorted = [...fetched].sort((a, b) => {
        if (!a.next_run_at && !b.next_run_at) return 0;
        if (!a.next_run_at) return 1;
        if (!b.next_run_at) return -1;
        return new Date(a.next_run_at).getTime() - new Date(b.next_run_at).getTime();
      });

      setJobs(sorted);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn('Failed to fetch scheduler jobs — Mate may be offline', { error: msg });
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchJobs();
    intervalRef.current = setInterval(fetchJobs, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchJobs]);

  return { jobs, isLoading, error, refetch: fetchJobs };
}
