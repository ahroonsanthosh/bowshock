/**
 * L1 density errors against the exact solution at 200 cells (HLLC, van
 * Leer, SSP-RK2, CFL 0.5), measured with the CPU reference engine when the
 * tests were written. Both engines are held to these values.
 */
export const TORO_L1_BASELINE_200: Readonly<Record<string, number>> = {
  'Toro test 1 (Sod)': 3.0e-3,
  'Toro test 2 (123 problem)': 4.783e-3,
  'Toro test 3': 8.85e-2,
  'Toro test 4': 8.286e-2,
  'Toro test 5': 2.548e-1,
};
