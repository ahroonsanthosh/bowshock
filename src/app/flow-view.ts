/**
 * Live flow: the flow around the Basic Finner's nose and body, solved as
 * the nose drag page solves it (src/analysis/gpu-fitted-flow.ts: the bow
 * shock fitted, on nested grids, with the drag's band measured from them)
 * and drawn full window by the flow view straight from the GPU's buffers
 * while it converges (docs/design/0012-interface.md, phase U1).
 *
 * Query parameters, for tests and links: mach (default 2), finest (the
 * finest refinement: 1, 2, 4 or 8 for 20 to 160 cells across; default 8),
 * field (schlieren, mach, cp, density).
 */

import { verifiedFittedDragGpu } from '../analysis/gpu-fitted-flow';
import {
  FITTED_DRAG_FLOOR,
  ORDER_TOLERANCE,
  type LevelReport,
  type VerifiedDrag,
} from '../analysis/verified-drag';
import { GpuExecutionError } from '../engine-gpu/gpu-common';
import type { LiveFit } from '../engine-gpu/shock-fitting-gpu';
import { bodyLength, bodyRadius, type Body } from '../geometry/body';
import type { FlowField } from '../render/flow-fields';
import { liveFitSource } from '../render/flow-source';
import { presentationFor } from '../render/presenter';
import { basicFinnerBody } from '../validation/basic-finner';
import { withBand } from './band';
import { element, h } from '../ui/dom';
import { FlowView, type FlowScale } from '../ui/flow-view';
import { formatCount, formatExponent, formatFixed, formatGrid, formatRate } from '../ui/format';
import { bandSection, colourScaleSection, schlierenSection } from '../ui/help';
import type { KeyBinding } from '../ui/keymap';
import { Legend } from '../ui/legend';
import { ModeBar } from '../ui/modebar';
import { Readout, type ReadoutKind } from '../ui/readout';
import { Shell } from '../ui/shell';

const GAMMA = 1.4;

/** The body's outline (x, r) from the tip to the base, and down the base to the axis. */
function outline(body: Body): [number, number][] {
  const end = bodyLength(body);
  const nose = body.nose.length;
  const points: [number, number][] = [];
  const n = 96;
  for (let k = 0; k <= n; k++) {
    // Denser near the tip, where a curved nose bends most.
    const x = nose * (k / n) ** 1.5;
    points.push([x, bodyRadius(body, x)]);
  }
  if (end > nose) points.push([end, bodyRadius(body, end)]);
  points.push([end, 0]);
  return points;
}

// ----------------------------------------------------------- the controls

type Action =
  | 'field-1'
  | 'field-2'
  | 'field-3'
  | 'field-4'
  | 'split'
  | 'grid'
  | 'shock'
  | 'fit'
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'png'
  | 'pause'
  | 'again';

const FIELDS: readonly { field: FlowField; key: string; label: string; name: string }[] = [
  { field: 'schlieren', key: '1', label: 'Schlieren', name: 'Schlieren' },
  { field: 'mach', key: '2', label: 'Mach', name: 'Mach number' },
  { field: 'cp', key: '3', label: 'Cp', name: 'Pressure coefficient' },
  { field: 'density', key: '4', label: 'Density', name: 'Density' },
];

