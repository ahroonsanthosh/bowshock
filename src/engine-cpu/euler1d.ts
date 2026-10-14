/**
 * One-dimensional finite-volume Euler solver: the CPU reference engine.
 *
 * Method:
 * - cell-centred finite volumes on a uniform grid;
 * - MUSCL reconstruction of primitive variables (rho, u, p) with a slope
 *   limiter, falling back to first order at any face where the
 *   reconstruction would produce non-positive density or pressure;
 * - an approximate (or exact) Riemann solver at each face;
 * - strong-stability-preserving Runge-Kutta time integration (C.-W. Shu and
 *   S. Osher, J. Comput. Phys. 77, 1988).
 *
 * Every later engine (2D, axisymmetric, GPU) is tested against this one or
 * against the same exact solutions, so it favours clarity over speed.
 */

import { pressureFromConserved, soundSpeed, type Primitive1D } from '../scheme/gas';
import { FLUXES, type FluxFunction, type FluxName } from '../scheme/flux';
import { LIMITERS, type Limiter, type LimiterName } from '../scheme/limiters';
import { validateGrid1DConfig } from '../solver/config';
import { NonPhysicalStateError } from '../solver/errors';
import { cellAverages1D } from '../solver/initial-condition';

export type BoundaryCondition = 'transmissive' | 'reflective' | 'periodic';
export type TimeIntegrator = 'forwardEuler' | 'ssprk2' | 'ssprk3';

export interface Euler1DConfig {
  readonly nCells: number;
  readonly xMin: number;
  readonly xMax: number;
  readonly gamma: number;
  readonly flux: FluxName;
  readonly limiter: LimiterName;
  readonly timeIntegrator: TimeIntegrator;
  /** Courant number; 0.5 or less is safe for the TVD limiters with SSP-RK. */
  readonly cfl: number;
  readonly left: BoundaryCondition;
  readonly right: BoundaryCondition;
}

export const DEFAULT_CONFIG: Omit<Euler1DConfig, 'nCells' | 'xMin' | 'xMax'> = {
  gamma: 1.4,
  flux: 'hllc',
  limiter: 'vanLeer',
  timeIntegrator: 'ssprk2',
  cfl: 0.5,
  left: 'transmissive',
  right: 'transmissive',
};

/** Ghost cells on each side; MUSCL needs two. */
const GHOSTS = 2;

interface Stage {
  rho: Float64Array;
  mom: Float64Array;
  energy: Float64Array;
}

export class Euler1D {
  readonly config: Euler1DConfig;
  readonly dx: number;
  time = 0;
  steps = 0;

  /** Conserved variables including ghost cells; cell i is at index i + GHOSTS. */
  private readonly rho: Float64Array;
  private readonly mom: Float64Array;
  private readonly energy: Float64Array;

  private readonly flux: FluxFunction;
  private readonly limiter: Limiter;
  // Work arrays, allocated once.
  private readonly prim: { rho: Float64Array; u: Float64Array; p: Float64Array };
  private readonly faceFlux: Float64Array;
  private readonly stage: readonly [Stage, Stage];
  private readonly rhs: Stage;
  private readonly fluxOut = new Float64Array(3);

  constructor(config: Euler1DConfig) {
    validateGrid1DConfig(config);
    this.config = config;
    this.dx = (config.xMax - config.xMin) / config.nCells;
    this.flux = FLUXES[config.flux];
    this.limiter = LIMITERS[config.limiter];

    const n = config.nCells + 2 * GHOSTS;
    const triple = () => ({
      rho: new Float64Array(n),
      mom: new Float64Array(n),
      energy: new Float64Array(n),
    });
    const state = triple();
    this.rho = state.rho;
    this.mom = state.mom;
    this.energy = state.energy;
    this.prim = { rho: new Float64Array(n), u: new Float64Array(n), p: new Float64Array(n) };
    this.faceFlux = new Float64Array(3 * (config.nCells + 1));
    this.stage = [triple(), triple()];
    this.rhs = triple();
  }

  /** x coordinate of the centre of cell i (0-based, excluding ghosts). */
  cellCentre(i: number): number {
    return this.config.xMin + (i + 0.5) * this.dx;
  }

  /** Set the initial state to the cell averages of a primitive field. */
  setInitialCondition(field: (x: number) => Primitive1D): void {
    const { gamma, nCells, xMin } = this.config;
    const averages = cellAverages1D(field, xMin, this.dx, nCells, gamma);
    this.rho.set(averages.rho, GHOSTS);
    this.mom.set(averages.mom, GHOSTS);
    this.energy.set(averages.energy, GHOSTS);
    this.time = 0;
    this.steps = 0;
    this.checkPhysical(this.rho, this.mom, this.energy);
  }

