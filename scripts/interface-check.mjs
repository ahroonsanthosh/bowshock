/**
 * The phase checks of docs/design/0012-interface.md section 8, for every
 * page: screenshots at 390, 768 and 1440 px wide (as the browser takes
 * them, unprocessed), no console errors, the keyboard alone operating the
 * page at 390 and 1440 px (each key, the tab order, a digit pressed in a
 * focused select, help opened and closed by its key and by Esc with focus
 * returned), and no serious or critical accessibility violations
 * (axe-core), in each field the flow page shows.
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
    id: 'app',
    path: 'index.html',
    // The Basic Finner's curve starts on opening: ready once its first
    // point's first grid is solved (a provisional value), a minute or two
    // on software WebGPU; its finest grid would take hours.
    ready: (page) =>
      until(
        page,
        async () =>
          (await page.evaluate(() => document.querySelector('.point__value') !== null)) &&
          (await readoutValue(page, 'cd')) !== '',
        900,
      ),
    // The 3D view opens; V switches to the side view (its fields on 1 to 5) and back.
    shots: [
      ['slice', ['2']],
      ['side', ['2', 'v']],
      ['mach', ['2']],
      ['glow', ['5']],
      ['3d', ['v']],
    ],
    keys: [
      { press: 'v', expect: { pressed: 'Side' } },
      { press: '2', expect: { pressed: 'Mach' } },
      { press: '5', expect: { pressed: 'Glow' } },
      { press: 'g', expect: { pressed: 'Grid' } },
      { press: 'g', expect: { notPressed: 'Grid' } },
      { press: 'v', expect: { pressed: '3D' } },
      { press: ' ', expect: { text: ['.readout [data-id="state"] .readout__value', 'Paused'] } },
      { press: ' ', expect: { text: ['.readout [data-id="state"] .readout__value', 'Solving'] } },
      { press: 'h', expect: 'dialog-open' },
    ],
    // V in the focused preset select shows the side view, and leaves the preset.
    select: { focus: '#preset', press: 'v', pressed: 'Side' },
  },
  {
    id: 'about',
    path: 'about.html',
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
    // A digit in the focused grid select switches the field, and leaves the grid.
    select: { focus: '#resolution', press: '2', pressed: 'Mach' },
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
      until(
        page,
        async () =>
          /erified|Refused|Not converged|GPU failed/.test(await readoutValue(page, 'state')),
        900,
      ),
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
    // 3 in the focused Mach select shows Cp, and leaves the Mach number.
    select: { focus: '#mach', press: '3', pressed: 'Cp' },
    // Another Mach number chosen and K pressed at once: the PNG is of the flow
    // still drawn (Mach 2), not of the case being set up.
    png: { select: '#mach', value: '3', expect: '-M2-' },
  },
  {
    id: 'drag',
    path: 'demos/nose-drag.html',
    // Run the default case (the Basic Finner's body at Mach 2) until its
    // first grid is drawn and checked: its finest grid, 160 cells across,
    // would take hours on software WebGPU.
    ready: async (page) => {
      await until(page, async () => !(await page.isDisabled('#run')), 120);
      await page.click('#run');
      return until(page, async () => (await readoutValue(page, 'cd')) !== '', 900);
    },
    shots: [
      ['mach', ['2']],
      ['split', ['d']],
    ],
    keys: [
      { press: '1', expect: { pressed: 'Schlieren' } },
      { press: 'd', expect: { notPressed: 'Split' } },
      { press: 'g', expect: { pressed: 'Grid' } },
      { press: 'g', expect: { notPressed: 'Grid' } },
      { press: ' ', expect: { text: ['#pause', 'Resume'] } },
      { press: ' ', expect: { text: ['#pause', 'Pause'] } },
      { press: 'h', expect: 'dialog-open' },
    ],
    // 2 in the focused Nose select shows Mach, and leaves the nose.
    select: { focus: '#shape', press: '2', pressed: 'Mach' },
    // Another Mach number typed and K pressed: the PNG is of the flow drawn (Mach 2).
    png: { fill: '#mach', value: '3', expect: '-M2-' },
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

/** Whether the mode bar's button named `label` is pressed ('true' or 'false'). */
const modePressed = (page, label) =>
  page.evaluate(
    (label) =>
      Array.from(document.querySelectorAll('.modebar button'))
        .find((b) => b.textContent.includes(label))
        ?.getAttribute('aria-pressed'),
    label,
  );

/**
 * Help by keyboard: opened by its key from a focused control, Tab kept
 * inside, closed by the same key and by Esc, focus back on that control.
 */
