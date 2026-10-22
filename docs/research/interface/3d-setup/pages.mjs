/**
 * Does the app's 3D view set up in every page of one browser on
 * SwiftShader? (0017 section 6.5.) Opens N app pages at once, each left
 * open and solving with its own GPU device, and reports for each whether
 * the 3D view set up, what the page said and its console errors.
 *
 *   npm run build
 *   CHROMIUM_PATH=... node docs/research/interface/3d-setup/pages.mjs 8
 *
 * IMPORT=<ms>: import an .ork that many milliseconds after each page opens.
 * BLOCK=1: refuse the 3D view's own code (its chunk), as a dropped
 * connection or a site rebuilt since the page loaded would.
 * SHOT=<file>: a screenshot of the last page.
 */

/* global console, process, fetch, setTimeout, document -- Node, and the page */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';

const N = Number(process.argv[2] ?? 3);
const port = Number(process.env.PORT ?? 4183);
const child = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
  stdio: 'ignore',
});
const url = `http://localhost:${port}/index.html`;
for (let k = 0; k < 60; k++) {
  try {
    if ((await fetch(url)).ok) break;
  } catch {
    // not up yet
  }
  await new Promise((r) => setTimeout(r, 500));
}
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
  for (let k = 0; k < N; k++) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    if (process.env.BLOCK !== undefined) {
      await page.route(/\/assets\/render3d-[^/]*\.js$/, (r) => r.abort());
    }
    await page.goto(url, { timeout: 180_000 });
    if (process.env.IMPORT !== undefined) {
      await page.waitForTimeout(Number(process.env.IMPORT));
      await page.setInputFiles(
        '#import-file',
        path.resolve('tests/import/fixtures/sport-four-fins-launch-lug.ork'),
      );
    }
    // Until the 3D | Side switch shows (set up) or a toast says it could not be, or 240 s.
    const end = Date.now() + 240_000;
    let state = null;
    while (Date.now() < end) {
      state = await page.evaluate(() => ({
        set: document.querySelector('.flow-switch')?.hidden === false,
        toasts: [...document.querySelectorAll('.toast')].map((e) => e.textContent),
        note: document.querySelector('#flow-note')?.textContent,
      }));
      if (state.set || state.toasts.some((t) => /3D view/.test(t ?? ''))) break;
      await page.waitForTimeout(1000);
    }
    console.log(`page ${k + 1} of ${N}: the 3D view ${state.set ? 'set up' : 'did NOT set up'}`);
    if (!state.set) console.log(`  note: ${state.note}`);
    for (const e of errors) console.log(`  console error: ${e}`);
    if (process.env.SHOT && k === N - 1) await page.screenshot({ path: process.env.SHOT });
  }
} finally {
  await browser.close();
  child.kill();
}
