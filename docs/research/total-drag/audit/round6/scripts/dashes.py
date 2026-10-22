"""Dash pattern of a tracked curve: lengths (px along x) of inked stretches and
of gaps, to tell solid, dashed and long-short-dash lines apart.

Usage: python3 -I dashes.py <spec.json> <track name>
Uses the spec's track (segments as in explore.py) and prints the pattern.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig import from_spec  # noqa: E402


def main():
    spec = json.load(open(sys.argv[1]))
    name = sys.argv[2]
    bx = spec["box"]
    f = from_spec(spec)
    t = [t for t in spec["tracks"] if t["name"] == name][0]
    pts = []
    for seg in t.get("segs", [t]):
        sd = (seg["seed"][0] - bx[0], seg["seed"][1] - bx[1])
        o = seg.get("orient", "cols")
        off = bx[1] if o == "rows" else bx[0]
        pts += f.track(sd, seg["lo"] - off, seg["hi"] - off, orient=o, max_jump=seg.get("max_jump", 6),
                       max_run=seg.get("max_run", 40), gap_slack=seg.get("gap_slack", 0.15))
    xs = sorted(set(int(p[0]) for p in pts))
    out = []
    s = xs[0]
    prev = xs[0]
    for x in xs[1:]:
        if x - prev > 2:
            out.append(("ink", s + bx[0], prev - s + 1))
            out.append(("gap", prev + bx[0], x - prev - 1))
            s = x
        prev = x
    out.append(("ink", s + bx[0], prev - s + 1))
    print(" ".join(f"{k[0]}{n}@{x}" for k, x, n in out))


if __name__ == "__main__":
    main()
