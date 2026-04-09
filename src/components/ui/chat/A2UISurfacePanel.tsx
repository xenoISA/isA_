/**
 * ============================================================================
 * A2UI Surface Panel (A2UISurfacePanel.tsx) - SDK Bridge Component
 * ============================================================================
 *
 * Bridge component connecting the isA_ event system to the SDK's
 * AgentSurfaceRenderer. Receives A2UI protocol events from MateEventAdapter,
 * maintains local surface state, and renders via the SDK renderer.
 *
 * Data flow:
 *   MateEventAdapter (a2ui_surface events)
 *     -> A2UISurfacePanel (state management)
 *       -> AgentSurfaceRenderer (@isa/ui-web)
 *         -> UserAction callback -> onUserAction prop -> Mate API
 *
 * A2UI protocol events handled:
 *   - createSurface:      Initialize a new surface with components + dataModel
 *   - updateComponents:   Replace the component tree
 *   - updateDataModel:    Apply JSON Patch operations to the data model
 *   - deleteSurface:      Tear down the surface
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AgentSurfaceRenderer } from '@isa/ui-web';
import type { A2UISurface, UserAction, A2UIComponent, A2UIDataModelOperation } from '@isa/core';
import { createDataModel, applyOperations } from '@isa/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the a2ui_surface events emitted by MateEventAdapter */
export interface A2UISurfaceEvent {
  type: 'a2ui_surface';
  data: {
    messageType: 'createSurface' | 'updateComponents' | 'updateDataModel' | 'deleteSurface';
    payload: Record<string, any>;
  };
}

export interface A2UISurfacePanelProps {
  /** Stream of A2UI surface events from MateEventAdapter */
  surfaceEvents: A2UISurfaceEvent[];
  /** Callback when a user interacts with a rendered component */
  onUserAction?: (action: UserAction) => void;
  /** Additional className for the container */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const A2UISurfacePanel: React.FC<A2UISurfacePanelProps> = ({
  surfaceEvents,
  onUserAction,
  className,
}) => {
  const [surface, setSurface] = useState<A2UISurface | null>(null);

  // Track the last processed event index to avoid reprocessing
  const [lastProcessedIndex, setLastProcessedIndex] = useState(-1);

  // Process incoming surface events incrementally
  useEffect(() => {
    if (surfaceEvents.length <= lastProcessedIndex + 1) return;

    // Process only new events since last render
    const newEvents = surfaceEvents.slice(lastProcessedIndex + 1);

    setSurface((prev) => {
      let current = prev;

      for (const event of newEvents) {
        const { messageType, payload } = event.data;

        switch (messageType) {
          case 'createSurface': {
            const dataModel = createDataModel(payload.dataModel ?? {});
            current = {
              id: payload.surfaceId ?? payload.id ?? 'default',
              catalogId: payload.catalogId ?? 'default',
              title: payload.title,
              components: (payload.components ?? []) as A2UIComponent[],
              dataModel,
              eventHandlers: new Map(),
            };
            break;
          }

          case 'updateComponents': {
            if (!current) break;
            current = {
              ...current,
              components: (payload.components ?? current.components) as A2UIComponent[],
            };
            break;
          }

          case 'updateDataModel': {
            if (!current) break;
            const operations = (payload.operations ?? []) as A2UIDataModelOperation[];
            const updatedDataModel = { ...current.dataModel };
            applyOperations(updatedDataModel, operations);
            current = { ...current, dataModel: updatedDataModel };
            break;
          }

          case 'deleteSurface': {
            current = null;
            break;
          }
        }
      }

      return current;
    });

    setLastProcessedIndex(surfaceEvents.length - 1);
  }, [surfaceEvents, lastProcessedIndex]);

  // Stable callback for user actions
  const handleUserAction = useCallback(
    (action: UserAction) => {
      onUserAction?.(action);
    },
    [onUserAction],
  );

  // Nothing to render if no surface is active
  if (!surface) {
    return null;
  }

  return (
    <div className={className ?? 'h-full overflow-y-auto p-4'}>
      <AgentSurfaceRenderer
        surface={surface}
        onUserAction={handleUserAction}
      />
    </div>
  );
};

A2UISurfacePanel.displayName = 'A2UISurfacePanel';

export default A2UISurfacePanel;
