import { describe, expect, test } from 'vitest';
import path from 'path';
import tsconfig from '../../../tsconfig.json';
import nextConfig from '../../../next.config.js';

describe('SDK package resolution config', () => {
  test('typescript paths resolve SDK packages to the web-safe entrypoints the app expects', () => {
    const paths = tsconfig.compilerOptions.paths;

    expect(paths['@isa/core']).toEqual(['../isA_App_SDK/packages/core/src/index.ts']);
    expect(paths['@isa/transport']).toEqual(['../isA_App_SDK/packages/transport/src/index.ts']);
    expect(paths['@isa/ui-web']).toEqual(['../isA_App_SDK/packages/ui-web/src/index.ts']);
    expect(paths['@isa/theme']).toEqual(['../isA_App_SDK/packages/theme/src/index.ts']);
    expect(paths['@isa/hooks']).toEqual(['./src/hooks/isaSdkHooks.web.ts']);
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

  test('next aliases @isa/hooks to the local web shim instead of the native-capable SDK root entry', () => {
    const config = nextConfig.webpack(
      {
        resolve: {
          alias: {},
          fallback: {},
        },
      },
      {},
    );

    expect(config.resolve.alias['@isa/hooks']).toBe(
      path.join(process.cwd(), 'src/hooks/isaSdkHooks.web.ts'),
    );
  });

  test('next forces SDK source imports to use the app React runtime', () => {
    const config = nextConfig.webpack(
      {
        resolve: {
          alias: {},
          fallback: {},
        },
      },
      {},
    );

    expect(config.resolve.alias.react).toBe(path.join(process.cwd(), 'node_modules/react'));
    expect(config.resolve.alias['react-dom']).toBe(
      path.join(process.cwd(), 'node_modules/react-dom'),
    );
    expect(config.resolve.alias['react/jsx-runtime']).toBe(
      path.join(process.cwd(), 'node_modules/react/jsx-runtime'),
    );
    expect(config.resolve.alias['react/jsx-dev-runtime']).toBe(
      path.join(process.cwd(), 'node_modules/react/jsx-dev-runtime'),
    );
  });
});
