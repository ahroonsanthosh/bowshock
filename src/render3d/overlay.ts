/**
 * The 3D view's text, drawn with a 2D canvas for the GPU to show over the
 * scene: the readout in the corner (the case, the grid and its steps),
 * the colour legend (real values and units), the notes on what is not
 * simulated, the label on the base, and the help (key H).
 */

import type { QuantityScale } from './quantities';

export const OVERLAY_FONT = "'JetBrains Mono', ui-monospace, 'DejaVu Sans Mono', monospace";

export type Canvas2D = OffscreenCanvas | HTMLCanvasElement;

function makeCanvas(width: number, height: number): Canvas2D {
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(height));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function context(c: Canvas2D): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (ctx === null) throw new Error('no 2D canvas context for the 3D view text');
  return ctx;
}

/** A faint dark ground with rounded corners, so that text reads over a bright slice. */
function backing(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  px: number,
): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, Math.round(px * 0.4));
  ctx.fill();
}

/** Lines of text, light on a transparent ground, with a faint shadow so they read over the flow. */
export function textBlock(
  lines: readonly { text: string; colour?: string; bold?: boolean }[],
  px: number,
  options: { align?: 'left' | 'right'; panel?: boolean; backing?: boolean } = {},
): Canvas2D {
  const lineHeight = Math.round(px * 1.45);
  const pad = Math.round(px * (options.panel === true ? 1.2 : 0.5));
  const probe = context(makeCanvas(1, 1));
  const font = (bold?: boolean) => `${bold === true ? 600 : 400} ${px}px ${OVERLAY_FONT}`;
  let width = 0;
  for (const l of lines) {
    probe.font = font(l.bold);
    width = Math.max(width, probe.measureText(l.text).width);
  }
  const c = makeCanvas(width + 2 * pad, lines.length * lineHeight + 2 * pad);
  const ctx = context(c);
  if (options.panel === true) {
    // A dark backing, so that the text reads over any part of the flow.
    ctx.fillStyle = 'rgba(6, 8, 12, 0.9)';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(160, 166, 178, 0.6)';
    ctx.lineWidth = Math.max(1, Math.round(px / 12));
    ctx.strokeRect(0.5, 0.5, c.width - 1, c.height - 1);
  } else if (options.backing === true) {
    backing(ctx, c.width, c.height, px);
  }
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = Math.round(px * 0.35);
  lines.forEach((l, k) => {
    ctx.font = font(l.bold);
    ctx.fillStyle = l.colour ?? 'rgba(236, 238, 242, 0.92)';
    const x = options.align === 'right' ? c.width - pad - ctx.measureText(l.text).width : pad;
    ctx.fillText(l.text, x, pad + (k + 0.5) * lineHeight);
  });
  return c;
}

/** Round tick values over [min, max]: about `count`, at 1, 2 or 5 times a power of ten. */
export function legendTicks(min: number, max: number, count = 5): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9 * step; v += step) {
    ticks.push(Number(v.toFixed(12)));
  }
  return ticks;
}

/** Decimals that show the ticks' step. */
function decimalsFor(ticks: readonly number[]): number {
  if (ticks.length < 2) return 2;
  const step = Math.abs(ticks[1]! - ticks[0]!);
  return Math.max(0, Math.min(4, -Math.floor(Math.log10(step) + 1e-9)));
}

/**
 * The colour legend: the palette over the range, tick values, the
 * quantity's name and unit, the free stream's value marked, and the
 * iso-surface levels as notches.
 */
export function legend(
  scale: QuantityScale,
  range: { min: number; max: number },
  levels: readonly number[],
  px: number,
): Canvas2D {
  const barWidth = Math.round(px * 22);
  const barHeight = Math.round(px * 0.8);
  const pad = Math.round(px * 0.6);
  const lineHeight = Math.round(px * 1.45);
  const ticks = legendTicks(range.min, range.max, 5);
  const decimals = decimalsFor(ticks);
  const notes =
    levels.length > 0
      ? `mark: free stream ${scale.freeValue.toFixed(decimals + 1)}; notches: surfaces; black: none drawn`
      : `mark: free stream ${scale.freeValue.toFixed(decimals + 1)}; black: nothing drawn`;
  const notesFont = `400 ${Math.round(px * 0.85)}px ${OVERLAY_FONT}`;
  const probe = context(makeCanvas(1, 1));
  probe.font = notesFont;
  const width = Math.max(barWidth + 2 * px, probe.measureText(notes).width) + 2 * pad;
  const c = makeCanvas(width, 3.6 * lineHeight + barHeight + 2 * pad);
  const ctx = context(c);
  backing(ctx, c.width, c.height, px);
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = Math.round(px * 0.3);
  ctx.font = `600 ${px}px ${OVERLAY_FONT}`;
  ctx.fillStyle = 'rgba(236, 238, 242, 0.95)';
  const unit = scale.unit === '' ? '' : `, ${scale.unit}`;
  ctx.fillText(`${scale.label}${unit}`, pad, pad + 0.5 * lineHeight);
  const x0 = pad + px;
  const y0 = pad + lineHeight + Math.round(px * 0.25);
  ctx.shadowBlur = 0;
  for (let k = 0; k < barWidth; k++) {
    const [r, g, b] = scale.palette(k / (barWidth - 1));
    ctx.fillStyle = `rgb(${Math.round(255 * r)}, ${Math.round(255 * g)}, ${Math.round(255 * b)})`;
    ctx.fillRect(x0 + k, y0, 1, barHeight);
  }
  const at = (v: number) => x0 + ((v - range.min) / (range.max - range.min)) * (barWidth - 1);
  // Iso-surface levels: notches under the bar.
  ctx.fillStyle = 'rgba(236, 238, 242, 0.8)';
  for (const l of levels) ctx.fillRect(Math.round(at(l)), y0 + barHeight, 1, Math.round(px * 0.35));
  ctx.font = `400 ${Math.round(px * 0.92)}px ${OVERLAY_FONT}`;
  ctx.shadowBlur = Math.round(px * 0.3);
  ctx.fillStyle = 'rgba(236, 238, 242, 0.9)';
  for (const t of ticks) {
    const label = t.toFixed(decimals);
    const w = ctx.measureText(label).width;
    const x = Math.min(Math.max(at(t) - w / 2, 0), c.width - w);
    ctx.fillRect(Math.round(at(t)), y0 - Math.round(px * 0.3), 1, Math.round(px * 0.3));
    ctx.fillText(label, x, y0 + barHeight + Math.round(px * 0.35) + 0.5 * lineHeight);
  }
  // The free stream's value: a mark over the bar, and named below.
  const xf = Math.round(at(scale.freeValue));
  ctx.fillStyle = 'rgba(245, 246, 248, 0.95)';
  ctx.beginPath();
  ctx.moveTo(xf, y0 - 1);
  ctx.lineTo(xf - Math.round(px * 0.35), y0 - Math.round(px * 0.55));
  ctx.lineTo(xf + Math.round(px * 0.35), y0 - Math.round(px * 0.55));
  ctx.closePath();
  ctx.fill();
  ctx.font = notesFont;
  ctx.fillStyle = 'rgba(200, 204, 212, 0.85)';
  ctx.fillText(notes, pad, y0 + barHeight + Math.round(px * 0.35) + 2.1 * lineHeight);
  return c;
}
