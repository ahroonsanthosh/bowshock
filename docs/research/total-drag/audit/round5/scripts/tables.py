"""Round 5: markdown tables for audit_round5.md, from this audit's JSON (default and rows options) and
bowshock's gate-second-run.json."""
import json
import os
import sys

root = sys.argv[1]
g = json.load(open(os.path.join(root, "docs/research/base-and-total/runs/gate-second-run.json")))
d = {o["shot"]: o for o in json.load(open(sys.argv[2]))}
r = {o["shot"]: o for o in json.load(open(sys.argv[3]))}
K = [("nose wave drag", "nose"), ("body friction", "body_friction"), ("fin friction", "fin_friction"),
     ("fin leading edges", "le"), ("fin wave drag", "fin_wave"), ("body base", "base"), ("fin trailing-edge base", "te")]

print("Table 1. Components, mine (default) / bowshock, C_D; body base also with the rows option")
print("| Shot | M | Nose | Body friction | Fin friction | Leading edges | Fin wave | Body base | Base (rows) | TE base | Total | Total (rows) |")
print("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
for x in g:
    o, q = d[x["shot"]], r[x["shot"]]
    c = x["components"]
    cells = [f"{o[k]:.5f} / {c[n]:.5f}" for n, k in K]
    cells.insert(6, f"{q['base']:.5f}")
    print(f"| {x['shot']} | {x['mach']:.3f} | " + " | ".join(cells) + f" | {o['total']:.5f} / {x['cd']:.5f} | {q['total']:.5f} |")

print()
print("Table 2. Largest |mine / bowshock - 1| per component over the 11 shots")
print("| Component | Default | Rows option | Half a unit of the json's 5th decimal, at the smallest value |")
print("| --- | --- | --- | --- |")
for n, k in K:
    a = max(abs(d[x["shot"]][k] / x["components"][n] - 1) for x in g)
    b = max(abs(r[x["shot"]][k] / x["components"][n] - 1) for x in g)
    m = min(x["components"][n] for x in g)
    print(f"| {n} | {100 * a:.3f}% | {100 * b:.3f}% | {100 * 0.5e-5 / m:.3f}% |")
a = max(abs(d[x["shot"]]["total"] / x["cd"] - 1) for x in g)
b = max(abs(r[x["shot"]]["total"] / x["cd"] - 1) for x in g)
print(f"| total | {100 * a:.3f}% | {100 * b:.3f}% | |")

print()
print("Table 3. Model-form band, input bands, residual and tolerance, mine (rows option) / bowshock")
print("| Shot | Band low | Band high | Transition (friction) + TE laminar low | TE laminar high + wall | Residual | Tolerance low | Tolerance high |")
print("| --- | --- | --- | --- | --- | --- | --- | --- |")
for x in g:
    q = r[x["shot"]]
    print(f"| {x['shot']} | {q['total'] + q['band_lo']:.5f} / {x['low']:.5f} | {q['total'] + q['band_hi']:.5f} / {x['high']:.5f} | "
          f"{q['transition_lo'] + q['te_lam_lo']:+.5f} / {x['inputLow']:+.5f} | {q['te_lam_hi'] + q['wall']:+.5f} / {x['inputHigh']:+.5f} | "
          f"{100 * q['residual']:+.2f}% / {100 * x['residual']:+.2f}% | {100 * q['tol_lo']:+.2f}% / {100 * x['tolerance'][0]:+.2f}% | "
          f"{100 * q['tol_hi']:+.2f}% / {100 * x['tolerance'][1]:+.2f}% |")

print()
print("Table 4. Fins-on-base factor at the shots: mine direct (the record's rule at M), mine rows, bowshock (from its base / P_B)")
print("| Shot | M | Direct: F (low to high) | Rows: F (low to high) | bowshock F | Base, direct minus bowshock |")
print("| --- | --- | --- | --- | --- | --- |")
for x in g:
    o, q = d[x["shot"]], r[x["shot"]]
    Fb = x["components"]["body base"] / abs(o["PB_less"])
    print(f"| {x['shot']} | {x['mach']:.3f} | {o['F']:.4f} ({o['F_low']:.4f} to {o['F_high']:.4f}) | {q['F']:.4f} ({q['F_low']:.4f} to {q['F_high']:.4f}) | "
          f"{Fb:.4f} | {o['base'] - x['components']['body base']:+.5f} |")
