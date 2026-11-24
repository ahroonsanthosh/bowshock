/**
 * Amendment 3's blind checks (README, "OpenFOAM's registration"): the
 * forebody pressure drag of sharp tangent ogives by the method of
 * characteristics (0006), on 320, 640 and 1280 intervals, with the
 * second-order extrapolation from the last two, and the effect of moving the
 * start line from 1e-3 L to 2.5e-4 L (on 640 intervals). Not part of the test suite
 * (vite includes tests/ only); run with
 *   MOC_OUT=<file.json> npx vitest run --root <repo> --config <a config including this file>
 * The TN 3716 ogive at Mach 1.98 (V3's 0.0988034) is computed as a control.
 */
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { pressureDragFromProfile } from '../../../src/analysis/forces';
import { bodyRadius, type Body } from '../../../src/geometry/body';
import { noseTipSlope } from '../../../src/geometry/nose';
import { characteristics } from '../../../src/validation/characteristics';
import { taylorMaccoll } from '../../../src/validation/taylor-maccoll';

const gamma = 1.4;

// As tests/validation/characteristics.test.ts: the integral closed at the
// end of the nose with the pressure interpolated there.
const noseDrag = (body: Body, mach: number, wall: readonly { x: number; p: number }[]) => {
  const L = body.nose.length;
  const beyond = wall.findIndex((w) => w.x >= L);
  const k = beyond > 0 ? beyond : wall.length - 1;
  const a = wall[k - 1]!;
  const b = wall[k]!;
  const end = { x: L, p: a.p + ((b.p - a.p) * (L - a.x)) / (b.x - a.x) };
  const tip = taylorMaccoll(mach, Math.atan(noseTipSlope(body.nose)), gamma);
  return pressureDragFromProfile(
    [...wall.filter((w) => w.x < L), end],
    (x) => bodyRadius(body, x),
    { pressure: 1, dynamicPressure: 0.5 * gamma * mach * mach },
    body.nose.baseRadius,
    tip.surfacePressureRatio,
  );
};

const CASES = [
  { name: 'V3-ogive3M1.98 (control)', calibers: 3, mach: 1.98 },
  { name: 'B-ogive3M1.35', calibers: 3, mach: 1.35 },
  { name: 'B-ogive3M3', calibers: 3, mach: 3 },
  { name: 'B-ogive5M1.3', calibers: 5, mach: 1.3 },
  { name: 'B-ogive5M2', calibers: 5, mach: 2 },
  { name: 'B-ogive5M3', calibers: 5, mach: 3 },
];

it('computes the blind checks\' references', () => {
  const out: Record<string, unknown>[] = [];
  for (const c of CASES) {
    const body: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: c.calibers, baseRadius: 0.5 },
      cylinderLength: 7,
    };
    const drags = [320, 640, 1280].map((n) =>
      noseDrag(body, c.mach, characteristics(body, { mach: c.mach, gamma, intervals: n, start: 1e-3 }).wall),
    );
    const [d1, d2, d3] = drags as [number, number, number];
    const ratio = (d2 - d1) / (d3 - d2);
    const extrapolated = d3 + (d3 - d2) / 3;
    // The start line moved from 1e-3 L to 2.5e-4 L, on 640 intervals: its effect.
    const nearerStart = noseDrag(body, c.mach, characteristics(body, { mach: c.mach, gamma, intervals: 640, start: 2.5e-4 }).wall);
    const row = { ...c, drags, ratio, extrapolated, nearerStart, startEffect: nearerStart - d2 };
    out.push(row);
    console.log(JSON.stringify(row));
  }
  if (process.env.MOC_OUT) writeFileSync(process.env.MOC_OUT, JSON.stringify(out, null, 1));
}, 1_800_000);