  /** Primitive variables of cell i (0-based, excluding ghosts). */
  primitive(i: number): Primitive1D {
    if (!(Number.isInteger(i) && i >= 0 && i < this.config.nCells)) {
      throw new RangeError(`cell index ${i} is outside 0..${this.config.nCells - 1}`);
    }
    const k = i + GHOSTS;
    const rho = this.rho[k]!;
    const mom = this.mom[k]!;
    return {
      rho,
      u: mom / rho,
      p: pressureFromConserved(rho, mom, this.energy[k]!, this.config.gamma),
    };
  }

  /** Totals of mass, momentum and energy over the domain (excluding ghosts). */
  totals(): { mass: number; momentum: number; energy: number } {
    let mass = 0;
    let momentum = 0;
    let energy = 0;
    for (let k = GHOSTS; k < GHOSTS + this.config.nCells; k++) {
      mass += this.rho[k]!;
      momentum += this.mom[k]!;
      energy += this.energy[k]!;
    }
    return { mass: mass * this.dx, momentum: momentum * this.dx, energy: energy * this.dx };
  }

  /** Largest stable time step for the current state. */
  stableTimeStep(): number {
    const { gamma, nCells, cfl } = this.config;
    let maxSpeed = 0;
    for (let k = GHOSTS; k < GHOSTS + nCells; k++) {
      const rho = this.rho[k]!;
      const u = this.mom[k]! / rho;
      const p = pressureFromConserved(rho, this.mom[k]!, this.energy[k]!, gamma);
      maxSpeed = Math.max(maxSpeed, Math.abs(u) + soundSpeed(rho, p, gamma));
    }
    return (cfl * this.dx) / maxSpeed;
  }

  /**
   * Advance to exactly `tEnd`, shortening the last step to land on it.
   * Throws if more than `maxSteps` steps would be needed.
   */
  advanceTo(tEnd: number, maxSteps = 1_000_000): void {
    const firstStep = this.steps;
    while (this.time < tEnd) {
      if (this.steps - firstStep >= maxSteps) {
        throw new Error(`advanceTo(${tEnd}) needed more than ${maxSteps} steps`);
      }
      const dt = Math.min(this.stableTimeStep(), tEnd - this.time);
      this.step(dt);
      // Land exactly on tEnd despite floating-point accumulation.
      if (tEnd - this.time < 1e-12 * Math.max(1, Math.abs(tEnd))) this.time = tEnd;
    }
  }

  /** One time step of size dt with the configured integrator. */
  step(dt: number): void {
    const u0 = { rho: this.rho, mom: this.mom, energy: this.energy };
    const [s1, s2] = this.stage;

    switch (this.config.timeIntegrator) {
      case 'forwardEuler':
        this.eulerStage(u0, dt, s1);
        copyState(s1, u0);
        break;
      case 'ssprk2':
        // U1 = U0 + dt L(U0);  U = (U0 + U1 + dt L(U1)) / 2
        this.eulerStage(u0, dt, s1);
        this.eulerStage(s1, dt, s2);
        combine(0.5, u0, 0.5, s2, u0);
        break;
      case 'ssprk3':
        // U1 = U0 + dt L(U0)
        // U2 = 3/4 U0 + 1/4 (U1 + dt L(U1))
        // U  = 1/3 U0 + 2/3 (U2 + dt L(U2))
        this.eulerStage(u0, dt, s1);
        this.eulerStage(s1, dt, s2);
        combine(0.75, u0, 0.25, s2, s1);
        this.eulerStage(s1, dt, s2);
        combine(1 / 3, u0, 2 / 3, s2, u0);
        break;
    }
    this.time += dt;
    this.steps += 1;
    this.checkPhysical(this.rho, this.mom, this.energy);
  }

  /** out = u + dt * L(u), where L is the spatial residual. */
  private eulerStage(u: Stage, dt: number, out: Stage): void {
    this.residual(u, this.rhs);
    const n = u.rho.length;
    for (let k = 0; k < n; k++) {
      out.rho[k] = u.rho[k]! + dt * this.rhs.rho[k]!;
      out.mom[k] = u.mom[k]! + dt * this.rhs.mom[k]!;
      out.energy[k] = u.energy[k]! + dt * this.rhs.energy[k]!;
    }
  }

