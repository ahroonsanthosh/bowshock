"""Shared helpers: synthetic symbol templates, matching, calibration.

This file is not imported by path (scripts run with python -I); the other
scripts exec() it explicitly from an absolute path given on the command line
or derived from their own __file__.
"""
import numpy as np
import cv2
from PIL import Image

SS = 4  # supersampling for template rendering


def load_gray(path, rot=0):
    im = Image.open(path).convert('L')
    if rot:
        im = im.rotate(rot, expand=True, fillcolor=255)
    return np.asarray(im, dtype=np.float32)


def _poly(draw_pts, size, t, filled):
    """draw_pts: list of (x, y) in template px units centred at 0."""
    n = size * SS
    img = np.zeros((n, n), np.uint8)
    c = n / 2.0
    pts = np.array([[c + x * SS, c + y * SS] for x, y in draw_pts], np.int32)
    if filled:
        cv2.fillPoly(img, [pts], 255)
    else:
        cv2.polylines(img, [pts], True, 255, max(1, int(round(t * SS))), lineType=cv2.LINE_AA)
    return img


def template(kind, h, t=2.5, pad=4):
    """kind: circle, square, diamond, triangle (apex up), triangle_down,
    rtriangle (apex right), ltriangle, octagon, hexagon,
    and filled versions with suffix _f, half-filled are treated as open.
    h: half-size (circle radius to stroke centre, square half-side,
    diamond half-diagonal, triangle circumradius)."""
    filled = kind.endswith('_f')
    base = kind[:-2] if filled else kind
    size = int(2 * (h + t + pad)) | 1
    n = size * SS
    img = np.zeros((n, n), np.uint8)
    # cv2 pixel-centre coordinates: the template centre (continuous n/2) is
    # at pixel coordinate n/2 - 0.5; draw with 4 fractional bits.
    c = n / 2.0 - 0.5
    F = 16
    if base == 'circle':
        if filled:
            cv2.circle(img, (int(round(c * F)), int(round(c * F))), int(round((h + t / 2) * SS * F)), 255, -1, cv2.LINE_AA, 4)
        else:
            cv2.circle(img, (int(round(c * F)), int(round(c * F))), int(round(h * SS * F)), 255, max(1, int(round(t * SS))), cv2.LINE_AA, 4)
    else:
        if base == 'square':
            p = [(-h, -h), (h, -h), (h, h), (-h, h)]
        elif base == 'diamond':
            p = [(0, -h), (h, 0), (0, h), (-h, 0)]
        elif base == 'triangle':
            p = [(0, -h), (h * 0.866, h * 0.5), (-h * 0.866, h * 0.5)]
        elif base == 'triangle_down':
            p = [(0, h), (h * 0.866, -h * 0.5), (-h * 0.866, -h * 0.5)]
        elif base == 'rtriangle':
            p = [(h, 0), (-h * 0.5, h * 0.866), (-h * 0.5, -h * 0.866)]
        elif base == 'ltriangle':
            p = [(-h, 0), (h * 0.5, h * 0.866), (h * 0.5, -h * 0.866)]
        elif base == 'octagon':
            a = np.pi / 8
            p = [(h * np.cos(a + k * np.pi / 4), h * np.sin(a + k * np.pi / 4)) for k in range(8)]
        elif base == 'hexagon':
            p = [(h * np.cos(k * np.pi / 3), h * np.sin(k * np.pi / 3)) for k in range(6)]
        elif base == 'plus':
            p = None
        else:
            raise ValueError(kind)
        if p is not None:
            pts = np.array([[(c + x * SS) * F, (c + y * SS) * F] for x, y in p], np.int32)
            if filled:
                cv2.fillPoly(img, [pts], 255, cv2.LINE_AA, 4)
                cv2.polylines(img, [pts], True, 255, max(1, int(round(t * SS))), cv2.LINE_AA, 4)
            else:
                cv2.polylines(img, [pts], True, 255, max(1, int(round(t * SS))), cv2.LINE_AA, 4)
        else:
            L = h * SS
            T = max(1, int(round(t * SS)))
            cv2.line(img, (int((c - L) * F), int(c * F)), (int((c + L) * F), int(c * F)), 255, T, cv2.LINE_AA, 4)
            cv2.line(img, (int(c * F), int((c - L) * F)), (int(c * F), int((c + L) * F)), 255, T, cv2.LINE_AA, 4)
    small = cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA).astype(np.float32)
    return small


