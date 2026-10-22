// Throwaway config: CPU profile of one probe (tests/tmp-transonic, gitignored).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/tmp-transonic/probe-bench.test.ts'],
    testTimeout: 172_800_000,
    pool: 'forks',
    execArgv: ['--cpu-prof', '--cpu-prof-dir=tests/tmp-transonic/prof'],
    fileParallelism: false,
    maxWorkers: 1,
  },
});
