/**
 * Usability, measured (the standing rule for every phase of
 * docs/design/0012-interface.md): for each page of a site, at 390 and
 * 1440 px wide, the visible words, the visible controls, the longest
 * visible paragraph, the page's height, the time to the first result on
 * the default case, and the actions the core tasks take (see the result;
 * change the Mach number and see the new result; find the band and the
 * status; open help), each task performed here to check its count: a
 * task counts only once what it is for is in view (the band and the
 * status both; the new result, changed from the one before).
 *
 *   node scripts/usability.mjs --url http://localhost:4173 --out after.json
 *   node scripts/usability.mjs --compare before.json after.json --md docs/research/interface/usability.md
 *
 * Measure the site before a change from a build of the commit before it.
 * Chromium: CHROMIUM_PATH, or Playwright's own (software WebGPU without a GPU).
 */

/* global console, process, setTimeout -- Node */
/* global window, document, NodeFilter, Event -- in the page */

import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

function argument(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

/** Words, controls and the longest paragraph a reader sees on the page (scrolling included). */
function census() {
  const shown = (el) =>
    el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
    el.getClientRects().length > 0;
  const words = (text) => text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  let total = 0;
  // Words one tap away: in a tab not shown (the phone's sheet) or a closed disclosure.
  let tucked = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parent = node.parentElement;
    // Text for screen readers only (visually hidden) is not seen.
    if (
      parent === null ||
      parent.closest('select, script, style, svg, dialog:not([open]), .visually-hidden')
    ) {
      continue;
    }
    if (!shown(parent)) {
      if (parent.closest('[data-tab-hidden], details:not([open])') !== null) {
        tucked += words(node.textContent ?? '');
      }
      continue;
    }
    total += words(node.textContent ?? '');
  }
  // A select shows its chosen option only.
  for (const select of document.querySelectorAll('select')) {
    if (shown(select)) total += words(select.selectedOptions[0]?.textContent ?? '');
  }
  let longest = 0;
  for (const block of document.querySelectorAll('p, li, figcaption, dd, td, .card__text')) {
    if (shown(block)) longest = Math.max(longest, words(block.innerText ?? ''));
  }
  const controls = Array.from(
    document.querySelectorAll(
      'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => shown(el) && !el.closest('dialog:not([open])')).length;
  return {
    words: total,
    tucked,
    controls,
    longestParagraph: longest,
    height: document.documentElement.scrollHeight,
  };
}

/**
 * Whether an element shows the text wanted: on the page, or (`inWindow`)
 * within the window, with nothing to scroll.
 */
async function shows(page, selector, pattern, inWindow) {
  return page.evaluate(
    ({ selector, pattern, inWindow }) =>
      Array.from(document.querySelectorAll(selector)).some((el) => {
        if (!el.checkVisibility({ checkVisibilityCSS: true })) return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0) return false;
        if (inWindow && (r.bottom <= 0 || r.top >= window.innerHeight)) return false;
        return new RegExp(pattern).test(el.textContent ?? '');
      }),
    { selector, pattern, inWindow },
  );
}

const inView = (page, selector, pattern) => shows(page, selector, pattern, true);
const onPage = (page, selector, pattern) => shows(page, selector, pattern, false);

async function until(test, seconds) {
  const start = Date.now();
  while ((Date.now() - start) / 1000 < seconds) {
    if (await test()) return (Date.now() - start) / 1000;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

/**
 * The pages and their tasks. Each task lists the user's actions (taps,
 * clicks or key presses) and what must then be in view; `actions` is
 * their number. A task the page does not offer is null.
 */
const PAGES = {
  landing: {
    path: 'index.html',
    // The first result: the GPU's status.
    result: { selector: '#gpu-status, #gpu-line', pattern: 'WebGPU available|No WebGPU|Adapter' },
    tasks: () => ({ help: [{ key: 'h' }] }),
  },
  ramp: {
    path: 'demos/supersonic-ramp.html',
    result: { selector: '#computed, #comparison, .pinned', pattern: '\\d\\.\\d{4}' },
    converged: { selector: '.readout, #status', pattern: 'Converged' },
    tasks: () => ({
      mach: [{ fill: ['#mach', '3'] }],
      help: [{ key: 'h' }],
    }),
    // The new result: the ramp pressure, the exact one and the phone's
    // pinned line, each changed (before the shell, one line holding both).
    machResult: {
      selector: '#computed, #exact, .pinned',
      fallback: '#comparison',
      pattern: '\\d\\.\\d{4}',
    },
    // The ramp's band is its difference from the exact pressure; its status, converged.
    band: { selector: '#difference, #comparison, .pinned', pattern: '\\d%' },
    status: { selector: '.readout, #status, .pinned', pattern: 'Converged' },
  },
  'shock-tube': {
    path: 'demos/shock-tube.html',
    run: [{ click: '#run' }],
    result: { selector: '#l1, #status, .pinned', pattern: 'e-\\d|error' },
    // The shock tube's band is its L1 error against the exact solution, at the end time.
    band: { selector: '#l1, #status, .pinned', pattern: 'e-\\d' },
    status: { selector: '.readout, #status, .pinned', pattern: 'of 0\\.|t = ' },
    tasks: () => ({ help: [{ key: 'h' }] }),
  },
  flow: {
    // The fixed case: the finest grid 20 cells across, which software
    // WebGPU here finishes in minutes. A band needs four grids (160
    // across), so here the outcome is its value marked not verified.
    path: 'demos/flow-view.html?finest=1',
    result: { selector: '.readout [data-id="cd"]', pattern: '\\d\\.\\d' },
    // The new result: the drag on the first grid at the new Mach number.
    machResult: { selector: '.readout [data-id="cd"]', pattern: '\\d\\.\\d{5}' },
    // The value with its band (or, unmeasured, the value), and its status.
    band: { selector: '#drag, .pinned', pattern: '\\d\\.\\d{5}( ± \\d)?' },
    status: {
      selector: '#status, .pinned',
      pattern: 'Verified|Not verified|Refused|Not converged|GPU failed',
    },
    tasks: () => ({ mach: [{ select: ['#mach', '3'] }], help: [{ key: 'h' }] }),
  },
  drag: {
    // The default case, the Basic Finner's body at Mach 2, run: its first
    // grid's wave drag is the first result (its band needs the finest grid,
    // 160 cells across, which software WebGPU here does not reach in hours).
    path: 'demos/nose-drag.html',
    runWhen: '#run:not([disabled])',
    run: [{ click: '#run' }],
    result: { selector: '#status, .readout [data-id="cd"]', pattern: '\\d\\.\\d{5}' },
    // The new result: Stop, the new Mach number, Run, and its first grid's drag.
    machResult: { selector: '#status, .readout [data-id="cd"]', pattern: '\\d\\.\\d{5}' },
    // Before the band: the status the total states, its class.
    status: { selector: '#total-output', pattern: 'inside the class|outside the class' },
    tasks: () => ({
      mach: [{ click: '#stop' }, { fill: ['#mach', '2.5'] }, { click: '#run' }],
      help: [{ key: 'h' }],
    }),
  },
};

/**
 * Brings what matches `selector` into view, if it is not: a scroll to it,
 * or a tap on the phone sheet's tab that holds it. Whether it is in view
 * after that one action.
 */
async function reveal(page, selector, pattern) {
  await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (el === null) return;
    const panel = el.closest('[data-tab-hidden]');
    if (panel !== null) document.getElementById(`${panel.id}-tab`)?.click();
    else el.scrollIntoView();
  }, selector);
  await page.waitForTimeout(300);
  return inView(page, selector, pattern);
}

async function act(page, steps) {
  for (const step of steps) {
    if (step.key !== undefined) await page.keyboard.press(step.key);
    if (step.click !== undefined) await page.click(step.click);
    if (step.fill !== undefined) {
      const [selector, value] = step.fill;
      await page.evaluate(
        ({ selector, value }) => {
          const input = document.querySelector(selector);
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        },
        { selector, value },
      );
    }
    if (step.select !== undefined) await page.selectOption(step.select[0], step.select[1]);
    await page.waitForTimeout(300);
  }
}

async function measure(browser, base, id, spec, size) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const t0 = Date.now();
  const response = await page.goto(`${base}/${spec.path}`).catch(() => null);
  if (response === null || !response.ok()) {
    await page.close();
    return null;
  }
  const actions = {};
  if (spec.run !== undefined) {
    await until(() => page.evaluate(() => document.readyState === 'complete'), 30);
    await page.waitForTimeout(1500);
    if (spec.runWhen !== undefined) await page.waitForSelector(spec.runWhen, { timeout: 120_000 });
    await act(page, spec.run);
  }
  const first = await until(() => onPage(page, spec.result.selector, spec.result.pattern), 900);
  const firstResult = first === null ? null : (Date.now() - t0) / 1000;
  // Seeing it: the actions that start it, and a scroll if it is out of view.
  actions.result =
    (spec.run?.length ?? 0) +
    (first !== null && !(await inView(page, spec.result.selector, spec.result.pattern)) ? 1 : 0);
  let converged = null;
  if (spec.converged !== undefined) {
    const t = await until(() => onPage(page, spec.converged.selector, spec.converged.pattern), 900);
    converged = t === null ? null : (Date.now() - t0) / 1000;
  }
  const counts = await page.evaluate(census);
  // The band and the status: once the run has its outcome, both in view
  // now, or how many actions away (a page whose band needs a solve too long
  // for this machine: its status alone).
  if (spec.status !== undefined) {
    const target = spec.band ?? spec.status;
    const both = async () =>
      (spec.band === undefined || (await inView(page, spec.band.selector, spec.band.pattern))) &&
      (await inView(page, spec.status.selector, spec.status.pattern));
    const outcome = await until(
      async () =>
        (await onPage(page, target.selector, target.pattern)) &&
        (await onPage(page, spec.status.selector, spec.status.pattern)),
      900,
    );
    if (outcome === null) actions.bandAndStatus = null;
    else if (await both()) actions.bandAndStatus = 0;
    else {
      // One scroll or tab to the band, if it is on the page at all.
      await reveal(page, target.selector, target.pattern);
      actions.bandAndStatus = (await both()) ? 1 : null;
    }
  }
  const tasks = spec.tasks();
  if (tasks.mach !== undefined) {
    // Counted once the new result is in view: each of its parts changed
    // from the one before.
    const { fallback, pattern } = spec.machResult;
    const selector =
      (await page.$(spec.machResult.selector)) === null ? fallback : spec.machResult.selector;
    const texts = () =>
      page.evaluate(
        (selector) => Array.from(document.querySelectorAll(selector), (el) => el.textContent),
        selector,
      );
    const old = await texts();
    await act(page, tasks.mach);
    const seen = await until(async () => {
      const now = await texts();
      return (
        now.length > 0 &&
        now.every((t, k) => t !== old[k]) &&
        (await inView(page, selector, pattern))
      );
    }, 600);
    actions.changeMach = seen === null ? null : tasks.mach.length;
  }
  if (tasks.help !== undefined) {
    await act(page, tasks.help);
    const open = await page.evaluate(() => document.querySelector('dialog')?.open === true);
    actions.openHelp = open ? tasks.help.length : null;
  }
  await page.close();
  return { page: id, width: size.width, ...counts, firstResult, converged, actions, errors };
}

