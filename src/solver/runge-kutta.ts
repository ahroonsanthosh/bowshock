/**
 * Strong-stability-preserving Runge-Kutta schemes in Shu-Osher form
 * (C.-W. Shu and S. Osher, J. Comput. Phys. 77, 1988). Every stage is
 *   U_stage = a * U0 + b * (U_prev + dt * L(U_prev)),
 * where U0 is the state at the start of the step, U_prev the previous
 * stage (U0 for the first) and L the spatial residual. All engines, CPU and
 * GPU, take their stages from this one table.
 */

export type TimeIntegrator = 'forwardEuler' | 'ssprk2' | 'ssprk3';

export interface RungeKuttaStage {
  readonly a: number;
  readonly b: number;
}

export const RUNGE_KUTTA_STAGES: Readonly<Record<TimeIntegrator, readonly RungeKuttaStage[]>> = {
  forwardEuler: [{ a: 0, b: 1 }],
  ssprk2: [
    { a: 0, b: 1 },
    { a: 1 / 2, b: 1 / 2 },
  ],
  ssprk3: [
    { a: 0, b: 1 },
    { a: 3 / 4, b: 1 / 4 },
    { a: 1 / 3, b: 2 / 3 },
  ],
};
