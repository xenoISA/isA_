/**
 * DesignPanel — Right panel for Design mode.
 *
 * Wraps the SDK DesignCanvas with the useDesign hook,
 * wiring up version management and refinement.
 *
 * @module
 */

import React from 'react';
import { DesignCanvas as DesignCanvasOriginal } from '@isa/ui-web';

// Cast for React types version mismatch
const DesignCanvas = DesignCanvasOriginal as React.FC<any>;

export interface DesignPanelProps {
  /** Design content URL (image) */
  contentUrl?: string;
  /** HTML content to render */
  htmlContent?: string;
  /** Whether generating */
  isGenerating?: boolean;
  /** Progress (0-100) */
  progress?: number;
  /** Versions for navigation */
  versions?: Array<{ id: string; version: number; createdAt: string }>;
  /** Active version number */
  activeVersion?: number;
  /** Called on version change */
  onVersionChange?: (version: number) => void;
  /** Called on refine request */
  onRefine?: (instruction: string) => void;
  /** Called on export */
  onExport?: (format: 'pdf' | 'pptx' | 'html') => void;
  /** Called on comment */
  onComment?: (x: number, y: number, text: string) => void;
  /** Additional CSS class */
  className?: string;
}

export const DesignPanel: React.FC<DesignPanelProps> = (props) => {
  return (
    <div className={`design-panel h-full ${props.className || ''}`}>
      <DesignCanvas {...props} />
    </div>
  );
};
