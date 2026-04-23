import type React from 'react';
import {
  StreamingStatusLine as SDKStreamingStatusLine,
  ThinkingBlock as SDKThinkingBlock,
} from '@isa/ui-web';
import type {
  StreamingStatusLineProps,
  ThinkingBlockProps,
} from '@isa/ui-web';

// Centralize React type casts while the app and SDK resolve separate @types/react copies.
export const StreamingStatusLine = SDKStreamingStatusLine as React.FC<StreamingStatusLineProps>;
export const ThinkingBlock = SDKThinkingBlock as React.FC<ThinkingBlockProps>;
export type { StreamingStatusLineProps, ThinkingBlockProps };
