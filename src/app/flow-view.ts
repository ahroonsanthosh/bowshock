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
import { liveFitSource } from '../render/flow-source';
import { presentationFor } from '../render/presenter';
import { basicFinnerBodyAsTyped } from '../validation/basic-finner';
import { withBand } from './band';
import { DrawnCaseRecord, pngCaption, pngName } from './drawn-case';
import {
  GPU_FAILED,
  NOT_CONVERGED,
  NOT_VERIFIED,
  REFUSED,
  VERIFIED,
  type NoseStatus,
} from './nose-status';
import {
  bodyOutline,
  FlowControls,
  flowField,
  flowReadout,
  RUN_BINDINGS,
  VIEW_BINDINGS,
  viewMenu,
  type RunAction,
  type ViewAction,
} from './flow-controls';
import { element, h } from '../ui/dom';
import { FlowView } from '../ui/flow-view';
import { formatCount, formatExponent, formatFixed, formatGrid, formatRate } from '../ui/format';
import { bandSection, colourScaleSection, schlierenSection } from '../ui/help';
import type { ReadoutKind } from '../ui/readout';
import { Shell } from '../ui/shell';

const GAMMA = 1.4;

type Action = ViewAction | RunAction;

const params = new URLSearchParams(location.search);

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
  bindings: [...VIEW_BINDINGS, ...RUN_BINDINGS],
  view: viewMenu(
    () => view,
    () => void savePng(),
  ),
  onAction: (action) => {
    if (action === 'pause') togglePause();
    else if (action === 'again') void start();
    else controls.act(action);
  },
  help: {
    title: 'Live flow: keys and help',
    sections: [
      {
        title: 'This page',
        body: [
          'The flow around the Basic Finner’s nose cone and body at zero incidence, solved on your GPU as the nose drag page solves it: the bow shock fitted as the outer boundary of the grid, on grids each twice as fine as the one before, until the finest chosen.',
          'Each grid’s flow is drawn from the GPU’s memory while it converges, mirrored about the axis. Each cell’s own value is drawn at its centre, with straight blends between centres; outside the shock, the free stream. The body is solid grey; the white line is the fitted bow shock.',
        ],
      },
      schlierenSection(),
      colourScaleSection(),
      bandSection(),
    ],
  },
});

const readout = flowReadout();
document.querySelector('main')?.append(readout.element);

const controls = new FlowControls(
  () => view,
  () => void savePng(),
  shell.bottom,
  element('#view-controls', HTMLElement),
  () => {
    shell.topBar.refresh();
  },
);

/** The case whose flow is drawn: the PNG's name and caption (not the controls, which may be ahead of it). */
const drawnCase = new DrawnCaseRecord();

async function savePng(): Promise<void> {
  const drawn = drawnCase.current;
  if (view === null || drawn === null) {
    shell.toasts.show('Nothing to save yet: the flow shows once its first grid is set up.');
    return;
  }
  const name = pngName(drawn, view.shown.split ? 'split' : view.shown.field);
  try {
    await view.savePng(name, pngCaption(drawn));
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
/** Why the GPU was lost, once it has been; and the promise that says so. */
let lost: string | null = null;
let deviceLost: Promise<unknown> = new Promise(() => {});

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
function settle(value: string, status: NoseStatus, reason: string): void {
  drawnCase.settled(generation, value, status.word);
  dragText.textContent = value;
  resultText.textContent = reason;
  badge(status.word, status.kind);
  showState(status.word, status.kind);
  shell.announce(`Wave drag coefficient ${value}: ${status.word}. ${reason}`);
}

/** The outcome of a run that was not stopped. */
function showOutcome(
  outcome: Exclude<VerifiedDrag, { kind: 'cancelled' }>,
  fallback: number | null,
): void {
  if (outcome.kind === 'not-converged') {
    // As the drag page says it: the grid did not converge.
    settle(
      'none',
      NOT_CONVERGED,
      `No result: the grid at refinement ${outcome.refinement} did not converge (${outcome.reason}).`,
    );
    return;
  }
  if (outcome.kind === 'invalid') {
    settle(
      'none',
      REFUSED,
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
      VERIFIED,
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
    NOT_VERIFIED,
    `No error band: ${e.kind === 'unresolved' ? e.reason : 'none measured'}. The finest grid’s value is shown, not verified; ${finer}.${notes}`,
  );
}

const lostText = (reason: string) =>
  `The GPU was lost (${reason}); reload the page to start it again.`;

/** The GPU failed or was lost: no value. */
function showGpuFailure(reason: string): void {
  settle('none', GPU_FAILED, reason);
}

/** Steps per second, from the checks of the grid being solved. */
let rate: { refinement: number; time: number; iterations: number; cells: number } | null = null;

/** An error from the GPU itself (a failed map or submission), not from the case. */
const fromGpu = (error: unknown) =>
  error instanceof GpuExecutionError || error instanceof DOMException;

async function run(device: GPUDevice, myGeneration: number): Promise<void> {
  // The drag page's Basic Finner, to the last bit (its fields, read back).
  const body = basicFinnerBodyAsTyped();
  const mach = Number(machSelect.value);
  const finest = Number(finestSelect.value);
  view?.setBody(bodyOutline(body));
  readout.set('mach', formatFixed(mach, 2));
  readout.set('alpha', '0°');
  for (const id of ['grid', 'step', 'shock', 'cd', 'rate']) readout.set(id, null);
  levels.tBodies[0]!.replaceChildren();
  levels.hidden = true;
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
        const grid = formatGrid(live.ni, live.nj);
        readout.set('grid', grid);
        view?.setSource(liveFitSource(live));
        // From now on the flow drawn, and so the PNG, is this run's.
        drawnCase.drawnGrid(myGeneration, mach, grid);
      },
      onCheck: (refinement, iterations, speed, drag) => {
        if (myGeneration !== generation) return;
        drawnCase.checked(myGeneration, drag);
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
    // A map that fails as the device is lost can reject before `lost`
    // resolves: wait a moment for it, so that the first word is the right one.
    if (lost === null && fromGpu(error)) {
      await Promise.race([deviceLost, new Promise((resolve) => setTimeout(resolve, 500))]);
      if (myGeneration !== generation) return;
    }
    if (lost !== null) showGpuFailure(lostText(lost));
    else if (fromGpu(error)) showGpuFailure(`The GPU failed: ${reason}.`);
    else settle('none', REFUSED, `Cannot solve this case: ${reason}.`);
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
    showState('Stopping the last run', '');
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
      { word: 'No WebGPU', kind: 'bad' },
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
  deviceLost = gpuDevice.lost;
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
  try {
    view = await FlowView.create(gpuDevice, canvas, {
      presentation: presentationFor(adapter.info),
      // Clear of the readout, the panels and the bottom row.
      fitRect: (aspect) => shell.drawingRect(aspect),
      onScale: (scale) => {
        controls.showScale(scale);
      },
    });
  } catch (error) {
    // Without the view nothing can be shown: a failed state, not "Starting the GPU".
    disableRuns();
    showGpuFailure(
      `The flow view could not be set up: ${error instanceof Error ? error.message : String(error)}.`,
    );
    return;
  }
  view.onChange(() => {
    controls.showViewState();
  });
  view.setField(flowField(params.get('field')));
  controls.showViewState();
  shell.onLayout(() => {
    view?.invalidate();
  });
  await start();
}

await startGpu();
