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
  /**
   * A far-field boundary in a free stream: the state outside each face
   * from the Riemann invariants of the flow normal to it (farFieldState),
   * the outgoing ones from the cell inside, the incoming ones from the
   * free stream, so that waves leave the domain instead of reflecting
   * from a fixed state. Inflow or outflow, subsonic or supersonic.
   */
  | { readonly kind: 'farField'; readonly state: Primitive2D }
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
}

/**
 * How an implicit step (iterateImplicit) solves its linear system
 * (D + L + U) dQ = R: by LU-SGS's forward and backward sweeps (`sweeps`,
 * the default), which approximate it by (D + L) D^-1 (D + U); or, in the
 * data-parallel forms a GPU can run cell by cell (design record 0013, "The
 * GPU solve"), by `sweeps` Jacobi iterations (every cell from the previous
 * iterate) or red-black Gauss-Seidel iterations (the cells with i + j even
 * from the odd ones, then the odd from the even), starting from dQ = 0.
 * Only the path to the steady state differs.
 */
export type ImplicitRelaxation =
  { readonly kind: 'sweeps' } | { readonly kind: 'jacobi' | 'redBlack'; readonly sweeps: number };

/** LU-SGS's sweeps (ImplicitRelaxation). */
export const LU_SGS: ImplicitRelaxation = { kind: 'sweeps' };

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

/** Ghost layers on each side; MUSCL needs two. */
const GHOSTS = 2;

/**
 * The state at a far-field boundary face of outward unit normal (nx, ny),
 * from the one-dimensional characteristics normal to it (the Riemann
 * invariants R+- = u_n +- 2 a / (gamma - 1), the entropy p / rho^gamma
 * and the tangential velocity): each is taken from the cell inside where
 * it travels outward (speeds u_n + a, u_n - a and u_n of the inside
 * state), and from the free stream where it travels inward. A supersonic
 * inflow gets the free stream, a supersonic outflow the inside state, and
 * a free stream inside gives the free stream back exactly.
 */
export function farFieldState(
  inside: Primitive2D,
  free: Primitive2D,
  nx: number,
  ny: number,
  gamma: number,
): Primitive2D {
  const g = 2 / (gamma - 1);
  const aIn = Math.sqrt((gamma * inside.p) / inside.rho);
  const aFree = Math.sqrt((gamma * free.p) / free.rho);
  const unIn = inside.u * nx + inside.v * ny;
  const unFree = free.u * nx + free.v * ny;
  const plus = unIn + aIn > 0 ? unIn + g * aIn : unFree + g * aFree;
  const minus = unIn - aIn > 0 ? unIn - g * aIn : unFree - g * aFree;
  const un = 0.5 * (plus + minus);
  const a = (plus - minus) / (2 * g);
  const upwind = unIn > 0 ? inside : free;
  const entropy = upwind.p / upwind.rho ** gamma;
  const unUpwind = upwind.u * nx + upwind.v * ny;
  const rho = ((a * a) / (gamma * entropy)) ** (1 / (gamma - 1));
  return {
    rho,
    u: upwind.u + (un - unUpwind) * nx,
    v: upwind.v + (un - unUpwind) * ny,
    p: (rho * a * a) / gamma,
  };
}

/**
 * The eigensystem of the Euler flux Jacobian along the unit normal
 * (nx, ny), for velocity (vx, vy), sound speed a and total enthalpy h:
 * `lambda` receives the positive (sign 1) or negative (sign -1) parts
 * (lambda +- |lambda|) / 2 of the eigenvalues u_n - a, u_n (entropy),
 * u_n (shear) and u_n + a, the magnitudes smoothed below delta a as
 * Harten's (l^2 + e^2) / (2 e); `right` the right eigenvectors as
 * columns (right[4 row + wave]) and `left` the left ones as rows
 * (left[4 wave + column]), left = right^-1, of the conserved variables
 * (rho, rho u, rho v, E). A+- = right diag(lambda+-) left are the
 * Steger-Warming split Jacobians.
 */
