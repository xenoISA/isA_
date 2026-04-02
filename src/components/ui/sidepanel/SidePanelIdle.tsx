/**
 * SidePanelIdle — Default view when no active context.
 * Shows Mate avatar, connection indicator, quick session stats.
 */
import React from 'react';
import { useChatMessages } from '../../../stores/useChatStore';
import { useSidePanelStore } from '../../../stores/useSidePanelStore';
import { useMatePresence } from '../../../hooks/useMatePresence';

export const SidePanelIdle: React.FC = () => {
  const messages = useChatMessages();
  const setPanelContext = useSidePanelStore((s) => s.setPanelContext);
  const { channels } = useMatePresence();
  const messageCount = messages.length;
  const aiCount = messages.filter((m) => m.role === 'assistant').length;

  return (
    <div className="flex flex-col items-center py-8 px-4 space-y-6">
      {/* Mate avatar + connection */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7c8cf5] to-[#a78bfa] flex items-center justify-center text-white text-2xl font-bold font-display shadow-lg shadow-[#7c8cf5]/20">
          M
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[var(--mate-surface)] animate-mate-breathe" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-display font-semibold text-[var(--mate-accent)]">Connected</p>
        <p className="text-xs text-white/40">Mate is here</p>
      </div>

      {/* Quick session stats */}
      <div className="w-full space-y-2">
        <div className="flex justify-between text-xs px-2">
          <span className="text-white/50">Messages</span>
          <span className="text-white/80 font-medium">{messageCount}</span>
        </div>
        <div className="flex justify-between text-xs px-2">
          <span className="text-white/50">Mate replies</span>
          <span className="text-white/80 font-medium">{aiCount}</span>
        </div>
      </div>

      {/* Knowledge shortcut */}
      <button
        onClick={() => setPanelContext('knowledge')}
        className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--mate-glow)] border border-[var(--mate-border)] hover:border-[var(--mate-accent)]/30 transition-colors duration-200 group"
      >
        <span className="text-sm">🧠</span>
        <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors font-display">
          What Mate knows about you
        </span>
      </button>

      {/* Active channels shortcut */}
      {channels.length > 0 && (
        <button
          onClick={() => setPanelContext('channels')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--mate-glow)] border border-[var(--mate-border)] hover:border-[var(--mate-accent)]/30 transition-colors duration-200 group"
        >
          <span className="text-sm">{'\uD83D\uDD17'}</span>
          <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors font-display">
            Active channels ({channels.length})
          </span>
        </button>
      )}

      {/* Prompt */}
      <div className="mt-4 text-center">
        <p className="text-xs text-white/30 font-display">Ask Mate anything</p>
      </div>
    </div>
  );
};
