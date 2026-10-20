/**
 * Shock tube demo: runs the 1D solver live, on the CPU reference engine or
 * on the GPU, and overlays the exact solution so anyone can see how
 * accurate the scheme is; the plot fills the window.
 */

import { DEFAULT_CONFIG, Euler1D, type Euler1DConfig } from '../engine-cpu/euler1d';
import { GpuEuler1D, gpuPrimitive, isGpuFlux } from '../engine-gpu/euler1d-gpu';
import { hasReached } from '../engine-gpu/time-loop';
import { FLUXES } from '../scheme/flux';
import type { Primitive1D } from '../scheme/gas';
import { LIMITERS } from '../scheme/limiters';
import { exactRiemannProfile } from '../scheme/riemann-exact';
import { TORO_TESTS, type ToroTest } from '../validation/toro-tests';
import { element, h } from '../ui/dom';
import { formatCount, formatExponent } from '../ui/format';
import type { KeyBinding } from '../ui/keymap';
import { Readout } from '../ui/readout';
import { Shell } from '../ui/shell';

const GAMMA = 1.4;
const EXACT_SAMPLES = 1000;

interface Panel {
  readonly label: string;
  readonly value: (w: Primitive1D) => number;
}

const PANELS: readonly Panel[] = [
  { label: 'Density', value: (w) => w.rho },
  { label: 'Velocity', value: (w) => w.u },
  { label: 'Pressure', value: (w) => w.p },
];

interface Snapshot {
  readonly time: number;
  readonly steps: number;
  readonly cells: readonly Primitive1D[];
}

/** What the demo needs from a solver, whichever engine runs it. */
interface Run {
  advanceTo(t: number): Promise<void>;
  snapshot(): Promise<Snapshot>;
  dispose(): void;
}

function cpuRun(config: Euler1DConfig, field: (x: number) => Primitive1D): Run {
  const solver = new Euler1D(config);
  solver.setInitialCondition(field);
  return {
    advanceTo: (t) => {
      solver.advanceTo(t);
      return Promise.resolve();
    },
    snapshot: () =>
      Promise.resolve({
        time: solver.time,
        steps: solver.steps,
        cells: Array.from({ length: config.nCells }, (_, i) => solver.primitive(i)),
      }),
    dispose: () => undefined,
  };
}

async function gpuRun(
  device: GPUDevice,
  config: Euler1DConfig,
  field: (x: number) => Primitive1D,
): Promise<Run> {
  const { flux } = config;
  if (!isGpuFlux(flux)) throw new Error(`the ${flux} flux is not available on the GPU`);
  const solver = await GpuEuler1D.create(device, { ...config, flux });
  solver.setInitialCondition(field);
  return {
    advanceTo: (t) => solver.advanceTo(t),
    snapshot: async () => {
      const s = await solver.readState();
      const cells = Array.from(s.rho, (_, i) => gpuPrimitive(s, i, GAMMA));
      return { time: s.time, steps: s.steps, cells };
    },
    dispose: () => {
      solver.destroy();
    },
  };
}

/** The selected option of a <select>, checked against the keys it must name. */
function selectedKey<K extends string>(select: HTMLSelectElement, options: Record<K, unknown>): K {
  const value = select.value;
  if (!(value in options)) throw new Error(`unknown option ${value} in #${select.id}`);
  return value as K;
}

type Action = 'run' | 'again';

const BINDINGS: readonly KeyBinding<Action>[] = [
  { keys: [' '], action: 'run', description: 'Run, pause or resume' },
  { keys: ['r'], action: 'again', description: 'Run again from the start' },
];

const shell = new Shell<Action>({
  root: '../',
  page: 'shock-tube',
  title: 'Shock tube',
  bindings: BINDINGS,
  onAction: (action) => {
    if (action === 'run') runButton.click();
    else void runAgain();
  },
  help: {
    title: 'Shock tube: keys and help',
    sections: [
      {
        title: 'This page',
        body: [
          'A tube of gas at rest, with different states either side of a diaphragm at the start: when it bursts, a shock, a contact surface and an expansion travel along the tube. Toro\u2019s five problems test a solver on strong shocks, near-vacuum and colliding waves.',
          'The dots are bowshock\u2019s 1D solver, on the CPU in 64-bit or on the GPU in 32-bit; the line is the exact solution. The L1 density error is the density\u2019s difference from the exact solution at the cells\u2019 centres, summed over the tube\u2019s length of 1; this page shows the solver against exact theory, so it has no error band.',
        ],
      },
    ],
  },
});

const readout = new Readout([
  [{ id: 'cells', label: 'cells' }, { id: 'engine' }],
  [
    { id: 'time', label: 't' },
    { id: 'steps', label: 'steps' },
    { id: 'l1', label: 'L1' },
  ],
]);
document.querySelector('main')?.append(readout.element);

