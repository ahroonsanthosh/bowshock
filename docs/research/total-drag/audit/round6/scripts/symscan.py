"""Find open symbols (circles, squares, diamonds) in a panel by outline-
template correlation, without centre dots: every local maximum of the
correlation above a threshold, the best shape kept where candidates of
different shapes coincide. The template's centre is the bounding-box centre
(0008's centroid for these shapes). A flag is ink in a short sector just
outside the outline in a given direction.

scan(mask, clean, shapes, region, thr, nms) -> list of dicts
shapes: [{"name", "shape", "r", "flag": {"angle", "name", "thr"}}]
"""
import numpy as np

import dig


def dilate(b, k):
    out = b.copy()
    for _ in range(k):
        o = out.copy()
        o[1:, :] |= out[:-1, :]
        o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]
        o[:, :-1] |= out[:, 1:]
        out = o
    return out


def peaks(score, thr, rad):
    ys, xs = np.nonzero(score >= thr)
    if len(ys) == 0:
        return []
    vals = score[ys, xs]
    order = np.argsort(-vals)
    picked = []
    for i in order:
        y, x = ys[i], xs[i]
        if all((y - py) ** 2 + (x - px) ** 2 > rad ** 2 for py, px, _ in picked):
            picked.append((y, x, float(vals[i])))
    return picked


def flag_ink(clean, cx, cy, r, angle_deg):
    a0 = np.deg2rad(angle_deg)
    hits = tot = 0
    for da in np.deg2rad(np.arange(-15, 16, 5)):
        for rad in np.arange(r * 1.2, r * 1.8, 2.0):
            y = int(round(cy + rad * np.sin(a0 + da)))
            x = int(round(cx + rad * np.cos(a0 + da)))
            if 0 <= y < clean.shape[0] and 0 <= x < clean.shape[1]:
                tot += 1
                hits += int(clean[y, x])
    return hits / max(1, tot)


def scan(mask, clean, shapes, region, thr=0.62, nms=9, stroke=5.0, need_dot=False, ann_max=0.2):
    x0, y0, x1, y1 = region
    sub = dilate(mask[y0:y1, x0:x1], 1)
    cands = []
    for sh in shapes:
        best = None
        for rr in (sh["r"] - 1, sh["r"], sh["r"] + 1):
            if sh["shape"] in ("triangle", "triangle_down"):
                from fig import tri_template
                t = tri_template(rr, stroke, down=(sh["shape"] == "triangle_down"))
            else:
                t = dig.ring_template(rr, stroke, sh["shape"])
            sc = dig.correlate(sub, t)
            best = sc if best is None else np.maximum(best, sc)
        for py, px, v in peaks(best, thr, nms):
            X, Y = px + x0, py + y0
            if "xmax" in sh and X > sh["xmax"]:
                continue
            if "ymax" in sh and Y > sh["ymax"]:
                continue
            if "ymin" in sh and Y < sh["ymin"]:
                continue
            if need_dot:
                # an open symbol with a centre dot: ink within 3 px of the
                # centre, little ink between 0.45 r and 0.75 r
                if not mask[max(0, Y - 3):Y + 4, max(0, X - 3):X + 4].any():
                    continue
                R = int(sh["r"])
                yy, xx = np.mgrid[-R:R + 1, -R:R + 1]
                d = np.hypot(xx, yy)
                a0_, a1_ = (0.2, 0.45) if sh["shape"].startswith("triangle") else (0.45, 0.75)
                ann = (d >= a0_ * R) & (d <= a1_ * R)
                Yi = np.clip(Y + yy, 0, mask.shape[0] - 1)
                Xi = np.clip(X + xx, 0, mask.shape[1] - 1)
                if mask[Yi[ann], Xi[ann]].mean() > ann_max:
                    continue
            cands.append(dict(x=X, y=Y, score=v, sh=sh))
    # keep the best candidate within nms px across shapes
    cands.sort(key=lambda c: -c["score"])
    kept = []
    for c in cands:
        if all((c["x"] - k["x"]) ** 2 + (c["y"] - k["y"]) ** 2 > nms ** 2 for k in kept):
            kept.append(c)
    for c in kept:
        sh = c["sh"]
        c["name"] = sh["name"]
        if sh.get("dot_name") and mask[max(0, c["y"] - 4):c["y"] + 5, max(0, c["x"] - 4):c["x"] + 5].sum() >= sh.get("dot_px", 8):
            c["name"] = sh["dot_name"]
        c["flag"] = None
        if sh.get("flag"):
            fr = flag_ink(clean, c["x"], c["y"], sh["r"], sh["flag"]["angle"])
            c["flag"] = fr
            if fr >= sh["flag"].get("thr", 0.15):
                c["name"] = sh["flag"]["name"]
    return kept
