/**
 * The GPU engine as a steady engine for verified drag: the steps run on
 * the GPU in 32-bit; at each convergence check the state is read back and
 * the wall fluxes are evaluated from it in double precision by the CPU
 * engine's scheme (within 1.1e-6 of a CPU solution's drag on cones and
 * ogives at Mach 1.3 to 5, wandering by up to 1.3e-6 at Mach 5;
 * docs/design/0005-solution-verification.md).
 */

import { Euler2D } from '../engine-cpu/euler2d';
import { GpuEuler2D, gpuPrimitive2D } from '../engine-gpu/euler2d-gpu';
import type { EngineFactory } from './verified-drag';

export function gpuEngine(device: GPUDevice): EngineFactory {
  return async (config, freeStream) => {
    const { flux, source, ...rest } = config;
    if (!(flux === 'hllc' || flux === 'rusanov')) {
      throw new RangeError(`the GPU engine has no ${flux} flux (only hllc and rusanov)`);
    }
    if (source !== undefined) throw new RangeError('the GPU engine has no source terms');
    const gpu = await GpuEuler2D.create(device, { ...rest, flux });
    gpu.setInitialCondition(() => freeStream);
    const evaluator = new Euler2D(config);
    const ni = config.grid.ni;
    return {
      iterate: (steps) => gpu.iterate(steps),
      wallFluxes: async () => {
        const state = await gpu.readState();
        evaluator.setCellPrimitives((i, j) => gpuPrimitive2D(state, i + j * ni, config.gamma));
        return evaluator.boundaryFluxes('jMin');
      },
      cells: async () => {
        const state = await gpu.readState();
        return (i, j) => gpuPrimitive2D(state, i + j * ni, config.gamma);
      },
      destroy: () => {
        gpu.destroy();
      },
    };
  };
}
