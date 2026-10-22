/**
 * Two-dimensional finite-volume Euler solver on a structured, curvilinear
 * grid block, in planar or axisymmetric geometry: the CPU reference engine.
 * Method and conventions: docs/design/0003-2d-solver.md.
 */

import {
  computeMetrics,
  type Geometry,
  type GridMetrics,
  type StructuredGrid,
} from '../grid/structured';
import {
  FACE_FLUXES,
  faceFlux2D,
  type FaceFrameFlux,
  type FluxName,
  type Primitive2D,
} from '../scheme/flux';
import { pressureFromConserved2D, soundSpeed } from '../scheme/gas';
import { LIMITERS, type LimiterName } from '../scheme/limiters';
import {
  type Reconstruction,
  reconstructPerVariable,
  reconstructShared,
  reconstructSharedScaled,
} from '../scheme/reconstruction';
import { validateGrid2DConfig } from '../solver/config';
import { NonPhysicalStateError } from '../solver/errors';
import { RUNGE_KUTTA_STAGES, type TimeIntegrator } from '../solver/runge-kutta';

export type Side = 'iMin' | 'iMax' | 'jMin' | 'jMax';

export type BoundaryCondition2D =
  /** Fixed state outside the boundary: supersonic inflow. */
  | { readonly kind: 'inflow'; readonly state: Primitive2D }
  /**
   * A fixed state outside each boundary face, in order along the side
   * (replaceable with setFaceStates): the post-shock state at a fitted
   * shock.
   */
  | { readonly kind: 'faceStates'; readonly states: readonly Primitive2D[] }
  /** Zero-gradient extrapolation: supersonic outflow. */
  | { readonly kind: 'outflow' }
  /** Slip wall; also a symmetry plane, or the axis in axisymmetric geometry. */
  | { readonly kind: 'wall' }
  /** Periodic: must be paired with periodic on the opposite side. */
  | { readonly kind: 'periodic' };

export interface Euler2DConfig {
  readonly grid: StructuredGrid;
  readonly geometry: Geometry;
  readonly gamma: number;
  readonly flux: FluxName;
  readonly limiter: LimiterName;
  /**
   * 'perVariable' for time-accurate flows, 'shared' for steady flows with
   * shocks; the trade-off is described in src/scheme/reconstruction.ts.
   */
  readonly reconstruction: Reconstruction;
  readonly timeIntegrator: TimeIntegrator;
  readonly cfl: number;
  /** Global steps are time-accurate; local steps converge steady flows faster. */
  readonly timeStepping: 'global' | 'local';
  readonly boundaries: Readonly<Record<Side, BoundaryCondition2D>>;
  /**
   * Steady source of mass, x and y momentum and energy integrated over each
   * cell (per radian in axisymmetric geometry), four values per cell, cell
   * (i, j) at 4 (i + j ni). For code verification by manufactured
   * solutions (src/validation/manufactured.ts); physical flows have none.
   */
  readonly source?: Float64Array;
  /**
   * i-node lines at which the wall's slope breaks, such as the shoulder of
   * a cone-cylinder. The cells on either side of one are reconstructed in i
   * from their own side only, with the one-sided difference: across the
   * corner the flow is not smooth (a centred expansion), and in supersonic
   * flow nothing from it reaches the cells ahead of it, but a stencil
   * across it would carry it there (docs/design/0006-shock-fitting.md).
   */
  readonly iSlopeBreaks?: readonly number[];
}

export interface BoundaryFaceFlux {
  /** Midpoint of the face. */
  readonly x: number;
  readonly y: number;
  /** Outward unit normal of the face. */
  readonly nx: number;
  readonly ny: number;
  /**
   * Face area: length in planar geometry; length times midpoint radius in
   * axisymmetric geometry (the area per radian of revolution).
   */
  readonly area: number;
  /** Flux per unit area along the outward normal: [mass, x mom., y mom., energy]. */
  readonly flux: readonly [number, number, number, number];
}

interface BoundaryFace {
  readonly i: number;
  readonly j: number;
  readonly nx: number;
  readonly ny: number;
  readonly area: number;
  /** Grid nodes at the two ends of the face. */
  readonly nodes: readonly [number, number];
  readonly outward: 1 | -1;
}

const NO_BREAKS: ReadonlySet<number> = new Set();

