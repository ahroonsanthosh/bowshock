"""Calibrate NACA TN 3819 fig. 18 (PDF p. 49 at 600 dpi) from all its gridlines.

usage: python3 -I tn3819_calib.py PAGE.png OUT_calib.json
Vertical gridlines: M = 1.0 to 8.6 every 0.2 (39 lines, M = 1.0 is the left
border, M = 8.6 the right border). Horizontal gridlines: P_B = -0.50 (top
border) to 0 (bottom border) every 0.02 (26 lines). Each line is found by
following it from a seed position measured near the plot border (from
probe.py), then sampled and fitted on its own (localgrid.py).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

# white label boxes and the legend, where gridlines are blanked and text sits
EXCLUDE = [
    (3385, 4615, 785, 1940),    # legend
    (795, 1455, 2995, 3255),    # "Compilation by Chapman"
    (1430, 2130, 3145, 3480),   # "Basic curve of present analysis ..."
    (1620, 2705, 1310, 1430),   # "Limiting base pressure (vacuum)"
    (1195, 1465, 1920, 2055),   # "Gabeaud"
    (790, 1090, 2180, 2320),    # "Free-flight data" lettering
]


def follow(d, orient, seed_pos, seed_s, s_lo, s_hi, prior_slope, step=20, win=7):
    """Follow a gridline from (seed_s, seed_pos) in both directions.

    The next position is predicted from a straight-line fit to the accepted
    samples when they span more than 300 px, otherwise from the prior slope
    through the last accepted sample. A sample is accepted within 2.5 px of the
    prediction (4 px after a gap of more than 100 px).
    """
    pts = []
    for direction in (+1, -1):
        hist = [(seed_s, seed_pos)]
        s = seed_s if direction > 0 else seed_s - step
        while s_lo <= s <= s_hi - step:
            sc_next = s + step / 2.0
            h = np.array(hist[-30:])
            span = h[:, 0].max() - h[:, 0].min()
            if len(h) >= 8 and span > 300:
                c = np.polyfit(h[:, 0], h[:, 1], 1)
                pred = float(np.polyval(c, sc_next))
            else:
                pred = float(h[-1, 1] + prior_slope * (sc_next - h[-1, 0]))
            gap = abs(sc_next - h[-1, 0])
            tol = 2.5 if gap < 100 else 4.0
            a = localgrid.sample_line(d, orient, pred, s, s + step, strip=step, step=step,
                                      win=win, exclude=EXCLUDE, track=False)
            if len(a):
                sc, pos = a[0]
                if abs(pos - pred) < tol:
                    pts.append((sc, pos))
                    hist.append((sc, pos))
            s += direction * step
    pts.sort()
    return np.array(pts) if pts else np.zeros((0, 2))


def merge(a, b):
    """Union of two sample sets; where both have a sample at the same s,
    keep the first."""
    if len(a) == 0:
        return b
    if len(b) == 0:
        return a
    seen = {round(s, 1) for s in a[:, 0]}
    extra = [r for r in b if round(r[0], 1) not in seen]
    out = np.vstack([a] + ([np.array(extra)] if extra else []))
    return out[np.argsort(out[:, 0])]


def main():
    page, out = sys.argv[1], sys.argv[2]
    d = 255.0 - np.asarray(Image.open(page).convert("L")).astype(float)
    vvals = [round(1.0 + 0.2 * k, 3) for k in range(39)]
    hvals = [round(-0.50 + 0.02 * j, 3) for j in range(26)]
    # seeds: vertical lines located in a band y 3520-3600 (just above P_B = 0),
    # horizontal lines in a band x 2180-2260 (between M = 3.4 and 3.6 lines)
    band = d[3520:3600, :].mean(axis=0)
    tband = d[640:760, :].mean(axis=0)  # above the legend, for M 5.4 to 7.4
    vs = []
    for k in range(39):
        x0 = 802.5 + 119.2 * k
        slope = 0.0111 - 0.0058 * k / 38.0
        a, b = int(x0) - 25, int(x0) + 26
        x_seed = a + int(np.argmax(band[a:b]))
        s1 = follow(d, "v", float(x_seed), 3560, 610, 3610, prior_slope=slope)
        xt = x_seed - slope * (3570 - 700)
        a, b = int(xt) - 12, int(xt) + 13
        xt_seed = a + int(np.argmax(tband[a:b]))
        s2 = follow(d, "v", float(xt_seed), 690, 610, 3610, prior_slope=slope)
        vs.append(merge(s1, s2))
    hband = d[:, 2240:2320].mean(axis=1)
    rband = d[:, 4900:4980].mean(axis=1)  # right of the legend
    hs = []
    for j in range(26):
        y0 = 605.5 + 120.1 * j - 0.00290 * (2280 - 800)
        a, b = int(y0) - 25, int(y0) + 26
        y_seed = a + int(np.argmax(hband[a:b]))
        s1 = follow(d, "h", float(y_seed), 2280, 804, 5330, prior_slope=-0.0029)
        yr = y_seed - 0.0029 * (4940 - 2290)
        a, b = int(yr) - 12, int(yr) + 13
        yr_seed = a + int(np.argmax(rband[a:b]))
        s2 = follow(d, "h", float(yr_seed), 4940, 804, 5330, prior_slope=-0.0029)
        hs.append(merge(s1, s2))
    g = localgrid.LocalGrid(vvals, hvals, vs, hs, half=200, gap=10)
    rep = g.dump(out, extra=dict(page=os.path.basename(page), dpi=600,
                                 note="TN 3819 fig. 18; x = M, y = P_B"))
    nan = np.isnan(g.X)
    print("intersections measured: %d of %d" % (g.X.size - int(nan.sum()), g.X.size))
    for k in range(39):
        if nan[k].any():
            print("  missing at M=%.1f: P=%s" % (vvals[k], [hvals[j] for j in np.where(nan[k])[0]]))
    gl = rep["global"]
    print("affine fit residual: M rms %.5f max %.5f ; P rms %.6f max %.6f" % (
        gl["affine_rms_x"], gl["affine_max_x"], gl["affine_rms_y"], gl["affine_max_y"]))
    print("projective fit residual: M rms %.5f max %.5f ; P rms %.6f max %.6f" % (
        gl["proj_rms_x"], gl["proj_max_x"], gl["proj_rms_y"], gl["proj_max_y"]))
    print("leave-one-out (px):", rep["leave_one_out_px"])
    print("intersection standard error (px):", rep["intersection_se_px"])
    for ln in rep["lines"]:
        if "slope" in ln:
            print("%s %6.2f n=%3d rej=%2d slope=%+.5f rms=%.2f max=%.2f rms_quad=%.2f" % (
                ln["orient"], ln["value"], ln["n"], ln["rejected"], ln["slope"], ln["rms_line"],
                ln["max_line"], ln["rms_quad"]))
        else:
            print(ln)
    for m, p in [(1.0, -0.19), (1.5, -0.17), (2.0, -0.14), (3.0, -0.10)]:
        x, y = g.to_pixel(m, p)
        x2, y2 = g.to_pixel(m + 0.2, p)
        x3, y3 = g.to_pixel(m, p + 0.02)
        print("near M=%.1f P=%.2f: px (%.1f, %.1f); %.2f px per 0.2 M; %.2f px per 0.02 P" % (
            m, p, x, y, np.hypot(x2 - x, y2 - y), np.hypot(x3 - x, y3 - y)))
        print("   round trip:", g.to_data(x, y))


if __name__ == "__main__":
    main()
