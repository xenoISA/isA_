/**
 * Message timing tracker — measures chat-send latency landmarks (#277).
 *
 *   t0 = handleSendMessage() called
 *   t1 = first SSE event of any kind (stream start)
 *   t2 = first content token (TTFT)
 *   t3 = stream complete
 *
 * Derived metrics:
 *   stream_start_ms    = t1 - t0
 *   ttft_ms            = t2 - t0    (time-to-first-token)
 *   stream_duration_ms = t3 - t2
 *   total_ms           = t3 - t0
 */

export interface MessageTiming {
  ttft_ms: number | null;
  stream_start_ms: number | null;
  stream_duration_ms: number | null;
  total_ms: number | null;
  timestamp: string;
}

type NowFn = () => number;

export class MessageTimingTracker {
  private t0: number | null = null;
  private t1: number | null = null;
  private t2: number | null = null;
  private t3: number | null = null;
  private readonly now: NowFn;

  constructor(now: NowFn = () => performance.now()) {
    this.now = now;
  }

  markSent(): void {
    this.t0 = this.now();
  }

  markStreamStart(): void {
    if (this.t1 === null) this.t1 = this.now();
  }

  markFirstToken(): void {
    if (this.t2 === null) this.t2 = this.now();
  }

  markComplete(): void {
    if (this.t3 === null) this.t3 = this.now();
  }

  snapshot(): MessageTiming {
    return {
      stream_start_ms: this.t0 !== null && this.t1 !== null ? this.t1 - this.t0 : null,
      ttft_ms: this.t0 !== null && this.t2 !== null ? this.t2 - this.t0 : null,
      stream_duration_ms: this.t2 !== null && this.t3 !== null ? this.t3 - this.t2 : null,
      total_ms: this.t0 !== null && this.t3 !== null ? this.t3 - this.t0 : null,
      timestamp: new Date().toISOString(),
    };
  }
}

/** Formatted one-line console log for dev-mode visibility. */
export function formatTimingLog(t: MessageTiming): string {
  const fmt = (v: number | null) => (v === null ? '—' : `${Math.round(v)}ms`);
  return `[PERF] TTFT: ${fmt(t.ttft_ms)} | stream_start: ${fmt(t.stream_start_ms)} | duration: ${fmt(t.stream_duration_ms)} | total: ${fmt(t.total_ms)}`;
}