/**
 * The value of cell c at a face, from its neighbour o on the same side of
 * a slope break: c + s (c - o) / 2, with s = 1 when o lies behind the face
 * and -1 when it lies beyond it (the one-sided difference, unlimited).
 */
function oneSided(c: Primitive2D, o: Primitive2D, s: 1 | -1): Primitive2D {
  const k = 0.5 * s;
  return {
    rho: c.rho + k * (c.rho - o.rho),
    u: c.u + k * (c.u - o.u),
    v: c.v + k * (c.v - o.v),
    p: c.p + k * (c.p - o.p),
  };
}

/** Ghost layers on each side; MUSCL needs two. */
const GHOSTS = 2;

/** Conserved variables, including ghost cells. */
interface State {
  readonly rho: Float64Array;
  readonly mu: Float64Array;
  readonly mv: Float64Array;
  readonly energy: Float64Array;
}

export class Euler2D {
  readonly config: Euler2DConfig;
  readonly metrics: GridMetrics;
  time = 0;
  steps = 0;

  private readonly flux: FaceFrameFlux;
  /** Reconstructs the centre cell's state at its +1 or -1 face. */
  private readonly reconstruct: (
    prev: Primitive2D,
    centre: Primitive2D,
    next: Primitive2D,
    side: 1 | -1,
  ) => Primitive2D;
  /** Row length of the padded arrays: ni + 2 * GHOSTS. */
  private readonly stride: number;
  private readonly state: State;
  private readonly stages: readonly [State, State];
  /** Residual: rate of change of the conserved variables times cell volume. */
  private readonly residual: State;
  /** Time step of each interior cell (all equal for global stepping). */
  private readonly dt: Float64Array;
  private readonly fluxOut = new Float64Array(4);
  /** The source integrated over each interior cell, four values per cell, or null. */
  private readonly cellSource: Float64Array | null;
  /** States outside the faces of each 'faceStates' side. */
  private readonly boundaryStates = new Map<Side, readonly Primitive2D[]>();
  /** Fluxes imposed on the faces of a 'faceStates' side, if any (see setFaceFluxes). */
  private readonly boundaryFluxOverrides = new Map<Side, Float64Array>();
  /** i-node lines at which the wall's slope breaks (Euler2DConfig.iSlopeBreaks). */
  private readonly iSlopeBreaks: ReadonlySet<number>;

  constructor(config: Euler2DConfig) {
    validateGrid2DConfig(config);
    const { grid } = config;
    this.config = config;
    this.metrics = computeMetrics(grid, config.geometry);
    this.flux = FACE_FLUXES[config.flux];
    const limiter = LIMITERS[config.limiter];
    const gamma = config.gamma;
    this.reconstruct =
      config.reconstruction === 'shared'
        ? reconstructShared
        : config.reconstruction === 'sharedScaled'
          ? (prev, centre, next, side) => reconstructSharedScaled(prev, centre, next, side, gamma)
          : (prev, centre, next, side) => reconstructPerVariable(prev, centre, next, side, limiter);
    this.stride = grid.ni + 2 * GHOSTS;
    const size = this.stride * (grid.nj + 2 * GHOSTS);
    const allocate = (): State => ({
      rho: new Float64Array(size),
      mu: new Float64Array(size),
      mv: new Float64Array(size),
      energy: new Float64Array(size),
    });
    this.state = allocate();
    this.stages = [allocate(), allocate()];
    this.residual = allocate();
    this.dt = new Float64Array(grid.ni * grid.nj);
    if (config.source !== undefined && config.source.length !== 4 * grid.ni * grid.nj) {
      throw new RangeError('the source needs four values per cell');
    }
    this.cellSource = config.source ?? null;
    this.iSlopeBreaks = new Set(config.iSlopeBreaks ?? []);
    for (const side of ['iMin', 'iMax', 'jMin', 'jMax'] as const) {
      const bc = config.boundaries[side];
      if (bc.kind === 'faceStates') this.setFaceStates(side, bc.states);
    }
  }

  /** Replace the states outside the faces of a 'faceStates' side. */
  setFaceStates(side: Side, states: readonly Primitive2D[]): void {
    if (this.config.boundaries[side].kind !== 'faceStates') {
      throw new RangeError(`the ${side} boundary does not take face states`);
    }
    const along = side === 'iMin' || side === 'iMax' ? this.metrics.nj : this.metrics.ni;
    if (states.length !== along) {
      throw new RangeError(`the ${side} boundary needs ${along} face states`);
    }
    this.boundaryStates.set(side, [...states]);
  }

