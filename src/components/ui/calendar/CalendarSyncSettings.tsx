import React, { useEffect, useState } from 'react';
import { useCalendarStore } from '../../../stores/useCalendarStore';
import * as CalendarAdapter from '../../../api/adapters/CalendarAdapter';
import type { CalendarProvider } from '../../../api/adapters/CalendarAdapter';

const PROVIDERS: Array<{ type: CalendarProvider['type']; label: string; icon: string }> = [
  { type: 'google', label: 'Google Calendar', icon: '📅' },
  { type: 'outlook', label: 'Outlook Calendar', icon: '📧' },
  { type: 'apple', label: 'Apple Calendar', icon: '🍎' },
];

export const CalendarSyncSettings: React.FC = () => {
  const { providers, fetchProviders } = useCalendarStore();
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const handleConnect = async (type: CalendarProvider['type']) => {
    const { authUrl } = await CalendarAdapter.connectProvider(type);
    window.open(authUrl, '_blank', 'width=500,height=600');
  };

  const handleDisconnect = async (type: CalendarProvider['type']) => {
    await CalendarAdapter.disconnectProvider(type);
    fetchProviders();
  };

  const handleSync = async (type: CalendarProvider['type']) => {
    setSyncing(type);
    try { await CalendarAdapter.syncProvider(type); fetchProviders(); } finally { setSyncing(null); }
  };

  const getProvider = (type: string) => providers.find((p) => p.type === type);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Calendar Sync</h3>
      <p className="text-xs text-[var(--text-tertiary)] mb-4">Connect your calendars so Mate can see your schedule and send reminders.</p>
      {PROVIDERS.map(({ type, label, icon }) => {
        const connected = getProvider(type);
        return (
          <div key={type} className="flex items-center justify-between p-3 rounded-lg border border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <span className="text-lg">{icon}</span>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                {connected?.connected && <p className="text-xs text-[var(--text-tertiary)]">Last synced: {connected.lastSynced ? new Date(connected.lastSynced).toLocaleString() : 'Never'}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected?.connected ? (
                <>
                  <button onClick={() => handleSync(type)} disabled={syncing === type} className="px-3 py-1 text-xs rounded-md bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)]">{syncing === type ? 'Syncing...' : 'Sync'}</button>
                  <button onClick={() => handleDisconnect(type)} className="px-3 py-1 text-xs rounded-md text-red-400 hover:text-red-300">Disconnect</button>
                </>
              ) : (
                <button onClick={() => handleConnect(type)} className="px-3 py-1 text-xs rounded-md bg-[var(--accent-primary)] text-white hover:opacity-90">Connect</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
