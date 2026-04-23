/**
 * ContentParser — Content type detection and structured parsing.
 *
 * Thin app compatibility wrapper around @isa/core ContentTypeDetector.
 */

import { ContentTypeDetector } from '@isa/core';
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
  readonly version = '3.0.0-sdk';

  private readonly detector = new ContentTypeDetector();

  canParse(data: string): boolean {
    return typeof data === 'string' && data.length > 0;
  }

  parse(content: string): ParsedContent | null {
    if (!content || typeof content !== 'string') return null;

    const detected = this.detector.detect(content);
    const typeDistribution = detected.elements.reduce<Record<string, number>>((acc, element) => {
      acc[element.type] = (acc[element.type] || 0) + 1;
      return acc;
    }, {});

    return {
      ...detected,
      stats: {
        totalLength: content.length,
        elementCount: detected.elements.length,
        typeDistribution,
      },
    };
  }
}

/** Factory function — backward-compatible */
export function createContentParser(): ContentParser {
  return new ContentParser();
}
