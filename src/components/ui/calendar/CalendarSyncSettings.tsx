/**
 * ============================================================================
 * CalendarSyncSettings - Connect/disconnect external calendar providers
 * ============================================================================
 *
 * Displays provider cards for Google, Apple, and Outlook calendars.
 * Each card shows connection status, last synced time, and sync controls.
 *
 * Usage:
 *   <CalendarSyncSettings userId={userId} />
 *
 * Can be embedded in UserPortal preferences, calendar widget settings, etc.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useCalendarSync, type CalendarSyncProvider } from '../../../hooks/useCalendar';
import { Button } from '../../shared/ui/Button';

// ================================================================================
// Types
// ================================================================================

interface CalendarSyncSettingsProps {
  userId?: string;
  className?: string;
}

interface ProviderConfig {
  id: CalendarSyncProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
}

// ================================================================================
// Provider Definitions
// ================================================================================

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Sync events from your Google account',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    description: 'Sync events from iCloud Calendar',
    icon: (
      <svg className="size-5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z"/>
      </svg>
    ),
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Sync events from Microsoft Outlook',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none">
        <path d="M24 7.387v10.478c0 .23-.08.424-.238.583a.793.793 0 0 1-.584.238h-8.322V6.566h8.322c.226 0 .42.08.584.238.158.159.238.353.238.583Z" fill="#0078D4"/>
        <path d="M14.856 6.566V18.69H5.822a.793.793 0 0 1-.584-.238.793.793 0 0 1-.238-.584V7.387c0-.23.08-.424.238-.583a.793.793 0 0 1 .584-.238h9.034Z" fill="#0364B8"/>
        <path d="M14.856 2v4.566H5V2.822c0-.23.08-.424.238-.583A.793.793 0 0 1 5.822 2h9.034Z" fill="#0078D4"/>
        <path d="M14.856 17.434V22H5.822a.793.793 0 0 1-.584-.238.793.793 0 0 1-.238-.584v-3.744h9.856Z" fill="#0364B8"/>
        <rect x="1" y="5.5" width="10" height="13" rx="1" fill="#0078D4"/>
        <ellipse cx="6" cy="12" rx="3" ry="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
  },
];

// ================================================================================
// Helpers
// ================================================================================

function formatLastSynced(iso?: string): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ================================================================================
// Sub-Components
// ================================================================================

const SyncStatusDot: React.FC<{ status: 'connected' | 'syncing' | 'disconnected' | 'error' }> = ({ status }) => {
  const colors: Record<string, string> = {
    connected: 'bg-emerald-500',
    syncing: 'bg-amber-500 animate-pulse',
    disconnected: 'bg-white/20',
    error: 'bg-red-500',
  };
  return <div className={`size-2 rounded-full ${colors[status] || colors.disconnected}`} />;
};

const SyncStatusLabel: React.FC<{ status: 'connected' | 'syncing' | 'disconnected' | 'error' }> = ({ status }) => {
  const labels: Record<string, { text: string; className: string }> = {
    connected: { text: 'Connected', className: 'text-emerald-400' },
    syncing: { text: 'Syncing...', className: 'text-amber-400' },
    disconnected: { text: 'Not connected', className: 'text-white/35' },
    error: { text: 'Error', className: 'text-red-400' },
  };
  const config = labels[status] || labels.disconnected;
  return <span className={`text-[11px] font-medium ${config.className}`}>{config.text}</span>;
};

// ================================================================================
// Provider Card
// ================================================================================

interface ProviderCardProps {
  provider: ProviderConfig;
  isConnected: boolean;
  isSyncing: boolean;
  lastSynced?: string;
  syncedEvents: number;
  errorMessage?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  isConnected,
  isSyncing,
  lastSynced,
  syncedEvents,
  errorMessage,
  onConnect,
  onDisconnect,
  onSync,
}) => {
  const status = isSyncing
    ? 'syncing'
    : errorMessage
      ? 'error'
      : isConnected
        ? 'connected'
        : 'disconnected';

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 transition-colors hover:border-white/[0.10]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
            {provider.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate">{provider.name}</span>
              <SyncStatusDot status={status} />
            </div>
            <p className="text-xs text-white/35 truncate">{provider.description}</p>
          </div>
        </div>

        <SyncStatusLabel status={status} />
      </div>

      {/* Details row - only when connected */}
      {isConnected && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-white/35">Last synced: </span>
                <span className="text-white/60">{formatLastSynced(lastSynced)}</span>
              </div>
              {syncedEvents > 0 && (
                <div>
                  <span className="text-white/35">Events: </span>
                  <span className="text-white/60 tabular-nums">{syncedEvents}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="mt-3 p-2.5 bg-red-500/[0.08] border border-red-500/15 rounded-lg">
          <p className="text-red-300 text-xs">{errorMessage}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {isConnected ? (
          <>
            <Button
              onClick={onSync}
              disabled={isSyncing}
              loading={isSyncing}
              size="sm"
              variant="ghost"
              icon={
                <svg
                  className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                  />
                </svg>
              }
            >
              {isSyncing ? 'Syncing...' : 'Sync now'}
            </Button>
            <Button onClick={onDisconnect} size="sm" variant="ghost">
              Disconnect
            </Button>
          </>
        ) : (
          <Button onClick={onConnect} disabled={isSyncing} size="sm" variant="primary">
            Connect
          </Button>
        )}
      </div>
    </div>
  );
};

// ================================================================================
// Main Component
// ================================================================================

export const CalendarSyncSettings: React.FC<CalendarSyncSettingsProps> = ({
  userId,
  className,
}) => {
  const { syncStatus, syncCalendar, getSyncStatus, isLoading } = useCalendarSync(userId);

  // Track per-provider syncing state locally for optimistic UI
  const [syncingProviders, setSyncingProviders] = useState<Set<CalendarSyncProvider>>(new Set());
  // Track locally "connected" providers (optimistic, persists across re-renders)
  const [connectedProviders, setConnectedProviders] = useState<Set<CalendarSyncProvider>>(new Set());
  const [providerErrors, setProviderErrors] = useState<Record<string, string>>({});

  // Fetch sync status on mount
  useEffect(() => {
    if (userId) {
      getSyncStatus();
    }
  }, [userId, getSyncStatus]);

  // Derive connection status from syncStatus response
  const getProviderStatus = useCallback(
    (providerId: CalendarSyncProvider) => {
      // If we have a syncStatus response matching this provider, use it
      if (syncStatus && syncStatus.provider === providerId) {
        return {
          isConnected: syncStatus.status === 'synced' || syncStatus.status === 'connected',
          lastSynced: syncStatus.last_synced,
          syncedEvents: syncStatus.synced_events,
        };
      }
      // Fall back to local optimistic state
      return {
        isConnected: connectedProviders.has(providerId),
        lastSynced: undefined,
        syncedEvents: 0,
      };
    },
    [syncStatus, connectedProviders]
  );

  const handleConnect = useCallback(
    async (providerId: CalendarSyncProvider) => {
      setSyncingProviders((prev) => new Set(prev).add(providerId));
      setProviderErrors((prev) => ({ ...prev, [providerId]: '' }));
      try {
        await syncCalendar(providerId);
        setConnectedProviders((prev) => new Set(prev).add(providerId));
        // Refresh status after connect
        await getSyncStatus();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to connect';
        setProviderErrors((prev) => ({ ...prev, [providerId]: msg }));
      } finally {
        setSyncingProviders((prev) => {
          const next = new Set(prev);
          next.delete(providerId);
          return next;
        });
      }
    },
    [syncCalendar, getSyncStatus]
  );

  const handleDisconnect = useCallback(
    (providerId: CalendarSyncProvider) => {
      setConnectedProviders((prev) => {
        const next = new Set(prev);
        next.delete(providerId);
        return next;
      });
      setProviderErrors((prev) => ({ ...prev, [providerId]: '' }));
    },
    []
  );

  const handleSync = useCallback(
    async (providerId: CalendarSyncProvider) => {
      setSyncingProviders((prev) => new Set(prev).add(providerId));
      setProviderErrors((prev) => ({ ...prev, [providerId]: '' }));
      try {
        await syncCalendar(providerId);
        await getSyncStatus();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sync failed';
        setProviderErrors((prev) => ({ ...prev, [providerId]: msg }));
      } finally {
        setSyncingProviders((prev) => {
          const next = new Set(prev);
          next.delete(providerId);
          return next;
        });
      }
    },
    [syncCalendar, getSyncStatus]
  );

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white/80">Calendar Sync</h3>
        <p className="text-xs text-white/35 mt-1">
          Connect your external calendars to sync events automatically.
        </p>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map((provider) => {
          const status = getProviderStatus(provider.id);
          return (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isConnected={status.isConnected}
              isSyncing={syncingProviders.has(provider.id)}
              lastSynced={status.lastSynced}
              syncedEvents={status.syncedEvents}
              errorMessage={providerErrors[provider.id] || undefined}
              onConnect={() => handleConnect(provider.id)}
              onDisconnect={() => handleDisconnect(provider.id)}
              onSync={() => handleSync(provider.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CalendarSyncSettings;
