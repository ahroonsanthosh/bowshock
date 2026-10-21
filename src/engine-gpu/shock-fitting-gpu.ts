/**
 * The fitted-shock iteration of src/solver/shock-fitting.ts on the GPU
 * engine (design: docs/design/0006-shock-fitting.md), all of it on the GPU
 * in 32-bit: the flow, the shock boundary, the shock's moves, the grid's
 * metrics and the remap after each move. Every stepsPerMove steps each
 * line moves by one step's worth, W dt, as on the CPU (moving by the sum
 * over the steps diverges). At each check the heights are read back in
 * double precision (src/engine-gpu/line-grid.ts) and made the new base of
 * the moves that follow.
 */

import { gridOnLines, type GridLine } from '../grid/blunt-grid';
import type { Geometry, StructuredGrid } from '../grid/structured';
import type { Primitive2D } from '../scheme/flux';
import { SettlingValue } from '../verification/iterative-convergence';
import { GpuEuler2D, gpuPrimitive2D, type GpuEuler2DConfig } from './euler2d-gpu';
import { GpuLineGrid } from './line-grid';
import { DT_LOG_SIZE } from './time-loop';

/**
 * A fit as it runs, for drawing it as it converges straight from the GPU's
 * buffers (src/render/flow-renderer.ts): nothing here reads the GPU.
 */
export interface LiveFit {
  readonly ni: number;
  readonly nj: number;
  readonly gamma: number;
  readonly geometry: Geometry;
  readonly freeStream: Primitive2D;
  readonly lines: readonly GridLine[];
  /** The buffer holding the current solution (it changes with every step). */
  state(): GPUBuffer;
  /** The buffers that place the moving grid's nodes (GpuLineGrid.nodeBuffers). */
  readonly nodeBuffers: { lines: GPUBuffer; fractions: GPUBuffer; heights: GPUBuffer };
  /** The heights at the last check, in double precision. */
  heights(): readonly number[];
}

export interface GpuShockFitOptions {
  readonly device: GPUDevice;
  /** The grid's lines, with fixed node fractions (withFixedFractions). */
  readonly lines: readonly GridLine[];
  /** Starting shock heights along the lines. */
  readonly heights: readonly number[];
  readonly nj: number;
  /** The body's radius, as for gridOnLines. */
  readonly baseRadius: number;
  /** The engine on a grid; jMax must be a 'faceStates' boundary (the shock is set here). */
  readonly configFor: (grid: StructuredGrid) => GpuEuler2DConfig;
  readonly initial: (i: number, j: number) => Primitive2D;
  readonly freeStream: Primitive2D;
  /** The shock's first node: on the axis, normal to it ('symmetry'), or not moved ('fixed'). */
  readonly firstNode: 'symmetry' | 'fixed';
  readonly stepsPerMove: number;
  /** Steps between convergence checks. */
  readonly checkEvery: number;
  /** The result the fit converges, from the flow on the current grid, in double precision. */
  readonly monitor: (grid: StructuredGrid, cell: (i: number, j: number) => Primitive2D) => number;
  /** Change of the monitored result, relative, that counts as none. */
  readonly noise: number;
  /**
   * The drag's rate of convergence per check known from before (the fit of
   * the coarser grid this one starts from), for the stopping test
   * (SettlingValue); NaN or undefined if none.
   */
  readonly knownRate?: number | undefined;
  /** Largest shock speed over the free stream's sound speed at convergence. */
  readonly speedTolerance: number;
  readonly maxIterations: number;
  /** Stops the fit at its next check, which then throws the signal's reason. */
  readonly signal?: AbortSignal | undefined;
  readonly onProgress?: ((iterations: number, maxSpeed: number, value: number) => void) | undefined;
  /**
   * Called with the fit once its solver is set up, and with null before
   * the solver's buffers are released: for drawing the flow as it
   * converges.
   */
  readonly onLive?: ((live: LiveFit | null) => void) | undefined;
  /**
   * Awaited before each batch of steps (at most DT_LOG_SIZE): a page holds
   * it to pause the fit. The steps are the same with it or without, in
   * the same batches: only when the CPU submits them changes.
   */
  readonly gate?: (() => Promise<void>) | undefined;
}

