/**
 * The drag curve's chart and table (docs/design/0017-rocketeer-interface.md
 * section 8.4). The chart: C_D against Mach number, each number with its
 * band as a bar and a mark by status (shape as well as colour), a
 * provisional value as a hollow mark without a bar, and below the axis a
 * labelled "No number" row where each refused point sits as a cross at its
 * Mach number, so that it reads as a result, not a gap; points still to
 * come as ticks on the axis. The table is the chart's text, a row a point.
 * Every string comes from src/app/point-view.ts.
 */

import type { CurvePoint } from '../app/curve';
import type { PointView } from '../app/point-view';
import type { Mark } from '../app/status-words';
import { h } from './dom';

const SVG = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Ticks of a nice step over [low, high]. */
export function niceTicks(low: number, high: number, most = 6): number[] {
  const span = Math.max(high - low, 1e-9);
  const raw = span / most;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
  const ticks: number[] = [];
  for (let t = Math.ceil(low / step - 1e-9) * step; t <= high + 1e-9; t += step) {
    ticks.push(Number(t.toFixed(10)));
  }
  return ticks;
}

/** The C_D range a chart shows: every band and provisional value, padded, on nice ends. */
export function chartRange(points: readonly CurvePoint[]): [number, number] {
  const values: number[] = [];
  for (const p of points) {
    const s = p.state;
    if (s.kind === 'done' && s.result.kind === 'total') {
      values.push(s.result.view.total.low, s.result.view.total.high);
    } else if (s.kind === 'solving' && s.provisional !== null) {
      values.push(s.provisional);
    }
  }
  if (values.length === 0) return [0.2, 0.8];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = Math.max(0.05 * (high - low), 0.02);
  const step = 0.05;
  return [Math.floor((low - pad) / step) * step, Math.ceil((high + pad) / step) * step];
}

export interface ChartOptions {
  readonly points: readonly CurvePoint[];
  readonly views: readonly PointView[];
  readonly selected: number | null;
  /** The point being solved, if any. */
  readonly solving: number | null;
  readonly onSelect: (index: number) => void;
  readonly width: number;
  /** The highest Mach number the rocket flies to, marked where it lies on the curve. */
  readonly flight?: number;
}

function markShape(mark: Mark, x: number, y: number, r: number, className: string): SVGElement {
  switch (mark) {
    case 'circle':
    case 'hollow':
      return svg('circle', { cx: x, cy: y, r, class: className });
    case 'diamond':
      return svg('path', {
        d: `M${x} ${y - r * 1.3}L${x + r * 1.3} ${y}L${x} ${y + r * 1.3}L${x - r * 1.3} ${y}Z`,
        class: className,
      });
    case 'square':
      return svg('rect', { x: x - r, y: y - r, width: 2 * r, height: 2 * r, class: className });
    case 'cross':
      return svg('path', {
        d: `M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}`,
        class: className,
      });
    case 'tick':
      return svg('path', { d: `M${x} ${y - r}V${y + r}`, class: className });
  }
}