const BINDINGS: readonly KeyBinding<Action>[] = [
  { keys: ['1'], action: 'field-1', description: 'Schlieren: the density gradient, light on dark' },
  { keys: ['2'], action: 'field-2', description: 'Mach number' },
  { keys: ['3'], action: 'field-3', description: 'Pressure coefficient' },
  { keys: ['4'], action: 'field-4', description: 'Density, over the free stream’s' },
  {
    keys: ['d'],
    action: 'split',
    description: 'Split view: schlieren above the axis, the field chosen below',
  },
  { keys: ['g'], action: 'grid', description: 'Grid lines' },
  { keys: ['s'], action: 'shock', description: 'The fitted shock as a line' },
  { keys: ['f'], action: 'fit', description: 'Fit the body to the view (also a double click)' },
  {
    keys: ['+', '='],
    action: 'zoom-in',
    description: 'Zoom in (also the wheel, or a pinch)',
    repeat: true,
    label: ['+'],
  },
  { keys: ['-', '_'], action: 'zoom-out', description: 'Zoom out', repeat: true, label: ['−'] },
  {
    keys: ['ArrowLeft'],
    action: 'pan-left',
    description: 'Pan (also a drag)',
    repeat: true,
    label: ['←', '→', '↑', '↓'],
  },
  { keys: ['ArrowRight'], action: 'pan-right', description: '', repeat: true },
  { keys: ['ArrowUp'], action: 'pan-up', description: '', repeat: true },
  { keys: ['ArrowDown'], action: 'pan-down', description: '', repeat: true },
  { keys: ['k'], action: 'png', description: 'Save a PNG of the view' },
  { keys: [' '], action: 'pause', description: 'Pause or resume the solver' },
  { keys: ['r'], action: 'again', description: 'Run again from the start' },
];

/** The legend of each colour field. */
const SCALES: Readonly<Record<Exclude<FlowField, 'schlieren'>, { title: string; units: string }>> =
  {
    mach: { title: 'Mach number', units: '' },
    cp: { title: 'Pressure coefficient', units: 'Cp' },
    density: { title: 'Density', units: 'ρ / ρ∞' },
  };

const params = new URLSearchParams(location.search);
const flowField = (value: string | null): FlowField =>
  FIELDS.find((f) => f.field === value)?.field ?? 'schlieren';

const machSelect = element('#mach', HTMLSelectElement);
const finestSelect = element('#finest', HTMLSelectElement);
const pauseButton = element('#pause', HTMLButtonElement);
const againButton = element('#again', HTMLButtonElement);
const dragText = element('#drag', HTMLElement);
const statusBadge = element('#status', HTMLElement);
const resultText = element('#result', HTMLElement);
const levels = element('#levels', HTMLTableElement);
const canvas = element('#flow', HTMLCanvasElement);
for (const [select, key] of [
  [machSelect, 'mach'],
  [finestSelect, 'finest'],
] as const) {
  const value = params.get(key);
  if (value !== null && Array.from(select.options).some((o) => o.value === value)) {
    select.value = value;
  }
}

let view: FlowView | null = null;

const shell = new Shell<Action>({
  root: '../',
  page: 'flow',
  title: 'Live flow',
  bindings: BINDINGS,
  view: [
    ...FIELDS.map((f) => ({
      label: f.name,
      key: f.key,
      action: () => view?.setField(f.field),
      pressed: () => view?.shown.field === f.field,
    })),
    {
      label: 'Split view',
      key: 'D',
      action: () => view?.toggleSplit(),
      pressed: () => view?.shown.split === true,
    },
    {
      label: 'Grid lines',
      key: 'G',
      action: () => view?.toggleGrid(),
      pressed: () => view?.shown.grid === true,
    },
    {
      label: 'Shock line',
      key: 'S',
      action: () => view?.toggleShock(),
      pressed: () => view?.shown.shock === true,
    },
    { label: 'Fit to the view', key: 'F', action: () => view?.fit() },
    { label: 'Save a PNG', key: 'K', action: () => void savePng() },
  ],
  onAction: (action) => {
    act(action);
  },
  help: {
    title: 'Live flow: keys and help',
    sections: [
      {
        title: 'This page',
        body: [
          'The flow around the Basic Finner’s nose cone and body at zero incidence, solved on your GPU as the nose drag page solves it: the bow shock fitted as the outer boundary of the grid, on grids each twice as fine as the one before, until the finest chosen.',
          'Each grid’s flow is drawn from the GPU’s memory while it converges, mirrored about the axis. Each cell’s own value is drawn at its centre, with straight blends between centres. The body is solid grey; the white line is the fitted bow shock.',
        ],
      },
      schlierenSection(),
      colourScaleSection(),
      bandSection(),
    ],
  },
});

