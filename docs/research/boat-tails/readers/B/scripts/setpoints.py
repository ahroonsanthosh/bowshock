"""Attach points to a panel of a spec.
Usage: python3 -I setpoints.py SPEC.json PANEL POINTS.json
POINTS.json: {"sizes": {...}, "overlay_box": [...], "points": [...], other panel keys}"""
import json, sys
spec = json.load(open(sys.argv[1]))
pts = json.load(open(sys.argv[3]))
spec['panels'][sys.argv[2]].update(pts)
json.dump(spec, open(sys.argv[1], 'w'), indent=1)
