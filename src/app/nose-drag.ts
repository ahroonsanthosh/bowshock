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
 */

import { verifiedFittedDragGpu } from '../analysis/gpu-fitted-flow';
import { GpuExecutionError } from '../engine-gpu/gpu-common';
import { FITTED_DRAG_FLOOR, ORDER_TOLERANCE, type LevelReport } from '../analysis/verified-drag';
import type { Body } from '../geometry/body';
import type { NoseShape } from '../geometry/nose';
import { withBand } from './band';
import {
  allowanceText,
  bandCaveat,
  parseNumber,
  totalDragView,
  type NoseState,
} from './total-drag';
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
const result = element('#result', HTMLElement);
const note = element('#note', HTMLElement);
const status = element('#status', HTMLElement);
const levels = element('#levels', HTMLTableElement);

const totalForm = element('#total-form', HTMLFormElement);
const sweepFields = element('#sweep-fields', HTMLElement);
const teSweepField = element('#te-sweep-field', HTMLElement);
const taperField = element('#taper-field', HTMLElement);
const thicknessLabel = element('#thickness-label', HTMLLabelElement);
const ridgeField = element('#ridge-field', HTMLElement);
const bevelFields = element('#bevel-fields', HTMLElement);
const leRadiusField = element('#le-radius-field', HTMLElement);
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
    case 'von-karman':
      return { kind: 'haack', parameter: 0 };
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

function show(text: string, kind: 'ok' | 'warn' | '' = ''): void {
  result.textContent = text;
  result.className = kind;
  // What a value means goes with every value shown, from the first grid's on.
  if (kind === 'ok') note.hidden = false;
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
stopButton.addEventListener('click', () => controller?.abort());

/**
 * A GPU device, or null without WebGPU (navigator.gpu is then undefined
 * despite its type), with the adapter's largest buffers: the finest grids
 * of long bodies need more than the default 128 MiB.
 */
async function requestDevice(): Promise<GPUDevice | null> {
  const gpu = navigator.gpu as GPU | undefined;
  const adapter = await gpu?.requestAdapter();
  if (!adapter) return null;
  return adapter.requestDevice({
    requiredLimits: {
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
    },
  });
}

// ------------------------------------------------------------ total drag

// Everything shown here comes from ./total-drag-display.ts; this only
// reads the fields and lays the blocks out.

/** The last nose solve: what it was for, and what it gave the total. */
let noseSolve: { readonly key: string; readonly state: NoseState } | null = null;
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
  leRadiusField.hidden = !shown.leadingEdgeRadius;
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
  try {
    blocks = totalDragDisplay(totalDragView(form, noseState()));
  } catch (error) {
    blocks = failureDisplay(error instanceof Error ? error.message : String(error));
  }
  renderBlocks(totalOutput, blocks);
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
for (const f of [form, totalForm]) {
  f.addEventListener('input', scheduleTotal);
  f.addEventListener('change', scheduleTotal);
}
basicFinnerButton.addEventListener('click', setBasicFinner);
showFinFields();
renderBlocks(gateBody, gateDisplay());
updateTotal();

// The form never submits natively; Run stays disabled until the GPU is ready.
let device: GPUDevice | null = null;
runButton.disabled = true;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (device !== null && controller === null) void run(device);
});
status.textContent = 'Starting the GPU...';
device = await requestDevice();
status.textContent = '';
// A lost device makes the next read of the GPU fail with an error of its
// own; the reason is kept to report it as the GPU's failure.
let lost: string | null = null;
void device?.lost.then((info) => {
  lost = info.message === '' ? info.reason : info.message;
});
if (device === null) {
  show('This page needs WebGPU, which this browser does not provide.', 'warn');
  noGpu = true;
  updateTotal();
} else {
  runButton.disabled = false;
}

async function run(gpu: GPUDevice): Promise<void> {
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
  runButton.disabled = true;
  stopButton.disabled = false;
  controller = new AbortController();
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
      onStart: (steps, total) => {
        status.textContent = `Starting from a captured solution on the CPU: ${steps} of ${total} steps`;
      },
      onProgress: (refinement, iterations, drag) => {
        status.textContent = `Grid at refinement ${refinement}: ${iterations} iterations, wave Cd on this grid so far ${drag.toFixed(6)}`;
        note.hidden = false;
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
        show('Stopped.');
        break;
      case 'invalid':
        show(
          `${asked}. No result: on the grid at refinement ${outcome.refinement}, ${outcome.reason}.`,
          'warn',
        );
        break;
      case 'not-converged':
        show(
          `${asked}. No result: the grid at refinement ${outcome.refinement} did not converge (${outcome.reason}).`,
          'warn',
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
            `${asked}. Wave Cd = ${withBand(e.value, outcome.uncertainty)}, the band from ${outcome.levels.length} grids, including an allowance of ${allowanceText(outcome.floor)} of the value.${stopped}${bandCaveat(outcome.floor) === '' ? '' : ` ${bandCaveat(outcome.floor)}`}`,
            'ok',
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
            'warn',
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
      'warn',
    );
    // A case the solver refuses refuses the total; a failed GPU leaves it unsolved.
    result(noseStateOf({ kind: 'error', message: reason, gpuFailed }));
  } finally {
    runButton.disabled = false;
    stopButton.disabled = true;
    controller = null;
    updateTotal();
  }
}
