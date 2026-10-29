// Config for the outline runners (one file at a time, 20 days per run), as
// W5's tests/tmp-haackmoc/vitest.config.ts.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/vk/*.test.ts'],
    testTimeout: 1_728_000_000,
    hookTimeout: 1_728_000_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
