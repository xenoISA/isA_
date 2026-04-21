/** Default HTML renderer — iframe-sandboxed to prevent XSS (#255).
 *  Content is rendered in an isolated iframe with no scripts/same-origin
 *  capability so untrusted markup can't access the parent page. */
import React from 'react';
import type { ArtifactRenderer } from '../../../../systems/ArtifactRendererRegistry';

export const HtmlRenderer: ArtifactRenderer = ({ content }) => (
  <iframe
    srcDoc={content}
    sandbox=""
    title="Artifact HTML"
    className="w-full min-h-[200px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white"
  />
);
