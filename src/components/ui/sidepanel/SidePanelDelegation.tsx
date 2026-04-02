/**
 * SidePanelDelegation — Shows active delegation / task progress.
 */
import React from 'react';

interface SidePanelDelegationProps {
  contextData: any;
}

export const SidePanelDelegation: React.FC<SidePanelDelegationProps> = ({ contextData }) => {
  const delegations: any[] = contextData?.delegations ?? [];

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-display font-semibold text-[var(--mate-accent)]">Active Delegations</h3>

      {delegations.length === 0 ? (
        <p className="text-xs text-white/40">No active delegations</p>
      ) : (
        <div className="space-y-3">
          {delegations.map((d: any, i: number) => (
            <div
              key={d.id ?? i}
              className="bg-white/5 rounded-lg p-3 border border-[var(--mate-border)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[var(--mate-accent)] rounded-full animate-pulse" />
                <span className="text-sm text-white font-medium truncate">
                  {d.title || d.name || `Task ${i + 1}`}
                </span>
              </div>
              {d.status && (
                <span className="text-xs text-white/50 capitalize">{d.status}</span>
              )}
              {d.description && (
                <p className="text-xs text-white/40 mt-1 truncate">{d.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
