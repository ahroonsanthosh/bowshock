import json, subprocess, sys
import numpy as np
B = sys.argv[1]
W = B + "/work/"
P = json.load(open(W + "gen/d67_f7_panels.json"))
C = json.load(open(W + "gen/d67_f7_cal.json"))
ST = {"0.6": [-0.02, 0.02, 0.08, 0.15, 0.30, 0.45, 0.58], "0.8": [-0.02, 0.02, 0.08, 0.20, 0.40, 0.60, 0.78],
      "0.8b10": [-0.02, 0.02, 0.08, 0.20, 0.40, 0.60, 0.77], "1.0": [-0.02, 0.02, 0.08, 0.25, 0.50, 0.75, 0.97]}
allres = {}
for pg, d in P.items():
    for p in d["panels"]:
        key = pg + "_" + p["name"]
        c = C[key]
        xv = np.array([e[0] for e in c["xgrid"]]); xp = np.array([e[1] for e in c["xgrid"]])
        kx = np.polyfit(xv, xp, 1)
        yv = np.array([e[0] for e in c["ygrid"]]); yp = np.array([e[1] for e in c["ygrid"]])
        y0, y1 = int(min(yp)) + 4, int(max(yp)) - 3
        if p["name"] == "top" and pg in ("p26",):
            pass
        sts = [{"id": "%s_%+.2f" % (key, s), "x": round(float(np.polyval(kx, s)), 1), "y0": y0, "y1": y1} for s in ST[p["ld"]]]
        spec = {"thr": d.get("thr", 128), "maxrun": 45, "open": 3, "band": 10, "minarea": 60, "gap": 10, "stations": sts}
        sf = W + "spec/f7_%s_bf.json" % key
        json.dump(spec, open(sf, "w"), indent=1)
        r = subprocess.run(["python3", "-I", B + "/scripts/blobfind.py", W + "d67/p-%s.png" % pg[1:], sf, W + "out/f7_%s_bf.json" % key], capture_output=True, text=True)
        print(r.stdout.strip())
        if r.stderr.strip():
            print(r.stderr)
        res = json.load(open(W + "out/f7_%s_bf.json" % key))
        tops = [s["top"] for rr in res for s in rr["stacks"]]
        bots = [s["bottom"] for rr in res for s in rr["stacks"]]
        ya, yb = (min(tops) - 18, max(bots) + 18) if tops else (y0, y1)
        ya, yb = max(ya, y0 - 10), min(yb, y1 + 10)
        args = ["python3", "-I", B + "/scripts/strip.py", W + "d67/p-%s.png" % pg[1:], W + "view/f7_%s_strip.png" % key, "3", "24", str(ya), str(yb)]
        args += ["%+.2f:%s" % (s, st["x"]) for s, st in zip(ST[p["ld"]], sts)]
        subprocess.run(args, capture_output=True)
        allres[key] = {"stations": sts, "res": res, "ywin": [ya, yb]}
json.dump(allres, open(W + "out/f7_all_bf.json", "w"), indent=1)
