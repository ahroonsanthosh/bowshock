import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/tmp-ratio/*.test.ts'],
    testTimeout: 3_600_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
