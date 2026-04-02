/**
 * ContextPanel — Shell component with fade transitions.
 * Renders the appropriate sub-panel based on panelContext from the store.
 */
import React from 'react';
import { useSidePanelContext } from '../../../hooks/useSidePanelContext';
import { SidePanelIdle } from './SidePanelIdle';
import { SidePanelDelegation } from './SidePanelDelegation';
import { SidePanelMemory } from './SidePanelMemory';
import { SidePanelKnowledge } from './SidePanelKnowledge';
import { SidePanelChannels } from './SidePanelChannels';

export const ContextPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { panelContext, contextData } = useSidePanelContext();

  const renderPanel = () => {
    switch (panelContext) {
      case 'delegation':
        return <SidePanelDelegation contextData={contextData} />;
      case 'memory':
        return <SidePanelMemory contextData={contextData} />;
      case 'knowledge':
        return <SidePanelKnowledge />;
      case 'channels':
        return <SidePanelChannels />;
      case 'idle':
      default:
        return <SidePanelIdle />;
    }
  };

  return (
    <div
      className={`h-full overflow-y-auto transition-opacity duration-300 ease-in-out ${className}`}
    >
      {renderPanel()}
    </div>
  );
};
