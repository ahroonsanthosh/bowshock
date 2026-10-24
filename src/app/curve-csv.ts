/**
 * The drag curve as CSV (docs/design/0017-rocketeer-interface.md section
 * 8.4): comment lines naming the rocket (and the parts it is computed
 * without), the altitude, the grids and the build, then one row per point:
 *
 *   mach,cd,cd_low,cd_high,status,reason,floor
 *
 * C_D to four decimals and its model-form band rounded outward, as the
 * page shows them; `status` the logic's kind (validated, estimate,
 * refused) or the page's (not-modelled, needs-choice, not-finished);
 * `reason` the logic's own text (the claim, or every refusal). A point
 * without a number has empty C_D and band. A provisional value is never
 * written. A refused point's `reason` also carries the parts served, each
 * with its band and label, and the floor with its label or why none is
 * given; `floor` holds the floor alone, rounded down, and is empty
 * everywhere else (docs/design/0011-total-drag-on-the-page.md section 10).
 */

import { excludableParts, withoutText } from '../rocket/adapter';
import { outward } from './band';
import type { CurvePoint, CurveRun } from './curve';
import { testedNote } from './point-view';
import { floorValue, partsSentence } from './refused-parts';
import type { RocketDesign } from '../rocket/design';

export const CSV_HEADER = 'mach,cd,cd_low,cd_high,status,reason,floor';

/** A CSV field, quoted where it holds a comma, a quote or a line break. */
export function csvField(text: string): string {
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One point's row. */
export function csvRow(point: CurvePoint): string {
  const mach = point.mach.toFixed(2);
  // A point in a tested window says so first, apart from the logic's words.
  const note = testedNote(point);
  const row = (cd: string, low: string, high: string, status: string, reason: string, floor = '') =>
    [
      mach,
      cd,
      low,
      high,
      status,
      csvField(note === null ? reason : `${note}; ${reason}`),
      floor,
    ].join(',');
  const s = point.state;
  if (s.kind !== 'done') {
    // Not finished: the window's note alone where there is one.
    const text = note ?? 'not computed';
    return [mach, '', '', '', 'not-finished', csvField(text), ''].join(',');
  }
  const r = s.result;
  switch (r.kind) {
    case 'total': {
      const t = r.view.total;
      const [low, high] = outward(t.low, t.high, 4);
      const without = withoutText(r.without);
      const c = r.view.claim;
      // The logic's text, then its reasons (an estimate) or its caveats (validated), word for word.
      const claim =
        c.kind === 'validated'
          ? c.caveats.length === 0
            ? c.text
            : `${c.text} ${c.caveats.join(' ')}`
          : c.reasons.length === 0
            ? c.text
            : `${c.text} Because: ${c.reasons.join('; ')}.`;
      return row(
        t.cd.toFixed(4),
        low,
        high,
        r.view.claim.kind,
        without === '' ? claim : `Computed ${without}. ${claim}`,
      );
    }
    case 'refused': {
      const reasons =
        r.refusals.length === 0
          ? `no nose term: ${r.nose ?? 'not solved'}`
          : r.refusals.map((x) => `${x.component} (${x.reason}): ${x.message}`).join('; ');
      // The parts served, with their bands and labels, and the floor (0011 section 10).
      return r.parts === null
        ? row('', '', '', 'refused', reasons)
        : row(
            '',
            '',
            '',
            'refused',
            `${reasons}. ${partsSentence(r.parts, true)}`,
            floorValue(r.parts.floor),
          );
    }
    case 'not-modelled':
      return row(
        '',
        '',
        '',
        'not-modelled',
        r.features.map((f) => `${f.feature}: ${f.reason}`).join('; '),
      );
    case 'choose':
      return row(
        '',
        '',
        '',
        'needs-choice',
        `bowshock does not model ${r.excludable.map((e) => e.part).join(', ')}`,
      );
  }
}

/**
 * The rocket a curve is of, and the parts it is computed without: the
 * curve's header on the page, the CSV's first line and the PNG's caption.
 * Always the run's own design, never the builder's since.
 */
export function curveRocketName(design: RocketDesign, without: boolean): string {
  const parts = without ? withoutText(excludableParts(design).map((e) => e.part)) : '';
  return `${design.name}${parts === '' ? '' : `, ${parts}`}`;
}

/** The whole curve: comment lines, the header, a row per point. */
export function curveCsv(run: CurveRun, build: string): string {
  const d = run.options.design;
  const lines = [
    `# bowshock drag curve: ${curveRocketName(d, run.options.without)}`,
    `# altitude ${String(Number(d.flight.altitude.toPrecision(7)))} m above sea level (U.S. Standard Atmosphere, 1976); ` +
      `zero incidence, power off; nose solved to ${20 * run.options.finest} cells across`,
    `# ${build}`,
    CSV_HEADER,
    ...run.points.map(csvRow),
  ];
  return `${lines.join('\n')}\n`;
}
