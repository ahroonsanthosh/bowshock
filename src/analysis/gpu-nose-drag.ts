/**
 * The page's solvers for solveNoseDrag (nose-drag-solve.ts): the
 * two-float transonic solve below Mach 1.2 and the fitted solver from 1.2,
 * both on the given GPU device.
 */

import { liveFitSource } from '../render/flow-source';
import { verifiedFittedDragGpu } from './gpu-fitted-flow';
import { gpuTransonicEngine } from './gpu-transonic';
import type { NoseDragSolvers } from './nose-drag-solve';
import { verifiedTransonicDrag } from './transonic-drag';
import { FITTED_DRAG_FLOOR, ORDER_TOLERANCE } from './verified-drag';

/**
 * Red-black sweeps per implicit step of the transonic solve on the GPU
 * (0013, step 2: on the CPU twin, 2 sweeps took 1.1 to 2.1 times LU-SGS's
 * steps and 4 Jacobi sweeps 1.0 to 1.7 times; on the GPU the two-float
 * residual dominates each step's cost, so more sweeps pay).
 */
export const GPU_TRANSONIC_SWEEPS = 4;

export function gpuNoseDragSolvers(device: GPUDevice): NoseDragSolvers {
  return {
    transonic: (body, options) =>
      verifiedTransonicDrag(
        body,
        options,
        gpuTransonicEngine(device, { sweeps: GPU_TRANSONIC_SWEEPS }),
      ),
    fitted: (body, { onLive, ...options }) =>
      verifiedFittedDragGpu(device, body, {
        ...options,
        // No early stop: always refine to the finest grid allowed (as the page).
        tolerance: 0,
        floor: FITTED_DRAG_FLOOR,
        orderTolerance: ORDER_TOLERANCE,
        // The fit as a flow source, as the transonic solve gives its grids.
        ...(onLive === undefined
          ? {}
          : {
              onLive: (live) => {
                onLive(live === null ? null : liveFitSource(live));
              },
            }),
      }),
  };
}
