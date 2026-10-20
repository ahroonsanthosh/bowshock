/**
 * The phase checks of docs/design/0012-interface.md section 8, for every
 * page: screenshots at 390, 768 and 1440 px wide, no console errors, the
 * keyboard alone operating the page, and no serious or critical
 * accessibility violations (axe-core).
 *
 *   npm run build
 *   node scripts/interface-check.mjs [--out docs/research/interface] [--pages ramp,shock-tube]
 *
 * Without BASE_URL it serves dist/ with `vite preview`; with it (for
 * example a dev server's http://localhost:5173) it checks that site.
 * Chromium: CHROMIUM_PATH, or Playwright's own. Without a hardware GPU it
 * runs WebGPU on SwiftShader, where a canvas cannot present WebGPU frames
 * and the pages fall back to copying them (a warning, not an error).
 */

/* global console, process, fetch, setTimeout -- Node */
/* global window, document, getComputedStyle -- in the page, inside page.evaluate */

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

/** Text of the readout item `id`. */
const readoutValue = (page, id) =>
  page.evaluate(
    (id) => document.querySelector(`.readout [data-id="${id}"] .readout__value`)?.textContent ?? '',
    id,
  );

/** Waits until `test` holds or `seconds` pass; true if it held. */
async function until(page, test, seconds) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    if (await test()) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

/** The pages, how to tell each is ready to be seen, and the keys to try on it. */
const PAGES = [
  {
    id: 'landing',
    path: 'index.html',
    ready: (page) => until(page, async () => (await page.$('#gpu-line .badge')) !== null, 30),
    keys: [{ press: 'h', expect: 'dialog-open' }],
  },
  {
    id: 'ramp',
    path: 'demos/supersonic-ramp.html',
    // Converged: a few minutes on software WebGPU.
    ready: (page) =>
      until(page, async () => (await readoutValue(page, 'state')) === 'Converged', 900),
    keys: [
      { press: '2', expect: { pressed: 'Mach' } },
      { press: '4', expect: { pressed: 'Density' } },
      { press: '1', expect: { pressed: 'Schlieren' } },
      { press: 'g', expect: { pressed: 'Grid' } },
      { press: 'g', expect: { notPressed: 'Grid' } },
      { press: ' ', expect: { text: ['#pause', 'Resume'] } },
      { press: ' ', expect: { text: ['#pause', 'Pause'] } },
      { press: 'h', expect: 'dialog-open' },
    ],
  },
  {
    id: 'shock-tube',
    path: 'demos/shock-tube.html',
    ready: async (page) => {
      // Once the problem is set up, run it to its end.
      await until(page, async () => (await readoutValue(page, 'engine')) !== '', 60);
      await page.keyboard.press(' ');
      return until(
        page,
        async () =>
          (await page.textContent('#run'))?.trim() === 'Run' &&
          (await page.textContent('#l1')) !== '…',
        600,
      );
    },
    keys: [
      { press: 'r', expect: { text: ['#run', 'Pause'] } },
      { press: ' ', expect: { text: ['#run', 'Run'] } },
      { press: 'h', expect: 'dialog-open' },
    ],
  },
  {
    id: 'flow',
    // The coarsest grid only: software WebGPU solves the finer ones slowly.
    path: 'demos/flow-view.html?finest=1',
    ready: (page) =>
      until(page, async () => /Done|Refused/.test(await readoutValue(page, 'state')), 900),
    // Each field and view, after the default (schlieren).
    shots: [
      ['mach', ['2']],
      ['cp', ['3']],
      ['density', ['4']],
      ['split', ['2', 'd']],
      ['grid', ['d', '1', 'g']],
    ],
    keys: [
      { press: '2', expect: { pressed: 'Mach' } },
      { press: 'd', expect: { pressed: 'Split' } },
      { press: 'd', expect: { notPressed: 'Split' } },
      { press: 'g', expect: { notPressed: 'Grid' } },
      { press: 's', expect: { notPressed: 'Shock' } },
      { press: 's', expect: { pressed: 'Shock' } },
      { press: 'h', expect: 'dialog-open' },
    ],
  },
];

