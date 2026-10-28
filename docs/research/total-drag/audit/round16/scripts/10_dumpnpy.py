# Character map of a gridline-subtracted window saved by 09_degrid.py (darkness above paper in steps of 25; the .npy holds grey, so it is inverted here).
import sys
import numpy as np
a = 255 - np.load(sys.argv[1]); x0, y0 = int(sys.argv[2]), int(sys.argv[3])
paper = np.median(a)
print('     ' + ''.join('%d' % ((x // 10) % 10) if x % 10 == 0 else ' ' for x in range(x0, x0 + a.shape[1])))
print('     ' + ''.join('%d' % (x % 10) for x in range(x0, x0 + a.shape[1])))
for j in range(a.shape[0]):
    row = ''
    for i in range(a.shape[1]):
        d = int((a[j, i] - paper) // 25)
        row += '.' if d <= 0 else str(min(d, 9))
    print('%4d ' % (y0 + j) + row)
