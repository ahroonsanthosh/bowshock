import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { FinRefusal } from '../../src/fins/refusal';
import { doubleWedge, hexagonal, type SymmetricSection } from '../../src/fins/section';
import { ackeretSectionDrag, exactSectionDrag } from '../../src/fins/section-drag';

const OUT = 'tests/tmp-fins/exactness.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');

it('where shock-expansion theory is exact', () => {
  const shapes: [string, (t: number) => SymmetricSection][] = [
    ['double wedge', (t) => doubleWedge(t)],
    ['double wedge, ridge 0.3', (t) => doubleWedge(t, 0.3)],
    ['hexagon, 30% bevels', (t) => hexagonal(t, 0.3)],
    ['hexagon, 15% bevels', (t) => hexagonal(t, 0.15)],
    ['hexagon, 5% bevels', (t) => hexagonal(t, 0.05)],
  ];
  const machs = [1.2, 1.3, 1.5, 2, 2.5, 3, 4];
  for (const [name, mk] of shapes) {
    for (const t of [0.02, 0.03, 0.05, 0.08, 0.12]) {
      const row = machs.map((m) => {
        try {
          const r = exactSectionDrag(mk(t), m);
          return `${(r.cd / ackeretSectionDrag(mk(t), m)).toFixed(4)}`;
        } catch (e) {
          if (!(e instanceof FinRefusal)) throw e;
          if (e.reason === 'reflected-wave') {
            const r = exactSectionDrag(mk(t), m, { neglectReflectedWaves: true });
            return `R@${r.upper.firstReflection.toFixed(2)}(${(r.cd / ackeretSectionDrag(mk(t), m)).toFixed(4)})`;
          }
          return e.reason === 'detached-shock' ? 'det' : e.reason;
        }
      });
      log(`${name} t/c ${t}: ` + machs.map((m, k) => `M${m} ${row[k]}`).join('  '));
    }
  }
});
