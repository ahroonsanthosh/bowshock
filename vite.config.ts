import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the built site works from any static host path
  // (for example GitHub Pages at /bowshock/).
  base: './',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // GPU tests need a browser and run separately (npm run test:gpu).
    exclude: ['tests/gpu/**'],
  },
});
