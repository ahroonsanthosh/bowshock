/**
 * The 3D Euler engine on WebGPU (docs/design/0021-3d-euler-fins.md section
 * 3): the GPU twin of ./euler3d.ts, the same scheme in 32-bit floats. The
 * metrics are computed once in double on the CPU (./grid3d.ts) and uploaded;
 * ghost cells are computed in the kernels from the boundary conditions. Local
 * time steps and SSPRK2 only (the page's and the ladder's scheme).
 *
 * One operation at a time: await each call before the next.
 */

import {
  checkDispatchSize,
  compileShader,
  GpuMemoryLimitError,
  readBuffer,
  withDeviceErrors,
  BufferSet,
  ExclusiveRunner,
} from '../engine-gpu/gpu-common';
import { NonPhysicalStateError } from '../solver/errors';
import { computeMetrics3D, type GridMetrics3D } from './grid3d';
import { SIDES_3D, type BoundaryCondition3D, type Euler3DConfig, type Side3D } from './euler3d';
import { totalEnergy3D, type Primitive3D } from './flux3d';
import euler3dWgsl from './shaders/euler3d.wgsl?raw';

const WORKGROUP_SIZE = 64;
const NV = 5;
const PARAMS_BYTES = 176;

export const BOUNDARY_KINDS_3D: Readonly<Record<BoundaryCondition3D['kind'], number>> = {
  inflow: 0,
  outflow: 1,
  wall: 2,
  periodic: 3,
  faceStates: 4,
};

/** A dispatch over `items` invocations, as a two-dimensional grid of workgroups. */
function groupsFor(device: GPUDevice, items: number): [number, number] {
  const groups = Math.max(1, Math.ceil(items / WORKGROUP_SIZE));
  const limit = device.limits.maxComputeWorkgroupsPerDimension;
  const x = Math.min(groups, limit);
  const y = Math.ceil(groups / x);
  if (y > limit) checkDispatchSize(device, groups, 1, '3D dispatch');
  return [x, y];
}

export class GpuEuler3D {
  readonly config: Euler3DConfig;
  readonly metrics: GridMetrics3D;
  steps = 0;
  private readonly runner = new ExclusiveRunner('GpuEuler3D');
  private readonly buffers: BufferSet;
  private readonly nCells: number;
  private readonly nFaces: number;
  private readonly boundaryData: Float32Array;
  private readonly ghostOffset = new Map<Side3D, number>();
  private readonly fluxOffset = new Map<Side3D, number>();
  private readonly imposedSides = new Set<Side3D>();

  private constructor(
    private readonly device: GPUDevice,
    config: Euler3DConfig,
    metrics: GridMetrics3D,
    buffers: BufferSet,
    private readonly params: GPUBuffer,
    private readonly boundary: GPUBuffer,
    private readonly states: [GPUBuffer, GPUBuffer, GPUBuffer],
    private readonly readback: GPUBuffer,
    private readonly dtBuffer: GPUBuffer,
    private readonly pipelines: Record<
      'face_fluxes' | 'update_cells' | 'residual_out' | 'time_steps',
      GPUComputePipeline
    >,
    private readonly group0: GPUBindGroup,
    private readonly stageGroups: GPUBindGroup[],
    boundaryLayout: { data: Float32Array; ghost: Map<Side3D, number>; flux: Map<Side3D, number> },
  ) {
    this.config = config;
    this.metrics = metrics;
    this.buffers = buffers;
    const { ni, nj, nk } = metrics;
    this.nCells = ni * nj * nk;
    this.nFaces = (ni + 1) * nj * nk + ni * (nj + 1) * nk + ni * nj * (nk + 1);
    this.boundaryData = boundaryLayout.data;
    for (const [s, o] of boundaryLayout.ghost) this.ghostOffset.set(s, o);
    for (const [s, o] of boundaryLayout.flux) this.fluxOffset.set(s, o);
  }

