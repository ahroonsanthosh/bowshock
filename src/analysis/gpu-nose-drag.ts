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
 * Red-black sweeps per implicit step of the transonic solve on the GPU.
 * Not more: the relaxation's own iteration does not contract for the
 * near-sonic acoustic wave, so each sweep amplifies it. On the cone's
 * base grid at Mach 1.1 (CPU twin, no Anderson) 1, 2 and 3 sweeps
 * converged in 2,350, 1,200 and 800 steps, and 4 fell into a limit
 * cycle, on the CPU and the GPU alike (0013, the review's findings).
 */
export const GPU_TRANSONIC_SWEEPS = 2;

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
