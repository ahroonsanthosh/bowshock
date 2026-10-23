/** An OpenRocket import in plain words (src/app/import-summary.ts). */

import { describe, expect, it } from 'vitest';
import { importSummary, type ImportMapping } from '../../src/app/import-summary';
import { preset } from '../../src/rocket/presets';

const mapping = (change: Partial<ImportMapping> = {}): ImportMapping => ({
  design: preset('example-54').design,
  represented: [
    { component: 'nose cone "Nose"', as: 'the nose' },
    { component: 'body tube "Body"', as: 'a tube' },
  ],
  notRepresented: [],
  ignored: [{ component: 'parachute "Main"', reason: 'inside the body' }],
  finishes: [],
  flightFrom: 'the default (Mach 3.0 at sea level): the file has no simulation',
  ...change,
});

describe('the import, said plainly', () => {
  it('what was taken, exactly or not', () => {
    expect(importSummary('rocket.ork', mapping()).headline).toBe(
      'rocket.ork: 2 parts taken, all of them exactly.',
    );
    const s = importSummary(
      'rocket.ork',
      mapping({
        notRepresented: [
          { component: 'launch lug "Lug"', reason: 'held as an outside part', effect: 'note' },
        ],
      }),
    );
    expect(s.headline).toBe('rocket.ork: 2 parts taken; 1 not exactly, listed below.');
    expect(s.notTaken).toEqual(['launch lug "Lug": held as an outside part']);
    expect(s.ignored).toEqual(['parachute "Main": inside the body']);
    expect(s.taken).toEqual(['nose cone "Nose": the nose', 'body tube "Body": a tube']);
  });

  it('no rocket at all; the surface finish, which is not modelled', () => {
    expect(importSummary('x.ork', mapping({ design: null })).headline).toBe(
      'x.ork: no rocket could be made from it.',
    );
    const s = importSummary(
      'x.ork',
      mapping({
        finishes: [
          { component: 'nose', finish: 'normal', label: 'Regular paint' },
          { component: 'body', finish: 'normal', label: 'Regular paint' },
        ],
      }),
    );
    expect(s.finish).toBe(
      'Surface finish in the file: Regular paint. bowshock computes a smooth surface (no roughness is modelled).',
    );
  });
});
