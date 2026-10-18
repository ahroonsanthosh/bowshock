// Throwaway config for the subsonic-tip measurements (tests/tmp-subtip, gitignored).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/tmp-subtip/*.test.ts'],
    testTimeout: 172_800_000,
    hookTimeout: 172_800_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
