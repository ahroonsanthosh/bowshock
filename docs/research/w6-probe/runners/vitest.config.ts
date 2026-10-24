// W6 probe runner config (one file at a time, long timeouts).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/w6/*.test.ts'],
    testTimeout: 172_800_000,
    hookTimeout: 172_800_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
