/**
 * The time of one point of the drag curve (docs/design/0017-rocketeer-interface.md
 * section 8.3), as the page solves it: the live flow page's verified nose
 * solve (src/analysis/gpu-fitted-flow.ts, drawn as it converges) for the
 * Basic Finner's body at one Mach number, to the finest grid asked. Writes
 * JSON lines: each grid's cells, steps and drag with the time since the
 * page opened, and every two minutes the readout's grid, step and cell
 * rate.
 *
 *   npx vite --port 5317 &
 *   node scripts/time-point.mjs --mach 2 --finest 8 --out timing.jsonl
 *
 * BASE_URL (default http://localhost:5317) is the site; CHROMIUM_PATH a
 * Chromium binary, or Playwright's own. Without a hardware GPU it runs on
 * SwiftShader, as scripts/interface-check.mjs does.
 */

/* global console, process, document -- Node, and the page inside page.evaluate */

import { appendFileSync } from 'node:fs';
import { chromium } from 'playwright';

const argument = (name, fallback) => {
  const k = process.argv.indexOf(`--${name}`);
  return k > 0 ? process.argv[k + 1] : fallback;
};
const mach = argument('mach', '2');
const finest = argument('finest', '8');
const out = argument('out', 'timing.jsonl');
const base = (process.env.BASE_URL ?? 'http://localhost:5317').replace(/\/$/, '');

const log = (record) => {
  appendFileSync(out, `${JSON.stringify({ t: new Date().toISOString(), ...record })}\n`);
};

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: [
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan',
    '--use-angle=swiftshader',
    '--use-webgpu-adapter=swiftshader',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const opened = Date.now();
await page.goto(`${base}/demos/flow-view.html?mach=${mach}&finest=${finest}&field=mach`);
const read = () =>
  page.evaluate(() => {
    const value = (id) =>
      document.querySelector(`.readout [data-id="${id}"] .readout__value`)?.textContent ?? '';
    const rows = Array.from(document.querySelectorAll('#levels tbody tr'), (tr) =>
      Array.from(tr.cells, (c) => c.textContent),
    );
    return {
      state: value('state'),
      rate: value('rate'),
      grid: value('grid'),
      step: value('step'),
      rows,
    };
  });
log({ start: true, mach, finest });
let seen = 0;
let sampled = 0;
for (;;) {
  const r = await read();
  const seconds = (Date.now() - opened) / 1000;
  while (r.rows.length > seen) {
    log({ level: seen + 1, row: r.rows[seen], seconds });
    seen++;
  }
  if (seconds - sampled > 120) {
    sampled = seconds;
    log({ sample: true, seconds, grid: r.grid, step: r.step, rate: r.rate, state: r.state });
  }
  if (/erified|Refused|Not converged|GPU failed/.test(r.state)) {
    log({ end: true, seconds, state: r.state });
    break;
  }
  await page.waitForTimeout(5000);
}
await browser.close();
console.log(`written to ${out}`);
