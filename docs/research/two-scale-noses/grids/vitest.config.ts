import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/tmp-gridcmp/*.test.ts'], testTimeout: 3_600_000 } });
