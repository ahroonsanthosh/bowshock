/**
 * Supersonic ramp demo: steady flow over a compression ramp (oblique
 * shock) or an expansion corner (Prandtl-Meyer fan), solved live and drawn
 * as numerical schlieren or a colour-mapped field, with the ramp pressure
 * compared against the exact solution as the run converges.
 *
 * Runs on the GPU when WebGPU is available, otherwise on the CPU engine at
 * reduced resolution.
 */

import { Euler2D, type Euler2DConfig } from '../engine-cpu/euler2d';
import { GpuEuler2D, gpuPrimitive2D } from '../engine-gpu/euler2d-gpu';
import { rampGrid } from '../grid/shapes';
import type { StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';
import { colormapTable } from '../render/colormap';
import { FieldRenderer } from '../render/field-renderer';
import { CanvasPresenter, CopyPresenter, type Presenter } from '../render/presenter';
import {
  DISPLAY_FIELD_CODES,
  displayField,
  schlierenShade,
  type DisplayField,
} from '../render/fields';
import {
  deflectionAngle,
  machFromPrandtlMeyer,
  maxDeflectionWaveAngle,
  obliqueShock,
  prandtlMeyer,
  stagnationPressureRatio,
} from '../validation/gas-dynamics';

const GAMMA = 1.4;
const DEG = Math.PI / 180;
const SCHLIEREN_CONTRAST = 12;
/** Domain: corner at x = 0, inflow at x = -0.5, outflow at x = 1.5, top at y = 1.2. */
const DOMAIN = { xMin: -0.5, xCorner: 0, xMax: 1.5, height: 1.2 } as const;
/** Ramp-face window, away from the corner and the outflow, over which pressure is compared. */
const PLATEAU = { x0: 0.5, x1: 1.2 } as const;

function element<T extends HTMLElement>(selector: string, type: new () => T): T {
  const el = document.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`expected ${type.name} at ${selector}`);
  return el;
}

let canvas = element('#flow', HTMLCanvasElement);
const machInput = element('#mach', HTMLInputElement);
const angleInput = element('#angle', HTMLInputElement);
const fieldSelect = element('#field', HTMLSelectElement);
const resolutionSelect = element('#resolution', HTMLSelectElement);
const machLabel = element('#mach-value', HTMLOutputElement);
const angleLabel = element('#angle-value', HTMLOutputElement);
const status = element('#status', HTMLElement);
const comparison = element('#comparison', HTMLElement);
const engineNote = element('#engine-note', HTMLElement);
const legend = element('#legend', HTMLElement);
const legendBar = element('#legend-bar', HTMLElement);
const legendMin = element('#legend-min', HTMLElement);
const legendMax = element('#legend-max', HTMLElement);
const legendCaption = element('#legend-caption', HTMLElement);

const FIELD_CAPTIONS: Readonly<Record<DisplayField, string>> = {
  schlieren:
    'Numerical schlieren: dark where the density changes fastest (shocks), grey for weaker waves.',
  mach: 'Mach number',
  pressure: 'Pressure, in units of the free-stream pressure',
  density: 'Density, in units of the free-stream density',
};

/** Show the colour scale of the field just drawn (schlieren has no scale, only a caption). */
function showLegend(field: DisplayField, range: { min: number; max: number }): void {
  legendCaption.textContent = FIELD_CAPTIONS[field];
  const coloured = field !== 'schlieren';
  legendBar.hidden = !coloured;
  legendMin.hidden = !coloured;
  legendMax.hidden = !coloured;
  if (coloured) {
    legendMin.textContent = range.min.toPrecision(3);
    legendMax.textContent = range.max.toPrecision(3);
  }
  legend.hidden = false;
}

