"""Print the axis calibrations of all panels as Markdown.
Usage: python3 -I calreport.py OUTDIR"""
import json, os, sys, glob
out = sys.argv[1]
FR = {'e51_f7': ('RM E51F26 fig. 7', 29, 'native'), 'e51_f8': ('RM E51F26 fig. 8', 30, 'native'),
      'e51_f24': ('RM E51F26 fig. 24', 48, 'native'), 'e51_f29': ('RM E51F26 fig. 29', 56, 'native'),
      'e51_f30': ('RM E51F26 fig. 30', 57, 'native'), 't3819_f19': ('TN 3819 fig. 19', 50, 'native'),
      't3819_f21': ('TN 3819 fig. 21', 52, 'rotated'), 't3819_f23': ('TN 3819 fig. 23', 54, 'rotated'),
      't3819_f24': ('TN 3819 fig. 24', 55, 'rotated'), 't3819_f25b': ('TN 3819 fig. 25(b)', 56, 'rotated'),
      'a52_f15': ('RM A52E20 fig. 15', 44, 'native'), 't3372_f10': ('TN 3372 fig. 10', 19, 'native'),
      't3372_f12': ('TN 3372 fig. 12', 20, 'native')}
for key, (title, page, frame) in FR.items():
    files = sorted(glob.glob(os.path.join(out, f'{key}_*_cal.json')))
    for f in files:
        pan = os.path.basename(f)[len(key) + 1:-9]
        c = json.load(open(f))
        print(f"**{title}, panel {pan}** (PDF page {page}, 300 dpi, {'image rotated 90 deg clockwise' if frame == 'rotated' else 'image as scanned'}):")
        ax = c['axis_x_1d']; ay = c['axis_y_1d']
        xs = ', '.join(f"{v:g} at u={p:.2f} (res {r:+.4f})" for p, v, r in zip(ax['pix'], ax['val'], ax['res']))
        ys = ', '.join(f"{v:g} at v={p:.2f} (res {r:+.5f})" for p, v, r in zip(ay['pix'], ay['val'], ay['res']))
        print(f"- x labelled grid lines (1-D fit, along the panel's mid-height): {xs}")
        print(f"- y labelled grid lines (1-D fit, along the panel's mid-width): {ys}")
        print(f"- 2-D affine fit through {c['n_int']} labelled-line intersections: rms residual x {c['rms_x']:.4f} (max {c['max_x']:.4f}), "
              f"y {c['rms_y']:.5f} (max {c['max_y']:.5f}); scale dx/du {c['cx'][1]:.6f}, dy/dv {c['cy'][2]:.6f} per pixel")
        chk = c.get('check_unlabelled', [])
        if chk:
            worst_h = max([abs(r) for o, v, r in chk if o == 'h'] or [0])
            worst_v = max([abs(r) for o, v, r in chk if o == 'v'] or [0])
            print(f"- check on unlabelled grid lines: worst |residual| x {worst_v:.4f}, y {worst_h:.5f}")
        print()