shell.bottom.append(
  h(
    'div',
    { className: 'legend', attrs: { role: 'group', 'aria-label': 'Legend' } },
    h(
      'div',
      { className: 'legend__title' },
      h(
        'span',
        {},
        h('span', { className: 'plot-key plot-key--dots', attrs: { 'aria-hidden': 'true' } }),
        'bowshock',
      ),
      h(
        'span',
        {},
        h('span', { className: 'plot-key plot-key--line', attrs: { 'aria-hidden': 'true' } }),
        'exact',
      ),
    ),
    h('p', { className: 'legend__note', text: 'Density, velocity and pressure along the tube.' }),
  ),
);

const problemSelect = element('#problem', HTMLSelectElement);
const engineSelect = element('#engine', HTMLSelectElement);
const fluxSelect = element('#flux', HTMLSelectElement);
const limiterSelect = element('#limiter', HTMLSelectElement);
const cellsSelect = element('#cells', HTMLSelectElement);
const runButton = element('#run', HTMLButtonElement);
const againButton = element('#again', HTMLButtonElement);
const status = element('#status', HTMLElement);
const canvas = element('#plot', HTMLCanvasElement);
const l1Text = element('#l1', HTMLElement);

TORO_TESTS.forEach((test, i) => {
  problemSelect.add(new Option(`${test.name}: ${test.description}`, String(i)));
});

const gpuDevice: Promise<GPUDevice | null> = (async () => {
  // The type definitions declare navigator.gpu as always present, but it is
  // undefined in browsers without WebGPU.
  const gpu = navigator.gpu as GPU | undefined;
  const adapter = await gpu?.requestAdapter();
  return adapter ? adapter.requestDevice() : null;
})().catch(() => null);

let run: Run | null = null;
let snapshot: Snapshot | null = null;
let test: ToroTest = TORO_TESTS[0]!;
let running = false;
/** Incremented on every reset so that work from an abandoned run is discarded. */
let generation = 0;

/** Keep the flux choice consistent with the engine: the exact Godunov flux is CPU-only. */
function syncFluxOptions(): void {
  const gpu = engineSelect.value === 'gpu';
  for (const option of fluxSelect.options) {
    option.disabled = gpu && !isGpuFlux(option.value);
  }
  if (fluxSelect.selectedOptions[0]?.disabled === true) fluxSelect.value = 'hllc';
}

async function reset(): Promise<void> {
  const myGeneration = ++generation;
  running = false;
  runButton.textContent = 'Run';
  run?.dispose();
  run = null;
  snapshot = null;
  status.textContent = '';

  test = TORO_TESTS[Number(problemSelect.value)] ?? TORO_TESTS[0]!;
  readout.set('cells', cellsSelect.value);
  const config: Euler1DConfig = {
    ...DEFAULT_CONFIG,
    nCells: Number(cellsSelect.value),
    xMin: 0,
    xMax: 1,
    flux: selectedKey(fluxSelect, FLUXES),
    limiter: selectedKey(limiterSelect, LIMITERS),
  };
  const field = (x: number) => (x < test.x0 ? test.left : test.right);

  let next: Run;
  if (engineSelect.value === 'gpu') {
    const device = await gpuDevice;
    if (device === null) {
      status.textContent = 'WebGPU is not available in this browser; using the CPU engine.';
      shell.toasts.show(status.textContent, 'warn');
      engineSelect.value = 'cpu';
      syncFluxOptions();
      next = cpuRun(config, field);
    } else {
      next = await gpuRun(device, config, field);
    }
  } else {
    next = cpuRun(config, field);
  }

  if (myGeneration !== generation) {
    next.dispose();
    return;
  }
  run = next;
  readout.set('engine', engineSelect.value === 'gpu' ? 'GPU' : 'CPU');
  snapshot = await run.snapshot();
  draw();
}

/** Start the problem again from its initial state, and run it. */
async function runAgain(): Promise<void> {
  await reset();
  runButton.click();
}

async function frame(): Promise<void> {
  const current = run;
  const myGeneration = generation;
  if (!running || current === null || snapshot === null) return;
  // Advance a fixed fraction of the run per frame so every problem animates
  // over about two seconds regardless of its time scale.
  const target = Math.min(test.tEnd, snapshot.time + test.tEnd / 120);
  try {
    await current.advanceTo(target);
    const next = await current.snapshot();
    if (myGeneration !== generation) return;
    snapshot = next;
  } catch (error) {
    // A reset while this frame was in flight destroys its solver; that is
    // not an error worth reporting.
    if (myGeneration !== generation) return;
    running = false;
    runButton.textContent = 'Run';
    status.textContent = `Stopped: ${String(error)}`;
    return;
  }
  draw();
  if (hasReached(snapshot.time, test.tEnd)) {
    running = false;
    runButton.textContent = 'Run';
    return;
  }
  requestAnimationFrame(() => void frame());
}

