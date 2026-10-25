// Throwaway config for the Haack MOC measurements (tests/tmp-haackmoc, gitignored).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/tmp-haackmoc/*.test.ts'],
    testTimeout: 172_800_000,
    hookTimeout: 172_800_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