/** The colour map as a CSS gradient, for the legend bar. */
function legendGradient(): string {
  const table = colormapTable(9);
  const stops = Array.from({ length: 9 }, (_, k) => {
    const [r, g, b] = [0, 1, 2].map((c) => Math.round(255 * table[4 * k + c]!));
    return `rgb(${r} ${g} ${b}) ${(100 * k) / 8}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/** The selected display field, checked against the fields that exist. */
function selectedField(): DisplayField {
  const value = fieldSelect.value;
  if (!(value in DISPLAY_FIELD_CODES)) throw new Error(`unknown field ${value}`);
  return value as DisplayField;
}

/** The exact ramp-face pressure ratio, or null if the shock detaches. */
function exactRampPressure(mach: number, angle: number): number | null {
  if (angle > 0) {
    const thetaMax = deflectionAngle(mach, maxDeflectionWaveAngle(mach, GAMMA), GAMMA);
    return angle < thetaMax ? obliqueShock(mach, angle, GAMMA).pressureRatio : null;
  }
  if (angle < 0) {
    const nu = prandtlMeyer(mach, GAMMA) - angle;
    const downstream = machFromPrandtlMeyer(nu, GAMMA);
    return stagnationPressureRatio(mach, GAMMA) / stagnationPressureRatio(downstream, GAMMA);
  }
  return 1;
}

/** What the page needs from a solver, whichever engine runs it. */
interface Run {
  readonly grid: StructuredGrid;
  iterate(count: number): Promise<void>;
  /** Steps taken, ramp-plateau pressure, and the residual relative to the start. */
  measure(): Promise<{ steps: number; rampPressure: number; residual: number }>;
  /** Draw a field; resolves with the field's minimum and maximum, for the legend. */
  draw(field: DisplayField): Promise<{ min: number; max: number }>;
  dispose(): void;
}

function solverConfig(mach: number, angle: number, ni: number, nj: number): Euler2DConfig {
  const free: Primitive2D = { rho: 1, u: mach * Math.sqrt(GAMMA), v: 0, p: 1 };
  return {
    grid: rampGrid({ ni, nj, ...DOMAIN, angle }),
    geometry: 'planar',
    gamma: GAMMA,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: { kind: 'inflow', state: free },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
    },
  };
}

/**
 * The residual relative to its initial value. A run that starts from its
 * own steady solution (a flat wall, angle 0) has no initial residual, and
 * counts as converged from the start.
 */
function relativeResidual(residual: number, initial: number): number {
  return initial > 0 ? residual / initial : 0;
}

function freestream(config: Euler2DConfig): Primitive2D {
  const bc = config.boundaries.iMin;
  if (bc.kind !== 'inflow') throw new Error('the ramp demo needs an inflow boundary');
  return bc.state;
}

/** Mean of the wall-adjacent cell pressures over the ramp plateau. */
function plateauPressure(
  grid: StructuredGrid,
  centroidX: Float64Array,
  pressureOf: (i: number) => number,
): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < grid.ni; i++) {
    const x = centroidX[i]!;
    if (x > PLATEAU.x0 && x < PLATEAU.x1) {
      sum += pressureOf(i);
      count += 1;
    }
  }
  return sum / count;
}

async function gpuRun(
  device: GPUDevice,
  presenter: Presenter,
  config: Euler2DConfig,
): Promise<Run> {
  const solver = await GpuEuler2D.create(device, { ...config, flux: 'hllc' });
  const renderer = await FieldRenderer.create(device, presenter.format, config.grid);
  solver.setInitialCondition(() => freestream(config));
  const initialResidual = await solver.densityResidualNorm();
  const background = backgroundColour();
  return {
    grid: config.grid,
    iterate: (count) => solver.iterate(count),
    measure: async () => {
      const residual = relativeResidual(await solver.densityResidualNorm(), initialResidual);
      const state = await solver.readState();
      const rampPressure = plateauPressure(
        config.grid,
        solver.metrics.centroidX,
        (i) => gpuPrimitive2D(state, i, GAMMA).p,
      );
      return { steps: state.steps, rampPressure, residual };
    },
    draw: async (field) => {
      renderer.render(
        presenter.frameTexture(),
        solver.stateBuffer,
        { field, gamma: GAMMA, schlierenContrast: SCHLIEREN_CONTRAST },
        background,
      );
      await presenter.present();
      return renderer.readRange();
    },
    dispose: () => {
      solver.destroy();
      renderer.destroy();
    },
  };
}

function cpuRun(config: Euler2DConfig): Run {
  const solver = new Euler2D(config);
  solver.setInitialCondition(() => freestream(config));
  const initialResidual = solver.densityResidualNorm();
  const colours = colormapTable(256);
  const { ni, nj } = config.grid;
  return {
    grid: config.grid,
    iterate: (count) => {
      solver.iterate(count);
      return Promise.resolve();
    },
    measure: () =>
      Promise.resolve({
        steps: solver.steps,
        rampPressure: plateauPressure(
          config.grid,
          solver.metrics.centroidX,
          (i) => solver.primitive(i, 0).p,
        ),
        residual: relativeResidual(solver.densityResidualNorm(), initialResidual),
      }),
    draw: (field) => {
      // Canvas 2D fallback: each cell filled with the mean of its node values.
      const n = ni * nj;
      const state = {
        rho: new Float64Array(n),
        mu: new Float64Array(n),
        mv: new Float64Array(n),
        energy: new Float64Array(n),
      };
      for (let j = 0; j < nj; j++) {
        for (let i = 0; i < ni; i++) {
          const w = solver.primitive(i, j);
          const c = i + j * ni;
          state.rho[c] = w.rho;
          state.mu[c] = w.rho * w.u;
          state.mv[c] = w.rho * w.v;
          state.energy[c] = w.p / (GAMMA - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v);
        }
      }
      const nodes = displayField(config.grid, state, field, GAMMA);
      drawCells2D(config.grid, nodes, field, colours);
      let min = Infinity;
      let max = -Infinity;
      for (const v of nodes) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
      return Promise.resolve({ min, max });
    },
    dispose: () => undefined,
  };
}

function drawCells2D(
  grid: StructuredGrid,
  nodes: Float64Array,
  field: DisplayField,
  colours: Float32Array,
): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const { width, height } = canvas;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim();
  ctx.fillRect(0, 0, width, height);
  const xs = Array.from(grid.x);
  const ys = Array.from(grid.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = 0.98 * Math.min(width / (x1 - x0), height / (y1 - y0));
  const px = (x: number) => width / 2 + (x - 0.5 * (x0 + x1)) * scale;
  const py = (y: number) => height / 2 - (y - 0.5 * (y0 + y1)) * scale;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of nodes) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const row = grid.ni + 1;
  for (let j = 0; j < grid.nj; j++) {
    for (let i = 0; i < grid.ni; i++) {
      const corners = [i + j * row, i + 1 + j * row, i + 1 + (j + 1) * row, i + (j + 1) * row];
      const value = corners.reduce((s, n) => s + nodes[n]!, 0) / 4;
      let rgb: [number, number, number];
      if (field === 'schlieren') {
        const shade = Math.round(255 * schlierenShade(value, hi, SCHLIEREN_CONTRAST));
        rgb = [shade, shade, shade];
      } else {
        const k = Math.round((255 * (value - lo)) / Math.max(hi - lo, 1e-30));
        rgb = [0, 1, 2].map((c) => Math.round(255 * colours[4 * k + c]!)) as [
          number,
          number,
          number,
        ];
      }
      ctx.fillStyle = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
      ctx.beginPath();
      corners.forEach((n, k) => {
        if (k === 0) ctx.moveTo(px(grid.x[n]!), py(grid.y[n]!));
        else ctx.lineTo(px(grid.x[n]!), py(grid.y[n]!));
      });
      ctx.closePath();
      ctx.fill();
      // Hairline in the same colour hides anti-aliasing seams between cells.
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
    }
  }
}

function backgroundColour(): GPUColor {
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim();
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
}

// Engine selection. WebGPU drawing straight into the canvas is the normal
// path. If the device is lost (some environments cannot present WebGPU to a
// canvas), the page retries on a fresh device with copy presentation, and
// if that fails too it falls back to the CPU engine. Each step is reported.

interface GpuSetup {
  readonly device: GPUDevice;
  readonly presenter: Presenter;
}

type Presentation = 'canvas' | 'copy';

/** Give the page a fresh canvas: one canvas cannot hold both a WebGPU and a 2D context. */
function replaceCanvas(): void {
  const fresh = document.createElement('canvas');
  fresh.id = canvas.id;
  canvas.replaceWith(fresh);
  canvas = fresh;
  sizeCanvas();
}

async function setUpGpu(presentation: Presentation): Promise<GpuSetup | null> {
  // The type definitions declare navigator.gpu as always present, but it is
  // undefined in browsers without WebGPU.
  const gpu = navigator.gpu as GPU | undefined;
  const adapter = await gpu?.requestAdapter();
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  const presenter =
    presentation === 'canvas'
      ? new CanvasPresenter(device, canvas)
      : new CopyPresenter(device, canvas);
  void device.lost.then((info) => {
    // Destroyed on purpose when the page switches engine.
    if (info.reason === 'destroyed') return;
    void switchEngine(
      presentation === 'canvas' ? 'copy' : 'cpu',
      `The GPU device was lost (${info.message}).`,
    );
  });
  return { device, presenter };
}

let gpu: GpuSetup | null = null;
let run: Run | null = null;
let generation = 0;
let exactPressure: number | null = null;
/** Settles once an engine switch has a device (or has fallen back to the CPU). */
let engineReady: Promise<void> = Promise.resolve();

/** Release a GPU setup; destroying the device does not trigger the fallback. */
function releaseGpu(setup: GpuSetup): void {
  setup.presenter.destroy();
  setup.device.destroy();
}

async function switchEngine(next: Presentation | 'cpu', reason: string): Promise<void> {
  generation += 1;
  run?.dispose();
  run = null;
  if (gpu !== null) releaseGpu(gpu);
  gpu = null;
  replaceCanvas();
  // Runs started while the new device is being set up (a slider moved
  // meanwhile) wait for it rather than starting on the CPU.
  engineReady = (async () => {
    gpu = next === 'cpu' ? null : await setUpGpu(next).catch(() => null);
    const continuation = gpu
      ? 'Continuing on the GPU, copying each frame to the page (slower).'
      : 'Continuing on the CPU engine, on a coarser grid.';
    engineNote.textContent = `${reason} ${continuation}`;
  })();
  await restart();
}

function updateLabels(): { mach: number; angle: number } {
  const mach = Number(machInput.value);
  const thetaMax = deflectionAngle(mach, maxDeflectionWaveAngle(mach, GAMMA), GAMMA) / DEG;
  // Keep the ramp attached: one degree short of detachment.
  angleInput.max = String(Math.floor(thetaMax - 1));
  if (Number(angleInput.value) > Number(angleInput.max)) angleInput.value = angleInput.max;
  const angle = Number(angleInput.value);
  machLabel.value = mach.toFixed(1);
  angleLabel.value = `${angle > 0 ? '+' : ''}${angle}°`;
  return { mach, angle };
}

function sizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  // Domain is 2 wide; leave room for the deepest expansion ramp below y = 0.
  const height = Math.round(width * 0.75);
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}

async function restart(): Promise<void> {
  await engineReady;
  const myGeneration = ++generation;
  run?.dispose();
  run = null;
  const { mach, angle } = updateLabels();
  exactPressure = exactRampPressure(mach, angle * DEG);
  const [ni, nj] = resolutionSelect.value.split('x').map(Number) as [number, number];
  // The CPU fallback runs a coarser grid to stay interactive.
  const scale = gpu ? 1 : 0.5;
  const config = solverConfig(mach, angle * DEG, Math.round(ni * scale), Math.round(nj * scale));
  let next: Run;
  try {
    next = gpu ? await gpuRun(gpu.device, gpu.presenter, config) : cpuRun(config);
  } catch (error) {
    // A run being set up on a device that was replaced meanwhile may fail;
    // only a failure of the current run is news.
    if (myGeneration === generation) status.textContent = `Could not start: ${String(error)}`;
    return;
  }
  if (myGeneration !== generation) {
    next.dispose();
    return;
  }
  run = next;
  void loop(myGeneration);
}

let drawing: Promise<void> | null = null;
let redrawRequested = false;

/**
 * Draw the current run. A request made while a frame is being drawn is
 * kept, and drawn once that frame is done, so a change of field or size is
 * never lost (even after the run has converged and the loop has stopped).
 * Errors from a run that has since been replaced are ignored; others are
 * reported.
 */
function redraw(): Promise<void> {
  if (drawing !== null) {
    redrawRequested = true;
    return drawing;
  }
  const current = run;
  if (current === null) return Promise.resolve();
  const myGeneration = generation;
  const field = selectedField();
  drawing = current
    .draw(field)
    .then((range) => {
      if (myGeneration === generation) showLegend(field, range);
    })
    .catch((error: unknown) => {
      if (myGeneration === generation) status.textContent = `Drawing failed: ${String(error)}`;
    })
    .finally(() => {
      drawing = null;
      if (redrawRequested) {
        redrawRequested = false;
        void redraw();
      }
    });
  return drawing;
}

/** Iterations after which the run stops even if not converged, to spare the user's battery. */
const MAX_ITERATIONS = 20_000;

/**
 * Convergence: the residual has fallen by four orders, and the ramp
 * pressure changed by less than 1e-5 relative over the last measurement
 * interval. The GPU runs in 32-bit floats, whose round-off holds the
 * residual near 1e-5 of its initial value, so a residual threshold alone
 * could never be met there.
 */
const RESIDUAL_DROP = 1e-4;
const PRESSURE_STEADY = 1e-5;

async function loop(myGeneration: number): Promise<void> {
  let frame = 0;
  let previousPressure = NaN;
  while (myGeneration === generation && run !== null) {
    const current = run;
    try {
      await current.iterate(10);
      if (myGeneration !== generation) return;
      await redraw();
      if (frame % 15 === 0) {
        const m = await current.measure();
        if (myGeneration !== generation) return;
        report(m);
        const change = Math.abs(m.rampPressure / previousPressure - 1);
        previousPressure = m.rampPressure;
        if (m.residual < RESIDUAL_DROP && change < PRESSURE_STEADY) {
          status.textContent += ' Converged.';
          return;
        }
        if (m.steps >= MAX_ITERATIONS) {
          status.textContent += ' Stopped at the iteration limit.';
          return;
        }
      }
    } catch (error) {
      if (myGeneration !== generation) return;
      status.textContent = `Stopped: ${String(error)}`;
      return;
    }
    frame += 1;
    await new Promise(requestAnimationFrame);
  }
}

function report(m: { steps: number; rampPressure: number; residual: number }): void {
  status.textContent =
    m.residual === 0
      ? `Iteration ${m.steps}. The free stream is already the steady solution.`
      : `Iteration ${m.steps}. Residual ${m.residual.toExponential(1)} of its initial value.`;
  if (exactPressure === null) {
    comparison.textContent = '';
    return;
  }
  const error = ((m.rampPressure / exactPressure - 1) * 100).toFixed(2);
  // toFixed keeps the sign of tiny negative errors ("-0.00").
  const signed = Number(error) > 0 ? `+${error}` : Number(error) < 0 ? error : '0.00';
  comparison.textContent =
    `Ramp pressure (wall cells, x from ${PLATEAU.x0} to ${PLATEAU.x1}): ` +
    `computed ${m.rampPressure.toFixed(4)}, exact ${exactPressure.toFixed(4)} ` +
    `(${signed}%), in units of the free-stream pressure.`;
}

legendBar.style.background = legendGradient();
sizeCanvas();
gpu = await setUpGpu('canvas').catch(() => null);
engineNote.textContent = gpu
  ? 'Running on your GPU (WebGPU).'
  : 'WebGPU is not available in this browser, so the CPU engine runs on a coarser grid.';
for (const input of [machInput, angleInput, resolutionSelect]) {
  input.addEventListener('input', () => void restart());
}
fieldSelect.addEventListener('input', () => void redraw());
window.addEventListener('resize', () => {
  sizeCanvas();
  void redraw();
});
await restart();
