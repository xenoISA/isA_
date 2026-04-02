/**
 * SidePanelMemory — Shows recalled memories from current conversation.
 */
import React from 'react';

interface SidePanelMemoryProps {
  contextData: any;
}

export const SidePanelMemory: React.FC<SidePanelMemoryProps> = ({ contextData }) => {
  const memories: any[] = contextData?.memories ?? [];

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-display font-semibold text-[var(--mate-accent)]">
        Mate remembers...
      </h3>

      {memories.length === 0 ? (
        <p className="text-xs text-white/40">No recalled memories</p>
      ) : (
        <div className="space-y-2">
          {memories.map((mem: any, i: number) => (
            <div
              key={i}
              className="bg-[var(--mate-glow)] rounded-lg p-3 border border-[var(--mate-border)]"
            >
              <p className="text-xs text-white/70 leading-relaxed">
                {typeof mem === 'string' ? mem : mem.content || mem.text || JSON.stringify(mem)}
              </p>
              {mem.source && (
                <span className="text-[10px] text-white/30 mt-1 block">{mem.source}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
