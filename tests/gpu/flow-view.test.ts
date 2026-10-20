import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sharpFitProblem } from '../../src/analysis/fitted-flow';
import { gpuFittedFlow, verifiedFittedDragGpu } from '../../src/analysis/gpu-fitted-flow';
import { FITTED_DRAG_FLOOR, ORDER_TOLERANCE } from '../../src/analysis/verified-drag';
import type { LiveFit } from '../../src/engine-gpu/shock-fitting-gpu';
import type { Body } from '../../src/geometry/body';
import { gridOnLines } from '../../src/grid/blunt-grid';
import type { StructuredGrid } from '../../src/grid/structured';
import { colormapTable } from '../../src/render/colormap';
import {
  cellCentre,
  cellFieldValue,
  schlierenGradient,
  type Conserved,
} from '../../src/render/flow-fields';
import { FlowRenderer, type FlowDrawOptions } from '../../src/render/flow-renderer';
import { liveFitSource } from '../../src/render/flow-source';
import { requireDevice } from './device';

/**
 * The flow view (src/render/flow-renderer.ts) draws the fitted flow of the
 * drag page's GPU solver while it runs, from the solver's own buffers:
 * the nodes it places are the solver's grid, and the value it draws at
 * each cell's centre is the solver's value in that cell (read back here,
 * and only here, to check it).
 */

const gamma = 1.4;
const deg = Math.PI / 180;

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

async function read(buffer: GPUBuffer, size: number): Promise<Float32Array> {
  const readback = device.createBuffer({
    size,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(buffer, 0, readback, 0, size);
  device.queue.submit([encoder.finish()]);
  await readback.mapAsync(GPUMapMode.READ);
  const data = new Float32Array(readback.getMappedRange().slice(0));
  readback.unmap();
  readback.destroy();
  return data;
}

/** The Basic Finner's 20 deg cone (10 deg half-angle) on one caliber of cylinder. */
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 0.5 / Math.tan(10 * deg), baseRadius: 0.5 },
  cylinderLength: 1,
};

const OPTIONS: Omit<FlowDrawOptions, 'view' | 'background' | 'field' | 'split'> = {
  grid: false,
  shock: false,
  schlierenContrast: 3,
  lengthScale: 0.5,
  gridStride: 1,
};