export interface GpuShockFit {
  /** The grid at the last heights, in double precision. */
  readonly grid: StructuredGrid;
  readonly heights: readonly number[];
  /** The flow at the last check. */
  readonly cell: (i: number, j: number) => Primitive2D;
  /** The monitored result at the last check. */
  readonly value: number;
  readonly maxSpeed: number;
  readonly iterations: number;
  readonly converged: boolean;
  /**
   * The drag's rate of convergence per check, for the next grid: measured
   * on this fit, else the one known from before; NaN if none.
   */
  readonly rate: number;
}

export async function fitShockGpu(options: GpuShockFitOptions): Promise<GpuShockFit> {
  const { device, lines, nj, baseRadius, freeStream: free } = options;
  const ni = lines.length - 1;
  let heights = [...options.heights];
  const config: GpuEuler2DConfig = {
    ...options.configFor(gridOnLines(lines, heights, nj, baseRadius, false)),
    fittedShock: { freeStream: free },
  };
  const { gamma } = config;
  const aFree = Math.sqrt((gamma * free.p) / free.rho);

  const gpu = await GpuEuler2D.create(device, config);
  let lineGrid: GpuLineGrid;
  try {
    lineGrid = await GpuLineGrid.create(device, lines, nj, {
      geometry: config.geometry,
      gamma,
      target: gpu.geometryBuffer,
      boundary: gpu.boundaryBuffer,
      firstNode: options.firstNode,
    });
  } catch (error) {
    gpu.destroy();
    throw error;
  }
  try {
    // From here on the engine's metrics are those computed on the GPU.
    lineGrid.setHeights(heights);
    gpu.setCellPrimitives(options.initial);
    options.onLive?.({
      ni,
      nj,
      gamma,
      geometry: config.geometry,
      freeStream: free,
      lines,
      state: () => gpu.stateBuffer,
      nodeBuffers: lineGrid.nodeBuffers,
      heights: () => heights,
    });
    const settling = new SettlingValue(options.noise, options.knownRate ?? Number.NaN);
    const movesPerCheck = Math.max(1, Math.round(options.checkEvery / options.stepsPerMove));
    let cell = options.initial;
    let value = Number.NaN;
    let maxSpeed = Infinity;
    let iterations = 0;
    let converged = false;

    while (iterations < options.maxIterations) {
      options.signal?.throwIfAborted();
      if (options.gate === undefined) {
        await gpu.iterateFitted(lineGrid, movesPerCheck, options.stepsPerMove);
      } else {
        // The batches iterateFitted makes of the moves, with the gate before each.
        const perBatch = Math.max(1, Math.floor(DT_LOG_SIZE / options.stepsPerMove));
        for (let done = 0; done < movesPerCheck; done += perBatch) {
          await options.gate();
          options.signal?.throwIfAborted();
          const moves = Math.min(perBatch, movesPerCheck - done);
          await gpu.iterateFitted(lineGrid, moves, options.stepsPerMove);
        }
      }
      iterations += movesPerCheck * options.stepsPerMove;
      // The speeds of the last move.
      const { speed } = await gpu.readShock();
      maxSpeed = Math.max(...Array.from(speed, (w) => Math.abs(w) / aFree));
      heights = await lineGrid.readHeights();
      lineGrid.setHeights(heights);
      const state = await gpu.readState();
      cell = (i, j) => gpuPrimitive2D(state, i + j * ni, gamma);
      value = options.monitor(gridOnLines(lines, heights, nj, baseRadius, false), cell);
      options.onProgress?.(iterations, maxSpeed, value);
      if (!Number.isFinite(value)) break;
      if (settling.add(value) && maxSpeed < options.speedTolerance) {
        converged = true;
        break;
      }
    }
    return {
      grid: gridOnLines(lines, heights, nj, baseRadius, false),
      heights,
      cell,
      value,
      maxSpeed,
      iterations,
      converged,
      rate: settling.rateToPassOn,
    };
  } finally {
    options.onLive?.(null);
    lineGrid.destroy();
    gpu.destroy();
  }
}
