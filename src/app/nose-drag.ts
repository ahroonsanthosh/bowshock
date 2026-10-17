/**
 * Nose wave drag: the verified forebody pressure drag of a rocket body,
 * solved on the GPU on a nested family of grids up to the finest allowed,
 * with its error band measured from them
 * (docs/design/0005-solution-verification.md).
 */

import { gpuEngine } from '../analysis/gpu-engine';
import {
  DRAG_FLOOR,
  GPU_NOISE,
  ORDER_TOLERANCE,
  verifiedForebodyDrag,
  type LevelReport,
} from '../analysis/verified-drag';
import type { Body } from '../geometry/body';
import type { NoseShape } from '../geometry/nose';

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
const status = element('#status', HTMLElement);
const levels = element('#levels', HTMLTableElement);

function shape(): NoseShape {
  const parameter = Number(parameterInput.value);
  switch (shapeSelect.value) {
    case 'conical':
      return { kind: 'conical' };
    case 'secant':
      return { kind: 'ogive', parameter };
    case 'parabolic':
      return { kind: 'parabolic', parameter };
    default:
      return { kind: 'ogive', parameter: 1 };
  }
}

shapeSelect.addEventListener('change', () => {
  parameterField.hidden = !(shapeSelect.value === 'secant' || shapeSelect.value === 'parabolic');
});

function show(text: string, kind: 'ok' | 'warn' | '' = ''): void {
  result.textContent = text;
  result.className = kind;
}

function addLevel(report: LevelReport, seconds: number): void {
  levels.hidden = false;
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

/** Significant digits of a value shown with its band: to the band's first digit. */
function withBand(value: number, band: number): string {
  const digits = Math.max(0, -Math.floor(Math.log10(band)) + 1);
  return `${value.toFixed(digits)} ± ${band.toFixed(digits)}`;
}

let controller: AbortController | null = null;
stopButton.addEventListener('click', () => controller?.abort());

/** A GPU device, or null without WebGPU (navigator.gpu is then undefined despite its type). */
async function requestDevice(): Promise<GPUDevice | null> {
  const gpu = navigator.gpu as GPU | undefined;
  const adapter = await gpu?.requestAdapter();
  return adapter ? adapter.requestDevice() : null;
}

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
if (device === null) {
  show('This page needs WebGPU, which this browser does not provide.', 'warn');
} else {
  runButton.disabled = false;
}

async function run(gpu: GPUDevice): Promise<void> {
  const body: Body = {
    nose: { shape: shape(), length: Number(noseLengthInput.value), baseRadius: 0.5 },
    cylinderLength: Number(bodyLengthInput.value),
  };
  const mach = Number(machInput.value);
  levels.tBodies[0]!.replaceChildren();
  levels.hidden = true;
  show('');
  runButton.disabled = true;
  stopButton.disabled = false;
  controller = new AbortController();
  let started = performance.now();
  try {
    const outcome = await verifiedForebodyDrag(
      body,
      {
        mach,
        gamma: GAMMA,
        // No early stop: always refine to the finest grid allowed.
        tolerance: 0,
        maxRefinement: Number(finestSelect.value),
        noise: GPU_NOISE,
        floor: DRAG_FLOOR,
        orderTolerance: ORDER_TOLERANCE,
        signal: controller.signal,
        onProgress: (refinement, iterations, drag) => {
          status.textContent = `Grid at refinement ${refinement}: ${iterations} iterations, Cd ${drag.toFixed(6)}`;
        },
        onLevel: (report) => {
          addLevel(report, (performance.now() - started) / 1000);
          started = performance.now();
        },
      },
      gpuEngine(gpu),
    );
    status.textContent = '';
    switch (outcome.kind) {
      case 'cancelled':
        show('Stopped.');
        break;
      case 'invalid':
        show(
          `No result: on the grid at refinement ${outcome.refinement}, ${outcome.reason}.`,
          'warn',
        );
        break;
      case 'not-converged':
        show(
          `No result: the grid at refinement ${outcome.refinement} did not converge (${outcome.reason}).`,
          'warn',
        );
        break;
      case 'solved': {
        const e = outcome.estimate;
        if (outcome.uncertainty !== undefined) {
          show(
            `Cd = ${withBand(e.value, outcome.uncertainty)}, error measured on ${outcome.levels.length} grids`,
            'ok',
          );
        } else {
          show(
            `No error band: ${e.kind === 'unresolved' ? e.reason : 'none measured'}. The finest value, ${e.value.toFixed(5)}, is not verified.`,
            'warn',
          );
        }
        break;
      }
    }
  } catch (error) {
    // Bodies the generator does not serve yet (blunt noses, detached
    // shocks) are refused with the reason.
    status.textContent = '';
    show(
      `Cannot solve this case: ${error instanceof Error ? error.message : String(error)}`,
      'warn',
    );
  } finally {
    runButton.disabled = false;
    stopButton.disabled = true;
    controller = null;
  }
}
