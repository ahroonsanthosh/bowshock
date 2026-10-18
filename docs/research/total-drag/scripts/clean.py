import sys
import numpy as np
from PIL import Image
def runs_mask(b, axis, L):
    # mark pixels belonging to runs of True of length >= L along axis
    b = b if axis == 0 else b.T
    out = np.zeros_like(b)
    H, W = b.shape
    for j in range(W):
        col = b[:, j]
        i = 0
        while i < H:
            if col[i]:
                k = i
                while k < H and col[k]: k += 1
                if k - i >= L: out[i:k, j] = True
                i = k
            else: i += 1
    return out if axis == 0 else out.T
def clean(arr, L):
    b = arr < 128
    v = runs_mask(b, 0, L); h = runs_mask(b, 1, L)
    return b & ~v & ~h
if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    x0,y0,x1,y1 = map(int, sys.argv[3:7]); L = int(sys.argv[7])
    a = np.array(Image.open(src).convert('L'))[y0:y1, x0:x1]
    c = clean(a, L)
    np.save(out + '.npy', c)
    Image.fromarray(np.where(c, 0, 255).astype(np.uint8)).save(out)