  static async create(device: GPUDevice, config: Euler3DConfig): Promise<GpuEuler3D> {
    if (config.timeStepping !== 'local' || config.timeIntegrator !== 'ssprk2') {
      throw new RangeError('the 3D GPU engine runs SSPRK2 with local time steps only');
    }
    if (config.source !== undefined)
      throw new RangeError('the 3D GPU engine takes no manufactured source');
    const metrics = computeMetrics3D(config.grid, config.geometry);
    const { ni, nj, nk } = metrics;
    const nCells = ni * nj * nk;
    const faceSets = [metrics.iFaces, metrics.jFaces, metrics.kFaces];
    const nFaces = faceSets.reduce((s, f) => s + f.s0.length, 0);
    const faceCount = (s: Side3D) => (s[0] === 'i' ? nj * nk : s[0] === 'j' ? ni * nk : ni * nj);
    const ghost = new Map<Side3D, number>();
    const flux = new Map<Side3D, number>();
    let size = 0;
    for (const s of SIDES_3D) {
      ghost.set(s, size);
      size += 2 * NV * faceCount(s);
    }
    for (const s of SIDES_3D) {
      flux.set(s, size);
      size += NV * faceCount(s);
    }
    const data = new Float32Array(Math.max(size, 4));
    const limit = Math.min(device.limits.maxStorageBufferBindingSize, device.limits.maxBufferSize);
    const stateBytes = 4 * NV * nCells;
    for (const [what, bytes] of [
      ['the state', stateBytes],
      ['the face fluxes', 4 * NV * nFaces],
      ['the face geometry', 16 * nFaces],
    ] as const) {
      if (bytes > limit)
        throw new GpuMemoryLimitError(
          `${what} needs ${bytes} bytes in one buffer, more than this GPU allows (${limit})`,
        );
    }
    const module = await compileShader(device, 'euler3d', euler3dWgsl);
    // Explicit layouts, shared by every kernel (an 'auto' layout keeps only the bindings a kernel uses).
    const entry = (binding: number, type: GPUBufferBindingType): GPUBindGroupLayoutEntry => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type },
    });
    const layout0 = device.createBindGroupLayout({
      label: 'euler3d group 0',
      entries: [
        entry(0, 'uniform'),
        entry(1, 'read-only-storage'),
        entry(2, 'read-only-storage'),
        entry(3, 'read-only-storage'),
        entry(4, 'storage'),
        entry(5, 'storage'),
      ],
    });
    const layout1 = device.createBindGroupLayout({
      label: 'euler3d group 1',
      entries: [
        entry(0, 'uniform'),
        entry(1, 'read-only-storage'),
        entry(2, 'read-only-storage'),
        entry(3, 'storage'),
      ],
    });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [layout0, layout1] });
    const pipelineNames = ['face_fluxes', 'update_cells', 'residual_out', 'time_steps'] as const;
    const pipelines = Object.fromEntries(
      await Promise.all(
        pipelineNames.map(
          async (n) =>
            [
              n,
              await device.createComputePipelineAsync({
                label: `euler3d ${n}`,
                layout,
                compute: { module, entryPoint: n },
              }),
            ] as const,
        ),
      ),
    ) as Record<(typeof pipelineNames)[number], GPUComputePipeline>;
    return withDeviceErrors(
      device,
      'the 3D GPU engine',
      () => {
        const buffers = new BufferSet(device);
        const S = GPUBufferUsage.STORAGE;
        const geom = new Float32Array(4 * nFaces);
        let f = 0;
        for (const set of faceSets) {
          for (let q = 0; q < set.s0.length; q++, f++) {
            geom[4 * f] = set.s0[q]!;
            geom[4 * f + 1] = set.s1[q]!;
            geom[4 * f + 2] = set.s2[q]!;
            geom[4 * f + 3] = Math.hypot(set.s0[q]!, set.s1[q]!, set.s2[q]!);
          }
        }
        const cells = new Float32Array(4 * nCells);
        for (let c = 0; c < nCells; c++) {
          cells[4 * c] = metrics.volume[c]!;
          cells[4 * c + 1] = metrics.sourceVolume[c]!;
        }
        const params = buffers.create(
          'params',
          PARAMS_BYTES,
          GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        );
        const faceGeom = buffers.createWith('face geometry', geom, S);
        const cellGeom = buffers.createWith('cell geometry', cells, S);
        const boundary = buffers.create('boundary', data.byteLength, S | GPUBufferUsage.COPY_DST);
        const faceFlux = buffers.create('face fluxes', 4 * NV * nFaces, S);
        const dt = buffers.create(
          'time steps',
          4 * (nCells + 1),
          S | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        );
        const states = [0, 1, 2].map((n) =>
          buffers.create(
            `state ${n}`,
            stateBytes,
            S | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
          ),
        ) as [GPUBuffer, GPUBuffer, GPUBuffer];
        const readback = buffers.create(
          'readback',
          Math.max(stateBytes, 4 * (nCells + 1)),
          GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        );
        const coefficient = (a: number, b: number) =>
          buffers.createWith(
            `stage ${a} ${b}`,
            new Float32Array([a, b, 0, 0]),
            GPUBufferUsage.UNIFORM,
          );
        // SSPRK2: stage 0 dst = src + dt/V R(src) (a = 0, b = 1); stage 1 dst = (u0 + src + dt/V R(src)) / 2.
        const stage0 = coefficient(0, 1);
        const stage1 = coefficient(0.5, 0.5);
        const group0 = device.createBindGroup({
          layout: layout0,
          entries: [params, faceGeom, cellGeom, boundary, faceFlux, dt].map((buffer, binding) => ({
            binding,
            resource: { buffer },
          })),
        });
        // Stage bind groups: [stage uniform, u0, src, dst] for the step's two stages from state s (s -> t -> d).
        const group = (st: GPUBuffer, u0: GPUBuffer, src: GPUBuffer, dst: GPUBuffer) =>
          device.createBindGroup({
            layout: layout1,
            entries: [st, u0, src, dst].map((buffer, binding) => ({
              binding,
              resource: { buffer },
            })),
          });
        const [a, b, c] = states;
        // Step from a: a -> b (stage 0), (a, b) -> c (stage 1); from c: c -> b, (c, b) -> a.
        const stageGroups = [
          group(stage0, a, a, b),
          group(stage1, a, b, c),
          group(stage0, c, c, b),
          group(stage1, c, b, a),
        ];
        const engine = new GpuEuler3D(
          device,
          config,
          metrics,
          buffers,
          params,
          boundary,
          states,
          readback,
          dt,
          pipelines,
          group0,
          stageGroups,
          { data, ghost, flux },
        );
        for (const side of SIDES_3D) {
          const bc = config.boundaries[side];
          if (bc.kind === 'faceStates') engine.writeGhosts(side, bc.layer0, bc.layer1);
          if (bc.kind === 'inflow') {
            const n = faceCount(side);
            engine.writeGhosts(
              side,
              Array.from({ length: n }, () => bc.state),
              Array.from({ length: n }, () => bc.state),
            );
          }
        }
        engine.writeParams();
        engine.uploadBoundary();
        return engine;
      },
      (e) => {
        e.buffers.destroyAll();
      },
    );
  }

  destroy(): void {
    this.buffers.destroyAll();
  }

  private faceCount(s: Side3D): number {
    const { ni, nj, nk } = this.metrics;
    return s[0] === 'i' ? nj * nk : s[0] === 'j' ? ni * nk : ni * nj;
  }

  private writeGhosts(
    side: Side3D,
    layer0: readonly Primitive3D[],
    layer1: readonly Primitive3D[],
  ): void {
    const n = this.faceCount(side);
    if (layer0.length !== n || layer1.length !== n)
      throw new RangeError(`${side} needs ${n} states in each layer`);
    const base = this.ghostOffset.get(side)!;
    const g = this.config.gamma;
    [layer0, layer1].forEach((layer, l) => {
      layer.forEach((w, t) => {
        const o = base + NV * (l * n + t);
        this.boundaryData.set(
          [w.rho, w.rho * w.u, w.rho * w.v, w.rho * w.w, totalEnergy3D(w, g)],
          o,
        );
      });
    });
  }

  private uploadBoundary(): void {
    this.device.queue.writeBuffer(this.boundary, 0, this.boundaryData);
  }

  private writeParams(): void {
    const { ni, nj, nk } = this.metrics;
    const b = new ArrayBuffer(PARAMS_BYTES);
    const u = new Uint32Array(b);
    const f = new Float32Array(b);
    u.set([
      ni,
      nj,
      nk,
      this.config.geometry === 'cylindrical' ? 1 : 0,
      1,
      this.nCells,
      this.nFaces,
      0,
    ]);
    f[8] = this.config.gamma;
    f[9] = this.config.cfl;
    SIDES_3D.forEach((s, n) => {
      u[12 + n] = BOUNDARY_KINDS_3D[this.config.boundaries[s].kind];
      u[20 + n] = this.imposedSides.has(s) ? 1 : 0;
      u[28 + n] = this.ghostOffset.get(s)!;
      u[36 + n] = this.fluxOffset.get(s)!;
    });
    this.device.queue.writeBuffer(this.params, 0, b);
  }

  setFaceStates(
    side: Side3D,
    layer0: readonly Primitive3D[],
    layer1: readonly Primitive3D[],
  ): void {
    if (this.config.boundaries[side].kind !== 'faceStates')
      throw new RangeError(`${side} does not take face states`);
    this.writeGhosts(side, layer0, layer1);
    this.uploadBoundary();
  }

  /** Fluxes imposed per unit area on a side's faces (5 a face), as Euler3D.setFaceFluxes; null removes them. */
  setFaceFluxes(side: Side3D, fluxes: Float64Array | null): void {
    if (fluxes === null) this.imposedSides.delete(side);
    else {
      if (fluxes.length !== NV * this.faceCount(side))
        throw new RangeError(`${side} needs ${NV} values a face`);
      this.boundaryData.set(fluxes, this.fluxOffset.get(side));
      this.imposedSides.add(side);
      this.uploadBoundary();
    }
    this.writeParams();
  }

  /** Index of the buffer holding the current state: 0 (a) or 2 (c). */
  private current = 0;

  setCellPrimitives(cell: (i: number, j: number, k: number) => Primitive3D): void {
    const { ni, nj, nk } = this.metrics;
    const data = new Float32Array(NV * this.nCells);
    for (let k = 0; k < nk; k++)
      for (let j = 0; j < nj; j++)
        for (let i = 0; i < ni; i++) {
          const w = cell(i, j, k);
          data.set(
            [w.rho, w.rho * w.u, w.rho * w.v, w.rho * w.w, totalEnergy3D(w, this.config.gamma)],
            NV * (i + ni * (j + nj * k)),
          );
        }
    this.current = 0;
    this.steps = 0;
    this.device.queue.writeBuffer(this.states[0], 0, data);
    this.device.queue.writeBuffer(this.dtBuffer, 4 * this.nCells, new Float32Array([0]));
  }

  private dispatch(
    pass: GPUComputePassEncoder,
    name: keyof GpuEuler3D['pipelines'],
    stageGroup: GPUBindGroup,
    items: number,
  ): void {
    pass.setPipeline(this.pipelines[name]);
    pass.setBindGroup(0, this.group0);
    pass.setBindGroup(1, stageGroup);
    const [x, y] = groupsFor(this.device, items);
    pass.dispatchWorkgroups(x, y);
  }

  async iterate(count: number): Promise<void> {
    await this.runner.run(async () => {
      const batch = 50;
      for (let done = 0; done < count;) {
        const n = Math.min(batch, count - done);
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        for (let s = 0; s < n; s++) {
          const g = this.current === 0 ? 0 : 2;
          // Time steps from the current state (bound as src in the first stage group).
          this.dispatch(pass, 'time_steps', this.stageGroups[g]!, this.nCells);
          for (const st of [g, g + 1]) {
            this.dispatch(pass, 'face_fluxes', this.stageGroups[st]!, this.nFaces);
            this.dispatch(pass, 'update_cells', this.stageGroups[st]!, this.nCells);
          }
          this.current = this.current === 0 ? 2 : 0;
        }
        pass.end();
        this.device.queue.submit([encoder.finish()]);
        done += n;
        this.steps += n;
        const flag = new Float32Array(
          await readBuffer(this.device, this.dtBuffer, this.readback, 4 * (this.nCells + 1)),
        )[this.nCells]!;
        if (flag !== 0)
          throw new NonPhysicalStateError(`non-physical state on the GPU after step ${this.steps}`);
      }
    });
  }

  /** The conserved state, five floats a cell in cell order. */
  async conserved(): Promise<Float32Array> {
    return this.runner.run(
      async () =>
        new Float32Array(
          await readBuffer(
            this.device,
            this.states[this.current]!,
            this.readback,
            4 * NV * this.nCells,
          ),
        ),
    );
  }

  async primitives(): Promise<Primitive3D[]> {
    const q = await this.conserved();
    // The GPU solves with gamma rounded to 32 bits; recover the pressure with the same value (as gpuPrimitive2D).
    const g = Math.fround(this.config.gamma);
    const out: Primitive3D[] = [];
    for (let c = 0; c < this.nCells; c++) {
      const rho = q[NV * c]!;
      const u = q[NV * c + 1]! / rho;
      const v = q[NV * c + 2]! / rho;
      const w = q[NV * c + 3]! / rho;
      out.push({
        rho,
        u,
        v,
        w,
        p: (g - 1) * (q[NV * c + 4]! - 0.5 * rho * (u * u + v * v + w * w)),
      });
    }
    return out;
  }

  /** The residual of the current state (five values a cell), computed on the GPU. */
  async residualVector(): Promise<Float32Array> {
    return this.runner.run(async () => {
      const g = this.current === 0 ? 0 : 2;
      // Stage group g reads the current state as src and writes the other buffer (b), which is scratch here.
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      this.dispatch(pass, 'face_fluxes', this.stageGroups[g]!, this.nFaces);
      this.dispatch(pass, 'residual_out', this.stageGroups[g]!, this.nCells);
      pass.end();
      this.device.queue.submit([encoder.finish()]);
      return new Float32Array(
        await readBuffer(this.device, this.states[1], this.readback, 4 * NV * this.nCells),
      );
    });
  }
}
