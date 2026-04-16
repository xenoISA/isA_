import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'isA',
    executableName: 'isa',
    icon: './icons/icon', // .icns/.ico resolved per platform
    appBundleId: 'com.isa.desktop',
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'isa',
      setupIcon: './icons/icon.ico',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDMG({
      format: 'ULFO',
      name: 'isA',
    }),
    new MakerDeb({
      options: {
        name: 'isa',
        productName: 'isA',
        maintainer: 'isA Team',
        homepage: 'https://github.com/xenoISA/isA_',
      },
    }),
    new MakerRpm({
      options: {
        name: 'isa',
        productName: 'isA',
        homepage: 'https://github.com/xenoISA/isA_',
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      // Main process Vite config
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [],
    }),
  ],
};

export default config;
