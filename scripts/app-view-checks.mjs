/**
 * Two checks of the app page in a real browser (docs/design/0017-rocketeer-interface.md
 * sections 2 and 6), each failing the run if it does not hold:
 *
 * 1. At 390 by 844 without WebGPU, the phone's first screen says that this
 *    browser solves nothing (and what to use) and what a "No number" cross
 *    means.
 * 2. At 1440 by 900 with WebGPU, pressing 0 straight after the opening view
 *    is drawn changes nothing: 0 goes back to the first view, exactly
 *    (the solve paused first, so that the picture stands still).
 *
 *   npm run build
 *   node scripts/app-view-checks.mjs [--out <folder for the screenshots>]
 *
 * Without BASE_URL it serves dist/ with `vite preview`. Chromium:
 * CHROMIUM_PATH, or Playwright's own; WebGPU on SwiftShader without a GPU.
 */

/* global console, process, fetch, setTimeout, navigator, document -- Node, and the page */

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const outIndex = process.argv.indexOf('--out');
const out = outIndex >= 0 ? process.argv[outIndex + 1] : null;

async function serve() {
  if (process.env.BASE_URL) return { url: process.env.BASE_URL.replace(/\/$/, ''), stop: () => {} };
  const port = 4181;
  const child = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    stdio: 'ignore',
  });
  const url = `http://localhost:${port}`;
  for (let k = 0; k < 60; k++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { url, stop: () => child.kill() };
}

/**
 * The canvas's picture once it has stayed the same for three looks 4 s
 * apart (at most 180 s): on software WebGPU a frame can take seconds.
 */
async function still(page, selector) {
  let last = null;
  let same = 0;
  const end = Date.now() + 180_000;
  while (Date.now() < end) {
    await page.waitForTimeout(4000);
    const now = await page.locator(selector).screenshot();
    same = last !== null && now.equals(last) ? same + 1 : 0;
    if (same >= 2) return now;
    last = now;
  }
  throw new Error('the picture did not settle');
}

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'pass' : 'FAIL'}: ${what}`);
  if (!ok) failures++;
};

const server = await serve();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: [
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan',
    '--use-angle=swiftshader',
    '--use-webgpu-adapter=swiftshader',
  ],
});
try {
  if (out !== null) await mkdir(out, { recursive: true });

  // 1. A phone without WebGPU.
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
    });
    await page.goto(`${server.url}/index.html`);
    await page.waitForFunction(
      () => (document.querySelector('.sheet__note')?.textContent ?? '').includes('WebGPU'),
      undefined,
      { timeout: 60_000 },
    );
    const note = await page.evaluate(() => {
      const e = document.querySelector('.sheet__note');
      const r = e.getBoundingClientRect();
      return { text: e.textContent, top: r.top, bottom: r.bottom, shown: r.height > 0 };
    });
    check(note.shown && note.top >= 0 && note.bottom <= 844, 'the note is on the first screen');
    check(
      note.text.includes('This browser has no WebGPU, so no airflow is solved here') &&
        note.text.includes('a recent Chrome or Edge'),
      'it says this browser solves nothing, and what to use',
    );
    check(
      note.text.includes('No number: the drag there cannot be given to a known accuracy'),
      'it says what a cross means',
    );
    if (out !== null) await page.screenshot({ path: `${out}/phone-no-webgpu-390.png` });
    await page.close();
  }

  // 2. Reset straight after opening changes nothing.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${server.url}/index.html`);
    await page.waitForFunction(
      () =>
        !document.querySelector('#flow3d').hidden &&
        (document.querySelector('.readout [data-id="cd"] .readout__value')?.textContent ?? '') !==
          '',
      undefined,
      { timeout: 900_000 },
    );
    // Pause the solve, so that the picture stands still.
    await page.locator('body').press(' ');
    await page.waitForTimeout(10_000);
    const before = await still(page, '#flow3d');
    await page.locator('body').press('0');
    const after = await still(page, '#flow3d');
    check(before.equals(after), '0 straight after opening changes nothing (the same picture)');
    if (out !== null) {
      await page.screenshot({ path: `${out}/reset-1440.png` });
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
}
if (failures > 0) {
  console.log(`${failures} check(s) failed`);
  process.exitCode = 1;
}
