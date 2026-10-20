import { appendFileSync, readFileSync } from 'node:fs';
import { it } from 'vitest';
import { linearWaveDrag } from '../../src/fins/linear-wave-drag';
import { doubleWedge, hexagonal } from '../../src/fins/section';

const OUT = 'tests/tmp-fins/port.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');

const json = JSON.parse(
  readFileSync('docs/research/total-drag/data/fin_linear_theory_results.json', 'utf8').replace(/Infinity/g, 'null'),
) as Record<string, [number, number, number][]>;

const tc = 0.05;
const deg = Math.PI / 180;
const cases: Record<string, { cr: number; s: number; tl: number; tt: number; sec: ReturnType<typeof doubleWedge> }> = {
  A: { cr: 3.38, s: 2.103, tl: Math.tan(30 * deg), tt: 0, sec: doubleWedge(tc, 0.536) },
  B: { cr: 1, s: 0.5, tl: 1, tt: 0, sec: doubleWedge(tc) },
  C: { cr: 1, s: 1, tl: 0.5, tt: 0, sec: doubleWedge(tc) },
  'C-hex': { cr: 1, s: 1, tl: 0.5, tt: 0, sec: hexagonal(tc, 0.15) },
  D: { cr: 1, s: 1, tl: 0, tt: 0, sec: doubleWedge(tc) },
  E: { cr: 1, s: 0.75, tl: 1, tt: 0.3, sec: doubleWedge(tc) },
  F: { cr: 0.75, s: 0.125, tl: 3, tt: 0, sec: doubleWedge(tc) },
  G: { cr: 1, s: 1, tl: 0.75, tt: 0, sec: doubleWedge(tc) },
};

it('port against finwave.py at n = 24', () => {
  const keys = Object.keys(json);
  for (const [name, c] of Object.entries(cases)) {
    const key = keys.find((k) => k.startsWith(name + ' '))!;
    const rows = json[key]!;
    const t0 = performance.now();
    const out: string[] = [];
    for (const [mach, ratio] of rows) {
      const r = linearWaveDrag(
        { rootChord: c.cr, span: c.s, tanLeadingEdge: c.tl, tanTrailingEdge: c.tt },
        c.sec,
        mach,
        { span: 24, chord: 24, eta: 24, splitAtMachCones: false },
      );
      out.push(`M${mach}: ${r.ratio.toFixed(12)} py ${ratio.toFixed(12)} rel ${(r.ratio / ratio - 1).toExponential(2)}`);
    }
    log(`${name} (${(performance.now() - t0).toFixed(0)} ms) ` + out.join('  '));
  }
});
