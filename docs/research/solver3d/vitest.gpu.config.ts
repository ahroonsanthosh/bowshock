// The 3D fins' GPU research runs (docs/design/0021-3d-euler-fins.md), in headless Chromium on SwiftShader
// at small sizes (as vitest.gpu.config.ts). ONLY names the file:
//   ONLY=./gpu-checks.test.ts CHROMIUM_PATH=... npx vitest run --config docs/research/solver3d/vitest.gpu.config.ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  test: {
    include: [fileURLToPath(new URL(process.env.ONLY ?? './gpu-checks.test.ts', import.meta.url))],
    testTimeout: 86_400_000,
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: {
          channel: 'chromium',
          ...(executablePath !== undefined ? { executablePath } : {}),
          args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'],
        },
      }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
