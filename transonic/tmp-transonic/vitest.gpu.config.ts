import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

/**
 * GPU tests run inside a real Chromium so that WGSL kernels execute on
 * WebGPU. Without a hardware GPU (for example in CI) Chromium uses
 * SwiftShader, a software Vulkan implementation: slow, but it runs the same
 * WGSL, which is what these tests check.
 *
 * Set CHROMIUM_PATH to use a specific Chromium binary instead of the one
 * Playwright manages.
 */
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  test: {
    include: [process.env.ONLY ?? 'tests/tmp-transonic/gpu-rate.test.ts'],
    
    testTimeout: 3_600_000,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: {
          channel: 'chromium',
          ...(executablePath !== undefined ? { executablePath } : {}),
          args: [
            '--enable-unsafe-webgpu',
            '--enable-features=Vulkan',
            '--use-angle=swiftshader',
            '--use-webgpu-adapter=swiftshader',
          ],
        },
      }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
