import sys, json
sys.path.insert(0, sys.argv[1])
import digi
res = json.load(open(sys.argv[2]))
page = sys.argv[3]; out = sys.argv[4]
box = tuple(map(int, sys.argv[5:9])); scale = float(sys.argv[9])
cols = {"diamond": (255, 0, 0), "square": (0, 0, 255), "circle": (0, 160, 0), "triangle": (200, 0, 200), "flagcircle": (0,160,160), "flagsquare": (160,0,160)}
pts = [(p["px"], p["py"], p["id"], cols.get(p["shape"], (255, 128, 0))) for p in res["points"]
       if box[0] <= p["px"] <= box[2] and box[1] <= p["py"] <= box[3]]
digi.overlay(page, out, box, pts, scale=scale, r=3)
print(out, len(pts))
