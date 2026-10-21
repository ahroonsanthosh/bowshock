/**
 * Nose wave drag: the verified forebody pressure drag of a rocket body,
 * solved on the GPU with the bow shock fitted (docs/design/0006-shock-fitting.md)
 * on a nested family of grids up to the finest allowed, with its error
 * band measured from them (docs/design/0005-solution-verification.md).
 *
 * Total drag: that solve's value and band, given to src/total as its nose
 * term, with the fins and the flight condition asked below it
 * (docs/design/0011-total-drag-on-the-page.md; ./total-drag.ts decides
 * what is shown and how it is labelled).
 *
 * The page is laid out in the shell of docs/design/0012-interface.md
 * (phase U2): the solve's flow drawn full window as it converges, the
 * rocket's inputs in the left panel, the drag in the right one. Every
 * text, number, band, label and refusal reason is the one the logic
 * returns; the layout only places them, and gives each status its colour
 * by help's rule.
 */

import { verifiedFittedDragGpu } from '../analysis/gpu-fitted-flow';
import { GpuExecutionError } from '../engine-gpu/gpu-common';
import type { LiveFit } from '../engine-gpu/shock-fitting-gpu';
import { FITTED_DRAG_FLOOR, ORDER_TOLERANCE, type LevelReport } from '../analysis/verified-drag';
import type { Body } from '../geometry/body';
import type { NoseShape } from '../geometry/nose';
import { liveFitSource } from '../render/flow-source';
import { presentationFor } from '../render/presenter';
import { FlowView } from '../ui/flow-view';
import { formatCount, formatExponent, formatFixed, formatGrid, formatRate } from '../ui/format';
import { bandSection, colourScaleSection, schlierenSection } from '../ui/help';
import { Shell } from '../ui/shell';
import { withBand } from './band';
import { DrawnCaseRecord, pngCaption, pngName } from './drawn-case';
import {
  bodyOutline,
  FlowControls,
  flowReadout,
  RUN_BINDINGS,
  VIEW_BINDINGS,
  viewMenu,
  type RunAction,
  type ViewAction,
} from './flow-controls';
import {
  GPU_FAILED,
  NOT_CONVERGED,
  NOT_VERIFIED,
  REFUSED,
  STOPPED,
  VERIFIED,
  type NoseStatus,
} from './nose-status';
import { presentTotal } from './total-drag-layout';
import { parseNumber, totalDragView, type NoseState, type TotalDragView } from './total-drag';
import {
  altitudeInUnit,
  altitudeUnitOf,
  BASIC_FINNER_NOSE_FIELDS,
  basicFinnerFields,
  failureDisplay,
  fieldsShown,
  formOf,
  gateDisplay,
  impliedConditionText,
  NO_WEBGPU,
  noseKeyOf,
  noseStateOf,
  overallLengthText,
  totalDragDisplay,
  type DisplayBlock,
  type TotalDragFields,
} from './total-drag-display';
import { renderBlocks } from './total-drag-render';
import { h } from '../ui/dom';

const GAMMA = 1.4;

function element<T extends HTMLElement>(selector: string, type: new () => T): T {
  const el = document.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`expected ${type.name} at ${selector}`);
  return el;
}

const form = element('#form', HTMLFormElement);
const shapeSelect = element('#shape', HTMLSelectElement);
const parameterField = element('#parameter-field', HTMLElement);
const parameterInput = element('#parameter', HTMLInputElement);
const noseLengthInput = element('#nose-length', HTMLInputElement);
const bodyLengthInput = element('#body-length', HTMLInputElement);
const machInput = element('#mach', HTMLInputElement);
const finestSelect = element('#finest', HTMLSelectElement);
const runButton = element('#run', HTMLButtonElement);
const stopButton = element('#stop', HTMLButtonElement);
const pauseButton = element('#pause', HTMLButtonElement);
const result = element('#result', HTMLElement);
const note = element('#note', HTMLElement);
const status = element('#status', HTMLElement);
const noseValue = element('#nose-value', HTMLElement);
const noseBadge = element('#nose-status', HTMLElement);
const canvas = element('#flow', HTMLCanvasElement);
const levels = element('#levels', HTMLTableElement);