const readout = new Readout([
  [
    { id: 'mach', label: 'M' },
    { id: 'alpha', label: 'α' },
    { id: 'grid', label: 'grid' },
  ],
  [
    { id: 'step', label: 'step' },
    { id: 'shock', label: 'shock speed' },
    { id: 'cd', label: 'wave Cd, this grid' },
  ],
  [{ id: 'rate' }, { id: 'gpu' }],
  [{ id: 'state' }],
]);
document.querySelector('main')?.append(readout.element);

const legend = new Legend();
const modes = new ModeBar<FlowField, 'split' | 'grid' | 'shock'>({
  modes: FIELDS.map((f) => ({ id: f.field, label: f.label, key: f.key, hint: f.name })),
  toggles: [
    { id: 'split', label: 'Split', key: 'D' },
    { id: 'grid', label: 'Grid', key: 'G' },
    { id: 'shock', label: 'Shock', key: 'S' },
  ],
  onMode: (field) => view?.setField(field),
  onToggle: (toggle) => {
    if (toggle === 'split') view?.toggleSplit();
    else if (toggle === 'grid') view?.toggleGrid();
    else view?.toggleShock();
  },
});
shell.bottom.append(legend.element, modes.element);

function act(action: Action): void {
  const v = view;
  if (v === null) return;
  switch (action) {
    case 'field-1':
    case 'field-2':
    case 'field-3':
    case 'field-4':
      v.setField(FIELDS[Number(action.slice(-1)) - 1]!.field);
      break;
    case 'split':
      v.toggleSplit();
      break;
    case 'grid':
      v.toggleGrid();
      break;
    case 'shock':
      v.toggleShock();
      break;
    case 'fit':
      v.fit();
      break;
    case 'zoom-in':
      v.zoom(1.25);
      break;
    case 'zoom-out':
      v.zoom(0.8);
      break;
    case 'pan-left':
      v.panFraction(-0.08, 0);
      break;
    case 'pan-right':
      v.panFraction(0.08, 0);
      break;
    case 'pan-up':
      v.panFraction(0, 0.08);
      break;
    case 'pan-down':
      v.panFraction(0, -0.08);
      break;
    case 'png':
      void savePng();
      break;
    case 'pause':
      togglePause();
      break;
    case 'again':
      void start();
      break;
  }
}

/** The phone's View tab: the view's toggles and actions as buttons (the mode bar keeps the fields). */
const viewButtons = (
  [
    ['Split view', 'split', () => view?.toggleSplit()],
    ['Grid lines', 'grid', () => view?.toggleGrid()],
    ['Shock line', 'shock', () => view?.toggleShock()],
    ['Fit to the view', null, () => view?.fit()],
    ['Save a PNG', null, () => void savePng()],
  ] as const
).map(([label, toggle, action]) => {
  const button = h('button', {
    className: 'button',
    text: label,
    attrs: { type: 'button', 'aria-pressed': toggle === null ? null : 'false' },
  });
  button.addEventListener('click', action);
  element('#view-controls', HTMLElement).append(button);
  return { button, toggle };
});

/** Reflect what the view shows in the mode bar, the View tab and the menus. */
function showViewState(): void {
  if (view === null) return;
  const s = view.shown;
  modes.setMode(s.field);
  modes.setToggle('split', s.split);
  modes.setToggle('grid', s.grid);
  modes.setToggle('shock', s.shock);
  for (const { button, toggle } of viewButtons) {
    if (toggle !== null) button.setAttribute('aria-pressed', String(s[toggle]));
  }
  shell.topBar.refresh();
  if (s.field === 'schlieren' && !s.split) {
    legend.show({
      kind: 'schlieren',
      title: 'Schlieren',
      note: 'Density gradient, light on dark. The bow shock is the white line.',
    });
  }
}

function showScale(scale: FlowScale): void {
  if (scale.field === 'schlieren') return;
  const { title, units } = SCALES[scale.field];
  legend.show({
    kind: 'colormap',
    title,
    units,
    min: scale.min,
    max: scale.max,
    note: scale.split ? 'Below the axis; schlieren above it.' : '',
  });
}

