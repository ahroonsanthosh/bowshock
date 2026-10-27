# usage: python3 -I gridspec.py <png> <out.json> "px,py,X,Y;px,py,X,Y;px,py,X,Y" <vvals comma> <hvals comma> <box x0,y0,x1,y1> [dark=140] [halfwin=4]
# From three frame corners (pixel position and data value, read by eye from zoomed crops) builds an
# approximate affine map, predicts where each labelled major gridline starts its trace (vertical lines at
# the box top, horizontal lines at the box left) and writes a calib.py spec. calib.py then traces each line
# in the image and fits the final calibration from the traced lines only (the corner values are not used).
import sys, json
import numpy as np
png, out = sys.argv[1], sys.argv[2]
C = np.array([[float(v) for v in c.split(',')] for c in sys.argv[3].split(';')])
vv = [float(v) for v in sys.argv[4].split(',')]; hv = [float(v) for v in sys.argv[5].split(',')]
box = [int(v) for v in sys.argv[6].split(',')]
dk = int(sys.argv[7]) if len(sys.argv) > 7 else 140; hw = int(sys.argv[8]) if len(sys.argv) > 8 else 4
A = np.vstack([np.ones(3), C[:, 2], C[:, 3]]).T
cx = np.linalg.solve(A, C[:, 0]); cy = np.linalg.solve(A, C[:, 1])   # px = cx0 + cx1 X + cx2 Y ; py likewise
def topx(X):  # x where line X=const crosses py = box top
    # py = cy0 + cy1 X + cy2 Y = box[1] -> Y
    Y = (box[1] - cy[0] - cy[1] * X) / cy[2]; return cx[0] + cx[1] * X + cx[2] * Y
def lefty(Y):
    X = (box[0] - cx[0] - cx[2] * Y) / cx[1]; return cy[0] + cy[1] * X + cy[2] * Y
spec = {"png": png, "dpi": 300, "box": box, "dark": dk, "halfwin": hw,
        "v": [[round(topx(X), 1), X] for X in vv], "h": [[round(lefty(Y), 1), Y] for Y in hv]}
json.dump(spec, open(out, 'w')); print(json.dumps(spec))
