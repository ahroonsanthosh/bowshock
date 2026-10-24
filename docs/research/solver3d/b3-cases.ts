/**
 * Rung (b3)'s cases and its characteristics reference rule (docs/design/0021-3d-euler-fins.md 4.2), shared by
 * rung-b3-reference.test.ts and rung-b3.test.ts.
 */

export interface B3Case {
  readonly id: string;
  readonly tc: number;
  readonly bevel: number;
  readonly mach: number;
}

/**
 * The hexagons of 0021 4.2 whose leading-edge shock attaches: t/c 0.05 with 10% bevels at Mach 1.5 has a
 * 14.04 deg bevel, beyond the 12.1 deg attachment limit at Mach 1.5, and is not run.
 */
export const B3_CASES: readonly B3Case[] = [
  { id: 'hexagon t/c 0.08, 15% bevels, M 2.0', tc: 0.08, bevel: 0.15, mach: 2.0 },
  { id: 'hexagon t/c 0.05, 10% bevels, M 2.0', tc: 0.05, bevel: 0.1, mach: 2.0 },
  { id: 'hexagon t/c 0.05, 15% bevels, M 1.5', tc: 0.05, bevel: 0.15, mach: 1.5 },
  { id: 'hexagon t/c 0.05, 15% bevels, M 2.0', tc: 0.05, bevel: 0.15, mach: 2.0 },
  { id: 'hexagon t/c 0.03, 5% bevels, M 2.0', tc: 0.03, bevel: 0.05, mach: 2.0 },
];

/**
 * The characteristics reference from the values at 320, 640, 1280 and 2560 intervals: where they agree within
 * 1e-12 of the drag there is no reflected wave on the surface, the reference is the finest value and must
 * equal shock-expansion theory within 1e-7; otherwise the finest triple's observed order must lie between 1.5
 * and 2.5 and the reference is the Richardson extrapolation of the two finest at that order.
 */
export function mocVerdict(values: readonly number[], shockExpansion: number) {
  const [v0, v1, v2, v3] = values as [number, number, number, number];
  const spread = Math.max(...values) - Math.min(...values);
  if (spread <= 1e-12 * Math.abs(v3)) {
    return {
      kind: 'no reflected wave on the surface' as const,
      reference: v3,
      pass: Math.abs(v3 / shockExpansion - 1) <= 1e-7,
    };
  }
  const coarseOrder = Math.log2((v0 - v1) / (v1 - v2));
  const order = Math.log2((v1 - v2) / (v2 - v3));
  const pass = order >= 1.5 && order <= 2.5;
  const reference = v3 + (v3 - v2) / (2 ** order - 1);
  return {
    kind: 'converging' as const,
    coarseOrder,
    order,
    reference,
    extrapolationDistance: Math.abs(reference - v3),
    pass,
  };
}
