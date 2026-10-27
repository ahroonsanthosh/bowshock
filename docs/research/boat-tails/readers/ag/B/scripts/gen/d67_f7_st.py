import json, sys
# usage: page_tag x0px x1px  panel_specs_json out_spec
tag, x0, x1, panels, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), json.loads(sys.argv[4]), sys.argv[5]
ST = {"0.6": [-0.02, 0.02, 0.08, 0.15, 0.30, 0.45, 0.58], "0.8": [-0.02, 0.02, 0.08, 0.20, 0.40, 0.60, 0.78],
      "0.8b10": [-0.02, 0.02, 0.08, 0.20, 0.40, 0.60, 0.77], "1.0": [-0.02, 0.02, 0.08, 0.25, 0.50, 0.75, 0.97]}
sts = []
for p in panels:
    for xs in ST[p["ld"]]:
        sts.append({"id": "%s_%s_%+.2f" % (tag, p["name"], xs), "x": round(x0 + xs * (x1 - x0), 1), "y0": p["y0"], "y1": p["y1"]})
json.dump({"thr": 128, "open": 3, "r": 8.5, "band": 5, "minsec": 26, "stations": sts}, open(out, "w"), indent=1)
