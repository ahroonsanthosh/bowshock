"""Calibrate panels and fit symbol centres for one figure from a JSON spec.

Usage: python3 -I readfig.py SPEC.json OUTDIR [--cal-only]

Spec keys:
  image, page, thr (dark threshold), panels: {name: panel}
  panel: hlines, vlines, uspan, vspan, (hexclude, vexclude, xlog, ylog),
         sizes: {kind: size_px}, extra_masks: [[u0,v0,u1,v1], ...],
         points: [{id, kind, u, v, (filled), (size), (radius), ...meta}]
Writes OUTDIR/<fig>_<panel>_cal.json, OUTDIR/<fig>_points.json and
overlay PNGs for checking.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import figlib as fl  # noqa: E402


def main():
    spec_path, outdir = sys.argv[1], sys.argv[2]
    cal_only = '--cal-only' in sys.argv
    spec = json.load(open(spec_path))
    name = spec['name']
    img = fl.load_gray(spec['image'])
    os.makedirs(outdir, exist_ok=True)
    allpts = []
    for pname, panel in spec['panels'].items():
        cal = fl.calibrate(img, panel)
        print(f"== panel {pname}: {cal['n_int']} labelled intersections; "
              f"rms x {cal['rms_x']:.5f} max {cal['max_x']:.5f}; rms y {cal['rms_y']:.5f} max {cal['max_y']:.5f}")
        print(f"   dx/du {cal['cx'][1]:.6f} dx/dv {cal['cx'][2]:.6f} dy/du {cal['cy'][1]:.6f} dy/dv {cal['cy'][2]:.6f}")
        for h in cal['hl']:
            print(f"   h y={h['value']} lab={h['labelled']} v={h['a']:.2f}+{h['b']:.5f}u rms {h['rms']:.2f} n {h['n']}/{h['nall']}")
        for v in cal['vl']:
            print(f"   v x={v['value']} lab={v['labelled']} u={v['a']:.2f}+{v['b']:.5f}v rms {v['rms']:.2f} n {v['n']}/{v['nall']}")
        for c in cal['check_unlabelled']:
            print(f"   check unlabelled {c[0]} {c[1]}: residual {c[2]:+.5f}")
        # 1-D axis fits at panel centre for the report
        uc = 0.5 * sum(panel['uspan'])
        vc = 0.5 * sum(panel['vspan'])
        ax_y = fl.axis_fit_1d(cal['hl'], uc, panel.get('ylog', False))
        ax_x = fl.axis_fit_1d(cal['vl'], vc, panel.get('xlog', False))
        cal['axis_y_1d'] = ax_y
        cal['axis_x_1d'] = ax_x
        print("   1-D y: " + "; ".join(f"{val}@v{p:.2f} res {r:+.5f}" for p, val, r in zip(ax_y['pix'], ax_y['val'], ax_y['res'])))
        print("   1-D x: " + "; ".join(f"{val}@u{p:.2f} res {r:+.5f}" for p, val, r in zip(ax_x['pix'], ax_x['val'], ax_x['res'])))
        json.dump(cal, open(os.path.join(outdir, f"{name}_{pname}_cal.json"), 'w'), indent=1)
        if cal_only or not panel.get('points'):
            continue
        grid = [dict(orient='h', a=h['a'], b=h['b']) for h in cal['hl']] + \
               [dict(orient='v', a=v['a'], b=v['b']) for v in cal['vl']]
        grid += panel.get('extra_lines', [])
        fitter = fl.SymbolFitter(img, thr=spec.get('thr', 150), gridlines=grid,
                                 gridmask_halfwidth=panel.get('gridmask', 2.2),
                                 extra_masks=panel.get('extra_masks', []),
                                 box=panel.get('fitbox', [panel['uspan'][0], panel['vspan'][0], panel['uspan'][1], panel['vspan'][1]]))
        fitter.method = panel.get('method', spec.get('method', 'gray'))
        marks = []
        for p in panel['points']:
            kind = p['kind']
            size = p.get('size', panel['sizes'][kind])
            if p.get('fixed'):
                r = {'u': p['u'], 'v': p['v'], 'score': float('nan'), 'eu': p.get('eu', 1.0), 'ev': p.get('ev', 1.0), 'at_edge': False}
            else:
                r = fitter.fit(kind, size, p['u'], p['v'], radius=p.get('radius', panel.get('radius', 5.0)),
                               filled_sym=p.get('filled', False), sigma=panel.get('sigma', 1.3))
            x, y = fl.apply_xform(cal, r['u'], r['v'])
            # reading error: centre uncertainty mapped to data + calibration rms
            ex_pix = abs(cal['cx'][1]) * r['eu'] + abs(cal['cx'][2]) * r['ev']
            ey_pix = abs(cal['cy'][2]) * r['ev'] + abs(cal['cy'][1]) * r['eu']
            if cal.get('xlog'):
                ex_pix = ex_pix * x * np.log(10)
            if cal.get('ylog'):
                ey_pix = ey_pix * y * np.log(10)
            rmsx = cal['rms_x'] * (x * np.log(10) if cal.get('xlog') else 1)
            rmsy = cal['rms_y'] * (y * np.log(10) if cal.get('ylog') else 1)
            ex = float(np.hypot(ex_pix, rmsx))
            ey = float(np.hypot(ey_pix, rmsy))
            rec = dict(p)
            rec.update(panel=pname, u_fit=round(r['u'], 2), v_fit=round(r['v'], 2), score=round(r['score'], 3),
                       eu=r['eu'], ev=r['ev'], at_edge=r['at_edge'], x=float(x), y=float(y), ex=ex, ey=ey, size_used=size)
            allpts.append(rec)
            print(f"   {p['id']:>8} {kind:8s} u {r['u']:8.2f} v {r['v']:8.2f} s {r['score']:.3f} e({r['eu']:.2f},{r['ev']:.2f}) "
                  f"{'EDGE ' if r['at_edge'] else ''}x {x:.4f} y {y:.4f} +-({ex:.4f},{ey:.4f})")
            marks.append({'u': r['u'], 'v': r['v'], 'label': p['id'], 'shape': kind, 'size': size, 'r': 2})
        box = panel.get('overlay_box')
        if box:
            fl.overlay(img, box, marks, os.path.join(outdir, f"{name}_{pname}_overlay.png"), scale=panel.get('overlay_scale', 3))
    if not cal_only:
        json.dump(allpts, open(os.path.join(outdir, f"{name}_points.json"), 'w'), indent=1)


if __name__ == '__main__':
    main()