  /** Spatial residual L(U) = -(F_{i+1/2} - F_{i-1/2}) / dx for every interior cell. */
  private residual(u: Stage, out: Stage): void {
    const { nCells, gamma } = this.config;
    this.fillGhosts(u);

    const { rho, u: vel, p } = this.prim;
    for (let k = 0; k < u.rho.length; k++) {
      const r = u.rho[k]!;
      rho[k] = r;
      vel[k] = u.mom[k]! / r;
      p[k] = pressureFromConserved(r, u.mom[k]!, u.energy[k]!, gamma);
      if (!(r > 0 && p[k]! > 0)) {
        throw new NonPhysicalStateError(
          `non-physical intermediate state at array index ${k} near t=${this.time}: rho=${r}, p=${p[k]}`,
        );
      }
    }

    // Face f lies between interior cells f-1 and f (0-based), i.e. between
    // array indices k = f + GHOSTS - 1 and k + 1.
    for (let f = 0; f <= nCells; f++) {
      const kL = f + GHOSTS - 1;
      const kR = kL + 1;
      const left = this.reconstruct(kL, 1);
      const right = this.reconstruct(kR, -1);
      const faceOk = left.rho > 0 && left.p > 0 && right.rho > 0 && right.p > 0;
      this.flux(
        faceOk ? left : this.cellPrimitive(kL),
        faceOk ? right : this.cellPrimitive(kR),
        gamma,
        this.fluxOut,
      );
      this.faceFlux[3 * f] = this.fluxOut[0]!;
      this.faceFlux[3 * f + 1] = this.fluxOut[1]!;
      this.faceFlux[3 * f + 2] = this.fluxOut[2]!;
    }

    out.rho.fill(0);
    out.mom.fill(0);
    out.energy.fill(0);
    const invDx = 1 / this.dx;
    for (let i = 0; i < nCells; i++) {
      const k = i + GHOSTS;
      out.rho[k] = -(this.faceFlux[3 * (i + 1)]! - this.faceFlux[3 * i]!) * invDx;
      out.mom[k] = -(this.faceFlux[3 * (i + 1) + 1]! - this.faceFlux[3 * i + 1]!) * invDx;
      out.energy[k] = -(this.faceFlux[3 * (i + 1) + 2]! - this.faceFlux[3 * i + 2]!) * invDx;
    }
  }

  private cellPrimitive(k: number): Primitive1D {
    return { rho: this.prim.rho[k]!, u: this.prim.u[k]!, p: this.prim.p[k]! };
  }

  /** Limited linear reconstruction of cell k's primitives at its right (+1) or left (-1) face. */
  private reconstruct(k: number, side: 1 | -1): Primitive1D {
    const { rho, u, p } = this.prim;
    return {
      rho: limitedValue(rho, k, side, this.limiter),
      u: limitedValue(u, k, side, this.limiter),
      p: limitedValue(p, k, side, this.limiter),
    };
  }

  private fillGhosts(u: Stage): void {
    const n = this.config.nCells;
    for (let g = 0; g < GHOSTS; g++) {
      // Left ghosts: index GHOSTS-1-g mirrors interior cell g.
      this.setGhost(u, GHOSTS - 1 - g, this.config.left, GHOSTS + g, GHOSTS + n - 1 - g);
      // Right ghosts: index GHOSTS+n+g mirrors interior cell n-1-g.
      this.setGhost(u, GHOSTS + n + g, this.config.right, GHOSTS + n - 1 - g, GHOSTS + g);
    }
  }

  /**
   * @param mirror interior cell reflected into this ghost (transmissive, reflective)
   * @param wrap interior cell that this ghost aliases in a periodic domain
   */
  private setGhost(
    u: Stage,
    ghost: number,
    bc: BoundaryCondition,
    mirror: number,
    wrap: number,
  ): void {
    const source = bc === 'periodic' ? wrap : mirror;
    u.rho[ghost] = u.rho[source]!;
    u.mom[ghost] = bc === 'reflective' ? -u.mom[source]! : u.mom[source]!;
    u.energy[ghost] = u.energy[source]!;
  }

  private checkPhysical(rho: Float64Array, mom: Float64Array, energy: Float64Array): void {
    const { gamma, nCells } = this.config;
    for (let k = GHOSTS; k < GHOSTS + nCells; k++) {
      const r = rho[k]!;
      const p = pressureFromConserved(r, mom[k]!, energy[k]!, gamma);
      if (!(r > 0 && p > 0 && Number.isFinite(r) && Number.isFinite(p))) {
        throw new NonPhysicalStateError(
          `non-physical state in cell ${k - GHOSTS} at t=${this.time}: rho=${r}, p=${p}`,
        );
      }
    }
  }
}

/** Value of q reconstructed at the right (+1) or left (-1) face of cell k. */
function limitedValue(q: Float64Array, k: number, side: 1 | -1, limiter: Limiter): number {
  const centre = q[k]!;
  return centre + 0.5 * side * limiter(centre - q[k - 1]!, q[k + 1]! - centre);
}

function copyState(from: Stage, to: Stage): void {
  to.rho.set(from.rho);
  to.mom.set(from.mom);
  to.energy.set(from.energy);
}

/** out = a * x + b * y, elementwise. `out` may alias x or y. */
function combine(a: number, x: Stage, b: number, y: Stage, out: Stage): void {
  for (let k = 0; k < x.rho.length; k++) {
    out.rho[k] = a * x.rho[k]! + b * y.rho[k]!;
    out.mom[k] = a * x.mom[k]! + b * y.mom[k]!;
    out.energy[k] = a * x.energy[k]! + b * y.energy[k]!;
  }
}
