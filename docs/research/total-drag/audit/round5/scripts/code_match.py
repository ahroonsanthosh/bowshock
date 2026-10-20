"""Round 5: the body base with the two data choices found in src/base/tn3819-fig35.ts (round 3's tunnel pairs at
the nominal Mach numbers 1.50, 2.00, 2.41; round 3's error +-0.003 at M 2.97 and 3.00) and the band
interpolated between rows, against bowshock's gate json."""
import json
import os
import sys
import bf_total_indep as B

B.TUN3 = [(1.50, 0.3251 / 0.1941), (2.00, 0.2077 / 0.1500), (2.41, 0.1648 / 0.1202)]
g = json.load(open(os.path.join(sys.argv[1], "docs/research/base-and-total/runs/gate-second-run.json")))
for x in g:
    M = 1.80 if x["mach"] < 1.80 else x["mach"]
    lo, hi, F = B.fins_on_base_rows_then_interp(M, 0.003)
    base = -B.pb_less(x["mach"]) * F
    print(f"{x['shot']} M {x['mach']:.3f}: F {F:.5f} ({lo:.5f} to {hi:.5f}), base {base:.5f}, "
          f"bowshock {x['components']['body base']:.5f}, diff {base - x['components']['body base']:+.6f}")
