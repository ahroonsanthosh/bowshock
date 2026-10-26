import sys, json
sys.path.insert(0, sys.argv[1])
import digi
d = json.load(open(sys.argv[2]))
thr = float(sys.argv[9])
cols = {"diamond": (255, 0, 0), "square": (0, 0, 255), "circle": (0, 160, 0)}
pts = [(c["x"], c["y"], f'{i}', cols[c["shape"]]) for i, c in enumerate(d) if c["score"] >= thr]
digi.overlay(sys.argv[3], sys.argv[4], tuple(map(int, sys.argv[5:9])), pts, scale=float(sys.argv[10]), r=3)
