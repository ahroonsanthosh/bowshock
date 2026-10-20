import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
_src = open(os.path.join(os.path.dirname(__file__), "read_fig8.py")).read().split("pts = {")[0]
_ns = {"__file__": os.path.join(os.path.dirname(__file__), "read_fig8.py")}
exec(_src, _ns)
PAGE = os.path.join(os.path.dirname(__file__), "..", "work", "f8-11.png")
g = _ns["gc"]; H = _ns["Hc"]; V = _ns["Vc"]
xband = (1650, 2400)
y0, y1, thr = int(min(l for _, l, _ in H)) - 5 if "c" == "a" else int(min(l for _, l, _ in H)) + 5, int(max(l for _, l, _ in H)) - 4, 180
