/**
 * The 3D view's demo (demos/flow-3d.html): the Basic Finner at Mach 2,
 * solved live on the GPU and drawn in 3D as it converges. With
 * `?field=<url>` it draws a field saved as JSON instead (for stills).
 */

import { sharpFitProblem } from '../analysis/fitted-flow';
import { gpuFittedFlow } from '../analysis/gpu-fitted-flow';
import { BASIC_FINNER_TEMPERATURE } from '../app/total-drag';
import { liveFitSource } from '../render/flow-source';
import { presentationFor } from '../render/presenter';
import { basicFinnerBodyAsTyped } from '../validation/basic-finner';
import { attachControls } from './controls';
import { fieldFromCells, type MeridionalField } from './field';
import { FlowScene3D } from './scene';
import { basicFinnerRocket } from './presets';
import { trapezoidalPlanform } from '../fins/planform';
import { doubleWedge } from '../fins/section';
import type { Rocket } from './rocket-mesh';

/** A rocket of the usual hobby kind: a von Karman nose 3 calibres long, three swept fins. */
function vonKarmanRocket(): Rocket {
  return {
    body: {
      nose: { shape: { kind: 'haack', parameter: 0 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 7,
    },
    fins: {
      count: 3,
      planform: trapezoidalPlanform({
        rootChord: 1.6,
        span: 1.1,
        leadingEdgeSweep: (45 * Math.PI) / 180,
        trailingEdgeSweep: (15 * Math.PI) / 180,
      }),
      section: doubleWedge(0.05),
      trailingEdgeAheadOfBase: 0,
      roll: 0,
    },
  };
}

/** A field saved as JSON: ni, nj, gamma, freeStream, node x and y, primitive (rho, u, v, p) per cell. */
export interface SavedField {
  readonly ni: number;
  readonly nj: number;
  readonly gamma: number;
  readonly mach: number;
  readonly iterations: number;
  readonly converged: boolean;
  readonly freeStream: { rho: number; u: number; v: number; p: number };
  readonly x: number[];
  readonly y: number[];
  readonly primitive: number[];
}

export function fieldFromSaved(saved: SavedField): MeridionalField {
  const grid = {
    ni: saved.ni,
    nj: saved.nj,
    x: Float64Array.from(saved.x),
    y: Float64Array.from(saved.y),
  };
  return fieldFromCells(
    grid,
    (i, j) => {
      const c = 4 * (i + j * saved.ni);
      const p = saved.primitive;
      return { rho: p[c]!, u: p[c + 1]!, v: p[c + 2]!, p: p[c + 3]! };
    },
    saved.gamma,
    saved.freeStream,
  );
}

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#flow3d')!;
  const status = document.querySelector<HTMLElement>('#flow3d-status')!;
  const params = new URLSearchParams(location.search);
  if (!('gpu' in navigator)) {
    status.textContent = 'This view needs WebGPU, which this browser does not offer.';
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter === null) {
    status.textContent = 'No WebGPU adapter: this view cannot run here.';
    return;
  }
  const device = await adapter.requestDevice();
  const fixed = params.get('size');
  const ratio = Number(params.get('ratio') ?? window.devicePixelRatio) || 1;
  const resize = () => {
    if (fixed !== null) {
      const [w, h] = fixed.split('x').map(Number);
      canvas.width = w!;
      canvas.height = h!;
      return;
    }
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * ratio));
    canvas.height = Math.max(2, Math.round(canvas.clientHeight * ratio));
  };
  resize();
  await document.fonts.load("12px 'JetBrains Mono'").catch(() => undefined);
  const scene = await FlowScene3D.create(device, canvas, {
    presentation: presentationFor(adapter.info),
    pixelRatio: ratio,
    units: { freeStreamTemperature: BASIC_FINNER_TEMPERATURE },
  });
  // ?rocket=haack: a von Karman nose with three swept fins (for a saved field of it).
  const haack = params.get('rocket') === 'haack';
  scene.setRocket(haack ? vonKarmanRocket() : basicFinnerRocket());
  scene.setStatus({
    caption: haack ? 'Von Karman nose, 3 calibres, three fins, Mach 2' : 'Basic Finner, Mach 2',
  });
  attachControls(scene, canvas);
  new ResizeObserver(() => {
    resize();
    scene.requestDraw();
  }).observe(canvas);
  canvas.focus();
  (window as unknown as { scene3d: FlowScene3D }).scene3d = scene;

  const saved = params.get('field');
  if (saved !== null) {
    const data = (await (await fetch(saved)).json()) as SavedField;
    scene.setField(fieldFromSaved(data), { steps: data.iterations, converged: data.converged });
    await scene.render();
    status.textContent = '';
    (window as unknown as { ready3d: boolean }).ready3d = true;
    return;
  }
  // Solve live on the GPU.
  status.textContent = 'Solving';
  const problem = sharpFitProblem(basicFinnerBodyAsTyped(), {
    mach: 2,
    gamma: 1.4,
    nj: 20,
    refinement: 1,
  });
  const started = performance.now();
  let firstSteps = 0;
  const result = await gpuFittedFlow(device, problem, {
    maxIterations: 20_000,
    stepsPerMove: 1,
    checkEvery: 250,
    speedTolerance: 1e-5,
    onLive: (live) => {
      if (live === null) {
        scene.freeze();
      } else {
        scene.setFlow(liveFitSource(live));
        scene.setLive(true);
      }
    },
    onProgress: (iterations) => {
      if (firstSteps === 0) firstSteps = iterations;
      const seconds = (performance.now() - started) / 1000;
      const cells = (problem.lines.length - 1) * problem.nj;
      scene.setStatus({
        steps: iterations,
        converged: false,
        cellRate: (cells * iterations) / seconds,
      });
      status.textContent = `Solving: ${iterations} steps`;
    },
  });
  scene.setStatus({ steps: result.fit.iterations, converged: result.fit.converged });
  status.textContent = result.fit.converged ? '' : 'Stopped before converging';
  (window as unknown as { ready3d: boolean }).ready3d = true;
}

void main();
