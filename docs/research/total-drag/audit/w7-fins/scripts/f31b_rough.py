"""Write fig. 31b's rough centres (placed on zoomed views of the crop at
page (560, 1590)) in crop pixels, and its grid file in crop pixels.
Usage: python3 -I f31b_rough.py <out.csv> <grid.json>"""
import json
import sys

S = {
    'o': ('circle', [(396.7, 448.3), (570.7, 422.7), (739.3, 394), (825, 373.3), (910, 335), (995, 280.7),
                     (1080, 238.3), (1165, 202.7), (1266, 151.7), (1348.3, 111.7)]),
    'x': ('cross', [(415, 442.7), (556, 435), (705, 422.7), (780, 402.7), (851.7, 351.7), (928.3, 288.3),
                    (1016, 230.7), (1085, 165)]),
    't': ('triangle', [(220, 493.3), (341.7, 479), (463.3, 466), (523.3, 469.3), (584, 467.3), (644, 437.3),
                       (707.3, 370.7), (739.3, 374), (776, 280), (823.3, 270.7)]),
    'p': ('plus', [(56.7, 490), (146, 492.7), (188.3, 470.7), (227.7, 429.3), (271.7, 495), (320, 500.7),
                   (363.3, 480.7), (397.3, 463.3)]),
}
with open(sys.argv[1], 'w') as f:
    f.write('id,kind,x,y\n')
    for k, (kind, pts) in S.items():
        for i, (x, y) in enumerate(pts, 1):
            f.write(f'{k}{i:02d},{kind},{x:.1f},{y:.1f}\n')
xs = [57, 229, 397, 568, 739, 907, 1079, 1247, 1416]
ys = [41, 156, 271, 385, 499, 614]
json.dump({'x': [[round(0.4 + 0.1 * i, 1), p] for i, p in enumerate(xs)],
           'y': [[round(0.03 - 0.01 * i, 2), p] for i, p in enumerate(ys)], 'band': 60}, open(sys.argv[2], 'w'))
