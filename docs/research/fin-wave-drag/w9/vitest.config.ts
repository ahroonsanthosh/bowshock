// The runs of W9(a) (docs/design/0009-fin-wave-drag.md section 9): one file, one worker, no time limit.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [fileURLToPath(new URL(process.env.ONLY ?? './code-checks.test.ts', import.meta.url))],
    testTimeout: 864_000_000,
    hookTimeout: 864_000_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
