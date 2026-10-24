// The owner's GPU run kit for the third blind run (0022 section 8 item 9): see ./README.txt.
import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

/**
 * One browser test in a real Chromium with WebGPU on the machine's own GPU.
 * SOFTWARE=1 uses SwiftShader instead (the kit's own check, not a run).
 * HEADED=1 opens a window, for systems whose headless Chromium has no
 * hardware adapter. CHROMIUM_PATH picks a Chromium binary. MACHS=1.064,1.062
 * limits the Mach numbers; FINEST=1 stops at r = 1 (a check only). MATCH=1
 * runs only the hardware match test at Mach 0.8 (0014 10.7 (y), item 5 (h));
 * Y_REVIEWED=1 asserts that (y) is committed and reviewed (README.txt).
 */
const software = process.env.SOFTWARE === '1';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  root,
  test: {
    include: ['docs/research/nose-model-form/owner-kit/gpu-solve.test.ts'],
    // Below 2^31 ms (setTimeout's limit): 20 days.
    testTimeout: 20 * 86_400_000,
    hookTimeout: 600_000,
    fileParallelism: false,
    provide: {
      kitMachs: process.env.MACHS ?? '',
      kitFinest: Number(process.env.FINEST ?? 8),
      kitSoftware: software,
      kitMatch: process.env.MATCH === '1',
      kitReviewed: process.env.Y_REVIEWED === '1',
    },
    browser: {
      enabled: true,
      headless: process.env.HEADED !== '1',
      provider: playwright({
        launchOptions: {
          channel: 'chromium',
          ...(executablePath !== undefined ? { executablePath } : {}),
          args: software
            ? [
                '--enable-unsafe-webgpu',
                '--enable-features=Vulkan',
                '--use-angle=swiftshader',
                '--use-webgpu-adapter=swiftshader',
              ]
            : [
                '--enable-unsafe-webgpu',
                '--enable-features=Vulkan,VulkanFromANGLE',
                '--ignore-gpu-blocklist',
                '--enable-gpu',
              ],
        },
      }),
      instances: [{ browser: 'chromium' }],
    },
  },
});

declare module 'vitest' {
  export interface ProvidedContext {
    kitMachs: string;
    kitFinest: number;
    kitSoftware: boolean;
    kitMatch: boolean;
    kitReviewed: boolean;
  }
}
