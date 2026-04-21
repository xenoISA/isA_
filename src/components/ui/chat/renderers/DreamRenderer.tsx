/** Widget-specific renderer for Dream image artifacts (#255).
 *  Dream artifacts are image URLs; the renderer adds a framed gallery
 *  treatment distinct from the generic ImageRenderer so gallery context
 *  is visually explicit. Content may be a single URL or a JSON array
 *  of URLs. */
import React from 'react';
import type { ArtifactRenderer } from '../../../../systems/ArtifactRendererRegistry';

function parseImageUrls(content: string): string[] {
  const trimmed = content.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => typeof s === 'string');
      }
    } catch {
      // Fall through to single-url treatment.
    }
  }
  return [trimmed];
}

export const DreamRenderer: ArtifactRenderer = ({ content, metadata }) => {
  const urls = parseImageUrls(content);
  const prompt = (metadata?.prompt as string | undefined) ?? undefined;

  if (urls.length === 0) {
    return <div className="text-sm text-gray-500">No images</div>;
  }

  return (
    <div className="space-y-3">
      {prompt && (
        <div className="text-xs text-gray-500 italic line-clamp-2" title={prompt}>
          {prompt}
        </div>
      )}
      <div className={`grid gap-3 ${urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="rounded-lg overflow-hidden bg-gray-50 dark:bg-[#111111] ring-1 ring-gray-200/60 dark:ring-white/10">
            <img src={url} alt={`Dream image ${i + 1}`} className="w-full h-auto" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
};
