/**
 * Cell rate of the GPU engine's explicit steps (SSPRK2, local time steps)
 * on the transonic grids of the 7 deg cone, r = 1, 2, 4, 8, on whatever
 * WebGPU adapter the browser has (SwiftShader here). The far-field
 * boundaries are not on the GPU yet; inflow and outflow stand in for them,
 * which does not change the work per step. Prints one line per grid.
 */
import { it } from 'vitest';
import { GpuEuler2D } from '../../src/engine-gpu/euler2d-gpu';
import { transonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';
import { requireDevice } from '../gpu/device';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

it('gpu rate', { timeout: 3_600_000 }, async () => {
  const device = await requireDevice();
  const lines: string[] = [];
  const info = (device as unknown as { adapterInfo?: GPUAdapterInfo }).adapterInfo;
  lines.push('adapter ' + JSON.stringify(info ? { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description } : null));
  for (const refinement of [1, 2, 4, 8]) {
    const problem = transonicProblem(cone, {
      mach: 1.1,
      gamma: 1.4,
      refinement,
      farField: 100,
      cylinder: 10,
    } as Parameters<typeof transonicProblem>[1]);
    const free = problem.freeStream.state;
    const gpu = await GpuEuler2D.create(device, {
      ...problem.config,
      flux: 'hllc',
      boundaries: {
        iMin: { kind: 'inflow', state: free },
        iMax: { kind: 'outflow' },
        jMin: { kind: 'wall' },
        jMax: { kind: 'inflow', state: free },
      },
    });
    gpu.setInitialCondition(() => free);
    await gpu.iterate(20);
    await gpu.readState();
    const cells = problem.config.grid.ni * problem.config.grid.nj;
    const steps = refinement <= 2 ? 400 : refinement === 4 ? 100 : 40;
    const t0 = performance.now();
    await gpu.iterate(steps);
    await gpu.readState();
    const seconds = (performance.now() - t0) / 1000;
    lines.push(
      JSON.stringify({
        refinement,
        ni: problem.config.grid.ni,
        nj: problem.config.grid.nj,
        cells,
        steps,
        seconds,
        stepsPerSecond: steps / seconds,
        cellStepsPerSecond: (cells * steps) / seconds,
      }),
    );
    gpu.destroy();
  }
  // Browser-mode logs are not printed here; the failure message carries the measurements.
  throw new Error('MEASURED\n' + lines.join('\n'));
});
