/** Default code renderer — monospace block with language class hint (#255). */
import React from 'react';
import type { ArtifactRenderer } from '../../../../systems/ArtifactRendererRegistry';

export const CodeRenderer: ArtifactRenderer = ({ content, language }) => (
  <pre className="p-4 text-[13px] font-mono leading-relaxed text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#111111] rounded-lg overflow-x-auto">
    <code className={language ? `language-${language}` : undefined}>{content}</code>
  </pre>
);
