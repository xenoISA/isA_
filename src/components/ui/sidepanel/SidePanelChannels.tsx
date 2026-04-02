/**
 * SidePanelChannels — Shows active channel conversations.
 * Lists channels Mate is active on (from useMatePresence health data)
 * with channel name, icon, and status.
 */
import React from 'react';
import { useMatePresence } from '../../../hooks/useMatePresence';
import { useSidePanelStore } from '../../../stores/useSidePanelStore';

const CHANNEL_META: Record<string, { icon: string; label: string }> = {
  telegram: { icon: '\u2708\uFE0F', label: 'Telegram' },
  discord: { icon: '\uD83C\uDFAE', label: 'Discord' },
  slack: { icon: '#\uFE0F\u20E3', label: 'Slack' },
  whatsapp: { icon: '\uD83D\uDCAC', label: 'WhatsApp' },
  web: { icon: '\uD83C\uDF10', label: 'Web' },
};

export const SidePanelChannels: React.FC = () => {
  const { channels, isOnline } = useMatePresence();
  const setPanelContext = useSidePanelStore((s) => s.setPanelContext);

  return (
    <div className="flex flex-col py-6 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-white/80">Active Channels</h3>
        <button
          onClick={() => setPanelContext('idle')}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Back
        </button>
      </div>

      {/* Channel list */}
      {channels.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs text-white/40">No active channels</p>
          <p className="text-[10px] text-white/25 mt-1">
            Mate connects to Telegram, Discord, Slack and more
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((channel) => {
            const meta = CHANNEL_META[channel] ?? { icon: '\uD83D\uDD17', label: channel };
            return (
              <div
                key={channel}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--mate-glow)] border border-[var(--mate-border)] hover:border-[var(--mate-accent)]/30 transition-colors duration-200"
              >
                <span className="text-base">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80">{meta.label}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-green-400 animate-mate-breathe' : 'bg-white/20'
                    }`}
                  />
                  <span className="text-[10px] text-white/40">
                    {isOnline ? 'Active' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="pt-2 border-t border-white/5">
        <p className="text-[10px] text-white/30 text-center leading-relaxed">
          Conversations continue seamlessly across channels
        </p>
      </div>
    </div>
  );
};
