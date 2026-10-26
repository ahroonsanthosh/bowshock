"""Convert pixel to value with a calib fit. usage: python3 -I val.py FIT.json KEY X Y"""
import sys, json
f = json.load(open(sys.argv[1]))[sys.argv[2]]
x, y = float(sys.argv[3]), float(sys.argv[4])
print(round(f["a"] * x + f["b"] * y + f["c"], 4))
