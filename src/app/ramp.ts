/**
 * Supersonic ramp demo: steady flow over a compression ramp (oblique
 * shock) or an expansion corner (Prandtl-Meyer fan), solved live and drawn
 * full window as numerical schlieren or a colour-mapped field, with the
 * ramp pressure compared against the exact solution as the run converges.
 *
 * Runs on the GPU when WebGPU is available, otherwise on the CPU engine at
 * reduced resolution.
 */

import { Euler2D, type Euler2DConfig } from '../engine-cpu/euler2d';
import { GpuEuler2D, gpuPrimitive2D } from '../engine-gpu/euler2d-gpu';
import { rampGrid } from '../grid/shapes';
import type { StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';
import { colormapTable, hexToRgb, SCHLIEREN_DARK, SCHLIEREN_LIGHT } from '../render/colormap';
import { FieldRenderer, domainToPixels, type PixelArea } from '../render/field-renderer';
import { CanvasPresenter, CopyPresenter, type Presenter } from '../render/presenter';
import { displayField, type DisplayField } from '../render/fields';
import {
  deflectionAngle,
  machFromPrandtlMeyer,
  maxDeflectionWaveAngle,
  obliqueShock,
  prandtlMeyer,
  stagnationPressureRatio,
} from '../validation/gas-dynamics';
import { element } from '../ui/dom';
import {
  formatCount,
  formatDegrees,
  formatExponent,
  formatFixed,
  formatGrid,
  formatSignedPercent,
} from '../ui/format';
import { colourScaleSection, schlierenSection } from '../ui/help';
import type { KeyBinding } from '../ui/keymap';
import { Legend } from '../ui/legend';
import { ModeBar } from '../ui/modebar';
import { Readout, type ReadoutKind } from '../ui/readout';
import { Shell } from '../ui/shell';

const GAMMA = 1.4;
const DEG = Math.PI / 180;
/**
 * Light on dark, schlieren is shaded from the cube of the gradient's
 * fraction of its largest, with a contrast to match: the captured shock,
 * smeared over two or three cells, reads as a line (drawing only).
 */
const LIT_SCHLIEREN = { contrast: 12, exponent: 3 } as const;
/** Domain: corner at x = 0, inflow at x = -0.5, outflow at x = 1.5, top at y = 1.2. */
const DOMAIN = { xMin: -0.5, xCorner: 0, xMax: 1.5, height: 1.2 } as const;
/** Ramp-face window, away from the corner and the outflow, over which pressure is compared. */
const PLATEAU = { x0: 0.5, x1: 1.2 } as const;

// ---------------------------------------------------------------- the page

type Action = 'field-1' | 'field-2' | 'field-3' | 'field-4' | 'grid' | 'pause' | 'restart';

const FIELD_KEYS: readonly { field: DisplayField; key: string; label: string; name: string }[] = [
  { field: 'schlieren', key: '1', label: 'Schlieren', name: 'Schlieren' },
  { field: 'mach', key: '2', label: 'Mach', name: 'Mach number' },
  { field: 'pressure', key: '3', label: 'Pressure', name: 'Pressure' },
  { field: 'density', key: '4', label: 'Density', name: 'Density' },
];

const BINDINGS: readonly KeyBinding<Action>[] = [
  { keys: ['1'], action: 'field-1', description: 'Schlieren', label: ['1'] },
  { keys: ['2'], action: 'field-2', description: 'Mach number' },
  { keys: ['3'], action: 'field-3', description: 'Pressure, over the free stream’s' },
  { keys: ['4'], action: 'field-4', description: 'Density, over the free stream’s' },
  { keys: ['g'], action: 'grid', description: 'Grid lines' },
  { keys: [' '], action: 'pause', description: 'Pause or resume the run' },
  { keys: ['r'], action: 'restart', description: 'Run again from the free stream' },
];

/** The legend of each field: its name, units and what it shows. */
const FIELD_SCALES: Readonly<Record<DisplayField, { title: string; units: string; note: string }>> =
  {
    schlieren: {
      title: 'Schlieren',
      units: '',
      note: 'Light where the density changes fast: the shock.',
    },
    mach: { title: 'Mach number', units: '', note: '' },
    pressure: { title: 'Pressure', units: 'p / p∞', note: '' },
    density: { title: 'Density', units: 'ρ / ρ∞', note: '' },
  };

let field: DisplayField = 'schlieren';
let showGrid = false;
let paused = false;

const shell = new Shell<Action>({
  root: '../',
  page: 'ramp',
  title: 'Supersonic ramp',
  bindings: BINDINGS,
  view: [
    ...FIELD_KEYS.map((f) => ({
      label: f.name,
      key: f.key,
      action: () => {
        setField(f.field);
      },
      pressed: () => field === f.field,
    })),
    { label: 'Grid lines', key: 'G', action: toggleGrid, pressed: () => showGrid },
  ],
  onAction: (action) => {
    switch (action) {
      case 'field-1':
      case 'field-2':
      case 'field-3':
      case 'field-4':
        setField(FIELD_KEYS[Number(action.slice(-1)) - 1]!.field);
        break;
      case 'grid':
        toggleGrid();
        break;
      case 'pause':
        togglePause();
        break;
      case 'restart':
        void restart();
        break;
    }
  },
  help: {
    title: 'Supersonic ramp: keys and help',
    sections: [
      {
        title: 'This page',
        body: [
          'Steady supersonic flow over a wall that turns into the stream (an oblique shock) or away from it (a Prandtl-Meyer expansion fan), solved live from a uniform free stream.',
          'The pressure on the ramp, averaged over the wall cells from x = 0.5 to 1.2 (away from the corner and the outflow), is compared with the exact solution as the run converges. This page shows the solver against exact theory, so it has no error band: the difference is the measured error.',
        ],
      },
      schlierenSection(),
      colourScaleSection(),
    ],
  },
});

let canvas = element('#flow', HTMLCanvasElement);
const overlay = element('#overlay', HTMLCanvasElement);
const machInput = element('#mach', HTMLInputElement);
const angleInput = element('#angle', HTMLInputElement);
const resolutionSelect = element('#resolution', HTMLSelectElement);
const machLabel = element('#mach-value', HTMLOutputElement);
const angleLabel = element('#angle-value', HTMLOutputElement);
const pauseButton = element('#pause', HTMLButtonElement);
const restartButton = element('#restart', HTMLButtonElement);
const computedText = element('#computed', HTMLElement);
const exactText = element('#exact', HTMLElement);
const differenceText = element('#difference', HTMLElement);
const runBadge = element('#run-badge', HTMLElement);
const comparison = element('#comparison', HTMLElement);
const engineNote = element('#engine-note', HTMLElement);

const readout = new Readout([
  [
    { id: 'mach', label: 'M' },
    { id: 'angle', label: 'ramp' },
    { id: 'grid', label: 'grid' },
  ],
  [
    { id: 'iteration', label: 'iteration' },
    { id: 'residual', label: 'residual' },
  ],
  [{ id: 'engine' }, { id: 'state' }],
]);
document.querySelector('main')?.append(readout.element);

const legend = new Legend();
const modes = new ModeBar<DisplayField, 'grid'>({
  modes: FIELD_KEYS.map((f) => ({ id: f.field, label: f.label, key: f.key })),
  toggles: [{ id: 'grid', label: 'Grid', key: 'G' }],
  onMode: setField,
  onToggle: toggleGrid,
});
shell.bottom.append(legend.element, modes.element);
modes.setMode(field);
modes.setToggle('grid', showGrid);

function setField(next: DisplayField): void {
  field = next;
  modes.setMode(next);
  shell.topBar.refresh();
  void redraw();
}

function toggleGrid(): void {
  showGrid = !showGrid;
  modes.setToggle('grid', showGrid);
  shell.topBar.refresh();
  drawOverlay();
}

function togglePause(): void {
  paused = !paused;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  if (!paused) {
    const resume = resumeRun;
    resumeRun = null;
    resume?.();
  }
  showState(paused ? 'Paused' : 'Running');
}

pauseButton.addEventListener('click', togglePause);
restartButton.addEventListener('click', () => void restart());

/** The run's state in the readout and the panel's badge, a word as well as a colour. */
function showState(text: string, kind: ReadoutKind = ''): void {
  readout.set('state', text, kind);
  for (const badge of [runBadge, shell.sheet.pinned.querySelector('.badge')]) {
    if (badge === null) continue;
    badge.textContent = text;
    badge.className = `badge${kind === '' ? '' : ` badge--${kind}`}`;
  }
  // An outcome (not every step) is said once: the readout and the pinned line are not live.
  if (kind === 'bad') shell.announce(text);
  else if (kind !== '') {
    const exact = exactText.textContent === '' ? '' : `, exact ${exactText.textContent}`;
    shell.announce(`${text}: ramp pressure ${computedText.textContent}${exact}.`);
  }
}

/** Show the colour scale of the field just drawn. */
function showLegend(shown: DisplayField, range: { min: number; max: number }): void {
  const scale = FIELD_SCALES[shown];
  if (shown === 'schlieren')
    legend.show({ kind: 'schlieren', title: scale.title, note: scale.note });
  else legend.show({ kind: 'colormap', title: scale.title, units: scale.units, ...range });
}

// ------------------------------------------------------------ the physics

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
  /** Draw a field into an area of the canvas; resolves with its minimum and maximum, for the legend. */
  draw(field: DisplayField, area: PixelArea): Promise<{ min: number; max: number }>;
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
  const background = groundColour();
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
    draw: async (shown, area) => {
      renderer.render(
        presenter.frameTexture(),
        solver.stateBuffer,
        {
          field: shown,
          gamma: GAMMA,
          schlierenContrast: LIT_SCHLIEREN.contrast,
          schlierenExponent: LIT_SCHLIEREN.exponent,
          schlierenStyle: 'light-on-dark',
        },
        background,
        area,
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
    draw: (shown, area) => {
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
      const nodes = displayField(config.grid, state, shown, GAMMA);
      drawCells2D(config.grid, nodes, shown, colours, area);
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

const SCHLIEREN_RGB = [hexToRgb(SCHLIEREN_DARK), hexToRgb(SCHLIEREN_LIGHT)] as const;

function drawCells2D(
  grid: StructuredGrid,
  nodes: Float64Array,
  shown: DisplayField,
  colours: Float32Array,
  area: PixelArea,
): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = cssColour('--ground');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const toPixels = domainToPixels(grid, area);
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
      let rgb: number[];
      if (shown === 'schlieren') {
        // Light on dark: the shade inverted, between the two schlieren colours.
        const fraction = Math.max(value, 0) / hi;
        const t = 1 - Math.exp(-LIT_SCHLIEREN.contrast * fraction ** LIT_SCHLIEREN.exponent);
        const [dark, light] = SCHLIEREN_RGB;
        rgb = [0, 1, 2].map((c) => Math.round(255 * (dark[c]! + t * (light[c]! - dark[c]!))));
      } else {
        const k = Math.round((255 * (value - lo)) / Math.max(hi - lo, 1e-30));
        rgb = [0, 1, 2].map((c) => Math.round(255 * colours[4 * k + c]!));
      }
      ctx.fillStyle = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
      ctx.beginPath();
      corners.forEach((n, k) => {
        const [px, py] = toPixels(grid.x[n]!, grid.y[n]!);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      // Hairline in the same colour hides anti-aliasing seams between cells.
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
    }
  }
}

function cssColour(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function groundColour(): GPUColor {
  const [r, g, b] = hexToRgb(cssColour('--ground'));
  return { r, g, b, a: 1 };
}

// ------------------------------------------------- drawing over the field

/**
 * The part of the canvas the flow is fitted into, in pixels: the whole
 * width of the view, between the top bar and the bottom row, so that the
 * wall and its corner stay clear of the legend; the panels float over it.
 */
function drawingArea(target: HTMLCanvasElement = canvas): PixelArea {
  // Pixels of this canvas per CSS pixel.
  const scale = target.width / Math.max(1, target.clientWidth);
  const rect = shell.viewRect(true);
  return {
    x: Math.round(scale * rect.x),
    y: Math.round(scale * rect.y),
    width: Math.max(1, Math.round(scale * rect.width)),
    height: Math.max(1, Math.round(scale * rect.height)),
  };
}

/** The area and run the overlay was last drawn for. */
let overlayDrawn: { area: PixelArea; run: Run | null; grid: boolean } | null = null;

/**
 * The wall as a solid below the flow, and the grid lines if asked for, on
 * the overlay canvas with the same fit as the field; drawn again only when
 * the area, the run or the grid lines change.
 */
function drawOverlay(area = drawingArea(overlay)): void {
  const current = run;
  const last = overlayDrawn;
  if (
    last?.run === current &&
    last.grid === showGrid &&
    last.area.x === area.x &&
    last.area.y === area.y &&
    last.area.width === area.width &&
    last.area.height === area.height
  ) {
    return;
  }
  overlayDrawn = { area, run: current, grid: showGrid };
  const ctx = overlay.getContext('2d');
  if (ctx === null) return;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (current === null) return;
  const { grid } = current;
  const toPixels = domainToPixels(grid, area);
  const dpr = window.devicePixelRatio || 1;
  const row = grid.ni + 1;
  const node = (i: number, j: number) => toPixels(grid.x[i + j * row]!, grid.y[i + j * row]!);

  if (showGrid) {
    ctx.strokeStyle = 'rgb(255 255 255 / 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let j = 0; j <= grid.nj; j++) {
      for (let i = 0; i <= grid.ni; i++) {
        const [x, y] = node(i, j);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    for (let i = 0; i <= grid.ni; i++) {
      for (let j = 0; j <= grid.nj; j++) {
        const [x, y] = node(i, j);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  // The wall: the solid below the first row of nodes, as wide as the field.
  const wall: [number, number][] = [];
  for (let i = 0; i <= grid.ni; i++) wall.push(node(i, 0));
  const [left] = wall[0]!;
  const [right] = wall[wall.length - 1]!;
  const trace = () => {
    ctx.beginPath();
    wall.forEach(([x, y], k) => {
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
  };
  trace();
  ctx.lineTo(right, overlay.height + 10);
  ctx.lineTo(left, overlay.height + 10);
  ctx.closePath();
  ctx.fillStyle = cssColour('--body');
  ctx.fill();
  trace();
  ctx.strokeStyle = cssColour('--body-edge');
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();
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
  for (const name of ['id', 'role', 'aria-label', 'tabindex']) {
    const value = canvas.getAttribute(name);
    if (value !== null) fresh.setAttribute(name, value);
  }
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
/** Resolves the pause of the running loop. */
let resumeRun: (() => void) | null = null;

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
    sizeCanvas();
    const continuation = gpu
      ? 'Continuing on the GPU, copying each frame (slower).'
      : 'Continuing on the CPU engine, on a coarser grid.';
    engineNote.textContent = `${reason} ${continuation}`;
    readout.set('engine', gpu ? 'GPU (copy)' : 'CPU engine');
    shell.toasts.show(`${reason} ${continuation}`, 'warn', 6);
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
  angleLabel.value = formatDegrees(angle, true);
  readout.set('mach', mach.toFixed(1));
  readout.set('angle', formatDegrees(angle, true));
  return { mach, angle };
}

/**
 * Size both canvases to the viewport, in device pixels; frames copied from
 * the GPU to the page (CopyPresenter, a software fallback) at half that,
 * since copying every pixel of every frame would slow the solver's pace.
 */
function sizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const copied = gpu?.presenter instanceof CopyPresenter ? 0.5 : 1;
  for (const [c, scale] of [
    [canvas, dpr * copied],
    [overlay, dpr],
  ] as const) {
    // Set only when changed: setting a canvas's size clears it.
    const width = Math.max(1, Math.round(c.clientWidth * scale));
    const height = Math.max(1, Math.round(c.clientHeight * scale));
    if (c.width !== width) c.width = width;
    if (c.height !== height) c.height = height;
  }
}

async function restart(): Promise<void> {
  await engineReady;
  const myGeneration = ++generation;
  run?.dispose();
  run = null;
  // A new run starts running; the paused loop of the old one ends.
  if (paused) togglePause();
  const { mach, angle } = updateLabels();
  exactPressure = exactRampPressure(mach, angle * DEG);
  const [ni, nj] = resolutionSelect.value.split('x').map(Number) as [number, number];
  // The CPU fallback runs a coarser grid to stay interactive.
  const scale = gpu ? 1 : 0.5;
  const config = solverConfig(mach, angle * DEG, Math.round(ni * scale), Math.round(nj * scale));
  readout.set('grid', formatGrid(config.grid.ni, config.grid.nj));
  readout.set('iteration', null);
  readout.set('residual', null);
  showState('Starting');
  let next: Run;
  try {
    next = gpu ? await gpuRun(gpu.device, gpu.presenter, config) : cpuRun(config);
  } catch (error) {
    // A run being set up on a device that was replaced meanwhile may fail;
    // only a failure of the current run is news.
    if (myGeneration === generation) showState(`Could not start: ${String(error)}`, 'bad');
    return;
  }
  if (myGeneration !== generation) {
    next.dispose();
    return;
  }
  run = next;
  drawOverlay();
  showState(paused ? 'Paused' : 'Running');
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
  const shown = field;
  const area = drawingArea();
  drawOverlay();
  drawing = current
    .draw(shown, area)
    .then((range) => {
      if (myGeneration === generation) showLegend(shown, range);
    })
    .catch((error: unknown) => {
      if (myGeneration === generation) showState(`Drawing failed: ${String(error)}`, 'bad');
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

/** Resolves when the run is not paused. */
function whileUnpaused(): Promise<void> {
  if (!paused) return Promise.resolve();
  return new Promise((resolve) => {
    resumeRun = resolve;
  });
}

async function loop(myGeneration: number): Promise<void> {
  let frame = 0;
  let previousPressure = NaN;
  while (myGeneration === generation && run !== null) {
    const current = run;
    try {
      await whileUnpaused();
      if (myGeneration !== generation) return;
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
          showState('Converged', 'ok');
          return;
        }
        if (m.steps >= MAX_ITERATIONS) {
          showState('Stopped at the iteration limit', 'warn');
          return;
        }
      }
    } catch (error) {
      if (myGeneration !== generation) return;
      showState(`Stopped: ${String(error)}`, 'bad');
      return;
    }
    frame += 1;
    await new Promise(requestAnimationFrame);
  }
}

function report(m: { steps: number; rampPressure: number; residual: number }): void {
  readout.set('iteration', formatCount(m.steps));
  readout.set('residual', m.residual === 0 ? '0' : formatExponent(m.residual, 1));
  if (m.residual === 0) {
    comparison.textContent = 'The free stream is already the steady solution.';
  }
  if (exactPressure === null) {
    computedText.textContent = formatFixed(m.rampPressure, 4);
    exactText.textContent = '';
    differenceText.textContent = '';
    shell.sheet.pinned.textContent = '';
    return;
  }
  const difference = formatSignedPercent(m.rampPressure / exactPressure - 1, 2);
  computedText.textContent = formatFixed(m.rampPressure, 4);
  exactText.textContent = formatFixed(exactPressure, 4);
  differenceText.textContent = difference;
  if (m.residual !== 0) {
    comparison.textContent =
      `Wall cells from x = ${PLATEAU.x0} to ${PLATEAU.x1}, over the free-stream pressure; ` +
      'exact: the oblique shock or Prandtl-Meyer fan.';
  }
  const badge = runBadge.cloneNode(true) as HTMLElement;
  badge.removeAttribute('id');
  shell.sheet.pinned.replaceChildren(
    `Ramp ${formatFixed(m.rampPressure, 4)}`,
    Object.assign(document.createElement('span'), {
      className: 'mono muted',
      textContent: `exact ${formatFixed(exactPressure, 4)} ${difference}`,
    }),
    badge,
  );
}

sizeCanvas();
gpu = await setUpGpu('canvas').catch(() => null);
const note = gpu
  ? 'Running on your GPU (WebGPU).'
  : 'WebGPU is not available in this browser, so the CPU engine runs on a coarser grid.';
engineNote.textContent = note;
readout.set('engine', gpu ? 'GPU' : 'CPU engine');
for (const input of [machInput, angleInput, resolutionSelect]) {
  input.addEventListener('input', () => void restart());
}
shell.onLayout(() => {
  sizeCanvas();
  overlayDrawn = null;
  drawOverlay();
  void redraw();
});
await restart();
