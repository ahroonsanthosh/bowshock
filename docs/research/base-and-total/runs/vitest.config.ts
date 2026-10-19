// Throwaway config for the total-drag measurements (tests/tmp-total, gitignored).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/tmp-total/none'],
    testTimeout: 86_400_000,
    hookTimeout: 86_400_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
