"""Round 5, comparison phase: this audit's blind implementation against bowshock's second gate run
(docs/research/base-and-total/runs/gate-second-run.out and .json), component by component and shot by shot.
Usage: python3 compare.py ROOT [mine.json] [mine_rows.json]"""
import json
import os
import re
import sys
import bf_total_indep as B

root = sys.argv[1]
runs = os.path.join(root, "docs/research/base-and-total/runs")
gj = json.load(open(os.path.join(runs, "gate-second-run.json")))
lines = [l for l in open(os.path.join(runs, "gate-second-run.out")) if l.startswith("DA")]


def load_or_run(path, opt):
    if path and os.path.exists(path):
        return json.load(open(path))
    res = B.run(opt)
    if path:
        json.dump(res, open(path, "w"), indent=1, default=str)
    return res


mine = {o["shot"]: o for o in load_or_run(sys.argv[2] if len(sys.argv) > 2 else None, B.DEFAULT)}
rows_opt = dict(B.DEFAULT); rows_opt["F_mode"] = "rows"
mine_rows = {o["shot"]: o for o in load_or_run(sys.argv[3] if len(sys.argv) > 3 else None, rows_opt)}

KEYS = [("nose wave drag", "nose"), ("body friction", "body_friction"), ("fin friction", "fin_friction"),
        ("fin leading edges", "le"), ("fin wave drag", "fin_wave"), ("body base", "base"),
        ("fin trailing-edge base", "te")]

# parse the .out: per component value [low, high]; input bands
out = {}
for l in lines:
    shot = l.split()[0]
    d = {}
    for name, _ in KEYS:
        m = re.search(re.escape(name) + r" ([0-9.]+) \[([0-9.]+), ([0-9.]+)\]", l)
        d[name] = tuple(float(x) for x in m.groups())
    m = re.search(r"\| transition (-?[0-9.]+)\.\.(-?[0-9.]+)", l); d["transition"] = float(m.group(1))
    m = re.search(r"wall temperature (-?[0-9.]+)\.\.(-?[0-9.]+)", l); d["wall"] = float(m.group(2))
    m = re.search(r"transition at the fin trailing edges (-?[0-9.]+)\.\.(-?[0-9.]+)", l)
    d["telam"] = (float(m.group(1)), float(m.group(2)))
    m = re.search(r"without the wall (-?[0-9.]+)%", l); d["tol_nowall"] = float(m.group(1)) / 100
    out[shot] = d

print("=== A. components, 5 decimals (gate json) against mine (default; rows option for the base): relative difference")
hdr = "shot        M     " + "  ".join(f"{k[:10]:>10s}" for _, k in KEYS) + "   base(rows)  total    total(rows)"
print(hdr)
worst = {k: 0.0 for _, k in KEYS}
for g in gj:
    s = g["shot"]; o = mine[s]; r = mine_rows[s]
    cells = []
    for name, k in KEYS:
        rel = o[k] / g["components"][name] - 1
        worst[k] = max(worst[k], abs(rel), key=abs) if abs(rel) > abs(worst[k]) else worst[k]
        cells.append(f"{100 * rel:+9.3f}%")
    rb = r["base"] / g["components"]["body base"] - 1
    print(f"{s} {g['mach']:.3f} " + " ".join(cells) + f"  {100 * rb:+8.3f}%  {100 * (o['total'] / g['cd'] - 1):+6.3f}%  "
          f"{100 * (r['total'] / g['cd'] - 1):+6.3f}%")
print("largest |difference| per component (default): " + ", ".join(f"{k} {100 * v:+.3f}%" for k, v in worst.items()))

print("\n=== B. component band ends (4 decimals, gate .out) against mine (rows option): mine minus bowshock, in C_D")
for s, d in out.items():
    r = mine_rows[s]
    cells = []
    for name, k in KEYS:
        lo = r[k] + r["bands"][k][0]; hi = r[k] + r["bands"][k][1]
        cells.append(f"{name[:9]} {lo - d[name][1]:+.4f}/{hi - d[name][2]:+.4f}")
    print(f"  {s}: " + "; ".join(cells))

print("\n=== C. totals, model-form band, input bands, residual, tolerance: mine (rows option) minus bowshock")
print("shot        total     low       high      transition  wall      TE lam lo/hi       residual  tol lo  tol hi  tol hi(no wall)")
for g in gj:
    s = g["shot"]; r = mine_rows[s]; d = out[s]
    print(f"{s} {r['total'] - g['cd']:+.5f}  {r['total'] + r['band_lo'] - g['low']:+.5f}  {r['total'] + r['band_hi'] - g['high']:+.5f}  "
          f"{r['transition_lo'] - d['transition']:+.4f}     {r['wall'] - d['wall']:+.4f}   "
          f"{r['te_lam_lo'] - d['telam'][0]:+.4f}/{r['te_lam_hi'] - d['telam'][1]:+.4f}    "
          f"{100 * (r['residual'] - g['residual']):+.2f}pt   {100 * (r['tol_lo'] - g['tolerance'][0]):+.2f}  "
          f"{100 * (r['tol_hi'] - g['tolerance'][1]):+.2f}  {100 * (r['tol_hi_nowall'] - d['tol_nowall']):+.2f}")
print("\n  input bands, json (inputLow, inputHigh) against mine (transition + TE lam low; TE lam high + wall):")
for g in gj:
    r = mine_rows[g["shot"]]
    print(f"  {g['shot']}: {g['inputLow']:+.5f} / {g['inputHigh']:+.5f}  mine {r['transition_lo'] + r['te_lam_lo']:+.5f} / "
          f"{r['te_lam_hi'] + r['wall']:+.5f}")

print("\n=== D. the same with my default (direct F band) at the shots where it differs")
for g in gj:
    s = g["shot"]; o = mine[s]
    if abs(o["base"] - mine_rows[s]["base"]) > 5e-5:
        print(f"  {s} M {g['mach']}: base {o['base']:.5f} (rows {mine_rows[s]['base']:.5f}, bowshock "
              f"{g['components']['body base']:.5f}); F {o['F']:.4f} ({o['F_low']:.4f} to {o['F_high']:.4f}) against rows "
              f"{mine_rows[s]['F']:.4f} ({mine_rows[s]['F_low']:.4f} to {mine_rows[s]['F_high']:.4f}); bowshock F "
              f"{g['components']['body base'] / abs(o['PB_less']):.4f}; residual {100 * o['residual']:+.2f}% against "
              f"{100 * g['residual']:+.2f}%")
