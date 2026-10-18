/**
 * Van Driest II against the tabulation of the NASA Turbulence Modeling
 * Resource, tests/friction/data/cf_vandriestII.dat (source, URL and
 * checksum in tests/friction/data/README.md): four flat-plate cases, Mach
 * 2 adiabatic and Mach 5 with Tw/Taw = 0.2, 0.5, 1.0, free-stream
 * temperature 300 K, 2481 points each for Re_theta from 200 to 25000.
 * The TMR computed it with its curve fit of the Karman-Schoenherr law, so
 * the comparison uses that fit; the fit's own difference from the exact
 * law is measured in karman-schoenherr.test.ts.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { karmanSchoenherrTmrFit } from '../../src/friction/karman-schoenherr';
import {
  vanDriestAverageCf,
  vanDriestFactors,
  vanDriestLocalCf,
  vanDriestLocalCfAtReynolds,
  vanDriestMomentumReynolds,
  vanDriestReynoldsForMomentum,
} from '../../src/friction/van-driest';

const FILE = new URL('./data/cf_vandriestII.dat', import.meta.url);
const SHA256 = '06ee88290744e17c63add43d60d0b8064988edb3fa92fb4e0760495bfbec4a04';
const TMR_FREE_STREAM_TEMPERATURE = 300;

interface Zone {
  readonly title: string;
  readonly mach: number;
  readonly wallOverFreeStream: number;
  readonly points: [number, number][];
}

function readZones(): Zone[] {
  const zones: Zone[] = [];
  for (const line of readFileSync(FILE, 'utf8').split('\n')) {
    const s = line.trim();
    if (s.startsWith('ZONE')) {
      const m = /M=([\d.]+), Tw\/Tini=([\d.]+)/.exec(s);
      if (!m) throw new Error(`unexpected zone title ${s}`);
      zones.push({ title: s, mach: Number(m[1]), wallOverFreeStream: Number(m[2]), points: [] });
    } else if (zones.length > 0 && s !== '') {
      const [x, y] = s.split(/\s+/).map(Number);
      zones[zones.length - 1]!.points.push([x!, y!]);
    }
  }
  return zones;
}

describe('van Driest II against the TMR tabulation', () => {
  it('the reference file is the one downloaded', () => {
    expect(createHash('sha256').update(readFileSync(FILE)).digest('hex')).toBe(SHA256);
  });

  it('reproduces all 9924 points of the four cases within 1e-6 relative', () => {
    const zones = readZones();
    expect(zones.map((z) => [z.mach, z.wallOverFreeStream])).toEqual([
      [2, 1.712],
      [5, 1.09],
      [5, 2.725],
      [5, 5.45],
    ]);
    let count = 0;
    for (const zone of zones) {
      const factors = vanDriestFactors({
        mach: zone.mach,
        temperature: TMR_FREE_STREAM_TEMPERATURE,
        wallTemperature: zone.wallOverFreeStream * TMR_FREE_STREAM_TEMPERATURE,
      });
      let worst = 0;
      for (const [reTheta, cf] of zone.points) {
        const mine = vanDriestLocalCf(reTheta, factors, karmanSchoenherrTmrFit);
        worst = Math.max(worst, Math.abs(mine / cf - 1));
        count++;
      }
      // Measured: 2.4e-7, 4.7e-7, 4.3e-7, 3.6e-7 for the four cases (the
      // file has ten digits; the differences look like single precision).
      expect(worst, zone.title).toBeLessThan(1e-6);
    }
    expect(count).toBe(9924);
  });

  it("the Mach 2 case's wall is the adiabatic wall at r = 0.89", () => {
    const f = vanDriestFactors({ mach: 2, temperature: 300 });
    expect(f.adiabaticWallTemperature / 300).toBeCloseTo(1.712, 12);
    expect(f.wallTemperature).toBe(f.adiabaticWallTemperature);
  });
});

describe('van Driest II flat-plate relations', () => {
  const cases = [
    vanDriestFactors({ mach: 2.5, temperature: 120 }),
    vanDriestFactors({ mach: 1.2, temperature: 250, wallTemperature: 320 }),
    vanDriestFactors({ mach: 3.6, temperature: 80, wallTemperature: 200 }),
  ];

  it('the Re_x forms are the Re_theta form on a plate turbulent from its leading edge', () => {
    for (const f of cases) {
      for (const re of [1e6, 1e7, 1e8]) {
        const reTheta = vanDriestMomentumReynolds(re, f);
        expect(vanDriestLocalCfAtReynolds(re, f) / vanDriestLocalCf(reTheta, f) - 1).toBeCloseTo(
          0,
          12,
        );
        expect(vanDriestAverageCf(re, f) / ((2 * reTheta) / re) - 1).toBeCloseTo(0, 12);
        expect(vanDriestReynoldsForMomentum(reTheta, f) / re - 1).toBeCloseTo(0, 11);
        // Momentum balance d(Re_theta)/d(Re_x) = cf / 2.
        const d = re * 1e-5;
        const slope =
          (vanDriestMomentumReynolds(re + d, f) - vanDriestMomentumReynolds(re - d, f)) / (2 * d);
        expect(Math.abs((2 * slope) / vanDriestLocalCfAtReynolds(re, f) - 1)).toBeLessThan(1e-7);
      }
    }
  });

  it('the formula at small M tends to the M = 0 limit F_c = ((1 + sqrt(Tw / Te)) / 2)^2', () => {
    for (const tw of [320, 250]) {
      const at0 = vanDriestFactors({ mach: 0, temperature: 288, wallTemperature: tw });
      expect(at0.fc).toBeCloseTo(((1 + Math.sqrt(tw / 288)) / 2) ** 2, 14);
      const small = vanDriestFactors({ mach: 1e-4, temperature: 288, wallTemperature: tw });
      expect(Math.abs(small.fc / at0.fc - 1)).toBeLessThan(1e-6);
      expect(small.fTheta).toBeCloseTo(at0.fTheta, 14);
    }
    const adiabatic = vanDriestFactors({ mach: 1e-4, temperature: 288 });
    expect(adiabatic.fc).toBeCloseTo(1, 7);
  });
});
