/**
 * ChannelOriginBadge — Small badge showing message origin channel.
 * Renders a subtle icon + label for messages that originated from
 * another channel (Telegram, Discord, Slack, etc.).
 */
import React, { useState } from 'react';

const CHANNEL_META: Record<string, { icon: string; label: string }> = {
  telegram: { icon: '\u2708\uFE0F', label: 'Telegram' },
  discord: { icon: '\uD83C\uDFAE', label: 'Discord' },
  slack: { icon: '#\uFE0F\u20E3', label: 'Slack' },
  whatsapp: { icon: '\uD83D\uDCAC', label: 'WhatsApp' },
  web: { icon: '\uD83C\uDF10', label: 'Web' },
};

interface ChannelOriginBadgeProps {
  channel: string;
  channelMessageId?: string;
  timestamp?: string;
}

export const ChannelOriginBadge: React.FC<ChannelOriginBadgeProps> = ({
  channel,
  timestamp,
}) => {
  const [hovered, setHovered] = useState(false);
  const meta = CHANNEL_META[channel] ?? { icon: '\uD83D\uDD17', label: channel };

  return (
    <div
      className="relative inline-flex items-center gap-1 text-xs text-slate-500 cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-[10px] leading-none">{meta.icon}</span>
      <span className="text-[10px] leading-none opacity-70">{meta.label}</span>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute bottom-full left-0 mb-1 px-2 py-1 rounded bg-neutral-800 border border-white/10 text-[10px] text-white/70 whitespace-nowrap shadow-lg z-10">
          From {meta.label} conversation
          {timestamp && (
            <span className="ml-1 text-white/40">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
