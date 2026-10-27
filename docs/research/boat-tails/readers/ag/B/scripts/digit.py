"""Blind figure digitiser: axis calibration and symbol centres.

Usage: python -I digit.py SPEC.json PAGE.png OUT_PREFIX

SPEC.json holds
  thr        ink threshold on 0-255 grey (pixels darker than thr are ink)
  frame      [x0, y0, x1, y1] approximate plot frame in pixels (used to
             limit line sampling)
  xgrid      list of [value, approx_px, kind]; kind "v" = full vertical
             grid line, "t" = tick mark only (then give "tick_span":
             [y0, y1] rows to sample)
  ygrid      same for the ordinate ([value, approx_py, kind])
  points     list of {id, series, approx: [px, py], shape, size, ...}
             shape: circle, diamond, square, tri_ur (right triangle with
             right angle bottom right, hypotenuse rising to the right),
             tri_up, tri_dn, tri_l, tri_r, octagon, flag info is copied
             through.  size = half size in px (circle radius, diamond
             half diagonal, square half side, triangle half width).
             Optional "fill": true for filled symbols.
Calibration: every grid line is sampled at many positions along its
length, the line position is the darkness-weighted centroid across the
line; then value = a + b*px + c*py is fitted by least squares over all
samples of all labelled lines (an affine fit that absorbs scan skew).
Residuals are reported per line.
Symbol centre: an outline template of the given shape is matched to a
lightly blurred ink map over a sub-pixel grid of positions and a range
of sizes; the score is the mean ink on the outline minus the mean ink
on outlines 2.5 px inside and outside it.  The centre reported is the
template's geometric centre (bounding-box centre); the pin dot inside
the symbol, if present, is located separately as the centroid of ink
inside the symbol away from the outline.
"""
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def load(path):
    im = Image.open(path).convert("L")
    return np.asarray(im, dtype=float)


def line_profile_pos(img, thr, kind, approx, lo, hi, half=10):
    """Sample a vertical (kind v) or horizontal (h) line near approx,
    between lo and hi along the line.  Return list of (along, across)."""
    out = []
    step = 6
    for t in range(int(lo), int(hi), step):
        if kind == "v":
            seg = img[t:t + step, int(approx) - half:int(approx) + half + 1]
            prof = (255.0 - seg).mean(axis=0)
            base = int(approx) - half
        else:
            seg = img[int(approx) - half:int(approx) + half + 1, t:t + step]
            prof = (255.0 - seg).mean(axis=1)
            base = int(approx) - half
        bg = np.median(prof)
        p = prof - bg
        k = int(np.argmax(p))
        if p[k] < (255 - thr) * 0.5:
            continue  # gap in line (dashed or broken) or symbol absent
        # contiguous region above half max
        hm = p[k] * 0.5
        a = k
        while a > 0 and p[a - 1] > hm:
            a -= 1
        b = k
        while b < len(p) - 1 and p[b + 1] > hm:
            b += 1
        if b - a > 8:
            continue  # too wide: something else (symbol, text) here
        w = p[a:b + 1]
        pos = base + (np.arange(a, b + 1) * w).sum() / w.sum()
        out.append((t + step / 2.0, pos))
    return out


def robust_line(samples):
    """Fit across = m*along + c with iterative 2.5-sigma clipping."""
    s = np.array(samples)
    keep = np.ones(len(s), bool)
    for _ in range(5):
        A = np.vstack([s[keep, 0], np.ones(keep.sum())]).T
        m, c = np.linalg.lstsq(A, s[keep, 1], rcond=None)[0]
        r = s[:, 1] - (m * s[:, 0] + c)
        sd = max(np.std(r[keep]), 0.3)
        nk = np.abs(r) < 2.5 * sd
        if (nk == keep).all():
            break
        keep = nk
    return m, c, s[keep]


