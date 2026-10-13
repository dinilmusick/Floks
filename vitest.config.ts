import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@floks/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
      '@floks/canvas-ui': path.resolve(__dirname, 'packages/canvas-ui/src/index.ts'),
      '@kloks/state-graph': '@ultrst-armada/kloks/state-graph',
      '@kloks/audio-midi': '@ultrst-armada/kloks/audio-midi',
    },
  },
});