/** The chart, as SVG. */
export function curveChart(o: ChartOptions): SVGSVGElement {
  const width = Math.max(240, o.width);
  const height = 236;
  const m = { left: 46, right: 12, top: 24, bottom: 64 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  const machs = o.points.map((p) => p.mach);
  const x0 = 1;
  const x1 = Math.max(machs.length > 0 ? machs[machs.length - 1]! : 3, 1.4);
  const [y0, y1] = chartRange(o.points);
  const X = (mach: number) => m.left + ((mach - x0) / (x1 - x0)) * plotW;
  const Y = (cd: number) => m.top + (1 - (cd - y0) / (y1 - y0)) * plotH;
  const axisY = m.top + plotH;
  const laneY = axisY + 34;

  const root = svg('svg', {
    class: 'chart',
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    role: 'img',
    'aria-label': 'Drag coefficient against Mach number; the table below gives every point',
  });
  // Grid and axes.
  for (const t of niceTicks(y0, y1, 5)) {
    root.append(
      svg('line', { x1: m.left, x2: m.left + plotW, y1: Y(t), y2: Y(t), class: 'chart__grid' }),
      svg(
        'text',
        { x: m.left - 6, y: Y(t) + 4, class: 'chart__tick chart__tick--y' },
        t.toFixed(2),
      ),
    );
  }
  for (const t of niceTicks(x0, x1, 5)) {
    root.append(
      svg('line', { x1: X(t), x2: X(t), y1: axisY, y2: axisY + 4, class: 'chart__axis' }),
      svg('text', { x: X(t), y: axisY + 16, class: 'chart__tick chart__tick--x' }, t.toFixed(1)),
    );
  }
  root.append(
    svg('line', { x1: m.left, x2: m.left + plotW, y1: axisY, y2: axisY, class: 'chart__axis' }),
    svg('text', { x: 6, y: 13, class: 'chart__name' }, 'C'),
    svg('text', { x: 14, y: 17, class: 'chart__name chart__name--sub' }, 'D'),
    svg(
      'text',
      { x: m.left + plotW, y: height - 4, class: 'chart__name chart__name--x' },
      'Mach number',
    ),
    svg('text', { x: 6, y: laneY + 4, class: 'chart__lane' }, 'No'),
    svg('text', { x: 6, y: laneY + 15, class: 'chart__lane' }, 'number'),
    svg('line', {
      x1: m.left,
      x2: m.left + plotW,
      y1: laneY,
      y2: laneY,
      class: 'chart__lane-line',
    }),
  );
  // The curve through the numbers, between neighbouring points that both have one.
  let segment: string[] = [];
  const lines: string[] = [];
  for (const p of o.points) {
    const s = p.state;
    if (s.kind === 'done' && s.result.kind === 'total') {
      segment.push(`${X(p.mach).toFixed(1)} ${Y(s.result.view.total.cd).toFixed(1)}`);
    } else {
      if (segment.length > 1) lines.push(`M${segment.join('L')}`);
      segment = [];
    }
  }
  if (segment.length > 1) lines.push(`M${segment.join('L')}`);
  if (lines.length > 0) root.append(svg('path', { d: lines.join(''), class: 'chart__curve' }));

  // The rocket's flight: a line at its highest Mach number, or an arrow past the curve's end.
  if (o.flight !== undefined && o.flight >= x0) {
    const inside = o.flight <= x1;
    const x = inside ? X(o.flight) : m.left + plotW;
    if (inside) {
      root.append(svg('line', { x1: x, x2: x, y1: m.top, y2: axisY, class: 'chart__flight' }));
    }
    root.append(
      svg(
        'text',
        { x: inside ? x : x - 2, y: m.top - 6, class: 'chart__flight-label' },
        inside ? `flies to M ${o.flight.toFixed(2)}` : `flies to M ${o.flight.toFixed(2)} \u2192`,
      ),
    );
  }

  // The Mach windows BRL Report 934's range A tested, where the curve has a point in them.
  for (const p of o.points) {
    if (p.tested === undefined) continue;
    const a = X(p.tested.from);
    const b = X(p.tested.to);
    root.append(
      svg('rect', {
        x: a,
        y: m.top,
        width: Math.max(b - a, 2),
        height: axisY - m.top,
        class: 'chart__window',
      }),
      svg('text', { x: (a + b) / 2, y: axisY - 4, class: 'chart__window-label' }, 'BRL 934 tested'),
    );
  }

  if (o.selected !== null && o.points[o.selected] !== undefined) {
    const x = X(o.points[o.selected]!.mach);
    root.append(svg('line', { x1: x, x2: x, y1: m.top, y2: laneY + 8, class: 'chart__selected' }));
  }

  o.points.forEach((p, k) => {
    const v = o.views[k]!;
    const x = X(p.mach);
    const g = svg('g', { class: `chart__point chart__point--${v.status.tone}` });
    const s = p.state;
    const chosen = k === o.selected ? ' chart__mark--selected' : '';
    if (s.kind === 'done' && s.result.kind === 'total') {
      const t = s.result.view.total;
      g.append(
        svg('line', { x1: x, x2: x, y1: Y(t.low), y2: Y(t.high), class: 'chart__band' }),
        svg('line', { x1: x - 4, x2: x + 4, y1: Y(t.low), y2: Y(t.low), class: 'chart__band' }),
        svg('line', { x1: x - 4, x2: x + 4, y1: Y(t.high), y2: Y(t.high), class: 'chart__band' }),
        markShape(v.status.mark, x, Y(t.cd), 4.5, `chart__mark${chosen}`),
      );
    } else if (s.kind === 'solving') {
      const y = s.provisional === null ? axisY : Y(s.provisional);
      g.append(markShape('hollow', x, y, 4.5, `chart__mark chart__mark--hollow${chosen}`));
    } else if (s.kind === 'done' && s.result.kind !== 'choose') {
      g.append(markShape('cross', x, laneY, 4.5, `chart__mark chart__mark--cross${chosen}`));
    } else {
      g.append(markShape('tick', x, axisY, 4, `chart__mark chart__mark--tick${chosen}`));
    }
    if (k === o.solving) {
      g.append(svg('circle', { cx: x, cy: axisY, r: 7, class: 'chart__solving' }));
    }
    // A wide, invisible target to pick the point by pointer.
    const hit = svg('rect', {
      x: x - 8,
      y: m.top,
      width: 16,
      height: laneY + 10 - m.top,
      class: 'chart__hit',
    });
    hit.addEventListener('click', () => {
      o.onSelect(k);
    });
    g.append(hit);
    root.append(g);
  });
  return root;
}

/** The table: a row a point, its Mach number, C_D, band and status, and a button to show it. */
export function curveTable(
  views: readonly PointView[],
  selected: number | null,
  onSelect: (index: number) => void,
): HTMLTableElement {
  const table = h(
    'table',
    { className: 'curve-table' },
    h('caption', { className: 'visually-hidden', text: 'Every point of the drag curve' }),
  );
  const head = table.createTHead().insertRow();
  for (const text of ['Mach', 'C_D', 'Band', 'Status']) {
    head.append(h('th', { text, attrs: { scope: 'col' } }));
  }
  const body = table.createTBody();
  views.forEach((v, k) => {
    const row = body.insertRow();
    if (k === selected) row.setAttribute('aria-current', 'true');
    const show = h('button', {
      className: 'curve-table__mach',
      text: v.mach,
      attrs: { type: 'button', 'aria-label': `Show Mach ${v.mach}` },
    });
    show.addEventListener('click', () => {
      onSelect(k);
    });
    row.insertCell().append(show);
    if (v.tested !== null) {
      row.cells[0]!.append(h('span', { className: 'curve-table__tested', text: ` ${v.tested}` }));
    }
    row.insertCell().textContent = v.value ?? '';
    row.insertCell().textContent = v.band ?? '';
    const status = row.insertCell();
    status.append(
      h('span', { className: `status-word status-word--${v.status.tone}`, text: v.status.word }),
    );
    // A point without a number: every reason, in plain words.
    if (v.reasons.length > 0) {
      status.append(
        h(
          'ul',
          { className: 'curve-table__reasons' },
          ...v.reasons.map((text) => h('li', { text })),
        ),
      );
    }
    for (const cell of [row.cells[1]!, row.cells[2]!]) cell.className = 'num';
  });
  return table;
}
