/**
 * The two-float GPU solver as a transonic engine for verifiedTransonicDrag
 * (design record 0013, step 4b): red-black implicit steps, the CFL number
 * ramped by 1.2 a step up to `cfl`, the state read back in double
 * precision at each check and the drag evaluated from it by the CPU
 * engine's scheme. Each grid can be drawn as it converges (live(): its
 * 32-bit view of the state, for drawing only).
 */

import { Euler2D } from '../engine-cpu/euler2d';
import { GpuPrecisionError } from '../engine-gpu/gpu-common';
import { GpuEuler2DTwoFloat, twoFloatGridLimit } from '../engine-gpu/euler2d-two-float';
import type { FlowSource } from '../render/flow-renderer';
import type { Bounds } from '../render/view';
import { pressureFromConserved2D } from '../scheme/gas';
import type { TransonicCells, TransonicEngine, TransonicGridSolver } from './transonic-drag';
import type { TransonicProblem } from './transonic-flow';

export interface GpuTransonicOptions {
  /** Red-black sweeps per implicit step. */
  readonly sweeps: number;
  /** Largest CFL number. */
  readonly cfl?: number;
}

export function gpuTransonicEngine(
  device: GPUDevice,
  options: GpuTransonicOptions,
): TransonicEngine {
  const cfl = options.cfl ?? 1000;
  const solve = async (problem: TransonicProblem): Promise<TransonicGridSolver> => {
    const solver = await GpuEuler2DTwoFloat.create(device, problem.config);
    const evaluator = new Euler2D(problem.config);
    const { ni, nj } = problem.config.grid;
    const gamma = problem.config.gamma;
    const cells = async (): Promise<TransonicCells> => {
      const q = await solver.readConserved();
      return (i, j) => {
        const c = 4 * (i + j * ni);
        const rho = q[c]!;
        return {
          rho,
          u: q[c + 1]! / rho,
          v: q[c + 2]! / rho,
          p: pressureFromConserved2D(rho, q[c + 1]!, q[c + 2]!, q[c + 3]!, gamma),
        };
      };
    };
    // The evaluator holds the state of the last check, read back once for
    // both the drag and the residual.
    let loaded = false;
    const load = async () => {
      if (loaded) return;
      evaluator.setCellPrimitives(await cells());
      loaded = true;
    };
    return {
      start: async (state, startCfl) => {
        loaded = false;
        solver.setCellPrimitives(state);
        await solver.setImplicitCfl(startCfl);
      },
      iterate: (steps) => {
        loaded = false;
        return solver.iterateImplicit(steps, { cfl, sweeps: options.sweeps });
      },
      drag: async () => {
        await load();
        return problem.drag(evaluator);
      },
      residual: async () => {
        await load();
        return evaluator.densityResidualNorm();
      },
      checkPrecision: async () => {
        const gpu = await solver.residual();
        await load();
        const why = residualPrecision(gpu, evaluator.residualVector());
        if (why !== null) throw new GpuPrecisionError(why);
      },
      cells,
      live: (): FlowSource => {
        const view = solver.viewBuffers();
        const bounds = boundsOf(problem.config.grid);
        return {
          ni,
          nj,
          gamma,
          freeStream: problem.freeStream.state,
          mirror: problem.config.geometry === 'axisymmetric',
          fittedShock: false,
          nodes: { kind: 'placed', buffer: view.nodes },
          state: () => view.state,
          bounds: () => bounds,
        };
      },
      destroy: () => {
        solver.destroy();
      },
    };
  };
  return Object.assign(solve, {
    refuses: (cells: { readonly ni: number; readonly nj: number }) =>
      twoFloatGridLimit(device, cells.ni, cells.nj),
  });
}

/**
 * Largest difference between the GPU's residual and the CPU's double one
 * on the same state, relative to the largest residual, before the GPU is
 * taken to lose the low parts. Two-float arithmetic measured 2.2e-9 on
 * SwiftShader (0013, step 4b), so 1e-8 leaves a margin of 4.5 for other
 * devices' rounding; 32-bit arithmetic loses about 1e-7 of the face
 * fluxes, which reach 1e3 on the far cells, against residuals of order
 * 0.1: some 1e-3, five decades above it.
 */
export const RESIDUAL_PRECISION = 1e-8;

/**
 * Why the GPU's residual is not the CPU's double one within
 * RESIDUAL_PRECISION (four values per cell, as residualVector), or null.
 */
export function residualPrecision(gpu: Float64Array, cpu: Float64Array): string | null {
  if (gpu.length !== cpu.length) return 'the GPU returned a residual of the wrong size';
  let worst = 0;
  let largest = 0;
  for (let k = 0; k < cpu.length; k++) {
    const d = Math.abs(gpu[k]! - cpu[k]!);
    worst = Number.isNaN(d) ? Infinity : Math.max(worst, d);
    largest = Math.max(largest, Math.abs(cpu[k]!));
  }
  if (worst <= RESIDUAL_PRECISION * largest) return null;
  return `this GPU's residual differs from the CPU's double-precision one by ${(worst / largest).toExponential(2)} of the largest (at most ${RESIDUAL_PRECISION} allowed): it loses the low parts of its two-float arithmetic`;
}

/** The grid's extent: the whole domain (the far boundaries 100 radii out on the family's grids). */
function boundsOf(grid: { readonly x: Float64Array; readonly y: Float64Array }): Bounds {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let n = 0; n < grid.x.length; n++) {
    xMin = Math.min(xMin, grid.x[n]!);
    xMax = Math.max(xMax, grid.x[n]!);
    yMin = Math.min(yMin, grid.y[n]!);
    yMax = Math.max(yMax, grid.y[n]!);
  }
  return { xMin, xMax, yMin, yMax };
}
