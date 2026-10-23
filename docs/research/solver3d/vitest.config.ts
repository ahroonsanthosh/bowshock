// The 3D fins' research runs (docs/design/0021-3d-euler-fins.md); see each file's header.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [fileURLToPath(new URL(process.env.ONLY ?? './rung-a.test.ts', import.meta.url))],
    testTimeout: 86_400_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
