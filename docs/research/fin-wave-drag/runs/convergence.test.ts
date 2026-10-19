import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { linearWaveDrag } from '../../src/fins/linear-wave-drag';
import { doubleWedge, hexagonal } from '../../src/fins/section';
import { areaRuleWaveDrag } from '../fins/support/area-rule';

const OUT = process.env.SPLIT === '0' ? 'tests/tmp-fins/convergence-unsplit.jsonl' : 'tests/tmp-fins/convergence.jsonl';
const log = (o: object) => appendFileSync(OUT, JSON.stringify(o) + '\n');

const tc = 0.05;
const deg = Math.PI / 180;
const b2 = Math.sqrt(3);
const cases = {
  A: { cr: 3.38, s: 2.103, tl: Math.tan(30 * deg), tt: 0, sec: doubleWedge(tc, 0.536) },
  B: { cr: 1, s: 0.5, tl: 1, tt: 0, sec: doubleWedge(tc) },
  C: { cr: 1, s: 1, tl: 0.5, tt: 0, sec: doubleWedge(tc) },
  'C-hex': { cr: 1, s: 1, tl: 0.5, tt: 0, sec: hexagonal(tc, 0.15) },
  D: { cr: 1, s: 1, tl: 0, tt: 0, sec: doubleWedge(tc) },
  E: { cr: 1, s: 0.75, tl: 1, tt: 0.3, sec: doubleWedge(tc) },
  F: { cr: 0.75, s: 0.125, tl: 3, tt: 0, sec: doubleWedge(tc) },
  G: { cr: 1, s: 1, tl: 0.75, tt: 0, sec: doubleWedge(tc) },
  R02: { cr: 1, s: 0.2, tl: 0, tt: 0, sec: doubleWedge(tc) },
  H: { cr: 1, s: 0.6, tl: 1, tt: -0.3, sec: doubleWedge(tc) },
  S105: { cr: 1, s: 0.5, tl: b2 / 1.05, tt: 0, sec: doubleWedge(tc) },
  S095: { cr: 1, s: 0.5, tl: b2 / 0.95, tt: 0, sec: doubleWedge(tc) },
};
// Recorded: SPLIT unset with n 8 to 48; SPLIT=0 (finwave.py's integration) with n 16 to 128.
const ns = (process.env.NS ?? (process.env.SPLIT === '0' ? '16,24,32,48,64,96,128' : '8,12,16,24,32,48'))
  .split(',')
  .map(Number);
const only = process.env.CASES?.split(',');

it('convergence of the source-sheet quadrature against the area rule', () => {
  for (const [name, c] of Object.entries(cases)) {
    if (only && !only.includes(name)) continue;
    const p = { rootChord: c.cr, span: c.s, tanLeadingEdge: c.tl, tanTrailingEdge: c.tt };
    const machs = name.startsWith('S') ? [2] : [1.2, 1.5, 2, 2.5, 3];
    for (const mach of machs) {
      const ar = areaRuleWaveDrag(p, c.sec, mach, 5).ratio;
      for (const n of ns) {
        const t0 = performance.now();
        const r = linearWaveDrag(p, c.sec, mach, { span: n, chord: n, eta: n, splitAtMachCones: process.env.SPLIT !== '0' }).ratio;
        log({ case: name, mach, n, ratio: r, areaRule: ar, rel: r / ar - 1, ms: Math.round(performance.now() - t0) });
      }
    }
  }
});
