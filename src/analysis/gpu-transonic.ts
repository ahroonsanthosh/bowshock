/**
 * The two-float GPU solver as a transonic engine for verifiedTransonicDrag
 * (design record 0013, step 4b): red-black implicit steps, the CFL number
 * ramped by 1.2 a step up to `cfl`, the state read back in double
 * precision at each check and the drag evaluated from it by the CPU
 * engine's scheme. Each grid can be drawn as it converges (live(): its
 * 32-bit view of the state, for drawing only).
 */

import { Euler2D } from '../engine-cpu/euler2d';
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
