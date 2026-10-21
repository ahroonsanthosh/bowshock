/**
 * The numbers the pages report on fixed cases, read from two builds of
 * the site, before and after a change to the interface, and recorded as
 * data: the interface may change how a number is shown, never the number
 * (docs/design/0012-interface.md section 8).
 *
 *   node scripts/numbers-check.mjs --before http://localhost:4180 --after http://localhost:4173 \
 *     --before-build cacc38e --after-build <commit> \
 *     --out docs/research/interface/numbers.json [--cases ramp-gpu,tube-cpu]
 *
 * The ramp: its readings (iteration, residual, the ramp pressure, the
 * exact one, their difference) as it runs to convergence, on the GPU and
 * on the CPU engine, compared at every iteration both builds reported and
 * at the reading once "Converged" shows. The shock tube: the time, the
 * steps and the L1 error it ends with. The wave drag: the first grid's
 * drag on the drag page with the old preset typed (2.836 and 7.164), with
 * its new one (2.835641 and 7.164359), with the exact body typed in full,
 * and on the live flow page, all from the `after` build. Chromium:
 * CHROMIUM_PATH, or Playwright's own.
 */

/* global console, process -- Node */
/* global document, Event -- in the page */

import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

function argument(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const GPU_ARGS = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-angle=swiftshader',
  '--use-webgpu-adapter=swiftshader',
];
const NO_GPU_ARGS = ['--disable-features=WebGPU', '--disable-unsafe-webgpu'];

/** The minus sign and thin spaces of the readout, as plain ASCII. */
const clean = (s) =>
  (s ?? '')
    .replace(/\u2212/g, '-')
    .replace(/\u2009/g, '')
    .trim();
const number = (s) => Number(clean(s).replace(/e(\d)/, 'e+$1'));

async function open(url, gpu) {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: gpu ? GPU_ARGS : NO_GPU_ARGS,
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  return { browser, page, errors };
}

/** A ramp reading, from the page before the shell (status and comparison lines) or after it. */
function rampReading() {
  const text = (sel) => document.querySelector(sel)?.textContent ?? '';
  const item = (id) =>
    document.querySelector(`.readout [data-id="${id}"] .readout__value`)?.textContent ?? '';
  if (document.querySelector('.readout') === null) {
    const status = text('#status');
    const it = /Iteration (\d+)\. Residual ([^ ]+) of/.exec(status);
    const cmp = /computed ([^,]+), exact ([^ ]+) \(([^%]+)%\)/.exec(text('#comparison'));
    return {
      iteration: it?.[1] ?? null,
      residual: it?.[2] ?? null,
      computed: cmp?.[1] ?? null,
      exact: cmp?.[2] ?? null,
      percent: cmp?.[3] ?? null,
      converged: status.includes('Converged'),
    };
  }
  return {
    iteration: item('iteration') || null,
    residual: item('residual') || null,
    computed: text('#computed') || null,
    exact: text('#exact') || null,
    percent: text('#difference').replace('%', '') || null,
    converged: item('state').includes('Converged'),
  };
}

async function rampSeries(base, { gpu, angle, readings }) {
  const { browser, page, errors } = await open(`${base}/demos/supersonic-ramp.html`, gpu);
  if (angle !== undefined) {
    await page.waitForTimeout(1500);
    await page.evaluate((angle) => {
      const input = document.querySelector('#angle');
      input.value = String(angle);
      input.dispatchEvent(new Event('input'));
    }, angle);
  }
  const series = [];
  const start = Date.now();
  while ((Date.now() - start) / 1000 < 900) {
    await page.waitForTimeout(400);
    const r = await page.evaluate(rampReading);
    if (r.iteration === null || r.computed === null || r.computed === '…') continue;
    const n = {
      iteration: number(r.iteration),
      residual: number(r.residual),
      computed: number(r.computed),
      exact: number(r.exact),
      percent: number(r.percent),
      converged: r.converged,
    };
    if (Number.isNaN(n.iteration)) continue;
    const last = series[series.length - 1];
    if (last === undefined || last.iteration !== n.iteration || last.converged !== n.converged) {
      series.push(n);
    }
    if (n.converged || series.length >= readings) break;
  }
  await browser.close();
  return { series, errors };
}

