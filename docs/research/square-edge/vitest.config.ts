// The flat-face check of design record 0016 section 21.3; see ./flat-face.test.ts.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [fileURLToPath(new URL(process.env.ONLY ?? './flat-face.test.ts', import.meta.url))],
    testTimeout: 86_400_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