/** What the PNG says it shows: the case, the grid, and the value with its status. */
function caption(): string[] {
  const mach = formatFixed(Number(machSelect.value), 2);
  const value =
    outcomeShown || lastDrag === null
      ? `wave Cd ${dragText.textContent} (${statusBadge.textContent})`
      : `wave Cd on this grid ${lastDrag.toFixed(5)} (solving, not verified)`;
  return [`bowshock: the Basic Finner, M ${mach}, α 0°, grid ${shownGrid}`, value];
}

async function savePng(): Promise<void> {
  if (view === null) return;
  const name = `bowshock-basic-finner-M${machSelect.value}-${view.shown.split ? 'split' : view.shown.field}.png`;
  try {
    await view.savePng(name, caption());
    shell.toasts.show(`Saved ${name}`);
  } catch (error) {
    shell.toasts.show(`Could not save the PNG: ${String(error)}`, 'bad');
  }
}

// --------------------------------------------------------------- the run

let paused = false;
let resume: (() => void) | null = null;
let controller: AbortController | null = null;
let generation = 0;
/** The run on the GPU; settled once it has released its grids. */
let running: Promise<void> = Promise.resolve();
/** Why the GPU was lost, once it has been. */
let lost: string | null = null;
/** The grid drawn, the latest check's drag on it, and whether an outcome is shown. */
let shownGrid = '';
let lastDrag: number | null = null;
let outcomeShown = false;

/** Resolves when the run is not paused (or has been stopped). */
function gate(): Promise<void> {
  if (!paused) return Promise.resolve();
  return new Promise((resolve) => {
    resume = resolve;
  });
}

function setPaused(value: boolean): void {
  paused = value;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  if (!paused) {
    resume?.();
    resume = null;
  }
}

/** Pause or resume the run (nothing to do without one). */
function togglePause(): void {
  if (controller === null) return;
  setPaused(!paused);
  showState(paused ? 'Paused' : 'Solving', '');
  view?.setLive(!paused);
}

pauseButton.disabled = true;
pauseButton.addEventListener('click', togglePause);
againButton.addEventListener('click', () => void start());
machSelect.addEventListener('change', () => void start());
finestSelect.addEventListener('change', () => void start());

function showState(text: string, kind: ReadoutKind): void {
  readout.set('state', text, kind);
}

function badge(text: string, kind: ReadoutKind): void {
  statusBadge.textContent = text;
  statusBadge.className = `badge${kind === '' ? '' : ` badge--${kind}`}`;
  pin();
}

/** The phone's pinned line: the value and its status, always in view (not a live region). */
function pin(value = dragText.textContent): void {
  const copy = statusBadge.cloneNode(true) as HTMLElement;
  copy.removeAttribute('id');
  shell.sheet.pinned.replaceChildren(
    h(
      'span',
      {},
      'Wave C',
      h('sub', { text: 'D' }),
      ' ',
      h('span', { className: 'mono', text: value }),
    ),
    copy,
  );
}

function addLevel(report: LevelReport): void {
  levels.hidden = false;
  levels.tBodies[0]!.append(
    h(
      'tr',
      {},
      h('td', { text: formatGrid(report.cells.ni, report.cells.nj) }),
      h('td', { text: formatCount(report.iterations) }),
      h('td', { text: report.drag.toFixed(6) }),
    ),
  );
}

/**
 * An end of a run: the value (or none), the status in words and colour in
 * the badge and the readout, the reason in the panel, and all of it said
 * once to screen readers. Green only for a measured band.
 */
function settle(value: string, status: string, kind: ReadoutKind, reason: string): void {
  outcomeShown = true;
  dragText.textContent = value;
  resultText.textContent = reason;
  badge(status, kind);
  showState(status, kind);
  shell.announce(`Wave drag coefficient ${value}: ${status}. ${reason}`);
}

