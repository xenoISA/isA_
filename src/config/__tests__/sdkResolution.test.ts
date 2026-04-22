import { describe, expect, test } from 'vitest';
import tsconfig from '../../../tsconfig.json';
import nextConfig from '../../../next.config.js';

describe('SDK package resolution config', () => {
  test('typescript paths resolve SDK packages to source entrypoints', () => {
    const paths = tsconfig.compilerOptions.paths;

    expect(paths['@isa/core']).toEqual(['../isA_App_SDK/packages/core/src/index.ts']);
    expect(paths['@isa/transport']).toEqual(['../isA_App_SDK/packages/transport/src/index.ts']);
    expect(paths['@isa/ui-web']).toEqual(['../isA_App_SDK/packages/ui-web/src/index.ts']);
    expect(paths['@isa/theme']).toEqual(['../isA_App_SDK/packages/theme/src/index.ts']);
    expect(paths['@isa/hooks']).toEqual(['../isA_App_SDK/packages/hooks/src/index.ts']);
  });

  test('next transpiles the same direct SDK packages the app imports', () => {
    expect(nextConfig.transpilePackages).toEqual(
      expect.arrayContaining([
        '@isa/core',
        '@isa/transport',
        '@isa/ui-web',
        '@isa/theme',
        '@isa/hooks',
      ]),
    );
  });
});
