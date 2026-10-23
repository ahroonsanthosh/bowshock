/**
 * The builder's drawing of the rocket (docs/design/0017-rocketeer-interface.md
 * section 7): the side view of src/rocket/geometry.ts at true proportions,
 * as SVG, the body shaded as a lit cylinder, each fin flat-shaded by how
 * much of its face is seen (those behind the body drawn first), and a
 * scale bar of a round length in the user's unit.
 */

import { rocketGeometry, sideViewFins, type Point } from '../rocket/geometry';
import type { RocketDesign } from '../rocket/design';
import { fromMetres, scaleBarLength, type LengthUnit } from '../rocket/units';
import { h } from './dom';

const SVG = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

const path = (points: readonly Point[]) =>
  `M${points.map(([x, y]) => `${x.toFixed(5)} ${(-y).toFixed(5)}`).join('L')}Z`;

/** A grey between the fin's edge-on shade and its face-on one. */
function finShade(facing: number, behind: boolean): string {
  const t = behind ? 0.15 : 0.35 + 0.65 * facing;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${mix(58, 168)} ${mix(64, 176)} ${mix(74, 188)})`;
}

let ids = 0;

/** A drawing of the rocket in `target`, replacing what was there; nothing for lengths that are not numbers. */
export function drawRocket(target: HTMLElement, design: RocketDesign, unit: LengthUnit): void {
  let geometry;
  try {
    geometry = rocketGeometry(design);
  } catch {
    target.replaceChildren(
      h('p', { className: 'drawing__empty', text: 'No drawing: a length is missing.' }),
    );
    return;
  }
  const finite = (p: Point) => Number.isFinite(p[0]) && Number.isFinite(p[1]);
  const fins = sideViewFins(geometry);
  const all = [...geometry.profile, ...fins.flatMap((f) => f.polygons.flat())];
  if (!all.every(finite) || geometry.length <= 0) {
    target.replaceChildren(
      h('p', { className: 'drawing__empty', text: 'No drawing: a length is missing.' }),
    );
    return;
  }
  const ys = all.map(([, y]) => Math.abs(y));
  const half = Math.max(0.5, ...ys);
  const pad = 0.08 * Math.max(geometry.length, 2 * half);
  const x0 = Math.min(0, ...all.map(([x]) => x)) - pad;
  const x1 = Math.max(geometry.length, ...all.map(([x]) => x)) + pad;
  const width = x1 - x0;
  const height = 2 * (half + pad);
  const id = `rocket-shade-${++ids}`;

  const root = svg('svg', {
    viewBox: `${x0} ${-half - pad} ${width} ${height}`,
    preserveAspectRatio: 'xMidYMid meet',
    class: 'drawing__svg',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  const defs = svg('defs');
  const gradient = svg('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 });
  for (const [offset, colour] of [
    [0, '#4f5762'],
    [0.22, '#d5dbe3'],
    [0.42, '#a3acb8'],
    [0.75, '#59616c'],
    [1, '#2a3038'],
  ] as const) {
    gradient.append(svg('stop', { offset, 'stop-color': colour }));
  }
  defs.append(gradient);
  root.append(defs);

  const finGroup = (behind: boolean) => {
    const g = svg('g');
    for (const f of fins.filter((s) => s.behind === behind)) {
      for (const polygon of f.polygons) {
        g.append(
          svg('path', {
            d: path(polygon),
            fill: finShade(f.facing, behind),
            stroke: behind ? '#2b3139' : '#d9dee5',
            'stroke-width': 0.8,
            'stroke-linejoin': 'round',
            'vector-effect': 'non-scaling-stroke',
          }),
        );
      }
    }
    return g;
  };
  root.append(finGroup(true));
  const upper = geometry.profile;
  const lower = [...upper].reverse().map(([x, y]): Point => [x, -y]);
  root.append(
    svg('path', {
      d: path([...upper, ...lower]),
      fill: `url(#${id})`,
      stroke: '#c9d0d9',
      'stroke-width': 0.8,
      'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke',
    }),
  );
  root.append(finGroup(false));

  // The scale bar: a round length in the user's unit, at most a third of the rocket.
  const calibreInUnit = fromMetres(geometry.calibre, unit);
  const barUnits = scaleBarLength((geometry.length * calibreInUnit) / 3);
  const barFraction = barUnits / calibreInUnit / width;
  const bar = h(
    'div',
    { className: 'drawing__scale' },
    h('span', {
      className: 'drawing__bar',
      attrs: { style: `width: ${(100 * barFraction).toFixed(2)}%` },
    }),
    h('span', { className: 'drawing__label', text: `${String(barUnits)} ${unit}` }),
  );
  target.replaceChildren(root, bar);
}

/** What the drawing shows, for screen readers. */
export function drawingLabel(design: RocketDesign, unit: LengthUnit): string {
  const length = design.nose.length + design.body.reduce((s, b) => s + b.length, 0);
  const show = (m: number) => `${Number(fromMetres(m, unit).toPrecision(4))} ${unit}`;
  const fins = design.finSets[0];
  return (
    `Side view of ${design.name}: ${show(design.nose.diameter)} across, ${show(length)} long` +
    (fins === undefined ? ', no fins' : `, ${fins.count} fins`)
  );
}
