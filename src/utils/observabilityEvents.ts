export const OBSERVABILITY_REFRESH_EVENT = 'isa:observability-refresh';

export interface ObservabilityRefreshDetail {
  sessionId?: string;
  reason?: string;
}

export function emitObservabilityRefresh(detail: ObservabilityRefreshDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ObservabilityRefreshDetail>(
    OBSERVABILITY_REFRESH_EVENT,
    { detail },
  ));
}