/** The outcome of a run that was not stopped. */
function showOutcome(
  outcome: Exclude<VerifiedDrag, { kind: 'cancelled' }>,
  fallback: number | null,
): void {
  if (outcome.kind !== 'solved') {
    settle(
      'none',
      'Refused',
      'bad',
      `No result: on the grid at refinement ${outcome.refinement}, ${outcome.reason}.`,
    );
    return;
  }
  const e = outcome.estimate;
  const notes =
    (outcome.stopped === undefined
      ? ''
      : ` The grid at refinement ${outcome.stopped.refinement} was not solved: ${outcome.stopped.reason}; the result is from the grids before it.`) +
    (outcome.columnDensity === undefined || fallback === null
      ? ''
      : ` The grids have ${outcome.columnDensity} times the usual columns along the body: the usual grid at refinement ${fallback} fails the quality checks of fitted grids.`);
  if (outcome.uncertainty !== undefined) {
    settle(
      withBand(e.value, outcome.uncertainty),
      'Verified',
      'ok',
      `The band from ${outcome.levels.length} grids, including an allowance of ${FITTED_DRAG_FLOOR.toExponential(0)} of the value.${notes}`,
    );
    return;
  }
  const finest = finestSelect.selectedIndex === finestSelect.options.length - 1;
  const finer =
    outcome.stopped !== undefined
      ? 'no finer grid could be solved here'
      : finest
        ? 'no finer grid is offered here'
        : 'a finer finest grid may verify it';
  settle(
    e.value.toFixed(5),
    'Not verified',
    'warn',
    `No error band: ${e.kind === 'unresolved' ? e.reason : 'none measured'}. The finest grid’s value is shown, not verified; ${finer}.${notes}`,
  );
}

const lostText = (reason: string) =>
  `The GPU was lost (${reason}); reload the page to start it again.`;

/** The GPU failed or was lost: no value. */
function showGpuFailure(reason: string): void {
  settle('none', 'GPU failed', 'bad', reason);
}

/** Steps per second, from the checks of the grid being solved. */
let rate: { refinement: number; time: number; iterations: number; cells: number } | null = null;

async function run(device: GPUDevice, myGeneration: number): Promise<void> {
  const body = basicFinnerBody();
  const mach = Number(machSelect.value);
  const finest = Number(finestSelect.value);
  view?.setBody(outline(body));
  readout.set('mach', formatFixed(mach, 2));
  readout.set('alpha', '0°');
  for (const id of ['grid', 'step', 'shock', 'cd', 'rate']) readout.set(id, null);
  levels.tBodies[0]!.replaceChildren();
  levels.hidden = true;
  outcomeShown = false;
  lastDrag = null;
  dragText.textContent = '…';
  resultText.textContent = '';
  badge(`Solving, finest grid ${20 * finest} cells across`, '');
  showState('Solving', '');
  controller = new AbortController();
  pauseButton.disabled = false;
  view?.setLive(!paused);
  // Where the usual grids fail the quality checks of fitted grids and the
  // family is solved again with more columns: the grid that failed.
  let fallback: number | null = null;
  try {
    const outcome = await verifiedFittedDragGpu(device, body, {
      mach,
      gamma: GAMMA,
      // No early stop: always refine to the finest grid chosen, as the drag page does.
      tolerance: 0,
      maxRefinement: finest,
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
      signal: controller.signal,
      gate,
      onLive: (live: LiveFit | null, refinement) => {
        if (myGeneration !== generation) return;
        if (live === null) {
          view?.freeze();
          return;
        }
        rate = { refinement, time: performance.now(), iterations: 0, cells: live.ni * live.nj };
        shownGrid = formatGrid(live.ni, live.nj);
        readout.set('grid', shownGrid);
        view?.setSource(liveFitSource(live));
      },
      onCheck: (refinement, iterations, speed, drag) => {
        if (myGeneration !== generation) return;
        lastDrag = drag;
        readout.set('step', formatCount(iterations));
        readout.set('shock', formatExponent(speed, 1));
        readout.set('cd', drag.toFixed(5));
        pin(`${drag.toFixed(5)} this grid`);
        const now = performance.now();
        if (rate?.refinement === refinement && now > rate.time && !paused) {
          const perSecond =
            ((iterations - rate.iterations) * rate.cells * 1000) / (now - rate.time);
          readout.set('rate', formatRate(perSecond, 'cell'));
        }
        rate = { refinement, time: now, iterations, cells: rate?.cells ?? 0 };
      },
      onLevel: (report) => {
        if (myGeneration === generation) addLevel(report);
      },
      onFallback: (refinement) => {
        if (myGeneration !== generation) return;
        fallback = refinement;
        levels.tBodies[0]!.replaceChildren();
        levels.hidden = true;
        resultText.textContent = `The grid at refinement ${refinement} fails the quality checks of fitted grids: solving every grid again with more columns along the body.`;
      },
    });
    // A run stopped by a new one shows nothing: the new one shows its own.
    if (myGeneration !== generation || outcome.kind === 'cancelled') return;
    showOutcome(outcome, fallback);
  } catch (error) {
    if (myGeneration !== generation) return;
    const reason = error instanceof Error ? error.message : String(error);
    if (lost !== null) showGpuFailure(lostText(lost));
    else if (error instanceof GpuExecutionError) showGpuFailure(`The GPU failed: ${reason}.`);
    else settle('none', 'Refused', 'bad', `Cannot solve this case: ${reason}.`);
  } finally {
    if (myGeneration === generation) {
      controller = null;
      pauseButton.disabled = true;
      view?.setLive(false);
    }
  }
}

