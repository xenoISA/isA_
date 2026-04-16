/**
 * Side Panel State Management — contextual panel driven by conversation state
 */
import { create } from 'zustand';

export type PanelContext = 'idle' | 'delegation' | 'memory' | 'knowledge' | 'schedule' | 'task-progress' | 'channels' | 'artifact';

export interface SidePanelState {
  panelContext: PanelContext;
  contextData: any;
  setPanelContext: (context: PanelContext, data?: any) => void;
}

export const useSidePanelStore = create<SidePanelState>((set) => ({
  panelContext: 'idle',
  contextData: null,
  setPanelContext: (context, data = null) => set({ panelContext: context, contextData: data }),
}));