def calibrate(img, spec, axis):
    if spec.get("comb"):
        # comb calibration: grid tooth positions measured elsewhere (periodic.py); value = v0 + (px - p0)/spacing*dv
        p0, sp, v0, dv = spec["comb"][axis]
        b = dv / sp
        coef = [b, 0.0, v0 - b * p0] if axis == "x" else [0.0, b, v0 - b * p0]
        rms = abs(b) * spec["comb"].get("rms_px", 0.3)
        return coef, [], rms, abs(b)
    thr = spec["thr"]
    fx0, fy0, fx1, fy1 = spec["frame"]
    rows = []  # (px, py, value)
    lines = []
    key = "xgrid" if axis == "x" else "ygrid"
    for ent in spec[key]:
        val, ap, kind = ent[0], ent[1], ent[2]
        span = ent[3] if len(ent) > 3 else None
        half = ent[4] if len(ent) > 4 else 10
        if axis == "x":
            lo, hi = span if span else (fy0 + 10, fy1 - 10)
            sm = line_profile_pos(img, thr, "v", ap, lo, hi, half)
            m, c, kept = robust_line(sm)
            for along, across in kept:
                rows.append((across, along, val))
        else:
            lo, hi = span if span else (fx0 + 10, fx1 - 10)
            sm = line_profile_pos(img, thr, "h", ap, lo, hi, half)
            m, c, kept = robust_line(sm)
            for along, across in kept:
                rows.append((along, across, val))
        lines.append({"value": val, "approx": ap, "kind": kind,
                      "n": len(kept), "slope": m, "mid": float(np.mean(kept[:, 1]))})
    R = np.array(rows)
    A = np.vstack([R[:, 0], R[:, 1], np.ones(len(R))]).T
    coef = np.linalg.lstsq(A, R[:, 2], rcond=None)[0]
    pred = A @ coef
    res = R[:, 2] - pred
    # per line residual (mean) in value units and pixels
    scale = math.hypot(coef[0], coef[1])
    for ln in lines:
        sel = R[:, 2] == ln["value"]
        ln["res_value"] = float(res[sel].mean())
        ln["res_px"] = float(res[sel].mean() / scale)
        ln["res_sd_px"] = float(res[sel].std() / scale)
    rms = float(np.sqrt((res ** 2).mean()))
    return coef, lines, rms, scale


def outline_pts(shape, size, aspect=1.0, n=160):
    """Template outline points relative to bbox centre (image coords)."""
    s = size
    if shape == "circle":
        t = np.linspace(0, 2 * np.pi, n, endpoint=False)
        return np.c_[s * np.cos(t), s * np.sin(t)]
    if shape == "diamond":
        v = [(0, -s), (s, 0), (0, s), (-s, 0)]
    elif shape == "square":
        v = [(-s, -s), (s, -s), (s, s), (-s, s)]
    elif shape == "tri_ur":
        h = s * aspect
        v = [(-s, h), (s, h), (s, -h)]
    elif shape == "tri_ul":
        h = s * aspect
        v = [(-s, -h), (-s, h), (s, h)]
    elif shape == "tri_up":
        h = s * aspect
        v = [(0, -h), (s, h), (-s, h)]
    elif shape == "tri_dn":
        h = s * aspect
        v = [(0, h), (s, -h), (-s, -h)]
    elif shape == "tri_r":
        h = s * aspect
        v = [(s, 0), (-s, h), (-s, -h)]
    elif shape == "tri_l":
        h = s * aspect
        v = [(-s, 0), (s, h), (s, -h)]
    elif shape == "octagon":
        a = s * math.tan(math.pi / 8)
        v = [(-a, -s), (a, -s), (s, -a), (s, a), (a, s), (-a, s), (-s, a), (-s, -a)]
    elif shape == "flag_circle":
        t = np.linspace(0, 2 * np.pi, n, endpoint=False)
        return np.c_[s * np.cos(t), s * np.sin(t)]
    else:
        raise ValueError(shape)
    v = np.array(v, float)
    pts = []
    m = len(v)
    per = n // m
    for i in range(m):
        a, b = v[i], v[(i + 1) % m]
        for k in range(per):
            pts.append(a + (b - a) * k / per)
    return np.array(pts)


def vertex_centroid(shape, s, aspect):
    h = s * aspect
    return {"tri_ur": (s / 3.0, h / 3.0), "tri_ul": (-s / 3.0, h / 3.0), "tri_up": (0.0, h / 3.0),
            "tri_dn": (0.0, -h / 3.0), "tri_r": (-s / 3.0, 0.0),
            "tri_l": (s / 3.0, 0.0)}.get(shape, (0.0, 0.0))


def shrink(pts, d):
    """Offset an outline toward (d>0 outward) its centre by scaling."""
    r = np.hypot(pts[:, 0], pts[:, 1])
    r[r == 0] = 1
    f = (r + d) / r
    return pts * f[:, None]


def sample(ink, pts):
    return ndimage.map_coordinates(ink, [pts[:, 1], pts[:, 0]], order=1, mode="nearest")


