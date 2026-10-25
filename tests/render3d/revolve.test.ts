import { describe, expect, it } from 'vitest';
import { POINT_FLOATS, revolvedIndices, revolvedLines } from '../../src/render3d/geometry';

/**
 * The revolved surfaces' geometry (src/render3d/geometry.ts): lines cut at
 * the base on the CPU (nothing of the flow drawn beyond it) and the
 * indexed quads that turn each point once per azimuth.
 */
describe('revolved lines', () => {
  const line = {
    x: [0, 1, 2, 3],
    r: [0, 1, 1, 0.5],
    nx: [0, 0, 0, 0],
    nr: [1, 1, 1, 1],
    value: [1, 2, 3, 4],
  };

  it('keep a line before the base whole', () => {
    const l = revolvedLines([line], 10);
    expect(l.points.length / POINT_FLOATS).toBe(4);
    expect([...l.segments]).toEqual([0, 1, 2]);
  });

  it('cut a line at the base, the cut point interpolated', () => {
    const l = revolvedLines([line], 1.5);
    const n = l.points.length / POINT_FLOATS;
    expect(n).toBe(3);
    const last = l.points.slice((n - 1) * POINT_FLOATS, n * POINT_FLOATS);
    expect(last[0]).toBeCloseTo(1.5, 6);
    expect(last[1]).toBeCloseTo(1, 6);
    expect(last[4]).toBeCloseTo(2.5, 6);
    expect([...l.segments]).toEqual([0, 1]);
  });

  it('start a new piece where a line comes back before the base', () => {
    const back = { ...line, x: [0, 2, 0.5, 0.2] };
    const l = revolvedLines([back], 1);
    // 0 -> cut at 1; then cut at 1 -> 0.5 -> 0.2: two pieces, no segment across the gap.
    expect(l.points.length / POINT_FLOATS).toBe(5);
    expect([...l.segments]).toEqual([0, 2, 3]);
    for (const p of [0, 1, 2, 3, 4]) expect(l.points[p * POINT_FLOATS]!).toBeLessThanOrEqual(1);
  });

  it('index two triangles per segment and sector, sharing the turned points', () => {
    const idx = revolvedIndices(new Uint32Array([0, 1]), 3);
    expect(idx.length).toBe(6 * 2 * 3);
    // Every vertex is point * (sectors + 1) + sector, within the 3 points.
    expect(Math.max(...idx)).toBe(2 * 4 + 3);
    expect([...idx.slice(0, 6)]).toEqual([0, 4, 5, 0, 5, 1]);
  });
});
