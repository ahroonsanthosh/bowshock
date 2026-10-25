// Throwaway config for the Haack grid measurements (tests/tmp-haack, gitignored).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/tmp-haack/*.test.ts'],
    testTimeout: 172_800_000,
    hookTimeout: 172_800_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
