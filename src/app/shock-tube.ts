/**
 * Shock tube demo: runs the 1D reference solver live and overlays the exact
 * solution, so anyone can see how accurate the scheme is.
 */

import { DEFAULT_CONFIG, Euler1D, type FluxName } from '../engine-cpu/euler1d';
import type { Primitive1D } from '../scheme/gas';
import type { LimiterName } from '../scheme/limiters';
import { exactRiemannProfile } from '../scheme/riemann-exact';
import { TORO_TESTS, type ToroTest } from '../validation/toro-tests';

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

/** Look up an element and check its type, failing clearly if the page and script disagree. */
function element<T extends HTMLElement>(selector: string, type: new () => T): T {
  const el = document.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`expected ${type.name} at ${selector}`);
  return el;
}

const problemSelect = element('#problem', HTMLSelectElement);
const fluxSelect = element('#flux', HTMLSelectElement);
const limiterSelect = element('#limiter', HTMLSelectElement);
const cellsSelect = element('#cells', HTMLSelectElement);
const runButton = element('#run', HTMLButtonElement);
const status = element('#status', HTMLElement);
const canvas = element('#plot', HTMLCanvasElement);

TORO_TESTS.forEach((test, i) => {
  problemSelect.add(new Option(`${test.name}: ${test.description}`, String(i)));
});

let solver: Euler1D | null = null;
let test: ToroTest = TORO_TESTS[0]!;
let running = false;

function reset(): void {
  test = TORO_TESTS[Number(problemSelect.value)] ?? TORO_TESTS[0]!;
  solver = new Euler1D({
    ...DEFAULT_CONFIG,
    nCells: Number(cellsSelect.value),
    xMin: 0,
    xMax: 1,
    flux: fluxSelect.value as FluxName,
    limiter: limiterSelect.value as LimiterName,
  });
  solver.setInitialCondition((x) => (x < test.x0 ? test.left : test.right));
  draw();
}

function frame(): void {
  if (!running || solver === null) return;
  // Advance a fixed fraction of the run per frame so every problem animates
  // over about two seconds regardless of its time scale.
  const target = Math.min(test.tEnd, solver.time + test.tEnd / 120);
  try {
    solver.advanceTo(target);
  } catch (error) {
    running = false;
    status.textContent = `Stopped: ${String(error)}`;
    runButton.textContent = 'Run';
    return;
  }
  draw();
  if (solver.time >= test.tEnd) {
    running = false;
    runButton.textContent = 'Run';
    return;
  }
  requestAnimationFrame(frame);
}

function draw(): void {
  if (solver === null) return;
  const s = solver;
  const n = s.config.nCells;
  const numeric = Array.from({ length: n }, (_, i) => s.primitive(i));
  const xs = Array.from({ length: n }, (_, i) => s.cellCentre(i));
  const exactXs = Array.from({ length: EXACT_SAMPLES }, (_, i) => (i + 0.5) / EXACT_SAMPLES);
  const exact =
    s.time > 0
      ? exactRiemannProfile(test.left, test.right, exactXs, test.x0, s.time, GAMMA)
      : exactXs.map((x) => (x < test.x0 ? test.left : test.right));

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

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

    ctx.strokeStyle = colour('--grid');
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.left, top, plotWidth, plotHeight);
    ctx.fillStyle = colour('--muted');
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(panel.label, pad.left, top - 6);
    ctx.textAlign = 'right';
    ctx.fillText(formatTick(hi - margin), pad.left - 6, py(hi - margin) + 4);
    ctx.fillText(formatTick(lo + margin), pad.left - 6, py(lo + margin) + 4);

    ctx.strokeStyle = colour('--exact');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    exact.forEach((w, i) => {
      const X = px(exactXs[i]!);
      const Y = py(panel.value(w));
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    ctx.fillStyle = colour('--numeric');
    // Dot radius follows the spacing between cells so dense grids stay legible.
    const r = Math.min(2.2, Math.max(0.8, (0.35 * plotWidth) / n));
    numeric.forEach((w, i) => {
      ctx.beginPath();
      ctx.arc(px(xs[i]!), py(panel.value(w)), r, 0, 2 * Math.PI);
      ctx.fill();
    });
  });

  let l1 = 0;
  if (s.time > 0) {
    const exactAtCells = exactRiemannProfile(test.left, test.right, xs, test.x0, s.time, GAMMA);
    numeric.forEach((w, i) => (l1 += Math.abs(w.rho - exactAtCells[i]!.rho) * s.dx));
  }
  status.textContent =
    `t = ${s.time.toPrecision(4)} of ${test.tEnd}, ${s.steps} steps` +
    (s.time > 0 ? `, L1 density error ${l1.toExponential(2)}` : '');
}

function formatTick(v: number): string {
  return Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(1) : v.toFixed(2);
}

runButton.addEventListener('click', () => {
  if (running) {
    running = false;
    runButton.textContent = 'Run';
    return;
  }
  if (solver === null || solver.time >= test.tEnd) reset();
  running = true;
  runButton.textContent = 'Pause';
  requestAnimationFrame(frame);
});

for (const select of [problemSelect, fluxSelect, limiterSelect, cellsSelect]) {
  select.addEventListener('change', () => {
    running = false;
    runButton.textContent = 'Run';
    reset();
  });
}
window.addEventListener('resize', draw);

reset();
