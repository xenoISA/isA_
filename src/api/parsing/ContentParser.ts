/**
 * ContentParser — Content type detection and structured parsing.
 *
 * MIGRATION NOTE (#281): Reduced from 542 lines to ~100.
 * Full implementation extracted to @isa/core ContentTypeDetector (isA_App_SDK#288).
 * When @isa/core is published, replace with:
 *
 *   export { ContentTypeDetector as ContentParser } from '@isa/core';
 *   export type { DetectedContent as ParsedContent, ContentType } from '@isa/core';
 */

import { BaseParser } from './Parser';

export type ContentType = 'text' | 'markdown' | 'code' | 'image' | 'mixed' | 'json' | 'html' | 'url';

export interface ContentElement {
  type: ContentType;
  content: string;
  position?: { start: number; end: number };
  metadata?: { language?: string; [key: string]: any };
}

export interface ParsedContent {
  raw: string;
  primaryType: ContentType;
  elements: ContentElement[];
  isMixed: boolean;
  renderHints?: {
    variant?: 'chat' | 'widget' | 'artifact' | 'preview';
    complexity?: 'simple' | 'moderate' | 'complex';
    requiresSpecialHandling?: boolean;
  };
  stats?: {
    totalLength: number;
    elementCount: number;
    typeDistribution: Record<string, number>;
  };
}

export class ContentParser extends BaseParser<string, ParsedContent> {
  readonly name = 'content_parser';
  readonly version = '2.0.0';

  canParse(data: string): boolean {
    return typeof data === 'string' && data.length > 0;
  }

  parse(content: string): ParsedContent | null {
    if (!content || typeof content !== 'string') return null;

    const hasCodeBlock = /```\w*\n[\s\S]*?\n```/.test(content);
    const hasMarkdown = (content.match(/(?:^|\n)(#{1,6}\s|[*\-]\s|\d+\.\s|>\s|\*\*.*\*\*)/g) || []).length >= 2;
    const hasImage = /https?:\/\/[^\s]*\.(jpg|jpeg|png|gif|webp|svg)/i.test(content);

    let primaryType: ContentType = 'text';
    if (hasCodeBlock) primaryType = 'code';
    else if (hasImage) primaryType = 'image';
    else if (hasMarkdown) primaryType = 'markdown';

    const isMixed = [hasCodeBlock, hasMarkdown, hasImage].filter(Boolean).length > 1;

    return {
      raw: content,
      primaryType: isMixed ? 'mixed' : primaryType,
      elements: [{ type: primaryType, content }],
      isMixed,
      renderHints: {
        variant: primaryType === 'code' ? 'artifact' : 'chat',
        complexity: content.length > 2000 ? 'complex' : content.length > 500 ? 'moderate' : 'simple',
      },
      stats: {
        totalLength: content.length,
        elementCount: 1,
        typeDistribution: { [primaryType]: 1 },
      },
    };
  }
}

/** Factory function — backward-compatible */
export function createContentParser(): ContentParser {
  return new ContentParser();
}