export function splitEigensystem(
  vx: number,
  vy: number,
  a: number,
  h: number,
  nx: number,
  ny: number,
  gamma: number,
  delta: number,
  sign: 1 | -1,
  lambda: Float64Array,
  right: Float64Array,
  left: Float64Array,
): void {
  const un = vx * nx + vy * ny;
  const ut = -vx * ny + vy * nx;
  const q2 = vx * vx + vy * vy;
  const eps = delta * a;
  const split = (l: number) => {
    const magnitude = Math.abs(l) >= eps ? Math.abs(l) : (l * l + eps * eps) / (2 * eps);
    return 0.5 * (l + sign * magnitude);
  };
  lambda[0] = split(un - a);
  lambda[1] = split(un);
  lambda[2] = lambda[1]!;
  lambda[3] = split(un + a);
  right[0] = 1;
  right[1] = 1;
  right[2] = 0;
  right[3] = 1;
  right[4] = vx - a * nx;
  right[5] = vx;
  right[6] = -ny;
  right[7] = vx + a * nx;
  right[8] = vy - a * ny;
  right[9] = vy;
  right[10] = nx;
  right[11] = vy + a * ny;
  right[12] = h - a * un;
  right[13] = 0.5 * q2;
  right[14] = ut;
  right[15] = h + a * un;
  const b1 = (gamma - 1) / (a * a);
  const b2 = 0.5 * b1 * q2;
  left[0] = 0.5 * (b2 + un / a);
  left[1] = 0.5 * (-b1 * vx - nx / a);
  left[2] = 0.5 * (-b1 * vy - ny / a);
  left[3] = 0.5 * b1;
  left[4] = 1 - b2;
  left[5] = b1 * vx;
  left[6] = b1 * vy;
  left[7] = -b1;
  left[8] = -ut;
  left[9] = -ny;
  left[10] = nx;
  left[11] = 0;
  left[12] = 0.5 * (b2 - un / a);
  left[13] = 0.5 * (-b1 * vx + nx / a);
  left[14] = 0.5 * (-b1 * vy + ny / a);
  left[15] = 0.5 * b1;
}

/**
 * Invert the 4 x 4 row-major matrix `m` into `out` at `offset`, by
 * Gauss-Jordan elimination with partial pivoting (m is overwritten).
 */