function argument(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function serve() {
  if (process.env.BASE_URL) return { url: process.env.BASE_URL.replace(/\/$/, ''), stop: () => {} };
  const port = 4179;
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

/** Serious and critical accessibility violations on the page as it is. */
async function accessibility(page) {
  await page.addScriptTag({ path: AXE });
  const results = await page.evaluate(() =>
    window.axe.run(document, { resultTypes: ['violations'] }),
  );
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}: ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(', ')})`,
    );
}

/** Tab through the page: every stop must show a focus indicator. */
async function tabOrder(page) {
  await page.evaluate(() => document.activeElement?.blur());
  const stops = [];
  const problems = [];
  for (let k = 0; k < 80; k++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (el === null || el === document.body) return null;
      const style = getComputedStyle(el);
      const name =
        el.getAttribute('aria-label') ||
        el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) ||
        el.getAttribute('id') ||
        el.tagName;
      const visible = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      return {
        key: `${el.tagName}#${el.id}:${name}`,
        label: `${el.tagName.toLowerCase()} "${name}"`,
        visible,
      };
    });
    if (stop === null) continue;
    if (stops.length > 0 && stop.key === stops[0].key) break;
    stops.push(stop);
    if (!stop.visible) problems.push(`no focus indicator on ${stop.label}`);
  }
  return { stops: stops.map((s) => s.label), problems };
}

/** Press each key and check its effect; then the help dialog: focus inside, Tab kept in, Esc back. */
async function keyboard(page, keys) {
  const problems = [];
  await page.evaluate(() => document.activeElement?.blur());
  for (const { press, expect } of keys) {
    await page.keyboard.press(press === ' ' ? 'Space' : press);
    await page.waitForTimeout(300);
    if (expect === 'dialog-open') {
      const open = await page.evaluate(() => document.querySelector('dialog')?.open === true);
      if (!open) problems.push(`${press} did not open the help`);
      for (let k = 0; k < 8; k++) await page.keyboard.press('Tab');
      const inside = await page.evaluate(() =>
        document.querySelector('dialog')?.contains(document.activeElement),
      );
      if (!inside) problems.push('Tab left the help dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const closed = await page.evaluate(() => document.querySelector('dialog')?.open === false);
      if (!closed) problems.push('Esc did not close the help');
    } else if (expect.pressed !== undefined || expect.notPressed !== undefined) {
      const label = expect.pressed ?? expect.notPressed;
      const pressed = await page.evaluate(
        (label) =>
          Array.from(document.querySelectorAll('.modebar button'))
            .find((b) => b.textContent.includes(label))
            ?.getAttribute('aria-pressed'),
        label,
      );
      const want = expect.pressed !== undefined ? 'true' : 'false';
      if (pressed !== want)
        problems.push(`${press}: ${label} aria-pressed ${pressed}, expected ${want}`);
    } else if (expect.text !== undefined) {
      const [selector, text] = expect.text;
      const ok = await until(
        page,
        async () => (await page.textContent(selector))?.trim() === text,
        30,
      );
      if (!ok) problems.push(`${press}: ${selector} did not read "${text}"`);
    }
  }
  return problems;
}

const out = argument('out', 'docs/research/interface');
const only = argument('pages', null)?.split(',');
await mkdir(out, { recursive: true });
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
let failures = 0;
try {
  for (const spec of PAGES.filter((p) => only === undefined || only.includes(p.id))) {
    for (const size of WIDTHS) {
      const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
      const errors = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${server.url}/${spec.path}`);
      const ready = await spec.ready(page);
      const file = path.join(out, `${spec.id}-${size.width}.png`);
      await page.screenshot({ path: file });
      for (const [name, keys] of spec.shots ?? []) {
        for (const key of keys) await page.keyboard.press(key);
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(out, `${spec.id}-${name}-${size.width}.png`) });
      }
      const violations = await accessibility(page);
      const lines = [
        `${spec.id} at ${size.width} px: ${file}${ready ? '' : ' (not ready in time)'}`,
      ];
      if (size.width === 1440) {
        const tabs = await tabOrder(page);
        lines.push(`  tab order (${tabs.stops.length} stops): ${tabs.stops.join(', ')}`);
        const problems = [...tabs.problems, ...(await keyboard(page, spec.keys))];
        lines.push(
          `  keyboard: ${problems.length === 0 ? 'every key and stop works' : problems.join('; ')}`,
        );
        failures += problems.length;
      }
      lines.push(`  console errors: ${errors.length === 0 ? 'none' : errors.join(' | ')}`);
      lines.push(
        `  accessibility (serious, critical): ${violations.length === 0 ? 'none' : violations.join('; ')}`,
      );
      failures += errors.length + violations.length;
      console.log(lines.join('\n'));
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.stop();
}
console.log(failures === 0 ? 'All interface checks passed.' : `${failures} problems found.`);
process.exitCode = failures === 0 ? 0 : 1;
