// Throwaway config for the transonic measurements (tests/tmp-transonic, gitignored).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/tmp-transonic/*.test.ts'],
    testTimeout: 172_800_000,
    hookTimeout: 172_800_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
