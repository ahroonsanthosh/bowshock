// Throwaway config for the fin measurements (tests/tmp-fins, gitignored).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/tmp-fins/none'],
    testTimeout: 86_400_000,
    hookTimeout: 86_400_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