async function tube(base, { gpu, problem }) {
  const { browser, page, errors } = await open(`${base}/demos/shock-tube.html`, gpu);
  await page.waitForTimeout(2000);
  if (gpu) {
    await page.selectOption('#engine', 'gpu');
    await page.waitForTimeout(3000);
  }
  if (problem !== undefined) {
    await page.selectOption('#problem', String(problem));
    await page.waitForTimeout(1500);
  }
  await page.click('#run');
  await page.waitForFunction(
    () => document.querySelector('#run')?.textContent?.trim() === 'Pause',
    null,
    { timeout: 120_000 },
  );
  await page.waitForFunction(
    () => document.querySelector('#run')?.textContent?.trim() === 'Run',
    null,
    { timeout: 600_000 },
  );
  const result = await page.evaluate(() => {
    const status = document.querySelector('#status')?.textContent ?? '';
    const old = /t = ([^ ]+) of ([^,]+), (\d+) steps, L1 density error (.+)$/.exec(status);
    if (old) return { time: old[1], steps: old[3], l1: old[4] };
    const item = (id) =>
      document.querySelector(`.readout [data-id="${id}"] .readout__value`)?.textContent ?? '';
    return {
      time: item('time').split(' of ')[0],
      steps: item('steps'),
      l1: document.querySelector('#l1')?.textContent ?? '',
    };
  });
  await browser.close();
  return {
    result: { time: number(result.time), steps: number(result.steps), l1: number(result.l1) },
    errors,
  };
}

/** The first grid's wave drag in a page's table of grids (the drag page or the flow page). */
async function firstGridDrag(url, setUp) {
  const { browser, page, errors } = await open(url, true);
  await setUp(page);
  await page.waitForFunction(() => document.querySelector('#levels tbody tr') !== null, null, {
    timeout: 1_800_000,
    polling: 1000,
  });
  const row = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#levels tbody tr:first-child td'), (td) =>
      td.textContent.trim(),
    ),
  );
  await browser.close();
  return { grid: row[0], iterations: number(row[1]), drag: number(row[2]), errors };
}

/** Sets a field of the drag page, opening the disclosures it may sit in. */
async function setField(page, selector, value) {
  await page.evaluate((selector) => {
    for (let d = document.querySelector(selector)?.closest('details'); d;) {
      d.open = true;
      d = d.parentElement?.closest('details') ?? null;
    }
  }, selector);
  const tag = await page.evaluate((s) => document.querySelector(s)?.tagName, selector);
  if (tag === 'SELECT') await page.selectOption(selector, value);
  else await page.fill(selector, value);
}

async function dragPage(base, nose, cylinder) {
  return firstGridDrag(`${base}/demos/nose-drag.html`, async (page) => {
    await page.waitForFunction(() => document.querySelector('#run')?.disabled === false, null, {
      timeout: 120_000,
    });
    if (nose !== undefined) {
      await setField(page, '#nose-length', nose);
      await setField(page, '#body-length', cylinder);
    }
    await page.click('#run');
  });
}

/**
 * The drag page's numbers and words for a case: the total section as the
 * logic gives it (its result, claim, every reason), the flight condition
 * it implies, and, when asked, the nose solve's first grid (cells, steps,
 * wave drag) or its outcome when the solver refuses.
 */
async function dragState(base, setUp, solve) {
  const { browser, page, errors } = await open(`${base}/demos/nose-drag.html`, true);
  await page.waitForFunction(() => document.querySelector('#run')?.disabled === false, null, {
    timeout: 120_000,
  });
  await setUp(page);
  // The total is computed once typing pauses (300 ms).
  await page.waitForTimeout(2500);
  const text = (s) => page.evaluate((s) => document.querySelector(s)?.textContent ?? '', s);
  const state = {
    total: await text('#total-output'),
    overallLength: await text('#overall-length'),
    mach: await text('#total-mach'),
    impliedReynolds: await text('#implied-reynolds'),
    impliedTemperature: await text('#implied-temperature'),
  };
  if (solve === 'first-grid') {
    await page.click('#run');
    await page.waitForFunction(() => document.querySelector('#levels tbody tr') !== null, null, {
      timeout: 1_800_000,
      polling: 1000,
    });
    const row = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#levels tbody tr:first-child td'), (td) =>
        td.textContent.trim(),
      ),
    );
    // The time column is the machine's, not the solve's.
    state.firstGrid = { cells: row[0], iterations: row[1], drag: row[2] };
  } else if (solve === 'outcome') {
    await page.click('#run');
    await page.waitForFunction(() => document.querySelector('#run')?.disabled === false, null, {
      timeout: 1_800_000,
      polling: 1000,
    });
    state.result = await text('#result');
    // The total once the nose's outcome is in (refused with the nose's reason).
    await page.waitForTimeout(2500);
    state.totalAfter = await text('#total-output');
  }
  await browser.close();
  return { state, errors };
}

async function compareDrag(before, after, setUp, solve) {
  const [b, a] = await Promise.all([
    dragState(before, setUp, solve),
    dragState(after, setUp, solve),
  ]);
  return {
    before: b.state,
    after: a.state,
    identical: JSON.stringify(b.state) === JSON.stringify(a.state),
    errors: { before: b.errors, after: a.errors },
  };
}