async function helpByKeyboard(page, key) {
  const problems = [];
  // The help dialog (a page may have others, such as the app's Details drawer).
  const isOpen = () =>
    page.evaluate(
      () =>
        (document.querySelector('dialog.help') ?? document.querySelector('dialog'))?.open === true,
    );
  const focusBack = () =>
    page.evaluate(() => document.activeElement?.hasAttribute('data-check-focus') === true);
  const marked = await page.evaluate(() => {
    const control = Array.from(
      document.querySelectorAll('.modebar button, .topbar a, .topbar button'),
    ).find((el) => el.getClientRects().length > 0);
    if (control === undefined) return false;
    control.setAttribute('data-check-focus', '');
    control.focus();
    return true;
  });
  if (!marked) return ['no control to start help from'];
  for (const [open, close] of [
    [key, key],
    ['?', 'Escape'],
  ]) {
    await page.keyboard.press(open);
    await page.waitForTimeout(300);
    if (!(await isOpen())) problems.push(`${open} did not open the help`);
    for (let k = 0; k < 8; k++) await page.keyboard.press('Tab');
    const inside = await page.evaluate(() =>
      (document.querySelector('dialog.help') ?? document.querySelector('dialog'))?.contains(
        document.activeElement,
      ),
    );
    if (!inside) problems.push('Tab left the help dialog');
    await page.keyboard.press(close);
    await page.waitForTimeout(300);
    if (await isOpen()) problems.push(`${close} did not close the help`);
    if (!(await focusBack())) problems.push(`focus did not return after ${close} closed the help`);
  }
  await page.evaluate(() =>
    document.querySelector('[data-check-focus]')?.removeAttribute('data-check-focus'),
  );
  return problems;
}

/** A digit pressed in a focused select: the page's key acts, the select keeps its value. */
async function selectKeys(page, spec) {
  const value = await page.evaluate((selector) => {
    const select = document.querySelector(selector);
    if (select === null || select.getClientRects().length === 0) return null;
    select.focus();
    return select.value;
  }, spec.focus);
  if (value === null) return { skipped: true, problems: [] };
  await page.keyboard.press(spec.press);
  await page.waitForTimeout(500);
  const problems = [];
  const after = await page.evaluate(
    (selector) => document.querySelector(selector).value,
    spec.focus,
  );
  if (after !== value) {
    problems.push(`${spec.press} in ${spec.focus} changed it from ${value} to ${after}`);
  }
  if ((await modePressed(page, spec.pressed)) !== 'true') {
    problems.push(`${spec.press} in ${spec.focus} did not show ${spec.pressed}`);
  }
  await page.evaluate(() => document.activeElement?.blur());
  return { skipped: false, problems };
}

/** Choose another case and press K at once: the PNG saved must name the case drawn. */
async function pngOfDrawnCase(page, spec) {
  await page.evaluate(() => document.activeElement?.blur());
  const download = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
  if (spec.select !== undefined) await page.selectOption(spec.select, spec.value);
  else await page.fill(spec.fill, spec.value);
  // K from outside the field typed in (keys do not act in a text field).
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('k');
  const file = await download;
  const name = file?.suggestedFilename() ?? 'none';
  const ok = name.includes(spec.expect);
  return {
    problems: ok ? 0 : 1,
    line: `${spec.select ?? spec.fill} set to ${spec.value}, then K: saved ${name}${ok ? '' : `, expected a name with ${spec.expect}`}`,
  };
}

/** Press each key and check its effect; then the help dialog by keyboard. */
async function keyboard(page, keys) {
  const problems = [];
  await page.evaluate(() => document.activeElement?.blur());
  for (const { press, expect } of keys) {
    if (expect === 'dialog-open') {
      problems.push(...(await helpByKeyboard(page, press)));
      continue;
    }
    await page.keyboard.press(press === ' ' ? 'Space' : press);
    await page.waitForTimeout(300);
    if (expect.pressed !== undefined || expect.notPressed !== undefined) {
      const label = expect.pressed ?? expect.notPressed;
      const pressed = await modePressed(page, label);
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
      // Accessibility in the view as it opens, and in each field and view shot.
      const violations = (await accessibility(page)).map((v) => `default: ${v}`);
      for (const [name, keys] of spec.shots ?? []) {
        for (const key of keys) await page.keyboard.press(key);
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(out, `${spec.id}-${name}-${size.width}.png`) });
        violations.push(...(await accessibility(page)).map((v) => `${name}: ${v}`));
      }
      const lines = [
        `${spec.id} at ${size.width} px: ${file}${ready ? '' : ' (not ready in time)'}`,
      ];
      if (size.width !== 768) {
        const tabs = await tabOrder(page);
        lines.push(`  tab order (${tabs.stops.length} stops): ${tabs.stops.join(', ')}`);
        const problems = [...tabs.problems, ...(await keyboard(page, spec.keys))];
        if (spec.select !== undefined) {
          const result = await selectKeys(page, spec.select);
          problems.push(...result.problems);
          lines.push(
            `  ${spec.select.press} in a focused ${spec.select.focus}: ${result.skipped ? 'not shown at this width' : result.problems.length === 0 ? `shows ${spec.select.pressed}, the select unchanged` : 'failed'}`,
          );
        }
        lines.push(
          `  keyboard: ${problems.length === 0 ? 'every key and stop works' : problems.join('; ')}`,
        );
        failures += problems.length;
      }
      if (spec.png !== undefined && size.width === 1440) {
        const result = await pngOfDrawnCase(page, spec.png);
        lines.push(`  ${result.line}`);
        failures += result.problems;
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