def match_near(gray, tpl, x, y, r):
    """Normalized correlation of template (ink=high) against inverted image
    in a window of +-r px around (x, y). Returns (xc, yc, score) with
    sub-pixel parabolic refinement. Coordinates are image px of the centre."""
    inv = 255.0 - gray
    th, tw = tpl.shape
    hx, hy = tw // 2, th // 2
    xi, yi = int(round(x)), int(round(y))
    X0, Y0 = xi - r - hx, yi - r - hy
    X1, Y1 = xi + r + hx + 1, yi + r + hy + 1
    win = inv[max(Y0, 0):Y1, max(X0, 0):X1]
    res = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED)
    j, i = np.unravel_index(np.argmax(res), res.shape)
    s = float(res[j, i])

    def para(a, b, c):
        d = a - 2 * b + c
        return 0.0 if d == 0 else 0.5 * (a - c) / d

    dx = para(res[j, i - 1], res[j, i], res[j, i + 1]) if 0 < i < res.shape[1] - 1 else 0.0
    dy = para(res[j - 1, i], res[j, i], res[j + 1, i]) if 0 < j < res.shape[0] - 1 else 0.0
    xc = max(X0, 0) + i + dx + hx
    yc = max(Y0, 0) + j + dy + hy
    edge = (i == 0 or j == 0 or i == res.shape[1] - 1 or j == res.shape[0] - 1)
    return xc, yc, s, edge


def scan(gray, tpl, box, thr=0.5, nms=10):
    inv = 255.0 - gray
    x0, y0, x1, y1 = box
    th, tw = tpl.shape
    win = inv[y0:y1, x0:x1]
    res = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED)
    out = []
    r = res.copy()
    while True:
        j, i = np.unravel_index(np.argmax(r), r.shape)
        s = r[j, i]
        if s < thr:
            break
        out.append((x0 + i + tw // 2, y0 + j + th // 2, float(s)))
        r[max(j - nms, 0):j + nms + 1, max(i - nms, 0):i + nms + 1] = -1
    return out


def fit_affine(samples):
    """samples: list of (u, v, val). Fit val = a + b*u + c*v if both u and v
    vary enough, else val = a + b*u. Returns coef, residuals."""
    S = np.array(samples, float)
    u, v, val = S[:, 0], S[:, 1], S[:, 2]
    A = np.column_stack([np.ones_like(u), u, v])
    coef, *_ = np.linalg.lstsq(A, val, rcond=None)
    resid = val - A @ coef
    return coef, resid


def remove_lines(gray, L=61, thr=170, grow=1):
    """Whiten long horizontal and vertical straight lines (grid, axes).
    Pixels that are dark and belong to a run of >= L px in x or y (found by
    morphological opening) are set to the local paper value (255)."""
    dark = (gray < thr).astype(np.uint8)
    kh = cv2.getStructuringElement(cv2.MORPH_RECT, (L, 1))
    kv = cv2.getStructuringElement(cv2.MORPH_RECT, (1, L))
    lines = cv2.morphologyEx(dark, cv2.MORPH_OPEN, kh) | cv2.morphologyEx(dark, cv2.MORPH_OPEN, kv)
    if grow:
        lines = cv2.dilate(lines, np.ones((2 * grow + 1, 2 * grow + 1), np.uint8))
    out = gray.copy()
    out[lines > 0] = 255.0
    return out, lines