const totalForm = element('#total-form', HTMLFormElement);
const sweepFields = element('#sweep-fields', HTMLElement);
const teSweepField = element('#te-sweep-field', HTMLElement);
const taperField = element('#taper-field', HTMLElement);
const thicknessLabel = element('#thickness-label', HTMLLabelElement);
const ridgeField = element('#ridge-field', HTMLElement);
const bevelFields = element('#bevel-fields', HTMLElement);
const overallLength = element('#overall-length', HTMLOutputElement);
const totalMach = element('#total-mach', HTMLOutputElement);
const conditionMode = element('#condition-mode', HTMLSelectElement);
const altitudeInput = element('#altitude', HTMLInputElement);
const altitudeLabel = element('#altitude-label', HTMLLabelElement);
const altitudeFields = ['#altitude-field', '#diameter-field'].map((s) => element(s, HTMLElement));
const impliedFields = ['#implied-reynolds-field', '#implied-temperature-field'].map((s) =>
  element(s, HTMLElement),
);
const impliedReynolds = element('#implied-reynolds', HTMLOutputElement);
const impliedTemperature = element('#implied-temperature', HTMLOutputElement);
const reynoldsFields = ['#reynolds-field', '#temperature-field'].map((s) =>
  element(s, HTMLElement),
);
const basicFinnerButton = element('#basic-finner', HTMLButtonElement);
const totalOutput = element('#total-output', HTMLElement);
const gateBody = element('#gate-body', HTMLElement);

// ------------------------------------------------------------ the shell

type Action = ViewAction | RunAction;

let view: FlowView | null = null;