def arc_filter(pts, arcs):
    """Keep outline points whose angle (deg, counterclockwise from +x,
    y up) lies in one of the [a0, a1] ranges."""
    if not arcs:
        return pts
    ang = np.degrees(np.arctan2(-pts[:, 1], pts[:, 0])) % 360
    keep = np.zeros(len(pts), bool)
    for a0, a1 in arcs:
        a0 %= 360
        a1 %= 360
        if a0 <= a1:
            keep |= (ang >= a0) & (ang <= a1)
        else:
            keep |= (ang >= a0) | (ang <= a1)
    return pts[keep]


def fit_symbol(ink, p, img, thr):
    ax, ay = p["approx"]
    arcs = p.get("arcs")
    if p.get("fixed"):
        # centre already found from the symbol's strokes by another tool
        return {"bx": float(ax), "by": float(ay), "cx": float(ax), "cy": float(ay),
                "size": float(p["size"]), "score": float("nan"),
                "peak_hw_x": float("nan"), "peak_hw_y": float("nan"), "dot": None}
    shape = p["shape"]
    s0 = p["size"]
    aspect = p.get("aspect", 1.0)
    fill = p.get("fill", False)
    search = p.get("search", 6)
    gap = p.get("gap", 4.0)
    ds = p.get("dsize", 1.5)
    best = None
    sizes = np.arange(max(2.0, s0 - ds), s0 + ds + 0.01, 0.5) if ds > 0 else [s0]
    for s in sizes:
        base = arc_filter(outline_pts(shape, s, aspect), arcs)
        inn = shrink(base, -gap)
        out = shrink(base, gap)
        if fill:
            # filled: interior area points
            ii = []
            for f in np.linspace(0.1, 0.9, 6):
                ii.append(base * f)
            inner_area = np.vstack(ii)
        for dy in np.arange(-search, search + 0.01, 0.5):
            for dx in np.arange(-search, search + 0.01, 0.5):
                c = np.array([ax + dx, ay + dy])
                on = sample(ink, base + c).mean()
                o = sample(ink, out + c).mean()
                if fill:
                    i_ = sample(ink, inner_area + c).mean()
                    sc = 0.5 * (on + i_) - o
                else:
                    i_ = sample(ink, inn + c).mean()
                    sc = on - 0.5 * (o + i_)
                if best is None or sc > best[0]:
                    best = (sc, ax + dx, ay + dy, s)
    # refine to 0.1 px around best
    sc, bx, by, bs = best
    base = arc_filter(outline_pts(shape, bs, aspect), arcs)
    inn = shrink(base, -gap)
    out = shrink(base, gap)
    rb = best
    for dy in np.arange(-0.5, 0.51, 0.1):
        for dx in np.arange(-0.5, 0.51, 0.1):
            c = np.array([bx + dx, by + dy])
            on = sample(ink, base + c).mean()
            o = sample(ink, out + c).mean()
            if fill:
                ii = np.vstack([base * f for f in np.linspace(0.1, 0.9, 6)])
                i_ = sample(ink, ii + c).mean()
                s_ = 0.5 * (on + i_) - o
            else:
                i_ = sample(ink, inn + c).mean()
                s_ = on - 0.5 * (o + i_)
            if s_ > rb[0]:
                rb = (s_, bx + dx, by + dy, bs)
    sc, bx, by, bs = rb
    # half-width of the score peak: positions where score > 0.9*peak
    hw = []
    for ddx, ddy in ((1, 0), (0, 1)):
        k = 0.0
        while k < 6:
            k += 0.25
            c = np.array([bx + ddx * k, by + ddy * k])
            on = sample(ink, base + c).mean()
            o = sample(ink, out + c).mean()
            i_ = sample(ink, inn + c).mean()
            s_ = on - 0.5 * (o + i_) if not fill else on - o
            if s_ < 0.8 * sc:
                break
        hw.append(k)
    # pin dot: ink inside the symbol, at least 3 px from the outline
    dot = None
    if not fill:
        R = int(bs * max(1, aspect)) + 2
        x0, y0 = int(bx) - R, int(by) - R
        sub = img[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1] < thr
        yy, xx = np.mgrid[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1]
        # mask of interior shrunk by 3 px: test with polygon
        poly = shrink(outline_pts(shape, bs, aspect), -3.5) + np.array([bx, by])
        mimg = Image.new("L", (2 * R + 1, 2 * R + 1), 0)
        ImageDraw.Draw(mimg).polygon([(float(a - x0), float(b - y0)) for a, b in poly], fill=1)
        m = np.asarray(mimg, bool) & sub
        if m.sum() >= 2 and m.sum() < 40:
            dot = (float(xx[m].mean()), float(yy[m].mean()), int(m.sum()))
    # vertex centroid offset (triangles: centroid differs from bbox centre)
    off = vertex_centroid(shape, bs, aspect)
    return {"bx": float(bx), "by": float(by),
            "cx": float(bx + off[0]), "cy": float(by + off[1]), "size": float(bs), "score": float(sc),
            "peak_hw_x": hw[0], "peak_hw_y": hw[1], "dot": dot}


