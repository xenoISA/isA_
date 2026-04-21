/** Default data renderer — JSON pretty-print with graceful fallback (#255). */
import React from 'react';
import type { ArtifactRenderer } from '../../../../systems/ArtifactRendererRegistry';

export const DataRenderer: ArtifactRenderer = ({ content }) => {
  let formatted = content;
  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    // Not valid JSON — render as-is.
  }
  return (
    <pre className="p-4 text-[12px] font-mono leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#111111] rounded-lg overflow-x-auto">
      <code>{formatted}</code>
    </pre>
  );
};
