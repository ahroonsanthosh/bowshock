"""Produce evidence crops (from the raw 600 dpi render) and an annotated overlay."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = sys.argv[1]
render = Image.open(f'{D}/p66_600-66.png').convert('RGB')
mp = np.load(f'{D}/work_rect_map.npy')  # sx, sy for each rectified pixel
def src_box(u0, v0, u1, v1):
    H, W = mp.shape[1:]; u0, u1 = [int(min(max(a, 0), W-1)) for a in (u0, u1)]; v0, v1 = [int(min(max(a, 0), H-1)) for a in (v0, v1)]
    xs = [mp[0][v, u] for v in (v0, v1) for u in (u0, u1)]; ys = [mp[1][v, u] for v in (v0, v1) for u in (u0, u1)]
    return int(min(xs)), int(min(ys)), int(max(xs))+1, int(max(ys))+1
def crop_raw(name, u0, v0, u1, v1, scale=1.0, note=None):
    b = src_box(u0, v0, u1, v1)
    im = render.crop(b)
    if scale != 1.0: im = im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS)
    if note:
        can = Image.new('RGB', (im.width, im.height+34), (255,255,255)); can.paste(im, (0, 34))
        ImageDraw.Draw(can).text((6, 8), note, fill=(180,0,0)); im = can
    im.save(f'{D}/{name}'); print(name, 'render box', b, 'size', im.size)
M = lambda m: 320 + (m-1.0)*1600      # rectified u for Mach number
P = lambda pb: 320 + (pb+0.36)*8000   # rectified v for P_B
cap = render.crop((1150, 3880, 4700, 4250)); cap.save(f'{D}/fig35_crop_caption.png'); print('caption', cap.size)
crop_raw('fig35_crop_freeflight_M1.0-1.65.png', M(1.0)+5, P(-0.31), M(1.66), P(-0.255), 1.0,
         'Free-flight curve (long-short dash, legend style) from left axis M=1.0 to the junction with estimate B near M=1.64 (600 dpi render)')
crop_raw('fig35_crop_estimateB_start_M1.5-1.66.png', M(1.47), P(-0.312), M(2.02), P(-0.258), 1.0,
         'Estimate B label, leader arrow and plain dashed line from M=1.5 down to the free-flight curve (600 dpi render)')
crop_raw('fig35_crop_estimateA_start_M1.1-1.75.png', M(1.08), P(-0.262), M(1.76), P(-0.215), 1.0,
         'Estimate A label, leader arrow and its line starting at M=1.5 (600 dpi render)')
crop_raw('fig35_crop_junction_M1.61-1.72.png', M(1.61), P(-0.2675), M(1.72), P(-0.2575), 5.0,
         '5x: dashed estimate B (from upper left) meets free-flight dash (from left) near M=1.64')
crop_raw('fig35_crop_steep_M1.68-2.0.png', M(1.68), P(-0.265), M(2.0), P(-0.18), 1.6,
         'Steep part: upper = free-flight (long dashes, single short dashes); middle = estimate B (plain dashes); lower = estimate A')
crop_raw('fig35_crop_bunch_crossing_M2.0-2.25.png', M(1.98), P(-0.2), M(2.26), P(-0.16), 2.6,
         'Bunch M~2.0-2.25: free-flight crosses estimate B (~M 2.05) and estimate A (~M 2.15-2.2); estimate B dashes emerge on top')
crop_raw('fig35_crop_right_ends_M2.2-3.05.png', M(2.2), P(-0.18), M(3.06), P(-0.105), 1.0,
         'Right: top = estimate B (plain dashes, ends M=3.0); middle = estimate A (long dashes + groups of short dashes, ends M=3.0); lower = free-flight (ends ~M 2.56)')
crop_raw('fig35_crop_end_freeflight_M2.4-2.62.png', M(2.38), P(-0.17), M(2.62), P(-0.125), 2.2,
         'End of free-flight curve near M=2.56 (single short dash between long dashes); estimate A above it continues')
crop_raw('fig35_crop_nofins_solid.png', M(1.0), P(-0.2), M(3.4), P(-0.07), 0.45,
         'Solid curve: "Present estimate, no fins, M0~Minf" (body-alone curve of fig. 18) with flagged (no-fin) symbols')
crop_raw('fig35_crop_symbols.png', M(1.4), P(-0.34), M(2.5), P(-0.1), 0.5, 'Wind-tunnel symbols (plain = with fins, flagged = no fins)')