let device: GPUDevice | null = null;

async function start(): Promise<void> {
  const myGeneration = ++generation;
  // The run being stopped may release its grid at any moment from now:
  // the view keeps a copy of the flow it shows, and ignores that run.
  if (controller !== null) {
    view?.freeze();
    showState('Stopping the run before', '');
  }
  controller?.abort();
  controller = null;
  setPaused(false);
  if (device === null || view === null || lost !== null) return;
  // Two solves never share the GPU: wait until the run stopped has released its grids.
  await running;
  if (myGeneration !== generation) return;
  running = run(device, myGeneration);
  await running;
}

/** Nothing can run (no WebGPU, or the GPU failed or was lost). */
function disableRuns(): void {
  for (const control of [againButton, pauseButton, machSelect, finestSelect]) {
    control.disabled = true;
  }
}

async function startGpu(): Promise<void> {
  showState('Starting the GPU', '');
  const gpu = navigator.gpu as GPU | undefined;
  const adapter = await gpu?.requestAdapter().catch(() => null);
  if (!adapter) {
    disableRuns();
    settle(
      'none',
      'No WebGPU',
      'bad',
      'This page needs WebGPU, which this browser does not provide: try a recent Chrome or Edge.',
    );
    return;
  }
  let gpuDevice: GPUDevice;
  try {
    gpuDevice = await adapter.requestDevice({
      requiredLimits: {
        maxBufferSize: adapter.limits.maxBufferSize,
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      },
    });
  } catch (error) {
    disableRuns();
    showGpuFailure(`The GPU could not be started: ${String(error)}.`);
    return;
  }
  device = gpuDevice;
  void gpuDevice.lost.then((info) => {
    if (info.reason === 'destroyed') return;
    const reason = info.message === '' ? info.reason : info.message;
    lost = reason;
    disableRuns();
    view?.setLive(false);
    showGpuFailure(lostText(reason));
    shell.toasts.show(lostText(reason), 'bad', 8);
  });
  readout.set('gpu', adapter.info.description || adapter.info.architecture || adapter.info.vendor);
  view = await FlowView.create(gpuDevice, canvas, {
    presentation: presentationFor(adapter.info),
    // Clear of the readout, the panels and the bottom row.
    fitRect: (aspect) => shell.drawingRect(aspect),
    onScale: showScale,
  });
  view.onChange(showViewState);
  view.setField(flowField(params.get('field')));
  showViewState();
  shell.onLayout(() => {
    view?.invalidate();
  });
  await start();
}

await startGpu();
