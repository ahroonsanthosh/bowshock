// The boat-tail lanes (docs/design/0023-boat-tails.md); see ./README.md.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [fileURLToPath(new URL(process.env.ONLY ?? './lane.test.ts', import.meta.url))],
    testTimeout: 0,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
