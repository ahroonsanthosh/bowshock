"""2-D stroke tracer for curves of any slope (complements dig.track, which
scans columns or rows)."""
import numpy as np

from dig import runs_1d


def trace2d(m, x0, y0, ang_deg, x_lo, x_hi, step=3.0, w=6, max_gap=45.0, smooth=0.5, max_turn=25.0,
            max_steps=20000, y_lo=None, y_hi=None, max_run=None):
    """Follow a stroke from (x0, y0) heading ang_deg (image coordinates:
    0 = +x, 90 = +y, downward). Each step advances `step` px, then looks
    along the perpendicular (+-w px) for ink: the dark run nearest the
    predicted point gives the new point, and the heading turns towards it
    (at most max_turn degrees, blended by `smooth`). Gaps (dashes, crossings
    cleared with the gridlines) are crossed on the current heading for up to
    max_gap px. Stops outside x_lo..x_hi (and y_lo..y_hi if given).
    Returns [(x, y, run_len)] of the ink points (local px)."""
    H, W = m.shape
    y_lo = 0 if y_lo is None else y_lo
    y_hi = H - 1 if y_hi is None else y_hi
    max_run = 2 * w if max_run is None else max_run
    px, py = float(x0), float(y0)
    th = np.deg2rad(ang_deg)
    gap = 0.0
    out = []
    offs = np.arange(-w, w + 1)
    for _ in range(max_steps):
        dx, dy = np.cos(th), np.sin(th)
        qx, qy = px + step * dx, py + step * dy
        if not (x_lo <= qx <= x_hi and y_lo <= qy <= y_hi):
            break
        nx, ny = -dy, dx
        sx = np.round(qx + offs * nx).astype(int)
        sy = np.round(qy + offs * ny).astype(int)
        ok = (sx >= 0) & (sx < W) & (sy >= 0) & (sy < H)
        ink = np.zeros(len(offs), dtype=bool)
        ink[ok] = m[sy[ok], sx[ok]]
        best = None
        for s, e in runs_1d(ink):
            ln = e - s + 1
            if ln > max_run:
                continue
            c = 0.5 * (offs[s] + offs[e])
            if best is None or abs(c) < abs(best[0]):
                best = (c, ln)
        if best is not None:
            nxp, nyp = qx + best[0] * nx, qy + best[0] * ny
            nth = np.arctan2(nyp - py, nxp - px)
            d = (nth - th + np.pi) % (2 * np.pi) - np.pi
            d = np.clip(d, -np.deg2rad(max_turn), np.deg2rad(max_turn))
            th = th + smooth * d
            px, py = nxp, nyp
            out.append((px, py, best[1]))
            gap = 0.0
        else:
            px, py = qx, qy
            gap += step
            if gap > max_gap:
                break
    return out
