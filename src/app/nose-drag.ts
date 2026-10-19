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
import { bodyLength, type Body } from '../geometry/body';
import type { NoseShape } from '../geometry/nose';
import { withBand } from './band';
import {
  BASIC_FINNER_CLASS,
  BASIC_FINNER_REYNOLDS_PER_MACH,
  BASIC_FINNER_TEMPERATURE,
  noseComponentOf,
  parseNumber,
  parseNumberList,
  totalDragView,
  type NoseState,
  type PlanformInput,
  type SectionInput,
  type TotalDragForm,
} from './total-drag';
import { renderGate, renderTotalDrag } from './total-drag-render';

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
const finCountInput = element('#fin-count', HTMLInputElement);
const planformSelect = element('#planform', HTMLSelectElement);
const sweepFields = element('#sweep-fields', HTMLElement);
const teSweepField = element('#te-sweep-field', HTMLElement);
const taperField = element('#taper-field', HTMLElement);
const leSweepInput = element('#le-sweep', HTMLInputElement);
const teSweepInput = element('#te-sweep', HTMLInputElement);
const taperInput = element('#taper', HTMLInputElement);
const rootChordInput = element('#root-chord', HTMLInputElement);
const spanInput = element('#span', HTMLInputElement);
const sectionSelect = element('#section', HTMLSelectElement);
const thicknessLabel = element('#thickness-label', HTMLLabelElement);
const thicknessInput = element('#thickness', HTMLInputElement);
const ridgeField = element('#ridge-field', HTMLElement);
const ridgeInput = element('#ridge', HTMLInputElement);
const bevelFields = element('#bevel-fields', HTMLElement);
const frontBevelInput = element('#front-bevel', HTMLInputElement);
const rearBevelInput = element('#rear-bevel', HTMLInputElement);
const leRadiusInput = element('#le-radius', HTMLInputElement);
const teAheadInput = element('#te-ahead', HTMLInputElement);
const overallLength = element('#overall-length', HTMLOutputElement);
const totalMach = element('#total-mach', HTMLOutputElement);
const reynoldsInput = element('#reynolds', HTMLInputElement);
const temperatureInput = element('#temperature', HTMLInputElement);
const transitionInput = element('#transition', HTMLInputElement);
const wallTemperatureInput = element('#wall-temperature', HTMLInputElement);
const roughLowInput = element('#rough-low', HTMLInputElement);
const roughHighInput = element('#rough-high', HTMLInputElement);
const roughSourceInput = element('#rough-source', HTMLInputElement);
const basicFinnerButton = element('#basic-finner', HTMLButtonElement);
const totalOutput = element('#total-output', HTMLElement);
const gateBody = element('#gate-body', HTMLElement);

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
  return JSON.stringify([bodyAsked(), parseNumber(machInput.value)]);
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

/** The last nose solve: what it was for, and what it gave the total. */
let noseSolve: { readonly key: string; readonly state: NoseState } | null = null;
/** Set when this browser has no WebGPU, so that no nose can be solved here. */
let noGpu = false;

function noseState(): NoseState {
  if (noGpu) {
    return {
      kind: 'refused',
      message: 'the nose wave drag is solved on the GPU, and this browser provides no WebGPU',
    };
  }
  return noseSolve !== null && noseSolve.key === noseKey() ? noseSolve.state : { kind: 'pending' };
}

function planformAsked(): PlanformInput {
  switch (planformSelect.value) {
    case 'trapezoidal':
      return {
        kind: 'trapezoidal',
        leadingEdgeSweepDegrees: parseNumber(leSweepInput.value),
        trailingEdgeSweepDegrees: parseNumber(teSweepInput.value),
      };
    case 'clipped-delta':
      return { kind: 'clipped-delta', taperRatio: parseNumber(taperInput.value) };
    default:
      return { kind: 'rectangular' };
  }
}

function sectionAsked(): SectionInput {
  const thickness = parseNumber(thicknessInput.value);
  switch (sectionSelect.value) {
    case 'double-wedge':
      return { kind: 'double-wedge', thickness, ridge: parseNumber(ridgeInput.value) };
    case 'hexagonal':
      return {
        kind: 'hexagonal',
        thickness,
        frontBevel: parseNumber(frontBevelInput.value),
        rearBevel: parseNumber(rearBevelInput.value),
      };
    default:
      return { kind: 'single-wedge', trailingEdgeThickness: thickness };
  }
}

/** An optional number: empty is none. */
function optional(text: string): number | undefined {
  return text.trim() === '' ? undefined : parseNumber(text);
}

