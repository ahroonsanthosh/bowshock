import json, subprocess, sys
B = sys.argv[1]
W = B + "/work/"
P = json.load(open(W + "gen/d67_f7_panels.json"))
cal = {}
for pg, d in P.items():
    for p in d["panels"]:
        x0 = p["x0"]
        (v1, q1), (v2, q2) = p["y"]
        y0, y1 = p["yr"]
        fx0, fx1 = int(x0 - 0.2 * 901 - 8), int(x0 + 901 + 8)
        r = subprocess.run(["python3", "-I", B + "/scripts/panelcal.py", W + "d67/p-%s.png" % pg[1:], str(fx0), str(y0 - 4), str(fx1), str(y1 + 4),
                            "0@%s,1@%s,0.2" % (x0, x0 + 901), "%s@%s,%s@%s,0.1" % (v1, q1, v2, q2), str(d.get("thr", 128)), str(d.get("minf", 0.45)), str(d.get("half", 6))], capture_output=True, text=True)
        c = json.loads(r.stdout)
        if r.stderr.strip():
            print(pg, p["name"], r.stderr.strip().replace("\n", " | "))
        cal[pg + "_" + p["name"]] = c
        print(pg, p["name"], "x:", [e[:2] for e in c["xgrid"]], "y:", [e[:2] for e in c["ygrid"]])
json.dump(cal, open(W + "gen/d67_f7_cal.json", "w"), indent=1)
