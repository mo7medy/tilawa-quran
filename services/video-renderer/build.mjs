import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { ensureBrowser } from '@remotion/renderer';

const here = path.dirname(fileURLToPath(import.meta.url));
await bundle({
  entryPoint: path.join(here, 'entry.tsx'),
  outDir: path.join(here, 'bundle'),
  publicDir: null,
  webpackOverride: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        '@/types': path.resolve(here, '../../types'),
        react: path.join(here, 'node_modules/react'),
        'react-dom': path.join(here, 'node_modules/react-dom'),
        remotion: path.join(here, 'node_modules/remotion'),
      },
    },
  }),
});
await ensureBrowser({ chromeMode: 'headless-shell' });
