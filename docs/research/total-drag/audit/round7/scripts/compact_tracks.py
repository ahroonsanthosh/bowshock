"""Write a compact copy of a tracks JSON for the repository.

usage: python3 -I compact_tracks.py IN.json OUT.json XKEY YKEY
Keeps x, y (px, 0.1), XKEY, YKEY (data, 4 decimals) and the flag of every point.
"""
import json
import sys

src, dst, xk, yk = sys.argv[1:5]
t = json.load(open(src))
out = {k: [[round(p["x"], 1), round(p["y"], 1), round(p[xk], 4), round(p[yk], 4), p.get("flag", "")]
           for p in v] for k, v in t.items()}
json.dump({"columns": ["x_px", "y_px", xk, yk, "flag"], "tracks": out}, open(dst, "w"), separators=(",", ":"))
print(dst, sum(len(v) for v in out.values()), "points")
