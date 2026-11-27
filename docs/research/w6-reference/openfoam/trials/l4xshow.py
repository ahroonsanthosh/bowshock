"""Residual and drag per block of a level 4 cycle trial: python3 -I l4xshow.py <case> [block]"""
import sys
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import numpy as np, ofref
case = sys.argv[1]; b = int(sys.argv[2]) if len(sys.argv) > 2 else 100
m = np.array(ofref.read_monitor(case, 1.3))
m = m[m[:, 1] > -100]
print("rows", len(m), "last", m[-1, 0])
a0 = int(m[0, 0]) // b * b
for a in range(a0, int(m[-1, 0]) + 1, b):
    s = m[(m[:, 0] >= a) & (m[:, 0] < a + b)]
    if len(s):
        print(a, "res %.2f..%.2f" % (s[:, 1].min(), s[:, 1].max()), "drag mean %.8f range %.2e" % (s[:, 2].mean(), np.ptp(s[:, 2])))