  /**
   * Impose the flux through each face of a 'faceStates' side instead of
   * solving a Riemann problem there: four values per face (mass, x and y
   * momentum, energy per unit area, along the stored face normal), such as
   * the flux through a fitted shock. The face states still fill the ghost
   * cells used by the reconstruction. Pass null to go back to the Riemann
   * flux.
   */
  setFaceFluxes(side: Side, fluxes: Float64Array | null): void {
    if (this.config.boundaries[side].kind !== 'faceStates') {
      throw new RangeError(`the ${side} boundary does not take face fluxes`);
    }
    const along = side === 'iMin' || side === 'iMax' ? this.metrics.nj : this.metrics.ni;
    if (fluxes === null) {
      this.boundaryFluxOverrides.delete(side);
      return;
    }
    if (fluxes.length !== 4 * along) {
      throw new RangeError(`the ${side} boundary needs ${4 * along} flux values`);
    }
    this.boundaryFluxOverrides.set(side, Float64Array.from(fluxes));
  }

  /** Copy an imposed flux for boundary face t of a side into fluxOut; false if none. */
  private imposedFlux(side: Side | null, t: number): boolean {
    if (side === null) return false;
    const fluxes = this.boundaryFluxOverrides.get(side);
    if (fluxes === undefined) return false;
    for (let k = 0; k < 4; k++) this.fluxOut[k] = fluxes[4 * t + k]!;
    return true;
  }

  /** Index of cell (i, j) in the padded arrays; i and j may be ghost indices (-2..n+1). */
  private index(i: number, j: number): number {
    return i + GHOSTS + (j + GHOSTS) * this.stride;
  }