describe('the flow view of a fit as it runs', () => {
  it('places the grid and draws each cell value at its centre, as the solver has them', async () => {
    const problem = sharpFitProblem(cone, { mach: 2, gamma, nj: 20, refinement: 1 });
    const renderer = await FlowRenderer.create(device, 'rgba8unorm');
    let live: LiveFit | null = null;
    let checked = false;
    let probed = 0;
    const errors: Record<string, number> = {};

    /** The drawing checked against the solver, between two batches of steps. */
    const check = async (fit: LiveFit) => {
      const { ni, nj } = fit;
      const state = await read(fit.state(), 16 * ni * nj);
      const conserved = (i: number, j: number): Conserved => {
        const c = 4 * (i + j * ni);
        return [state[c]!, state[c + 1]!, state[c + 2]!, state[c + 3]!];
      };
      const grid: StructuredGrid = gridOnLines(
        problem.lines,
        fit.heights(),
        nj,
        problem.baseRadius,
        false,
      );
      const target = device.createTexture({
        size: [65, 65],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });
      try {
        // The nodes, placed on the GPU from the line grid's buffers.
        renderer.draw(target, {
          ...OPTIONS,
          field: 'schlieren',
          split: false,
          view: { cx: 1, cy: 0, ppu: 10 },
          background: { r: 0, g: 0, b: 0, a: 1 },
        });
        const nodes = await read(renderer.nodeBuffer!, 8 * (ni + 1) * (nj + 1));
        let nodeError = 0;
        for (let n = 0; n < grid.x.length; n++) {
          nodeError = Math.max(
            nodeError,
            Math.abs(nodes[2 * n]! - grid.x[n]!),
            Math.abs(nodes[2 * n + 1]! - grid.y[n]!),
          );
        }
        errors.nodes = nodeError;
        expect(nodeError, 'node positions').toBeLessThan(2e-6);

        // Schlieren's gradient against its TypeScript twin on the solver's densities.
        const values = await read(renderer.valueBuffer!, 4 * ni * nj);
        let largest = 0;
        let schlierenError = 0;
        for (let j = 0; j < nj; j++) {
          for (let i = 0; i < ni; i++) {
            const g = schlierenGradient(grid, (a, b) => conserved(a, b)[0], i, j, 0.5, 1);
            largest = Math.max(largest, g);
            schlierenError = Math.max(schlierenError, Math.abs(values[i + j * ni]! - g));
          }
        }
        errors.schlieren = schlierenError / largest;
        expect(schlierenError / largest, 'schlieren gradient').toBeLessThan(1e-4);

        // Probes at cell centres across the layer and along the body.
        const cells: [number, number][] = [];
        for (const fi of [0.05, 0.3, 0.55, 0.8, 0.97]) {
          for (const j of [0, Math.floor(nj / 2), nj - 1]) cells.push([Math.floor(fi * ni), j]);
        }
        const points = cells.map(([i, j]) => cellCentre(grid, i, j));
        const mirrored = points.map(([x, y]) => [x, -y] as const);
        for (const field of ['mach', 'cp', 'density'] as const) {
          const expected = cells.map(([i, j]) =>
            cellFieldValue(field, conserved(i, j), Math.fround(gamma), problem.freeStream),
          );
          const drawn = await renderer.probe(points, { ...OPTIONS, field, split: false });
          const below = await renderer.probe(mirrored, { ...OPTIONS, field, split: false });
          const scale = Math.max(...expected.map(Math.abs));
          let error = 0;
          expected.forEach((value, k) => {
            error = Math.max(error, Math.abs(drawn[k]! - value) / scale);
            // The same value mirrored, to the rounding of the interpolation.
            expect(Math.abs(below[k]! - drawn[k]!) / scale, `${field} mirrored`).toBeLessThan(2e-6);
          });
          errors[field] = error;
          expect(error, `${field} at the cell centres`).toBeLessThan(2e-6);
        }

        // The split view: schlieren above the axis, the field chosen below.
        const upper = await renderer.probe(points, { ...OPTIONS, field: 'mach', split: true });
        const lower = await renderer.probe(mirrored, { ...OPTIONS, field: 'mach', split: true });
        cells.forEach(([i, j], k) => {
          const g = schlierenGradient(grid, (a, b) => conserved(a, b)[0], i, j, 0.5, 1);
          expect(Math.abs(upper[k]! - g) / largest).toBeLessThan(1e-4);
          const mach = cellFieldValue(
            'mach',
            conserved(i, j),
            Math.fround(gamma),
            problem.freeStream,
          );
          expect(Math.abs(lower[k]! - mach) / mach).toBeLessThan(2e-6);
        });

        // And the colour drawn at a cell's centre is the colour map's for its value.
        const [i, j] = cells[7]!;
        const [x, y] = cellCentre(grid, i, j);
        renderer.draw(target, {
          ...OPTIONS,
          field: 'mach',
          split: false,
          view: { cx: x, cy: y, ppu: 4000 },
          background: { r: 0, g: 0, b: 0, a: 1 },
        });
        const range = await renderer.readRange(0);
        const pixels = device.createBuffer({
          size: 512 * 65,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        const encoder = device.createCommandEncoder();
        encoder.copyTextureToBuffer(
          { texture: target },
          { buffer: pixels, bytesPerRow: 512 },
          [65, 65],
        );
        device.queue.submit([encoder.finish()]);
        await pixels.mapAsync(GPUMapMode.READ);
        const centre = new Uint8Array(
          pixels.getMappedRange().slice(512 * 32 + 4 * 32, 512 * 32 + 4 * 32 + 4),
        );
        pixels.destroy();
        const mach = cellFieldValue(
          'mach',
          conserved(i, j),
          Math.fround(gamma),
          problem.freeStream,
        );
        const t = (mach - range!.min) / (range!.max - range!.min);
        const table = colormapTable(256);
        const at = t * 255;
        const k = Math.min(Math.floor(at), 254);
        for (let channel = 0; channel < 3; channel++) {
          const a = table[4 * k + channel]!;
          const b = table[4 * (k + 1) + channel]!;
          const want = 255 * (a + (at - k) * (b - a));
          expect(
            Math.abs(centre[channel]! - want),
            `colour channel ${channel}`,
          ).toBeLessThanOrEqual(1.5);
        }
      } finally {
        target.destroy();
      }
      probed += 1;
    };

    await gpuFittedFlow(device, problem, {
      maxIterations: 750,
      stepsPerMove: 1,
      checkEvery: 250,
      speedTolerance: 3e-5,
      onLive: (fit) => {
        live = fit;
        if (fit === null) renderer.freeze();
        else renderer.setSource(liveFitSource(fit));
      },
      onProgress: () => {
        checked = true;
      },
      gate: async () => {
        // Right after a check the heights on the GPU are those the CPU holds.
        if (checked && live !== null) await check(live);
        checked = false;
      },
    });
    console.log('flow view against the solver, largest relative errors:', errors);
    expect(probed).toBe(2);

    // Once the fit is released, the view still draws the flow, from its own copy.
    const after = await renderer.probe([[2, 0.6]], { ...OPTIONS, field: 'mach', split: false });
    expect(Number.isFinite(after[0])).toBe(true);
    renderer.destroy();
  }, 900_000);

  it('changes no number: a fit watched, drawn and paused ends where an unwatched one does', async () => {
    const problem = sharpFitProblem(cone, { mach: 2, gamma, nj: 20, refinement: 1 });
    const options = {
      maxIterations: 750,
      stepsPerMove: 1,
      checkEvery: 250,
      speedTolerance: 3e-5,
    } as const;
    const plain = await gpuFittedFlow(device, problem, options);
    const renderer = await FlowRenderer.create(device, 'rgba8unorm');
    const target = device.createTexture({
      size: [64, 64],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    let pauses = 0;
    const watched = await gpuFittedFlow(device, problem, {
      ...options,
      onLive: (fit) => {
        if (fit === null) renderer.freeze();
        else renderer.setSource(liveFitSource(fit));
      },
      // Each batch waits a task and draws a frame first.
      gate: async () => {
        pauses += 1;
        renderer.draw(target, {
          ...OPTIONS,
          field: 'mach',
          split: true,
          view: { cx: 2, cy: 0, ppu: 10 },
          background: { r: 0, g: 0, b: 0, a: 1 },
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      },
    });
    target.destroy();
    renderer.destroy();
    expect(pauses).toBeGreaterThan(2);
    expect(watched.fit.iterations).toBe(plain.fit.iterations);
    expect(watched.drag).toBe(plain.drag);
    expect(watched.fit.heights).toEqual(plain.fit.heights);
  }, 900_000);

  it("changes no number on the page's own path: the verified drag to 80 cells across, checked every 1000 steps there, watched, drawn and paused", async () => {
    // As the flow page asks it (src/app/flow-view.ts), with the finest grid 80 cells across.
    const options = {
      mach: 2,
      gamma,
      tolerance: 0,
      maxRefinement: 4,
      floor: FITTED_DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
    };
    const plain = await verifiedFittedDragGpu(device, cone, options);
    const renderer = await FlowRenderer.create(device, 'rgba8unorm');
    const target = device.createTexture({
      size: [64, 64],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const checks: { refinement: number; iterations: number }[] = [];
    let pauses = 0;
    const watched = await verifiedFittedDragGpu(device, cone, {
      ...options,
      onLive: (fit) => {
        if (fit === null) renderer.freeze();
        else renderer.setSource(liveFitSource(fit));
      },
      onCheck: (refinement, iterations) => {
        checks.push({ refinement, iterations });
      },
      // As the page's gate: a frame drawn between batches, and a pause now and then.
      gate: async () => {
        pauses += 1;
        renderer.draw(target, {
          ...OPTIONS,
          field: 'schlieren',
          split: true,
          view: { cx: 2, cy: 0, ppu: 10 },
          background: { r: 0, g: 0, b: 0, a: 1 },
        });
        await new Promise((resolve) => setTimeout(resolve, pauses % 5 === 0 ? 200 : 0));
      },
    });
    target.destroy();
    renderer.destroy();
    console.log(
      'page path:',
      JSON.stringify(plain.kind === 'solved' ? plain.levels : plain),
      `${pauses} pauses`,
    );
    // Checked every 250 steps on the first grid, 500 on the second, 1000 on the third.
    const finest = checks.filter((c) => c.refinement === 4);
    expect(finest.length).toBeGreaterThan(0);
    expect(finest.every((c) => c.iterations % 1000 === 0)).toBe(true);
    expect(plain.kind).toBe('solved');
    expect(watched).toEqual(plain);
  }, 3_600_000);
});