def main():
    spec = json.load(open(sys.argv[1]))
    img = load(sys.argv[2])
    outp = sys.argv[3]
    thr = spec["thr"]
    ink = ndimage.gaussian_filter((img < thr).astype(float), 0.8)
    res = {"spec": sys.argv[1]}
    cx, lx, rmsx, scx = calibrate(img, spec, "x")
    cy, ly, rmsy, scy = calibrate(img, spec, "y")
    res["xcal"] = {"coef": list(cx), "lines": lx, "rms_value": rmsx, "value_per_px": scx}
    res["ycal"] = {"coef": list(cy), "lines": ly, "rms_value": rmsy, "value_per_px": scy}
    pts = []
    for p in spec.get("points", []):
        f = fit_symbol(ink, p, img, thr)
        X = cx[0] * f["cx"] + cx[1] * f["cy"] + cx[2]
        Y = cy[0] * f["cx"] + cy[1] * f["cy"] + cy[2]
        d = dict(p)
        d.update(f)
        d["x"] = float(X)
        d["y"] = float(Y)
        if f["dot"]:
            d["x_dot"] = float(cx[0] * f["dot"][0] + cx[1] * f["dot"][1] + cx[2])
            d["y_dot"] = float(cy[0] * f["dot"][0] + cy[1] * f["dot"][1] + cy[2])
        pts.append(d)
    res["points"] = pts
    json.dump(res, open(outp + ".json", "w"), indent=1)
    # overlay
    im = Image.open(sys.argv[2]).convert("RGB")
    dr = ImageDraw.Draw(im)
    for ln in lx:
        dr.line([(ln["mid"], spec["frame"][1]), (ln["mid"], spec["frame"][3])], fill=(0, 160, 255))
    for ln in ly:
        dr.line([(spec["frame"][0], ln["mid"]), (spec["frame"][2], ln["mid"])], fill=(0, 160, 255))
    for d in pts:
        o = arc_filter(outline_pts(d["shape"], d["size"], d.get("aspect", 1.0)), d.get("arcs")) + np.array([d["bx"], d["by"]])
        for q in o:
            dr.point((float(q[0]), float(q[1])), fill=(255, 0, 0))
        dr.line([(d["cx"] - 3, d["cy"]), (d["cx"] + 3, d["cy"])], fill=(255, 0, 0))
        dr.line([(d["cx"], d["cy"] - 3), (d["cx"], d["cy"] + 3)], fill=(255, 0, 0))
        if d["dot"]:
            dr.point((d["dot"][0], d["dot"][1]), fill=(0, 200, 0))
    im.save(outp + "_overlay.png")
    print("x cal rms", rmsx, "per px", scx)
    for ln in lx:
        print("  x line", ln["value"], "mid px %.2f" % ln["mid"], "n", ln["n"], "res_px %.2f" % ln["res_px"])
    print("y cal rms", rmsy, "per px", scy)
    for ln in ly:
        print("  y line", ln["value"], "mid px %.2f" % ln["mid"], "n", ln["n"], "res_px %.2f" % ln["res_px"])
    for d in pts:
        dot = d["dot"]
        print("%-10s %-14s c=(%.1f,%.1f) s=%.1f sc=%.2f hw=(%.2f,%.2f) x=%.4f y=%.4f %s" % (
            d["id"], d["series"], d["cx"], d["cy"], d["size"], d["score"], d["peak_hw_x"], d["peak_hw_y"],
            d["x"], d["y"], ("dot x=%.4f y=%.4f n=%d" % (d["x_dot"], d["y_dot"], dot[2])) if dot else ""))


if __name__ == "__main__":
    main()