const CASES = {
  // The drag page: the Basic Finner by its button, with its first grid solved.
  'drag-basic-finner': async (b, a) =>
    compareDrag(b, a, (page) => page.click('#basic-finner'), 'first-grid'),
  // A total refused: below the base drag's Mach range, with every reason.
  'drag-refused': async (b, a) => compareDrag(b, a, (page) => setField(page, '#mach', '1.6')),
  // An estimate: another nose, outside the class, with every reason.
  'drag-estimate': async (b, a) => compareDrag(b, a, (page) => setField(page, '#shape', 'ogive')),
  // A nose the solver refuses: a cone too steep for the grids, and the total it refuses.
  'drag-nose-refused': async (b, a) =>
    compareDrag(
      b,
      a,
      async (page) => {
        await setField(page, '#nose-length', '0.5');
        await setField(page, '#body-length', '9.5');
      },
      'outcome',
    ),
  'ramp-gpu': async (b, a) => compareRamp(b, a, { gpu: true, readings: 1000 }),
  'ramp-cpu': async (b, a) => compareRamp(b, a, { gpu: false, readings: 1000 }),
  'ramp-cpu-expansion': async (b, a) =>
    compareRamp(b, a, { gpu: false, angle: -10, readings: 1000 }),
  'tube-cpu': async (b, a) => compareTube(b, a, { gpu: false }),
  'tube-cpu-3': async (b, a) => compareTube(b, a, { gpu: false, problem: 2 }),
  'tube-gpu': async (b, a) => compareTube(b, a, { gpu: true }),
  'wave-drag': async (_b, a) => {
    const oldPreset = await dragPage(a, '2.836', '7.164');
    const newPreset = await dragPage(a);
    // The exact body typed in full (String of the double, which reads back the same double).
    const nose = 0.5 / Math.tan(10 * (Math.PI / 180));
    const exact = await dragPage(a, String(nose), String(10 - nose));
    const flow = await firstGridDrag(`${a}/demos/flow-view.html?finest=1`, async () => {});
    return {
      what: "the first grid's wave drag of the Basic Finner's body at Mach 2, all from the after build",
      dragPageOldPreset: oldPreset,
      dragPageNewPreset: newPreset,
      dragPageExactBody: exact,
      flowPage: flow,
      sameDragOnBothPages: newPreset.drag === flow.drag,
      sameStepsOnBothPages: newPreset.iterations === flow.iterations,
    };
  },
};

async function compareRamp(before, after, options) {
  const [b, a] = await Promise.all([rampSeries(before, options), rampSeries(after, options)]);
  const byIteration = new Map(b.series.map((r) => [`${r.iteration} ${r.converged}`, r]));
  let compared = 0;
  const differences = [];
  for (const r of a.series) {
    const old = byIteration.get(`${r.iteration} ${r.converged}`);
    if (old === undefined) continue;
    compared += 1;
    if (JSON.stringify(old) !== JSON.stringify(r)) differences.push({ before: old, after: r });
  }
  // The end state: the reading once "Converged" shows, in both builds.
  const endBefore = b.series.find((r) => r.converged) ?? null;
  const endAfter = a.series.find((r) => r.converged) ?? null;
  const endIdentical =
    endBefore !== null &&
    endAfter !== null &&
    JSON.stringify(endBefore) === JSON.stringify(endAfter);
  return {
    options,
    compared,
    endIdentical,
    identical: compared > 0 && differences.length === 0 && endIdentical,
    differences,
    endBefore,
    endAfter,
    errors: { before: b.errors, after: a.errors },
  };
}

async function compareTube(before, after, options) {
  const [b, a] = await Promise.all([tube(before, options), tube(after, options)]);
  return {
    options,
    before: b.result,
    after: a.result,
    identical: JSON.stringify(b.result) === JSON.stringify(a.result),
    errors: { before: b.errors, after: a.errors },
  };
}

const before = argument('before', 'http://localhost:4180').replace(/\/$/, '');
const after = argument('after', 'http://localhost:4173').replace(/\/$/, '');
const only = argument('cases', null)?.split(',');
// The two builds compared, as the caller names them (their commits).
const builds = {
  before: argument('before-build', before),
  after: argument('after-build', after),
};
const results = {};
for (const [id, run] of Object.entries(CASES)) {
  if (only !== undefined && !only.includes(id)) continue;
  results[id] = await run(before, after);
  console.log(id, JSON.stringify(results[id]));
}
const out = argument('out', null);
if (out !== null) {
  await writeFile(out, `${JSON.stringify({ builds, cases: results }, null, 2)}\n`);
}