function invert4(m: Float64Array, out: Float64Array, offset: number): void {
  const a = m;
  const inv = new Float64Array(16);
  for (let d = 0; d < 4; d++) inv[5 * d] = 1;
  for (let col = 0; col < 4; col++) {
    let pivot = col;
    for (let row = col + 1; row < 4; row++) {
      if (Math.abs(a[4 * row + col]!) > Math.abs(a[4 * pivot + col]!)) pivot = row;
    }
    if (pivot !== col) {
      for (let k = 0; k < 4; k++) {
        const t = a[4 * col + k]!;
        a[4 * col + k] = a[4 * pivot + k]!;
        a[4 * pivot + k] = t;
        const s = inv[4 * col + k]!;
        inv[4 * col + k] = inv[4 * pivot + k]!;
        inv[4 * pivot + k] = s;
      }
    }
    const scale = 1 / a[4 * col + col]!;
    for (let k = 0; k < 4; k++) {
      a[4 * col + k] = a[4 * col + k]! * scale;
      inv[4 * col + k] = inv[4 * col + k]! * scale;
    }
    for (let row = 0; row < 4; row++) {
      if (row === col) continue;
      const factor = a[4 * row + col]!;
      if (factor === 0) continue;
      for (let k = 0; k < 4; k++) {
        a[4 * row + k] = a[4 * row + k]! - factor * a[4 * col + k]!;
        inv[4 * row + k] = inv[4 * row + k]! - factor * inv[4 * col + k]!;
      }
    }
  }
  out.set(inv, offset);
}

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

  /**
   * The residual of the current state, the net inflow of each conserved
   * quantity into each interior cell (with the axisymmetric source), four
   * values per cell, cell (i, j) at 4 (i + j ni): for checking the GPU
   * engines' residuals against this one.
   */
  residualVector(): Float64Array {
    const { ni, nj } = this.metrics;
    this.computeResidual(this.state);
    const r = new Float64Array(4 * ni * nj);
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const k = this.index(i, j);
        const c = 4 * (i + j * ni);
        r[c] = this.residual.rho[k]!;
        r[c + 1] = this.residual.mu[k]!;
        r[c + 2] = this.residual.mv[k]!;
        r[c + 3] = this.residual.energy[k]!;
      }
    }
    return r;
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

  /**
   * Take `count` implicit steps towards a steady state, by the lower-upper
   * symmetric Gauss-Seidel scheme (LU-SGS) of S. Yoon and A. Jameson,
   * "Lower-upper symmetric-Gauss-Seidel method for the Euler and
   * Navier-Stokes equations", AIAA J. 26 (1988) 1025-1026: the implicit
   * Euler step (V / dt - dR/dQ) dQ = R(Q), with R the residual of the
   * configured (second-order) scheme and its Jacobian approximated by the
   * first-order flux 1/2 (F(Q_c) + F(Q_nb)) - 1/2 omega lambda (Q_nb - Q_c),
   * lambda the spectral radius |u_n| + a of the face, solved by one forward
   * and one backward sweep. The diagonal is then the scalar
   * 1/2 sum(lambda A) (omega + 1 / cfl), and the neighbours enter through
   * the change of their physical flux, so no matrix is formed. Only the
   * path to the steady state changes: at convergence R(Q) = 0, the
   * solution of the explicit scheme. The boundary states are held during
   * each step (their ghost cells change only with the residual), and the
   * axisymmetric pressure source is explicit. Each cell's change is scaled
   * down where it would change its density or pressure by more than half,
   * which only acts during the transient.
   */
  iterateImplicit(
    count: number,
    cfl: number,
    omega = 1.5,
    relaxation: ImplicitRelaxation = LU_SGS,
  ): void {
    if (!(cfl > 0 && omega >= 1)) throw new RangeError('LU-SGS needs cfl > 0 and omega >= 1');
    for (let n = 0; n < count; n++) this.implicitStep(cfl, omega, relaxation);
  }

  /**
   * Take `count` implicit steps by block LU-SGS with the Steger-Warming
   * flux-split Jacobians: the implicit operator of the first-order flux
   * F+(Q_c) + F-(Q_nb), whose parts A+- = R diag(lambda+-) R^-1 carry
   * each wave at its own speed (the eigenvalues u_n - a, u_n, u_n, u_n + a,
   * their magnitudes kept above `delta` times the sound speed by Harten's
   * smoothing). The scalar operator of iterateImplicit damps every wave
   * with the largest speed, |u_n| + a, so near sonic flow, where u_n - a
   * vanishes, it moves that wave by a small fraction of a cell per step;
   * here it moves at the step's own CFL number. The diagonal is a 4 x 4
   * block per cell, V / dt + sum A A+ less the Jacobian of the
   * axisymmetric pressure source, inverted once per step. As there, only
   * the path changes: the steady state is that of the configured scheme.
   */
  iterateBlockImplicit(
    count: number,
    cfl: number,
    delta = 0.1,
    source: 'jacobian' | 'explicit' | 'damped' = 'damped',
    share = 0,
  ): void {
    if (!(cfl > 0 && delta > 0)) throw new RangeError('block LU-SGS needs cfl > 0 and delta > 0');
    for (let n = 0; n < count; n++) this.blockImplicitStep(cfl, delta, source, share);
  }

  /** Work arrays of the block implicit steps, allocated on first use. */
  private blockWork:
    | {
        /** rho, u, v, p, a, H of each interior cell. */
        readonly prim: Float64Array;
        /** Inverse of each cell's diagonal block, row-major. */
        readonly inverse: Float64Array;
        readonly dq: Float64Array;
      }
    | undefined;

  private blockImplicitStep(
    cfl: number,
    delta: number,
    source: 'jacobian' | 'explicit' | 'damped',
    share: number,
  ): void {
    const { ni, nj, iFaces, jFaces, planarArea, geometry } = this.metrics;
    const gamma = this.config.gamma;
    const u = this.state;
    const r = this.residual;
    this.computeResidual(u);
    const work = (this.blockWork ??= {
      prim: new Float64Array(6 * ni * nj),
      inverse: new Float64Array(16 * ni * nj),
      dq: new Float64Array(4 * ni * nj),
    });
    const { prim, inverse, dq } = work;
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const k = this.index(i, j);
        const c = i + j * ni;
        const rho = u.rho[k]!;
        const vx = u.mu[k]! / rho;
        const vy = u.mv[k]! / rho;
        const p = (gamma - 1) * (u.energy[k]! - 0.5 * rho * (vx * vx + vy * vy));
        prim[6 * c] = rho;
        prim[6 * c + 1] = vx;
        prim[6 * c + 2] = vy;
        prim[6 * c + 3] = p;
        prim[6 * c + 4] = Math.sqrt((gamma * p) / rho);
        prim[6 * c + 5] = (u.energy[k]! + p) / rho;
      }
    }

    // Eigenvalues and eigenvectors of the flux Jacobian of cell c along
    // (nx, ny): split[] receives lambda+- (sign +1 or -1) for the waves
    // u_n - a, u_n (entropy), u_n (shear), u_n + a.
    const lambda = new Float64Array(4);
    const right = new Float64Array(16);
    const left = new Float64Array(16);
    const decompose = (c: number, nx: number, ny: number, sign: 1 | -1) => {
      splitEigensystem(
        prim[6 * c + 1]!,
        prim[6 * c + 2]!,
        prim[6 * c + 4]!,
        prim[6 * c + 5]!,
        nx,
        ny,
        gamma,
        delta,
        sign,
        lambda,
        right,
        left,
      );
    };

    // Diagonal blocks: V / dt + sum over faces of A A+(Q_c, n_out), less
    // the pressure source's Jacobian, and their inverses.
    const block = new Float64Array(16);
    const addSplit = (c: number, nx: number, ny: number, area: number) => {
      if (area === 0) return;
      decompose(c, nx, ny, 1);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          let s = 0;
          for (let w = 0; w < 4; w++) s += right[4 * row + w]! * lambda[w]! * left[4 * w + col]!;
          block[4 * row + col] = block[4 * row + col]! + area * s;
        }
      }
    };
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const c = i + j * ni;
        block.fill(0);
        const fi = i + j * (ni + 1);
        const fj = i + j * ni;
        const vx = prim[6 * c + 1]!;
        const vy = prim[6 * c + 2]!;
        const a = prim[6 * c + 4]!;
        let spectral = 0;
        const faces: [number, number, number][] = [
          [-iFaces.nx[fi]!, -iFaces.ny[fi]!, iFaces.area[fi]!],
          [iFaces.nx[fi + 1]!, iFaces.ny[fi + 1]!, iFaces.area[fi + 1]!],
          [-jFaces.nx[fj]!, -jFaces.ny[fj]!, jFaces.area[fj]!],
          [jFaces.nx[fj + ni]!, jFaces.ny[fj + ni]!, jFaces.area[fj + ni]!],
        ];
        for (const [nx, ny, area] of faces) {
          addSplit(c, nx, ny, area);
          spectral += (Math.abs(vx * nx + vy * ny) + a) * area;
        }
        const dtTerm = 0.5 * spectral * (1 / cfl + share);
        for (let d = 0; d < 4; d++) block[5 * d] = block[5 * d]! + dtTerm;
        if (geometry === 'axisymmetric' && source === 'jacobian') {
          const ap = planarArea[c]!;
          const phi = 0.5 * (gamma - 1) * (vx * vx + vy * vy);
          block[8] = block[8]! - ap * phi;
          block[9] = block[9]! + ap * (gamma - 1) * vx;
          block[10] = block[10]! + ap * (gamma - 1) * vy;
          block[11] = block[11]! - ap * (gamma - 1);
        }
        if (geometry === 'axisymmetric' && source === 'damped') {
          const extra = planarArea[c]! * (Math.abs(vy) + a);
          for (let d = 0; d < 4; d++) block[5 * d] = block[5 * d]! + extra;
        }
        invert4(block, inverse, 16 * c);
      }
    }

    // The neighbour's term A A-(Q_nb, n_out) dQ_nb, added to `sum`.
    const sum = new Float64Array(4);
    const neighbour = (nb: number, nx: number, ny: number, area: number) => {
      if (area === 0) return;
      decompose(nb, nx, ny, -1);
      const d0 = dq[4 * nb]!;
      const d1 = dq[4 * nb + 1]!;
      const d2 = dq[4 * nb + 2]!;
      const d3 = dq[4 * nb + 3]!;
      for (let w = 0; w < 4; w++) {
        const coefficient =
          area *
          lambda[w]! *
          (left[4 * w]! * d0 +
            left[4 * w + 1]! * d1 +
            left[4 * w + 2]! * d2 +
            left[4 * w + 3]! * d3);
        for (let row = 0; row < 4; row++) sum[row] = sum[row]! + coefficient * right[4 * row + w]!;
      }
    };
    const solve = (c: number, b0: number, b1: number, b2: number, b3: number) => {
      const m = 16 * c;
      for (let row = 0; row < 4; row++) {
        dq[4 * c + row] =
          inverse[m + 4 * row]! * b0 +
          inverse[m + 4 * row + 1]! * b1 +
          inverse[m + 4 * row + 2]! * b2 +
          inverse[m + 4 * row + 3]! * b3;
      }
    };

    // Forward sweep: (D + L) dQ* = R.
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const c = i + j * ni;
        sum.fill(0);
        if (i > 0) {
          const f = i + j * (ni + 1);
          neighbour(c - 1, -iFaces.nx[f]!, -iFaces.ny[f]!, iFaces.area[f]!);
        }
        if (j > 0) {
          const f = i + j * ni;
          neighbour(c - ni, -jFaces.nx[f]!, -jFaces.ny[f]!, jFaces.area[f]!);
        }
        const k = this.index(i, j);
        solve(
          c,
          r.rho[k]! - sum[0]!,
          r.mu[k]! - sum[1]!,
          r.mv[k]! - sum[2]!,
          r.energy[k]! - sum[3]!,
        );
      }
    }
    // Backward sweep: (D + U) dQ = D dQ*.
    const star = new Float64Array(4);
    for (let j = nj - 1; j >= 0; j--) {
      for (let i = ni - 1; i >= 0; i--) {
        const c = i + j * ni;
        sum.fill(0);
        if (i < ni - 1) {
          const f = i + 1 + j * (ni + 1);
          neighbour(c + 1, iFaces.nx[f]!, iFaces.ny[f]!, iFaces.area[f]!);
        }
        if (j < nj - 1) {
          const f = i + (j + 1) * ni;
          neighbour(c + ni, jFaces.nx[f]!, jFaces.ny[f]!, jFaces.area[f]!);
        }
        for (let q = 0; q < 4; q++) star[q] = dq[4 * c + q]!;
        solve(c, sum[0]!, sum[1]!, sum[2]!, sum[3]!);
        for (let q = 0; q < 4; q++) dq[4 * c + q] = star[q]! - dq[4 * c + q]!;
      }
    }
    this.applyImplicitUpdate(dq);
  }

  /**
   * Add dQ to every interior cell, each cell's change scaled down by halves
   * until its density and pressure stay within a factor of two.
   */
  private applyImplicitUpdate(dq: Float64Array): void {
    const { ni, nj } = this.metrics;
    const gamma = this.config.gamma;
    const u = this.state;
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const c = i + j * ni;
        const k = this.index(i, j);
        const rho = u.rho[k]!;
        const mx = u.mu[k]!;
        const my = u.mv[k]!;
        const e = u.energy[k]!;
        const p = (gamma - 1) * (e - (0.5 * (mx * mx + my * my)) / rho);
        let alpha = 1;
        for (let tries = 0; tries < 30; tries++) {
          const rho1 = rho + alpha * dq[4 * c]!;
          const mx1 = mx + alpha * dq[4 * c + 1]!;
          const my1 = my + alpha * dq[4 * c + 2]!;
          const e1 = e + alpha * dq[4 * c + 3]!;
          const p1 = (gamma - 1) * (e1 - (0.5 * (mx1 * mx1 + my1 * my1)) / rho1);
          if (rho1 > 0.5 * rho && rho1 < 2 * rho && p1 > 0.5 * p && p1 < 2 * p) break;
          alpha *= 0.5;
        }
        u.rho[k] = rho + alpha * dq[4 * c]!;
        u.mu[k] = mx + alpha * dq[4 * c + 1]!;
        u.mv[k] = my + alpha * dq[4 * c + 2]!;
        u.energy[k] = e + alpha * dq[4 * c + 3]!;
      }
    }
    this.steps += 1;
    this.checkPhysical(u);
  }

  /** Work arrays of the implicit steps, allocated on first use. */
  private implicitWork:
    | {
        readonly lambdaI: Float64Array;
        readonly lambdaJ: Float64Array;
        readonly diagonal: Float64Array;
        readonly dq: Float64Array;
        /** Interior conserved variables, four per cell, and each cell's pressure and sound speed. */
        readonly q: Float64Array;
        readonly p: Float64Array;
        readonly a: Float64Array;
        readonly residual: Float64Array;
      }
    | undefined;

  /** The previous iterate of the Jacobi relaxation, allocated on first use. */
  private jacobiWork: Float64Array | undefined;

  private implicitStep(cfl: number, omega: number, relaxation: ImplicitRelaxation): void {
    this.applyImplicitUpdate(this.implicitCorrection(cfl, omega, relaxation));
  }

  /**
   * The change of the conserved variables one LU-SGS step (iterateImplicit)
   * would make from the current state, before any scaling, four values per
   * cell, cell (i, j) at 4 (i + j ni); the state is not changed. The array
   * is reused by the next call. For accelerating the iteration from
   * outside (src/solver/anderson.ts).
   */
  implicitCorrection(
    cfl: number,
    omega = 1.5,
    relaxation: ImplicitRelaxation = LU_SGS,
  ): Float64Array {
    if (!(cfl > 0 && omega >= 1)) throw new RangeError('LU-SGS needs cfl > 0 and omega >= 1');
    if (
      relaxation.kind !== 'sweeps' &&
      !(Number.isInteger(relaxation.sweeps) && relaxation.sweeps >= 1)
    ) {
      throw new RangeError('a relaxation needs a whole number of sweeps, at least one');
    }
    const { ni, nj, iFaces, jFaces, planarArea } = this.metrics;
    const gamma = this.config.gamma;
    const u = this.state;
    const r = this.residual;
    this.computeResidual(u);
    const n = ni * nj;
    const work = (this.implicitWork ??= {
      lambdaI: new Float64Array((ni + 1) * nj),
      lambdaJ: new Float64Array(ni * (nj + 1)),
      diagonal: new Float64Array(n),
      dq: new Float64Array(4 * n),
      q: new Float64Array(4 * n),
      p: new Float64Array(n),
      a: new Float64Array(n),
      residual: new Float64Array(4 * n),
    });
    const { lambdaI, lambdaJ, diagonal, dq, q, residual } = work;
    const pc = work.p;
    const ac = work.a;
    for (let j = 0; j < nj; j++) {
      let k = this.index(0, j);
      for (let i = 0; i < ni; i++, k++) {
        const c = i + j * ni;
        const rho = u.rho[k]!;
        const mx = u.mu[k]!;
        const my = u.mv[k]!;
        const e = u.energy[k]!;
        q[4 * c] = rho;
        q[4 * c + 1] = mx;
        q[4 * c + 2] = my;
        q[4 * c + 3] = e;
        const p = (gamma - 1) * (e - (0.5 * (mx * mx + my * my)) / rho);
        pc[c] = p;
        ac[c] = Math.sqrt((gamma * p) / rho);
        residual[4 * c] = r.rho[k]!;
        residual[4 * c + 1] = r.mu[k]!;
        residual[4 * c + 2] = r.mv[k]!;
        residual[4 * c + 3] = r.energy[k]!;
      }
    }

    // Spectral radius of each face: the larger of its interior cells'.
    const radius = (c: number, nx: number, ny: number) =>
      Math.abs((q[4 * c + 1]! * nx + q[4 * c + 2]! * ny) / q[4 * c]!) + ac[c]!;
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i <= ni; i++) {
        const f = i + j * (ni + 1);
        const nx = iFaces.nx[f]!;
        const ny = iFaces.ny[f]!;
        const c = i + j * ni;
        const left = i > 0 ? radius(c - 1, nx, ny) : 0;
        const right = i < ni ? radius(c, nx, ny) : 0;
        lambdaI[f] = Math.max(left, right) * iFaces.area[f]!;
      }
    }
    for (let j = 0; j <= nj; j++) {
      for (let i = 0; i < ni; i++) {
        const f = i + j * ni;
        const nx = jFaces.nx[f]!;
        const ny = jFaces.ny[f]!;
        const below = j > 0 ? radius(f - ni, nx, ny) : 0;
        const above = j < nj ? radius(f, nx, ny) : 0;
        lambdaJ[f] = Math.max(below, above) * jFaces.area[f]!;
      }
    }
    // In axisymmetric geometry the faces' areas do not close (their sum
    // times the normal is the planar area A_p in y), so the self-coupling
    // the scalar diagonal leaves out, 1/2 A_p dF_y/dQ less the pressure
    // source's A_p dp/dQ, is of the order of A_p (|v| + a): next to the
    // axis, as large as the rest. It is added to the diagonal, which keeps
    // those cells stable at large CFL numbers.
    const scale = 0.5 * (omega + 1 / cfl);
    const axisymmetric = this.metrics.geometry === 'axisymmetric';
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const fi = i + j * (ni + 1);
        const fj = i + j * ni;
        diagonal[fj] =
          scale * (lambdaI[fi]! + lambdaI[fi + 1]! + lambdaJ[fj]! + lambdaJ[fj + ni]!) +
          (axisymmetric ? planarArea[fj]! * radius(fj, 0, 1) : 0);
      }
    }

    // The neighbour c's term, added to `sum`: A (1/2 dF_n - 1/2 omega
    // lambda dQ), dF_n the change of its physical flux along n (out of the
    // cell being solved) for its change dQ, `lambdaA` the face's lambda
    // times area.
    const sum = new Float64Array(4);
    // The neighbours' changes are read from `from`: dq itself in the
    // sweeps, the previous iterate in the Jacobi relaxation.
    let from = dq;
    const neighbour = (c: number, nx: number, ny: number, area: number, lambdaA: number) => {
      const b = 4 * c;
      const rho = q[b]!;
      const mx = q[b + 1]!;
      const my = q[b + 2]!;
      const e = q[b + 3]!;
      const d0 = from[b]!;
      const d1 = from[b + 1]!;
      const d2 = from[b + 2]!;
      const d3 = from[b + 3]!;
      const p0 = pc[c]!;
      const un0 = (mx * nx + my * ny) / rho;
      const rho1 = rho + d0;
      const mx1 = mx + d1;
      const my1 = my + d2;
      const e1 = e + d3;
      const p1 = (gamma - 1) * (e1 - (0.5 * (mx1 * mx1 + my1 * my1)) / rho1);
      const un1 = (mx1 * nx + my1 * ny) / rho1;
      const half = 0.5 * area;
      const damp = 0.5 * omega * lambdaA;
      sum[0] = sum[0]! + half * (rho1 * un1 - rho * un0) - damp * d0;
      sum[1] = sum[1]! + half * (mx1 * un1 + p1 * nx - (mx * un0 + p0 * nx)) - damp * d1;
      sum[2] = sum[2]! + half * (my1 * un1 + p1 * ny - (my * un0 + p0 * ny)) - damp * d2;
      sum[3] = sum[3]! + half * ((e1 + p1) * un1 - (e + p0) * un0) - damp * d3;
    };

    if (relaxation.kind !== 'sweeps') {
      // (D + L + U) dQ = R relaxed from dQ = 0, every interior neighbour
      // on the right: Jacobi (all cells from the previous iterate) or
      // red-black (cells with i + j even, then odd, each from the latest).
      dq.fill(0);
      const previous = (this.jacobiWork ??= new Float64Array(4 * n));
      const relax = (i: number, j: number) => {
        const c = i + j * ni;
        sum[0] = 0;
        sum[1] = 0;
        sum[2] = 0;
        sum[3] = 0;
        if (i > 0) {
          const f = i + j * (ni + 1);
          neighbour(c - 1, -iFaces.nx[f]!, -iFaces.ny[f]!, iFaces.area[f]!, lambdaI[f]!);
        }
        if (i < ni - 1) {
          const f = i + 1 + j * (ni + 1);
          neighbour(c + 1, iFaces.nx[f]!, iFaces.ny[f]!, iFaces.area[f]!, lambdaI[f]!);
        }
        if (j > 0) {
          neighbour(c - ni, -jFaces.nx[c]!, -jFaces.ny[c]!, jFaces.area[c]!, lambdaJ[c]!);
        }
        if (j < nj - 1) {
          const f = c + ni;
          neighbour(c + ni, jFaces.nx[f]!, jFaces.ny[f]!, jFaces.area[f]!, lambdaJ[f]!);
        }
        const d = diagonal[c]!;
        dq[4 * c] = (residual[4 * c]! - sum[0]) / d;
        dq[4 * c + 1] = (residual[4 * c + 1]! - sum[1]) / d;
        dq[4 * c + 2] = (residual[4 * c + 2]! - sum[2]) / d;
        dq[4 * c + 3] = (residual[4 * c + 3]! - sum[3]) / d;
      };
      for (let s = 0; s < relaxation.sweeps; s++) {
        if (relaxation.kind === 'jacobi') {
          previous.set(dq);
          from = previous;
          for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) relax(i, j);
        } else {
          from = dq;
          for (const colour of [0, 1]) {
            for (let j = 0; j < nj; j++) {
              for (let i = (j + colour) % 2; i < ni; i += 2) relax(i, j);
            }
          }
        }
      }
      from = dq;
      return dq;
    }

    // Forward sweep: (D + L) dQ* = R.
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const c = i + j * ni;
        sum[0] = 0;
        sum[1] = 0;
        sum[2] = 0;
        sum[3] = 0;
        if (i > 0) {
          const f = i + j * (ni + 1);
          neighbour(c - 1, -iFaces.nx[f]!, -iFaces.ny[f]!, iFaces.area[f]!, lambdaI[f]!);
        }
        if (j > 0) {
          neighbour(c - ni, -jFaces.nx[c]!, -jFaces.ny[c]!, jFaces.area[c]!, lambdaJ[c]!);
        }
        const d = diagonal[c]!;
        dq[4 * c] = (residual[4 * c]! - sum[0]) / d;
        dq[4 * c + 1] = (residual[4 * c + 1]! - sum[1]) / d;
        dq[4 * c + 2] = (residual[4 * c + 2]! - sum[2]) / d;
        dq[4 * c + 3] = (residual[4 * c + 3]! - sum[3]) / d;
      }
    }
    // Backward sweep: (D + U) dQ = D dQ*.
    for (let j = nj - 1; j >= 0; j--) {
      for (let i = ni - 1; i >= 0; i--) {
        const c = i + j * ni;
        sum[0] = 0;
        sum[1] = 0;
        sum[2] = 0;
        sum[3] = 0;
        if (i < ni - 1) {
          const f = i + 1 + j * (ni + 1);
          neighbour(c + 1, iFaces.nx[f]!, iFaces.ny[f]!, iFaces.area[f]!, lambdaI[f]!);
        }
        if (j < nj - 1) {
          const f = c + ni;
          neighbour(c + ni, jFaces.nx[f]!, jFaces.ny[f]!, jFaces.area[f]!, lambdaJ[f]!);
        }
        const d = diagonal[c]!;
        dq[4 * c] = dq[4 * c]! - sum[0] / d;
        dq[4 * c + 1] = dq[4 * c + 1]! - sum[1] / d;
        dq[4 * c + 2] = dq[4 * c + 2]! - sum[2] / d;
        dq[4 * c + 3] = dq[4 * c + 3]! - sum[3] / d;
      }
    }

    return dq;
  }

  /** The interior cells' conserved variables, four per cell, cell (i, j) at 4 (i + j ni). */
  conserved(): Float64Array {
    const { ni, nj } = this.metrics;
    const q = new Float64Array(4 * ni * nj);
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const k = this.index(i, j);
        const c = 4 * (i + j * ni);
        q[c] = this.state.rho[k]!;
        q[c + 1] = this.state.mu[k]!;
        q[c + 2] = this.state.mv[k]!;
        q[c + 3] = this.state.energy[k]!;
      }
    }
    return q;
  }

  /**
   * Set the interior cells' conserved variables (as conserved() gives
   * them), counting one step; throws if a state is not physical.
   */
  setConserved(q: Float64Array): void {
    const { ni, nj } = this.metrics;
    if (q.length !== 4 * ni * nj) throw new RangeError('four values per cell are needed');
    for (let j = 0; j < nj; j++) {
      for (let i = 0; i < ni; i++) {
        const k = this.index(i, j);
        const c = 4 * (i + j * ni);
        this.state.rho[k] = q[c]!;
        this.state.mu[k] = q[c + 1]!;
        this.state.mv[k] = q[c + 2]!;
        this.state.energy[k] = q[c + 3]!;
      }
    }
    this.steps += 1;
    this.checkPhysical(this.state);
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
    const left = this.reconstruct(wLL, wL, wR, 1);
    const right = this.reconstruct(wL, wR, wRR, -1);
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
          if (bc.kind === 'inflow' || bc.kind === 'faceStates' || bc.kind === 'farField') {
            let w: Primitive2D;
            if (bc.kind === 'inflow') w = bc.state;
            else if (bc.kind === 'faceStates') w = this.boundaryStates.get(side)![t]!;
            else {
              // Both layers take the state of the face, from the cell next to it.
              const inside = this.primitiveAt(u, this.ghostCells(side, t, 0, ni, nj)[1]);
              const { outward } = this.boundaryFace(side, t);
              w = farFieldState(inside, bc.state, outward * nx, outward * ny, this.config.gamma);
            }
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
