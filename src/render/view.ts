/**
 * The view of a flow: where the solver's coordinates land on the canvas,
 * and how pan, zoom and fit change it. Pure functions of plain numbers.
 *
 * A view puts the world point (cx, cy) at the canvas's centre, at `ppu`
 * device pixels per unit of length, y up:
 *   px = W / 2 + (x - cx) ppu,   py = H / 2 - (y - cy) ppu.
 */

export interface View {
  readonly cx: number;
  readonly cy: number;
  /** Device pixels per unit of length. */
  readonly ppu: number;
}

export interface Bounds {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}

/** A rectangle of the canvas, in device pixels from its top left corner. */
export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Zoom limits, relative to the view that fits the bounds. */
export const ZOOM_LIMITS = { out: 0.25, in: 4000 } as const;

/**
 * The view that shows `bounds` as large as fits in `rect` (of a canvas
 * `width` by `height`), centred in it, with `margin` of the room to spare.
 */
export function fitView(
  bounds: Bounds,
  rect: PixelRect,
  width: number,
  height: number,
  margin = 0.94,
): View {
  const bw = Math.max(bounds.xMax - bounds.xMin, 1e-12);
  const bh = Math.max(bounds.yMax - bounds.yMin, 1e-12);
  const ppu = margin * Math.min(rect.width / bw, rect.height / bh);
  const bx = 0.5 * (bounds.xMin + bounds.xMax);
  const by = 0.5 * (bounds.yMin + bounds.yMax);
  const rx = rect.x + 0.5 * rect.width;
  const ry = rect.y + 0.5 * rect.height;
  return { cx: bx - (rx - 0.5 * width) / ppu, cy: by + (ry - 0.5 * height) / ppu, ppu };
}

/** The canvas pixel of a world point. */
export function worldToPixel(
  view: View,
  x: number,
  y: number,
  width: number,
  height: number,
): [number, number] {
  return [0.5 * width + (x - view.cx) * view.ppu, 0.5 * height - (y - view.cy) * view.ppu];
}

/** The world point at a canvas pixel. */
export function pixelToWorld(
  view: View,
  px: number,
  py: number,
  width: number,
  height: number,
): [number, number] {
  return [view.cx + (px - 0.5 * width) / view.ppu, view.cy - (py - 0.5 * height) / view.ppu];
}

/** Move the view by a drag of (dx, dy) device pixels: the world follows the pointer. */
export function panBy(view: View, dx: number, dy: number): View {
  return { cx: view.cx - dx / view.ppu, cy: view.cy + dy / view.ppu, ppu: view.ppu };
}

/**
 * Zoom by `factor` (above 1 magnifies) about the canvas pixel (px, py),
 * which keeps showing the same world point; `ppu` stays within the limits
 * relative to `fitted`, the scale that fits the bounds.
 */
export function zoomAbout(
  view: View,
  factor: number,
  px: number,
  py: number,
  width: number,
  height: number,
  fitted: number,
): View {
  const ppu = Math.min(
    Math.max(view.ppu * factor, fitted * ZOOM_LIMITS.out),
    fitted * ZOOM_LIMITS.in,
  );
  const [x, y] = pixelToWorld(view, px, py, width, height);
  return { cx: x - (px - 0.5 * width) / ppu, cy: y + (py - 0.5 * height) / ppu, ppu };
}

/** Scale and offset taking world points to clip space: clip = world * scale + offset. */
export function clipTransform(
  view: View,
  width: number,
  height: number,
): { scale: [number, number]; offset: [number, number] } {
  const sx = (2 * view.ppu) / width;
  const sy = (2 * view.ppu) / height;
  return { scale: [sx, sy], offset: [-view.cx * sx, -view.cy * sy] };
}