function draw(): void {
  if (snapshot === null) return;
  const { time, steps, cells } = snapshot;
  const n = cells.length;
  const dx = 1 / n;
  const xs = Array.from({ length: n }, (_, i) => (i + 0.5) * dx);
  const exactXs = Array.from({ length: EXACT_SAMPLES }, (_, i) => (i + 0.5) / EXACT_SAMPLES);
  const exact =
    time > 0
      ? exactRiemannProfile(test.left, test.right, exactXs, test.x0, time, GAMMA)
      : exactXs.map((x) => (x < test.x0 ? test.left : test.right));

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  // The plots fill the part of the window the panels and the readout leave.
  const area = shell.drawingRect(1.4);
  const width = Math.max(120, area.width);
  const height = Math.max(150, area.height);
  ctx.translate(area.x, area.y);

  const style = getComputedStyle(document.documentElement);
  const colour = (name: string) => style.getPropertyValue(name).trim();
  const panelHeight = height / PANELS.length;
  const pad = { left: 56, right: 12, top: 22, bottom: 18 };

  PANELS.forEach((panel, p) => {
    const top = p * panelHeight + pad.top;
    const plotHeight = panelHeight - pad.top - pad.bottom;
    const plotWidth = width - pad.left - pad.right;
    // Fixed range over the whole run: initial and exact values.
    const all = [...exact, test.left, test.right].map(panel.value);
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    const margin = 0.08 * (hi - lo || 1);
    lo -= margin;
    hi += margin;
    const px = (x: number) => pad.left + x * plotWidth;
    const py = (v: number) => top + (1 - (v - lo) / (hi - lo)) * plotHeight;

    ctx.strokeStyle = colour('--plot-grid');
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.left, top, plotWidth, plotHeight);
    ctx.fillStyle = colour('--muted');
    ctx.font = `12px ${colour('--font-ui')}`;
    ctx.textAlign = 'left';
    ctx.fillText(panel.label, pad.left, top - 6);
    ctx.textAlign = 'right';
    ctx.fillText(formatTick(hi - margin), pad.left - 6, py(hi - margin) + 4);
    ctx.fillText(formatTick(lo + margin), pad.left - 6, py(lo + margin) + 4);

    ctx.strokeStyle = colour('--text');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    exact.forEach((w, i) => {
      const X = px(exactXs[i]!);
      const Y = py(panel.value(w));
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    ctx.fillStyle = colour('--accent');
    // Dot radius follows the spacing between cells so dense grids stay legible.
    const r = Math.min(2.2, Math.max(0.8, (0.35 * plotWidth) / n));
    cells.forEach((w, i) => {
      ctx.beginPath();
      ctx.arc(px(xs[i]!), py(panel.value(w)), r, 0, 2 * Math.PI);
      ctx.fill();
    });
  });

  let l1 = 0;
  if (time > 0) {
    const exactAtCells = exactRiemannProfile(test.left, test.right, xs, test.x0, time, GAMMA);
    cells.forEach((w, i) => (l1 += Math.abs(w.rho - exactAtCells[i]!.rho) * dx));
  }
  readout.set('time', `${time.toPrecision(4)} of ${test.tEnd}`);
  readout.set('steps', formatCount(steps));
  readout.set('l1', time > 0 ? formatExponent(l1, 2) : null);
  l1Text.textContent = time > 0 ? formatExponent(l1, 2) : '\u2026';
  shell.sheet.pinned.textContent =
    time > 0 ? `L1 density error ${formatExponent(l1, 2)} at t = ${time.toPrecision(4)}` : '';
}

function formatTick(v: number): string {
  return Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(1) : v.toFixed(2);
}

runButton.addEventListener('click', () => {
  void (async () => {
    if (running) {
      running = false;
      runButton.textContent = 'Run';
      return;
    }
    if (run === null || snapshot === null || hasReached(snapshot.time, test.tEnd)) {
      await reset();
    }
    running = true;
    runButton.textContent = 'Pause';
    requestAnimationFrame(() => void frame());
  })();
});

againButton.addEventListener('click', () => void runAgain());
engineSelect.addEventListener('change', syncFluxOptions);
for (const select of [problemSelect, engineSelect, fluxSelect, limiterSelect, cellsSelect]) {
  select.addEventListener('change', () => void reset());
}
shell.onLayout(draw);

void (async () => {
  const device = await gpuDevice;
  const gpuOption = engineSelect.querySelector<HTMLOptionElement>('option[value="gpu"]');
  if (device === null && gpuOption !== null) {
    gpuOption.disabled = true;
    gpuOption.textContent = 'GPU (WebGPU unavailable)';
  }
  await reset();
})();
