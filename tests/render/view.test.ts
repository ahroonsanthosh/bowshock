import { describe, expect, it } from 'vitest';
import {
  clipTransform,
  fitView,
  panBy,
  pixelToWorld,
  worldToPixel,
  zoomAbout,
  ZOOM_LIMITS,
} from '../../src/render/view';

const W = 1440;
const H = 900;

describe('the flow view’s camera', () => {
  it('fits the bounds in the rectangle, centred, with the margin to spare', () => {
    const bounds = { xMin: 0, xMax: 10, yMin: -4, yMax: 4 };
    const rect = { x: 0, y: 40, width: 1440, height: 860 };
    const view = fitView(bounds, rect, W, H, 0.9);
    // Height-limited: 8 units over 0.9 x 860 pixels.
    expect(view.ppu).toBeCloseTo((0.9 * 860) / 8, 12);
    const [cx, cy] = worldToPixel(view, 5, 0, W, H);
    expect(cx).toBeCloseTo(720, 9);
    expect(cy).toBeCloseTo(40 + 430, 9);
    const [top] = [worldToPixel(view, 5, 4, W, H)[1]];
    expect(top).toBeCloseTo(470 - 0.45 * 860, 9);
  });

  it('maps pixels and world points both ways, and clip space as the GPU does', () => {
    const view = { cx: 2.5, cy: -0.3, ppu: 123.4 };
    for (const [x, y] of [
      [0, 0],
      [3.2, 1.7],
      [-4, 2.5],
    ] as const) {
      const [px, py] = worldToPixel(view, x, y, W, H);
      const [bx, by] = pixelToWorld(view, px, py, W, H);
      expect(bx).toBeCloseTo(x, 12);
      expect(by).toBeCloseTo(y, 12);
      const { scale, offset } = clipTransform(view, W, H);
      const clipX = x * scale[0] + offset[0];
      const clipY = y * scale[1] + offset[1];
      expect(((clipX + 1) / 2) * W).toBeCloseTo(px, 9);
      expect(((1 - clipY) / 2) * H).toBeCloseTo(py, 9);
    }
  });

  it('pans with the pointer and zooms about it, the point under it staying put', () => {
    const view = { cx: 1, cy: 0, ppu: 100 };
    const moved = panBy(view, 50, -20);
    // A drag right by 50 pixels moves the world right: the centre goes left.
    expect(moved.cx).toBeCloseTo(0.5, 12);
    expect(moved.cy).toBeCloseTo(-0.2, 12);
    const at = pixelToWorld(view, 300, 200, W, H);
    const zoomed = zoomAbout(view, 2, 300, 200, W, H, 100);
    expect(zoomed.ppu).toBe(200);
    const after = pixelToWorld(zoomed, 300, 200, W, H);
    expect(after[0]).toBeCloseTo(at[0], 12);
    expect(after[1]).toBeCloseTo(at[1], 12);
  });

  it('keeps the zoom within its limits of the fitted scale', () => {
    const view = { cx: 0, cy: 0, ppu: 100 };
    expect(zoomAbout(view, 1e-6, 0, 0, W, H, 100).ppu).toBe(100 * ZOOM_LIMITS.out);
    expect(zoomAbout(view, 1e9, 0, 0, W, H, 100).ppu).toBe(100 * ZOOM_LIMITS.in);
  });
});
