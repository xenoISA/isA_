/**
 * Reactive hook that watches chat store state and drives the side panel context.
 *
 * Rules:
 *  - activeDelegations non-empty  -> 'delegation'
 *  - current message has memory   -> 'memory'
 *  - otherwise                    -> 'idle'
 */
import { useEffect } from 'react';
import { useCurrentTasks, useChatMessages } from '../stores/useChatStore';
import { useSidePanelStore } from '../stores/useSidePanelStore';

export function useSidePanelContext() {
  const currentTasks = useCurrentTasks();
  const messages = useChatMessages();
  const setPanelContext = useSidePanelStore((s) => s.setPanelContext);
  const panelContext = useSidePanelStore((s) => s.panelContext);
  const contextData = useSidePanelStore((s) => s.contextData);

  useEffect(() => {
    // Check for active delegations (tasks that are running)
    const activeDelegations = currentTasks.filter(
      (t: any) => t.status === 'running' || t.status === 'in_progress' || t.status === 'pending'
    );

    if (activeDelegations.length > 0) {
      setPanelContext('delegation', { delegations: activeDelegations });
      return;
    }

    // Check latest message for memory recalls (only RegularMessage has metadata)
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && 'metadata' in lastMessage && lastMessage.metadata) {
      const meta = lastMessage.metadata as Record<string, any>;
      if (meta.memoryRecalls && Array.isArray(meta.memoryRecalls) && meta.memoryRecalls.length > 0) {
        setPanelContext('memory', { memories: meta.memoryRecalls });
        return;
      }
    }

    // Default
    setPanelContext('idle');
  }, [currentTasks, messages, setPanelContext]);

  return { panelContext, contextData };
}