  /** Set every cell to the field's value at its centroid; resets time. */
  setInitialCondition(field: (x: number, y: number) => Primitive2D): void {
    const { ni, nj, centroidX, centroidY } = this.metrics;
    const gamma = this.config.gamma;
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const w = field(centroidX[i + j * ni]!, centroidY[i + j * ni]!);
        const k = this.index(i, j);
        this.state.rho[k] = w.rho;
        this.state.mu[k] = w.rho * w.u;
        this.state.mv[k] = w.rho * w.v;
        this.state.energy[k] = w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v);
      }
    }
    this.time = 0;
    this.steps = 0;
    this.checkPhysical(this.state);
  }

  /**
   * Set every interior cell from its indices, for example to evaluate wall
   * fluxes, in double precision, of a state computed elsewhere (the GPU
   * engine). The time and step count restart from zero.
   */
  setCellPrimitives(cell: (i: number, j: number) => Primitive2D): void {
    const { ni, nj } = this.metrics;
    const gamma = this.config.gamma;
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const w = cell(i, j);
        const k = this.index(i, j);
        this.state.rho[k] = w.rho;
        this.state.mu[k] = w.rho * w.u;
        this.state.mv[k] = w.rho * w.v;
        this.state.energy[k] = w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v);
      }
    }
    this.time = 0;
    this.steps = 0;
    this.checkPhysical(this.state);
  }

  /** Primitive variables of interior cell (i, j). */
  primitive(i: number, j: number): Primitive2D {
    const { ni, nj } = this.metrics;
    if (!(Number.isInteger(i) && Number.isInteger(j) && i >= 0 && i < ni && j >= 0 && j < nj)) {
      throw new RangeError(`cell (${i}, ${j}) is outside the ${ni} x ${nj} grid`);
    }
    return this.primitiveAt(this.state, this.index(i, j));
  }

  /** Root-mean-square of the density residual d(rho)/dt over the interior cells. */
  densityResidualNorm(): number {
    const { ni, nj, volume } = this.metrics;
    this.computeResidual(this.state);
    let sum = 0;
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const r = this.residual.rho[this.index(i, j)]! / volume[i + j * ni]!;
        sum += r * r;
      }
    }
    return Math.sqrt(sum / (ni * nj));
  }

  /**
   * Flux per unit area through each boundary face on one side, as
   * [mass, x momentum, y momentum, energy], with the face's unit normal
   * pointing out of the domain. On a wall the mass flux vanishes and the
   * normal momentum flux is the wall pressure.
   */
  boundaryFluxes(side: Side): BoundaryFaceFlux[] {
    this.fillGhosts(this.state);
    const direction = side === 'iMin' || side === 'iMax' ? 'i' : 'j';
    const along = direction === 'i' ? this.metrics.nj : this.metrics.ni;
    const result: BoundaryFaceFlux[] = [];
    for (let t = 0; t < along; t++) {
      const { i, j, nx, ny, area, nodes, outward } = this.boundaryFace(side, t);
      const [left, right] = this.wallMirrored(
        this.faceStates(this.state, direction, i, j),
        side,
        nx,
        ny,
      );
      faceFlux2D(this.flux, left, right, nx, ny, this.config.gamma, this.fluxOut);
      const f = this.fluxOut;
      const { x, y } = this.config.grid;
      result.push({
        x: 0.5 * (x[nodes[0]]! + x[nodes[1]]!),
        y: 0.5 * (y[nodes[0]]! + y[nodes[1]]!),
        nx: outward * nx,
        ny: outward * ny,
        area,
        flux: [outward * f[0]!, outward * f[1]!, outward * f[2]!, outward * f[3]!],
      });
    }
    return result;
  }

  /** Largest stable global time step for the current state (the smallest cell time step). */
  stableTimeStep(): number {
    this.computeTimeSteps(Infinity);
    let smallest = Infinity;
    for (const dt of this.dt) smallest = Math.min(smallest, dt);
    return smallest;
  }

  /** Advance to exactly `tEnd` with global time steps. */
  advanceTo(tEnd: number, maxSteps = 1_000_000): void {
    if (this.config.timeStepping !== 'global') {
      throw new Error('advanceTo needs global time stepping; use iterate() for local stepping');
    }
    const firstStep = this.steps;
    while (this.time < tEnd) {
      if (this.steps - firstStep >= maxSteps) {
        throw new Error(`advanceTo(${tEnd}) needed more than ${maxSteps} steps`);
      }
      this.computeTimeSteps(tEnd - this.time);
      const dt = this.dt[0]!;
      this.step();
      this.time += dt;
      if (tEnd - this.time < 1e-12 * Math.max(1, Math.abs(tEnd))) this.time = tEnd;
    }
  }

  /** Take `count` steps towards a steady state (local or global time steps). */
  iterate(count: number): void {
    for (let n = 0; n < count; n++) {
      this.computeTimeSteps(Infinity);
      if (this.config.timeStepping === 'global') this.time += this.dt[0]!;
      this.step();
    }
  }

  /** One step of the configured Runge-Kutta scheme using the time steps in this.dt. */
  private step(): void {
    const u0 = this.state;
    const stages = RUNGE_KUTTA_STAGES[this.config.timeIntegrator];
    let previous = u0;
    stages.forEach(({ a, b }, n) => {
      const out = n === stages.length - 1 ? u0 : this.stages[n % 2]!;
      this.stage(u0, previous, a, b, out);
      previous = out;
    });
    this.steps += 1;
    this.checkPhysical(u0);
  }

  /** out = a * u0 + b * (src + dt * L(src)), cell by cell. `out` may alias u0. */
  private stage(u0: State, src: State, a: number, b: number, out: State): void {
    this.computeResidual(src);
    const { ni, nj, volume } = this.metrics;
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const k = this.index(i, j);
        const c = i + j * ni;
        const factor = this.dt[c]! / volume[c]!;
        out.rho[k] = a * u0.rho[k]! + b * (src.rho[k]! + factor * this.residual.rho[k]!);
        out.mu[k] = a * u0.mu[k]! + b * (src.mu[k]! + factor * this.residual.mu[k]!);
        out.mv[k] = a * u0.mv[k]! + b * (src.mv[k]! + factor * this.residual.mv[k]!);
        out.energy[k] =
          a * u0.energy[k]! + b * (src.energy[k]! + factor * this.residual.energy[k]!);
      }
    }
  }

  /**
   * Time step of every cell: CFL * V / (spectral radius in i + in j), each
   * spectral radius |u . S| + a |S| with S the mean area vector of the
   * cell's two faces in that direction. Global stepping uses the minimum,
   * capped at `limit`.
   */
  private computeTimeSteps(limit: number): void {
    const { ni, nj, iFaces, jFaces, volume } = this.metrics;
    const { cfl, gamma } = this.config;
    let smallest = Infinity;
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const w = this.primitiveAt(this.state, this.index(i, j));
        const a = soundSpeed(w.rho, w.p, gamma);
        const spectralRadius = (faces: typeof iFaces, f0: number, f1: number) => {
          const sx = 0.5 * (faces.nx[f0]! * faces.area[f0]! + faces.nx[f1]! * faces.area[f1]!);
          const sy = 0.5 * (faces.ny[f0]! * faces.area[f0]! + faces.ny[f1]! * faces.area[f1]!);
          return Math.abs(w.u * sx + w.v * sy) + a * Math.hypot(sx, sy);
        };
        const fi = i + j * (ni + 1);
        const fj = i + j * ni;
        const lambda = spectralRadius(iFaces, fi, fi + 1) + spectralRadius(jFaces, fj, fj + ni);
        const dt = (cfl * volume[fj]!) / lambda;
        this.dt[fj] = dt;
        smallest = Math.min(smallest, dt);
      }
    }
    if (this.config.timeStepping === 'global') this.dt.fill(Math.min(smallest, limit));
  }

  /** Residual (rate of change times volume) of every interior cell for state `u`. */
  private computeResidual(u: State): void {
    const { ni, nj, iFaces, jFaces, planarArea, geometry } = this.metrics;
    const { gamma } = this.config;
    const r = this.residual;
    this.fillGhosts(u);
    r.rho.fill(0);
    r.mu.fill(0);
    r.mv.fill(0);
    r.energy.fill(0);

    // Subtract the face flux from the cell behind the face (whose outward
    // normal it is) and add it to the cell in front.
    const accumulate = (kLeft: number, kRight: number, area: number) => {
      const f = this.fluxOut;
      const mass = f[0]! * area;
      const xMomentum = f[1]! * area;
      const yMomentum = f[2]! * area;
      const energy = f[3]! * area;
      r.rho[kLeft] = r.rho[kLeft]! - mass;
      r.mu[kLeft] = r.mu[kLeft]! - xMomentum;
      r.mv[kLeft] = r.mv[kLeft]! - yMomentum;
      r.energy[kLeft] = r.energy[kLeft]! - energy;
      r.rho[kRight] = r.rho[kRight]! + mass;
      r.mu[kRight] = r.mu[kRight]! + xMomentum;
      r.mv[kRight] = r.mv[kRight]! + yMomentum;
      r.energy[kRight] = r.energy[kRight]! + energy;
    };

    // i-faces: face (i, j) lies between cells (i - 1, j) and (i, j).
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i <= ni; i++) {
        const f = i + j * (ni + 1);
        const side = i === 0 ? 'iMin' : i === ni ? 'iMax' : null;
        if (!this.imposedFlux(side, j)) {
          const [left, right] = this.wallMirrored(
            this.faceStates(u, 'i', i, j),
            side,
            iFaces.nx[f]!,
            iFaces.ny[f]!,
          );
          faceFlux2D(this.flux, left, right, iFaces.nx[f]!, iFaces.ny[f]!, gamma, this.fluxOut);
        }
        accumulate(this.index(i - 1, j), this.index(i, j), iFaces.area[f]!);
      }
    }
    // j-faces: face (i, j) lies between cells (i, j - 1) and (i, j).
    for (let j = 0; j <= nj; j++) {
      for (let i = 0; i < ni; i++) {
        const f = i + j * ni;
        const side = j === 0 ? 'jMin' : j === nj ? 'jMax' : null;
        if (!this.imposedFlux(side, i)) {
          const [left, right] = this.wallMirrored(
            this.faceStates(u, 'j', i, j),
            side,
            jFaces.nx[f]!,
            jFaces.ny[f]!,
          );
          faceFlux2D(this.flux, left, right, jFaces.nx[f]!, jFaces.ny[f]!, gamma, this.fluxOut);
        }
        accumulate(this.index(i, j - 1), this.index(i, j), jFaces.area[f]!);
      }
    }

    if (this.cellSource !== null) {
      const q = this.cellSource;
      for (let j = 0; j < nj; j++) {
        for (let i = 0; i < ni; i++) {
          const k = this.index(i, j);
          const c = 4 * (i + j * ni);
          r.rho[k] = r.rho[k]! + q[c]!;
          r.mu[k] = r.mu[k]! + q[c + 1]!;
          r.mv[k] = r.mv[k]! + q[c + 2]!;
          r.energy[k] = r.energy[k]! + q[c + 3]!;
        }
      }
    }

    // Axisymmetric source: the pressure p * A on the radial momentum,
    // balancing the radial pressure force on the faces (see 0003).
    if (geometry === 'axisymmetric') {
      for (let j = 0; j < nj; j++) {
        for (let i = 0; i < ni; i++) {
          const k = this.index(i, j);
          const p = pressureFromConserved2D(u.rho[k]!, u.mu[k]!, u.mv[k]!, u.energy[k]!, gamma);
          r.mv[k] = r.mv[k]! + p * planarArea[i + j * ni]!;
        }
      }
    }
  }

  /**
   * Reconstructed left and right states at face (i, j) of the given
   * direction, falling back to the adjacent cell values (first order) if
   * reconstruction would give non-positive density or pressure.
   */
  private faceStates(
    u: State,
    direction: 'i' | 'j',
    i: number,
    j: number,
  ): [Primitive2D, Primitive2D] {
    const step = direction === 'i' ? 1 : this.stride;
    const kRight = this.index(i, j);
    const kLeft = kRight - step;
    const wLL = this.primitiveAt(u, kLeft - step);
    const wL = this.primitiveAt(u, kLeft);
    const wR = this.primitiveAt(u, kRight);
    const wRR = this.primitiveAt(u, kRight + step);
    // Face i lies between cells i - 1 and i; node line b separates cells
    // b - 1 and b.
    const breaks = direction === 'i' ? this.iSlopeBreaks : NO_BREAKS;
    const left = breaks.has(i)
      ? oneSided(wL, wLL, 1)
      : breaks.has(i - 1)
        ? oneSided(wL, wR, -1)
        : this.reconstruct(wLL, wL, wR, 1);
    const right = breaks.has(i + 1)
      ? oneSided(wR, wL, -1)
      : breaks.has(i)
        ? oneSided(wR, wRR, 1)
        : this.reconstruct(wL, wR, wRR, -1);
    const ok = left.rho > 0 && left.p > 0 && right.rho > 0 && right.p > 0;
    return ok ? [left, right] : [wL, wR];
  }

  /**
   * At a wall face, the state outside the wall becomes the exact mirror of
   * the state reconstructed inside it, its velocity reflected about the
   * face normal (nx, ny), so that the face carries no mass whatever the
   * reconstruction. (Reconstructing both sides from the mirrored ghost
   * cells gives the same for the shared reconstruction, whose limiter
   * factor is mirror-invariant, but not for the per-variable one, whose
   * componentwise limiting of u and v is not invariant under a reflection
   * about a wall that is not aligned with x or y.)
   */
  private wallMirrored(
    states: [Primitive2D, Primitive2D],
    side: Side | null,
    nx: number,
    ny: number,
  ): [Primitive2D, Primitive2D] {
    if (side === null || this.config.boundaries[side].kind !== 'wall') return states;
    const mirror = (w: Primitive2D): Primitive2D => {
      const un = w.u * nx + w.v * ny;
      return { rho: w.rho, u: w.u - 2 * un * nx, v: w.v - 2 * un * ny, p: w.p };
    };
    // On a minimum side the cell inside lies to the right of the face.
    const inside = side === 'iMin' || side === 'jMin' ? states[1] : states[0];
    return side === 'iMin' || side === 'jMin' ? [mirror(inside), inside] : [inside, mirror(inside)];
  }

  private primitiveAt(u: State, k: number): Primitive2D {
    const rho = u.rho[k]!;
    const mu = u.mu[k]!;
    const mv = u.mv[k]!;
    return {
      rho,
      u: mu / rho,
      v: mv / rho,
      p: pressureFromConserved2D(rho, mu, mv, u.energy[k]!, this.config.gamma),
    };
  }

  /** Fill the two ghost layers on every side according to its boundary condition. */
  private fillGhosts(u: State): void {
    const { ni, nj } = this.metrics;
    for (const side of ['iMin', 'iMax', 'jMin', 'jMax'] as const) {
      const bc = this.config.boundaries[side];
      const along = side === 'iMin' || side === 'iMax' ? nj : ni;
      for (let t = 0; t < along; t++) {
        const { nx, ny } = this.boundaryFace(side, t);
        for (let g = 0; g < GHOSTS; g++) {
          // Ghost layer g mirrors interior layer g (or, if periodic, wraps).
          const [ghost, mirror, wrap] = this.ghostCells(side, t, g, ni, nj);
          const source = bc.kind === 'periodic' ? wrap : mirror;
          if (bc.kind === 'inflow' || bc.kind === 'faceStates') {
            const w = bc.kind === 'inflow' ? bc.state : this.boundaryStates.get(side)![t]!;
            const gamma = this.config.gamma;
            u.rho[ghost] = w.rho;
            u.mu[ghost] = w.rho * w.u;
            u.mv[ghost] = w.rho * w.v;
            u.energy[ghost] = w.p / (gamma - 1) + 0.5 * w.rho * (w.u * w.u + w.v * w.v);
            continue;
          }
          u.rho[ghost] = u.rho[source]!;
          u.energy[ghost] = u.energy[source]!;
          if (bc.kind === 'wall') {
            // Reflect the momentum about the wall: m' = m - 2 (m . n) n.
            const mn = u.mu[source]! * nx + u.mv[source]! * ny;
            u.mu[ghost] = u.mu[source]! - 2 * mn * nx;
            u.mv[ghost] = u.mv[source]! - 2 * mn * ny;
          } else {
            u.mu[ghost] = u.mu[source]!;
            u.mv[ghost] = u.mv[source]!;
          }
        }
      }
    }
  }

  /** Padded indices of [ghost, its mirror cell, its periodic image] for layer g at position t along a side. */
  private ghostCells(
    side: Side,
    t: number,
    g: number,
    ni: number,
    nj: number,
  ): [number, number, number] {
    switch (side) {
      case 'iMin':
        return [this.index(-1 - g, t), this.index(g, t), this.index(ni - 1 - g, t)];
      case 'iMax':
        return [this.index(ni + g, t), this.index(ni - 1 - g, t), this.index(g, t)];
      case 'jMin':
        return [this.index(t, -1 - g), this.index(t, g), this.index(t, nj - 1 - g)];
      case 'jMax':
        return [this.index(t, nj + g), this.index(t, nj - 1 - g), this.index(t, g)];
    }
  }

  /**
   * The boundary face at position t along a side: its face indices (i, j),
   * its unit normal (pointing towards increasing index) and the sign that
   * turns that normal outward.
   */
  private boundaryFace(side: Side, t: number): BoundaryFace {
    const { ni, nj, iFaces, jFaces } = this.metrics;
    switch (side) {
      case 'iMin':
      case 'iMax': {
        const i = side === 'iMin' ? 0 : ni;
        const f = i + t * (ni + 1);
        const outward = side === 'iMin' ? -1 : 1;
        // Face (i, t) joins nodes (i, t) and (i, t + 1).
        const nodes = [f, f + ni + 1] as const;
        return {
          i,
          j: t,
          nx: iFaces.nx[f]!,
          ny: iFaces.ny[f]!,
          area: iFaces.area[f]!,
          nodes,
          outward,
        };
      }
      case 'jMin':
      case 'jMax': {
        const j = side === 'jMin' ? 0 : nj;
        const f = t + j * ni;
        const outward = side === 'jMin' ? -1 : 1;
        // Face (t, j) joins nodes (t, j) and (t + 1, j).
        const node = t + j * (ni + 1);
        const nodes = [node, node + 1] as const;
        return {
          i: t,
          j,
          nx: jFaces.nx[f]!,
          ny: jFaces.ny[f]!,
          area: jFaces.area[f]!,
          nodes,
          outward,
        };
      }
    }
  }

  private checkPhysical(u: State): void {
    const { ni, nj } = this.metrics;
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const w = this.primitiveAt(u, this.index(i, j));
        if (!(w.rho > 0 && w.p > 0 && Number.isFinite(w.u) && Number.isFinite(w.v))) {
          throw new NonPhysicalStateError(
            `non-physical state in cell (${i}, ${j}) after step ${this.steps}: rho=${w.rho}, p=${w.p}`,
          );
        }
      }
    }
  }
}