function totalAsked(): TotalDragForm {
  const roughGiven = [roughLowInput, roughHighInput, roughSourceInput].some(
    (i) => i.value.trim() !== '',
  );
  return {
    body: bodyAsked(),
    mach: parseNumber(machInput.value),
    finCount: parseNumber(finCountInput.value),
    planform: planformAsked(),
    rootChord: parseNumber(rootChordInput.value),
    span: parseNumber(spanInput.value),
    section: sectionAsked(),
    leadingEdgeRadius: parseNumber(leRadiusInput.value),
    trailingEdgeAheadOfBase: parseNumber(teAheadInput.value),
    reynoldsOnLength: parseNumber(reynoldsInput.value),
    temperature: parseNumber(temperatureInput.value),
    transitionReynolds: parseNumberList(transitionInput.value),
    wallTemperature: optional(wallTemperatureInput.value),
    // A one-sided band leaves the other end empty: zero.
    roughness: roughGiven
      ? {
          low: optional(roughLowInput.value) ?? 0,
          high: optional(roughHighInput.value) ?? 0,
          source: roughSourceInput.value,
        }
      : undefined,
  };
}

function showFinFields(): void {
  sweepFields.hidden = planformSelect.value !== 'trapezoidal';
  teSweepField.hidden = planformSelect.value !== 'trapezoidal';
  taperField.hidden = planformSelect.value !== 'clipped-delta';
  ridgeField.hidden = sectionSelect.value !== 'double-wedge';
  bevelFields.hidden = sectionSelect.value !== 'hexagonal';
  thicknessLabel.textContent =
    sectionSelect.value === 'single-wedge' ? 'Trailing-edge thickness' : 'Largest thickness';
}

function updateTotal(): void {
  const form = totalAsked();
  const length = bodyLength(form.body);
  overallLength.value = Number.isFinite(length) ? `${Number(length.toFixed(4))} calibers` : '';
  totalMach.value = machInput.value;
  try {
    renderTotalDrag(totalOutput, totalDragView(form, noseState()));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const p = document.createElement('p');
    p.className = 'warn result';
    p.textContent = `The total could not be computed: ${reason}. No number is given.`;
    totalOutput.replaceChildren(p);
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
  const bf = BASIC_FINNER_CLASS;
  const mach = parseNumber(machInput.value);
  shapeSelect.value = 'conical';
  showParameter();
  noseLengthInput.value = bf.noseLength.toFixed(3);
  bodyLengthInput.value = (bf.length - Number(noseLengthInput.value)).toFixed(3);
  finCountInput.value = String(bf.finCount);
  planformSelect.value = 'rectangular';
  rootChordInput.value = String(bf.rootChord);
  spanInput.value = String(bf.span);
  sectionSelect.value = 'single-wedge';
  thicknessInput.value = String(bf.trailingEdgeThickness);
  leRadiusInput.value = String(bf.leadingEdgeRadius);
  teAheadInput.value = '0';
  if (Number.isFinite(mach)) {
    reynoldsInput.value = (BASIC_FINNER_REYNOLDS_PER_MACH * mach).toPrecision(3);
  }
  temperatureInput.value = BASIC_FINNER_TEMPERATURE.toFixed(2);
  showFinFields();
  scheduleTotal();
}

planformSelect.addEventListener('change', showFinFields);
sectionSelect.addEventListener('change', showFinFields);
totalForm.addEventListener('submit', (event) => {
  event.preventDefault();
});
for (const f of [form, totalForm]) {
  f.addEventListener('input', scheduleTotal);
  f.addEventListener('change', scheduleTotal);
}
basicFinnerButton.addEventListener('click', setBasicFinner);
showFinFields();
renderGate(gateBody);
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
  const result = (state: NoseState) => {
    noseSolve = { key, state };
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
        result({
          kind: 'refused',
          message: `the nose wave drag was not solved: on the grid at refinement ${outcome.refinement}, ${outcome.reason}`,
        });
        break;
      case 'not-converged':
        show(
          `${asked}. No result: the grid at refinement ${outcome.refinement} did not converge (${outcome.reason}).`,
          'warn',
        );
        result({
          kind: 'refused',
          message: `the nose wave drag was not solved: the grid at refinement ${outcome.refinement} did not converge`,
        });
        break;
      case 'solved': {
        const e = outcome.estimate;
        const stopped =
          outcome.stopped === undefined
            ? ''
            : ` The grid at refinement ${outcome.stopped.refinement} was not solved: ${outcome.stopped.reason}; the result is from the grids before it.`;
        if (outcome.uncertainty !== undefined) {
          show(
            `${asked}. Wave Cd = ${withBand(e.value, outcome.uncertainty)}, the band from ${outcome.levels.length} grids, including an allowance of ${FITTED_DRAG_FLOOR.toExponential(0)} of the value.${stopped}`,
            'ok',
          );
          result({
            kind: 'solved',
            component: noseComponentOf({
              value: e.value,
              uncertainty: outcome.uncertainty,
              grids: outcome.levels.length,
            }),
          });
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
          result({
            kind: 'refused',
            message:
              'the nose wave drag has no measured error band (not verified), and the total ' +
              'needs one',
          });
        }
        break;
      }
    }
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
    if (!gpuFailed) {
      result({ kind: 'refused', message: `the nose wave drag cannot be solved here: ${reason}` });
    }
  } finally {
    runButton.disabled = false;
    stopButton.disabled = true;
    controller = null;
    updateTotal();
  }
}
