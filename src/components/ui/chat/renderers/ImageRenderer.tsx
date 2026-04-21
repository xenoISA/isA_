/** Default image renderer — responsive img tag (#255). */
import React from 'react';
import type { ArtifactRenderer } from '../../../../systems/ArtifactRendererRegistry';

export const ImageRenderer: ArtifactRenderer = ({ content, metadata }) => {
  const alt = (metadata?.alt as string | undefined) ?? 'Artifact image';
  return (
    <img src={content} alt={alt} className="max-w-full rounded-lg" loading="lazy" />
  );
};
