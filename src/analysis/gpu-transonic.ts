/**
 * The two-float GPU solver as a transonic engine for verifiedTransonicDrag
 * (design record 0013, step 4b): red-black implicit steps, the CFL number
 * ramped by 1.2 a step up to `cfl`, the state read back in double
 * precision at each check and the drag evaluated from it by the CPU
 * engine's scheme.
 */

import { Euler2D } from '../engine-cpu/euler2d';
import { GpuEuler2DTwoFloat } from '../engine-gpu/euler2d-two-float';
import { pressureFromConserved2D } from '../scheme/gas';
import type { TransonicCells, TransonicEngine } from './transonic-drag';

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
  return async (problem) => {
    const solver = await GpuEuler2DTwoFloat.create(device, problem.config);
    const evaluator = new Euler2D(problem.config);
    const { ni } = problem.config.grid;
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
    return {
      start: async (state, startCfl) => {
        solver.setCellPrimitives(state);
        await solver.setImplicitCfl(startCfl);
      },
      iterate: (steps) => solver.iterateImplicit(steps, { cfl, sweeps: options.sweeps }),
      drag: async () => {
        evaluator.setCellPrimitives(await cells());
        return problem.drag(evaluator);
      },
      cells,
      destroy: () => {
        solver.destroy();
      },
    };
  };
}
