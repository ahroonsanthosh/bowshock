import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the built site works from any static host path
  // (for example GitHub Pages at /bowshock/).
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: 'index.html',
        shockTube: 'demos/shock-tube.html',
        supersonicRamp: 'demos/supersonic-ramp.html',
        noseDrag: 'demos/nose-drag.html',
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // GPU tests need a browser and run separately (npm run test:gpu).
    // Scratch experiments live in tests/tmp* and are never part of the suite.
    exclude: [...configDefaults.exclude, 'tests/gpu/**', 'tests/tmp*', 'tests/tmp*/**'],
  },
});
