// The refusal audit's runs (docs/design/0014-refusals.md); see ./README.md.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [fileURLToPath(new URL(process.env.ONLY ?? './impact.test.ts', import.meta.url))],
    testTimeout: 86_400_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