function table(before, after) {
  const key = (r) => `${r.page} ${r.width}`;
  const old = new Map((before ?? []).map((r) => [key(r), r]));
  const fmt = (v) => (v === null || v === undefined ? 'none' : String(v));
  const lines = [
    '| Page | Width | Words | Words a tab or disclosure away | Controls | Longest paragraph | Height | First result (s) | Converged (s) | See the result (actions) | Band and status (actions) | Mach (actions) | Help (actions) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of after) {
    const b = old.get(key(r));
    const pair = (f) => (b === undefined ? fmt(f(r)) : `${fmt(f(b))} to ${fmt(f(r))}`);
    lines.push(
      `| ${r.page} | ${r.width} | ${pair((x) => x.words)} | ${pair((x) => x.tucked)} | ${pair((x) => x.controls)} | ${pair((x) => x.longestParagraph)} | ${pair((x) => x.height)} | ${pair((x) => x.firstResult?.toFixed(1))} | ${pair((x) => x.converged?.toFixed(1))} | ${pair((x) => x.actions.result)} | ${pair((x) => x.actions.bandAndStatus)} | ${pair((x) => x.actions.changeMach)} | ${pair((x) => x.actions.openHelp)} |`,
    );
  }
  return lines.join('\n');
}

if (process.argv.includes('--compare')) {
  const i = process.argv.indexOf('--compare');
  const before = JSON.parse(await readFile(process.argv[i + 1], 'utf8'));
  const after = JSON.parse(await readFile(process.argv[i + 2], 'utf8'));
  const text = table(before, after);
  const md = argument('md', null);
  if (md !== null) await writeFile(md, `${text}\n`);
  console.log(text);
} else {
  const base = argument('url', 'http://localhost:4173').replace(/\/$/, '');
  const only = argument('pages', null)?.split(',');
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: [
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan',
      '--use-angle=swiftshader',
      '--use-webgpu-adapter=swiftshader',
    ],
  });
  const results = [];
  try {
    for (const [id, spec] of Object.entries(PAGES)) {
      if (only !== undefined && !only.includes(id)) continue;
      for (const size of WIDTHS) {
        const r = await measure(browser, base, id, spec, size);
        if (r !== null) {
          results.push(r);
          console.log(JSON.stringify(r));
        }
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(argument('out', 'usability.json'), `${JSON.stringify(results, null, 2)}\n`);
}