const shell = new Shell<Action>({
  root: '../',
  page: 'drag',
  title: 'Rocket drag',
  bindings: [...VIEW_BINDINGS, ...RUN_BINDINGS],
  view: viewMenu(
    () => view,
    () => void savePng(),
  ),
  onAction: (action) => {
    if (action === 'pause') togglePause();
    else if (action === 'again') void runAgain();
    else controls.act(action);
  },
  help: {
    title: 'Rocket drag: keys and help',
    sections: [
      // The page's own words, kept in its HTML.
      {
        title: 'This page',
        body: Array.from(document.querySelectorAll('#page-help > p'), (p) => p.textContent.trim()),
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

/** The case whose flow is drawn: the PNG's name and caption. */
const drawnCase = new DrawnCaseRecord();

async function savePng(): Promise<void> {
  const drawn = drawnCase.current;
  if (view === null || drawn === null) {
    shell.toasts.show('Nothing to save yet: the flow shows once a solve has set up its grid.');
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

/** The page's element for each total-drag field. */
const FIELD_IDS: Record<keyof TotalDragFields, string> = {
  finCount: '#fin-count',
  planform: '#planform',
  leadingEdgeSweep: '#le-sweep',
  trailingEdgeSweep: '#te-sweep',
  taperRatio: '#taper',
  rootChord: '#root-chord',
  span: '#span',
  section: '#section',
  thickness: '#thickness',
  ridge: '#ridge',
  frontBevel: '#front-bevel',
  rearBevel: '#rear-bevel',
  leadingEdgeRadius: '#le-radius',
  trailingEdgeAheadOfBase: '#te-ahead',
  conditionMode: '#condition-mode',
  altitude: '#altitude',
  diameter: '#diameter',
  reynoldsOnLength: '#reynolds',
  temperature: '#temperature',
  transitionReynolds: '#transition',
  wallTemperature: '#wall-temperature',
  roughnessLow: '#rough-low',
  roughnessHigh: '#rough-high',
  roughnessSource: '#rough-source',
};
const fieldElements = Object.fromEntries(
  Object.entries(FIELD_IDS).map(([name, id]) => {
    const el = document.querySelector(id);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) {
      throw new Error(`expected an input or select at ${id}`);
    }
    return [name, el];
  }),
) as Record<keyof TotalDragFields, HTMLInputElement | HTMLSelectElement>;

function shape(): NoseShape {
  const parameter = Number(parameterInput.value);
  switch (shapeSelect.value) {
    case 'conical':
      return { kind: 'conical' };
    case 'secant':
      return { kind: 'ogive', parameter };
    case 'parabolic':
      return { kind: 'parabolic', parameter };
    case 'ellipsoid':
      return { kind: 'ellipsoid' };
    default:
      return { kind: 'ogive', parameter: 1 };
  }
}

function showParameter(): void {
  parameterField.hidden = !(shapeSelect.value === 'secant' || shapeSelect.value === 'parabolic');
  // A hidden field is not asked for: disabled, it is left out of the
  // form's validation, which refuses an empty number (it would read as 0).
  parameterInput.disabled = parameterField.hidden;
}
shapeSelect.addEventListener('change', showParameter);

/** The body asked for: the nose solve's, and the total's. */
function bodyAsked(): Body {
  return {
    nose: { shape: shape(), length: parseNumber(noseLengthInput.value), baseRadius: 0.5 },
    cylinderLength: parseNumber(bodyLengthInput.value),
  };
}

/** What a nose solve is for: its body and Mach number. */
function noseKey(): string {
  return noseKeyOf(bodyAsked(), parseNumber(machInput.value));
}

/** The case as asked, repeated with its result. */
function caseText(): string {
  const name = shapeSelect.selectedOptions[0]?.textContent ?? shapeSelect.value;
  const parameter = parameterField.hidden ? '' : ` (parameter ${parameterInput.value})`;
  return `${name}${parameter}, nose length ${noseLengthInput.value} and body length ${bodyLengthInput.value} calibers, Mach ${machInput.value}`;
}

/**
 * The nose solve's result: its text as the page has always written it,
 * its status in a word and a colour (help's rule), and the value shown
 * large (the same value as in the text, or none).
 */
/** The body as a saved PNG names it, and a short name for its file. */
function caseLabel(): { text: string; slug: string } {
  const name = shapeSelect.selectedOptions[0]?.textContent ?? shapeSelect.value;
  const parameter = parameterField.hidden ? '' : ` (parameter ${parameterInput.value})`;
  return {
    text: `${name}${parameter}, nose ${noseLengthInput.value} and body ${bodyLengthInput.value} calibers`,
    slug: shapeSelect.value,
  };
}

function show(text: string, outcome: NoseStatus | null = null, value = 'none'): void {
  result.textContent = text;
  // What a value means goes with every value shown, from the first grid's on.
  if (outcome === VERIFIED) note.hidden = false;
  if (outcome === null) return;
  noseValue.textContent = value;
  noseBadge.textContent = outcome.word;
  noseBadge.className = `badge${outcome.kind === '' ? '' : ` badge--${outcome.kind}`}`;
  readout.set('state', outcome.word, outcome.kind);
  drawnCase.settled(generation, value, outcome.word);
  pin();
  shell.announce(`Nose wave drag ${value}: ${outcome.word}. ${text}`);
}

/** The phone's pinned line: the total with its status once there is one, else the nose's. */
function pin(): void {
  const copy = (badge: HTMLElement) => {
    const c = badge.cloneNode(true) as HTMLElement;
    c.removeAttribute('id');
    return c;
  };
  const headline = totalOutput.querySelector('p.result');
  shell.sheet.pinned.replaceChildren(
    ...(totalShown && headline !== null
      ? [h('span', { className: 'mono', text: headline.textContent }), copy(totalBadge)]
      : [
          h('span', {}, 'Wave C', h('sub', { text: 'D' }), ' '),
          h('span', { className: 'mono', text: noseValue.textContent }),
          copy(noseBadge),
        ]),
  );
}

function addLevel(report: LevelReport, seconds: number): void {
  levels.hidden = false;
  note.hidden = false;
  const row = levels.tBodies[0]!.insertRow();
  for (const text of [
    `${report.cells.ni} x ${report.cells.nj}`,
    String(report.iterations),
    report.drag.toFixed(6),
    `${seconds.toFixed(1)} s`,
  ]) {
    row.insertCell().textContent = text;
  }
}

let controller: AbortController | null = null;
stopButton.addEventListener('click', () => {
  if (paused) togglePause();
  controller?.abort();
});

/** Each run's number: what a run's callbacks check they still belong to. */
let generation = 0;
/** The run on the GPU; settled once it has released its grids. */
let running: Promise<void> = Promise.resolve();

// Pause (Space): the solve waits between its batches of steps.
let paused = false;
let resume: (() => void) | null = null;

function gate(): Promise<void> {
  if (!paused) return Promise.resolve();
  return new Promise((resolve) => {
    resume = resolve;
  });
}

function togglePause(): void {
  if (controller === null) return;
  paused = !paused;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
  if (!paused) {
    resume?.();
    resume = null;
  }
  readout.set('state', paused ? 'Paused' : 'Solving');
  view?.setLive(!paused);
}
pauseButton.addEventListener('click', togglePause);

/** R: run again from the start, stopping the run going (if any) first. */
async function runAgain(): Promise<void> {
  if (controller !== null) {
    if (paused) togglePause();
    controller.abort();
    await running;
  }
  form.requestSubmit();
}

/**
 * A GPU device and what its adapter says of itself, or null without WebGPU
 * (navigator.gpu is then undefined despite its type), with the adapter's
 * largest buffers: the finest grids of long bodies need more than the
 * default 128 MiB.
 */
async function requestDevice(): Promise<{ device: GPUDevice; info: GPUAdapterInfo } | null> {
  const gpu = navigator.gpu as GPU | undefined;
  const adapter = await gpu?.requestAdapter();
  if (!adapter) return null;
  const device = await adapter.requestDevice({
    requiredLimits: {
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
    },
  });
  return { device, info: adapter.info };
}

// ------------------------------------------------------------ total drag

// Everything shown here comes from ./total-drag-display.ts; this only
// reads the fields and lays the blocks out.

/** The last nose solve: what it was for, and what it gave the total. */
let noseSolve: { readonly key: string; readonly state: NoseState } | null = null;
/** The total's status badge; whether a total (a number) is shown; whether to say the next one. */
const totalBadge = element('#total-status', HTMLElement);
let totalShown = false;
let announceTotal = false;
/** Set when this browser has no WebGPU, so that no nose can be solved here. */
let noGpu = false;

function noseState(): NoseState {
  if (noGpu) return NO_WEBGPU;
  return noseSolve !== null && noseSolve.key === noseKey() ? noseSolve.state : { kind: 'pending' };
}

function fieldsAsked(): TotalDragFields {
  return Object.fromEntries(
    Object.entries(fieldElements).map(([name, el]) => [name, el.value]),
  ) as unknown as TotalDragFields;
}

/** The unit the altitude was last typed in: a change of unit converts it. */
let altitudeUnit = altitudeUnitOf(conditionMode.value) ?? 'm';

function showFinFields(): void {
  const unit = altitudeUnitOf(conditionMode.value);
  if (unit !== null && unit !== altitudeUnit) {
    altitudeInput.value = altitudeInUnit(altitudeInput.value, altitudeUnit, unit);
    altitudeUnit = unit;
  }
  const shown = fieldsShown(fieldsAsked());
  sweepFields.hidden = !shown.sweeps;
  teSweepField.hidden = !shown.sweeps;
  taperField.hidden = !shown.taperRatio;
  ridgeField.hidden = !shown.ridge;
  bevelFields.hidden = !shown.bevels;
  thicknessLabel.textContent = shown.thicknessLabel;
  for (const f of [...altitudeFields, ...impliedFields]) f.hidden = !shown.altitude;
  for (const f of reynoldsFields) f.hidden = !shown.reynolds;
  altitudeLabel.textContent = shown.altitudeLabel;
}

function updateTotal(): void {
  const body = bodyAsked();
  overallLength.value = overallLengthText(body);
  totalMach.value = machInput.value;
  const mach = parseNumber(machInput.value);
  const implied = impliedConditionText(body, mach, fieldsAsked());
  impliedReynolds.value = implied.reynolds;
  impliedTemperature.value = implied.temperature;
  const form = formOf(body, mach, fieldsAsked());
  let blocks: DisplayBlock[];
  let totalView: TotalDragView | null = null;
  try {
    totalView = totalDragView(form, noseState());
    blocks = totalDragDisplay(totalView);
  } catch (error) {
    blocks = failureDisplay(error instanceof Error ? error.message : String(error));
  }
  renderBlocks(totalOutput, blocks);
  // The layout of what the logic returned: its status badge, the components
  // as bars, the details folded, the pinned line.
  const shown = presentTotal(totalView, {
    output: totalOutput,
    badge: totalBadge,
    bars: element('#total-bars', HTMLElement),
    details: element('#total-details', HTMLButtonElement),
  });
  totalShown = shown.total;
  pin();
  if (announceTotal) {
    announceTotal = false;
    shell.announce(shown.said);
  }
}

// Each total takes a fraction of a second: computed once typing pauses.
let totalTimer: number | undefined;
function scheduleTotal(): void {
  window.clearTimeout(totalTimer);
  totalTimer = window.setTimeout(updateTotal, 300);
}

/** The Basic Finner's nose, fins and range conditions at the Mach number asked. */
function setBasicFinner(): void {
  shapeSelect.value = BASIC_FINNER_NOSE_FIELDS.shape;
  showParameter();
  noseLengthInput.value = BASIC_FINNER_NOSE_FIELDS.noseLength;
  bodyLengthInput.value = BASIC_FINNER_NOSE_FIELDS.bodyLength;
  const fields = basicFinnerFields(parseNumber(machInput.value), fieldsAsked());
  for (const [name, el] of Object.entries(fieldElements)) {
    el.value = fields[name as keyof TotalDragFields];
  }
  showFinFields();
  scheduleTotal();
}

totalForm.addEventListener('change', showFinFields);
totalForm.addEventListener('submit', (event) => {
  event.preventDefault();
});
// The Rocket panel holds both forms' fields (some of the solve's sit under
// "More", outside its form element, tied to it by their form attribute).
const rocketPanel = element('#panel-rocket', HTMLElement);
rocketPanel.addEventListener('input', scheduleTotal);
rocketPanel.addEventListener('change', scheduleTotal);
basicFinnerButton.addEventListener('click', setBasicFinner);
showFinFields();
renderBlocks(gateBody, gateDisplay());
updateTotal();

// The form never submits natively; Run stays disabled until the GPU is ready.
let device: GPUDevice | null = null;
runButton.disabled = true;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (device !== null && controller === null) {
    running = run(device);
  }
});
status.textContent = 'Starting the GPU...';
readout.set('state', 'Starting the GPU');
const gpu = await requestDevice().catch(() => null);
device = gpu?.device ?? null;
status.textContent = '';
// A lost device makes the next read of the GPU fail with an error of its
// own; the reason is kept to report it as the GPU's failure.
let lost: string | null = null;
void device?.lost.then((info) => {
  lost = info.message === '' ? info.reason : info.message;
  view?.setLive(false);
});
if (gpu === null) {
  show('This page needs WebGPU, which this browser does not provide.', {
    word: 'No WebGPU',
    kind: 'bad',
  });
  noGpu = true;
  updateTotal();
} else {
  readout.set('gpu', gpu.info.description || gpu.info.architecture || gpu.info.vendor);
  try {
    view = await FlowView.create(gpu.device, canvas, {
      presentation: presentationFor(gpu.info),
      // Clear of the readout, the panels and the bottom row.
      fitRect: (aspect) => shell.drawingRect(aspect),
      onScale: (scale) => {
        controls.showScale(scale);
      },
    });
    view.onChange(() => {
      controls.showViewState();
    });
    controls.showViewState();
    shell.onLayout(() => {
      view?.invalidate();
    });
  } catch {
    // Without the view the solve still runs: its numbers are the page's.
    view = null;
  }
  runButton.disabled = false;
  readout.set('state', 'Ready: Run (R) solves this case');
}

/** Steps per second, from the checks of the grid being solved. */
let rate: { refinement: number; time: number; iterations: number; cells: number } | null = null;

async function run(gpu: GPUDevice): Promise<void> {
  const myGeneration = ++generation;
  const body = bodyAsked();
  const mach = parseNumber(machInput.value);
  const asked = caseText();
  // The total takes this solve's result only while its case is still the one asked.
  const key = noseKey();
  const result = (state: NoseState | null) => {
    noseSolve = state === null ? null : { key, state };
  };
  noseSolve = null;
  updateTotal();
  levels.tBodies[0]!.replaceChildren();
  levels.hidden = true;
  note.hidden = true;
  show('');
  noseValue.textContent = '…';
  noseBadge.textContent = `Solving, finest grid ${20 * Number(finestSelect.value)} cells across`;
  noseBadge.className = 'badge';
  pin();
  runButton.disabled = true;
  stopButton.disabled = false;
  pauseButton.disabled = false;
  controller = new AbortController();
  // The flow drawn from here on is this case's.
  view?.setBody(bodyOutline(body));
  view?.setLive(!paused);
  readout.set('mach', formatFixed(mach, 2));
  readout.set('alpha', '0°');
  for (const id of ['grid', 'step', 'shock', 'cd', 'rate']) readout.set(id, null);
  readout.set('state', 'Solving');
  const label = caseLabel();
  let started = performance.now();
  // Where the usual grids fail the quality checks and the family is solved
  // again with more columns: the grid that failed.
  let fallback: { refinement: number } | null = null;
  try {
    const outcome = await verifiedFittedDragGpu(gpu, body, {
      mach,
      gamma: GAMMA,
      // No early stop: always refine to the finest grid allowed.
      tolerance: 0,
      maxRefinement: Number(finestSelect.value),
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
      signal: controller.signal,
      gate,
      onStart: (steps, total) => {
        status.textContent = `Starting from a captured solution on the CPU: ${steps} of ${total} steps`;
      },
      onProgress: (refinement, iterations, drag) => {
        status.textContent = `Grid at refinement ${refinement}: ${iterations} iterations, wave Cd on this grid so far ${drag.toFixed(6)}`;
        note.hidden = false;
      },
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
        drawnCase.drawnGrid(myGeneration, mach, grid, label.text, label.slug);
      },
      onCheck: (refinement, iterations, speed, drag) => {
        if (myGeneration !== generation) return;
        drawnCase.checked(myGeneration, drag);
        readout.set('step', formatCount(iterations));
        readout.set('shock', formatExponent(speed, 1));
        readout.set('cd', drag.toFixed(5));
        const now = performance.now();
        if (rate?.refinement === refinement && now > rate.time && !paused) {
          const perSecond =
            ((iterations - rate.iterations) * rate.cells * 1000) / (now - rate.time);
          readout.set('rate', formatRate(perSecond, 'cell'));
        }
        rate = { refinement, time: now, iterations, cells: rate?.cells ?? 0 };
      },
      onLevel: (report) => {
        addLevel(report, (performance.now() - started) / 1000);
        started = performance.now();
      },
      onFallback: (refinement) => {
        fallback = { refinement };
        levels.tBodies[0]!.replaceChildren();
        status.textContent = `The grid at refinement ${refinement} fails the quality checks of fitted grids: solving every grid again with more columns along the body`;
        started = performance.now();
      },
    });
    status.textContent = '';
    switch (outcome.kind) {
      case 'cancelled':
        show('Stopped.', STOPPED);
        break;
      case 'invalid':
        show(
          `${asked}. No result: on the grid at refinement ${outcome.refinement}, ${outcome.reason}.`,
          REFUSED,
        );
        break;
      case 'not-converged':
        show(
          `${asked}. No result: the grid at refinement ${outcome.refinement} did not converge (${outcome.reason}).`,
          NOT_CONVERGED,
        );
        break;
      case 'solved': {
        const e = outcome.estimate;
        const failed = fallback as { refinement: number } | null;
        const stopped =
          (outcome.stopped === undefined
            ? ''
            : ` The grid at refinement ${outcome.stopped.refinement} was not solved: ${outcome.stopped.reason}; the result is from the grids before it.`) +
          (outcome.columnDensity === undefined || failed === null
            ? ''
            : ` The grids have ${outcome.columnDensity} times the usual columns along the body: the usual grid at refinement ${failed.refinement} fails the quality checks of fitted grids.`);
        if (outcome.uncertainty !== undefined) {
          show(
            `${asked}. Wave Cd = ${withBand(e.value, outcome.uncertainty)}, the band from ${outcome.levels.length} grids, including an allowance of ${FITTED_DRAG_FLOOR.toExponential(0)} of the value.${stopped}`,
            VERIFIED,
            withBand(e.value, outcome.uncertainty),
          );
        } else {
          const finer =
            outcome.stopped !== undefined
              ? 'no finer grid could be solved here'
              : finestSelect.value === '16'
                ? 'no finer grid is offered'
                : 'choosing 320 cells across may verify it';
          show(
            `${asked}. No error band: ${e.kind === 'unresolved' ? e.reason : 'none measured'}. The finest grid's wave Cd, ${e.value.toFixed(5)}, is not verified; ${finer}.${stopped}`,
            NOT_VERIFIED,
            e.value.toFixed(5),
          );
          note.hidden = false;
        }
        break;
      }
    }
    result(noseStateOf(outcome));
  } catch (error) {
    // Bodies the solver does not serve yet (detached shocks, subsonic tip
    // flow) are refused with the reason; a failure of the GPU says so.
    status.textContent = '';
    const reason = error instanceof Error ? error.message : String(error);
    const gpuFailed = lost !== null || error instanceof GpuExecutionError;
    show(
      lost !== null
        ? `The GPU was lost (${lost}); reload the page to start it again.`
        : error instanceof GpuExecutionError
          ? `The GPU failed: ${reason}.`
          : `${asked}. Cannot solve this case: ${reason}.`,
      gpuFailed ? GPU_FAILED : REFUSED,
    );
    // A case the solver refuses refuses the total; a failed GPU leaves it unsolved.
    result(noseStateOf({ kind: 'error', message: reason, gpuFailed }));
  } finally {
    runButton.disabled = false;
    stopButton.disabled = true;
    pauseButton.disabled = true;
    pauseButton.textContent = 'Pause';
    paused = false;
    controller = null;
    view?.setLive(false);
    announceTotal = true;
    updateTotal();
  }
}
