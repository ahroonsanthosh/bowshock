/**
 * Fins that reach past the base (the interface review's item 6): the page
 * says so in plain words, "the fins reach past the base", in place of the
 * logic's message about a negative distance (which stays, word for word,
 * in Details and the CSV); and, since the logic checks its inputs before
 * anything else, moving the fins is offered as a first step, never as
 * giving a number.
 */

import { describe, expect, it } from 'vitest';
import { CurveRun } from '../../src/app/curve';
import { csvRow } from '../../src/app/curve-csv';
import { pointView } from '../../src/app/point-view';
import { finsAhead } from '../../src/ui/builder-edits';
import type { RocketDesign } from '../../src/rocket/design';
import { preset } from '../../src/rocket/presets';

/** A preset with its fins moved aft by `by` metres. */
const past = (id: string, by: number): RocketDesign => {
  const d = preset(id).design;
  const f = d.finSets[0]!;
  return { ...d, finSets: [{ ...f, rootLeadingEdge: f.rootLeadingEdge + by }] };
};

const curve = (design: RocketDesign, noGpu: boolean) =>
  new CurveRun(
    { design, without: true, step: 0.2, finest: 8, noGpu },
    () => Promise.resolve({ kind: 'cancelled' as const, reports: [] }),
    () => {},
  );

describe('fins past the base', () => {
  it('every point says "the fins reach past the base", not the negative distance', () => {
    for (const id of ['basic-finner', 'example-54', 'example-98']) {
      const design = past(id, 0.005);
      expect(finsAhead(design)).toBeLessThan(0);
      for (const noGpu of [false, true]) {
        for (const p of curve(design, noGpu).points) {
          const v = pointView(p, true);
          expect(v.status.word, `${id} ${p.mach}`).toBe('No number');
          expect(v.reasons).toContain('the fins reach past the base');
          expect(v.reasons.join(' ')).not.toMatch(/must be zero or a positive number/);
          // A first step, never promised to give a number.
          expect(v.change).not.toMatch(/^To get a number/);
          if (v.reasons.length === 1) {
            expect(v.change).toBe(
              "First: fins whose trailing edges are at the base or ahead of it. The rocket's " +
                'other checks are made only then.',
            );
          }
          // The logic's own text stays in the CSV.
          expect(csvRow(p)).toMatch(
            /fins \(input\): the distance of the fins' trailing edges ahead of the base must be zero or a positive number/,
          );
        }
      }
    }
  });

  it('fins at the base are not refused for their place', () => {
    for (const p of curve(preset('basic-finner').design, false).points) {
      expect(pointView(p, true).reasons).not.toContain('the fins reach past the base');
    }
  });
});
