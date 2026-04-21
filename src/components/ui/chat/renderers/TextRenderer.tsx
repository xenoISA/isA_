/** Default text renderer — whitespace-preserving prose (#255). */
import React from 'react';
import type { ArtifactRenderer } from '../../../../systems/ArtifactRendererRegistry';

export const TextRenderer: ArtifactRenderer = ({ content }) => (
  <div className="text-[15px] leading-[1.6] text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
    {content}
  </div>
);
