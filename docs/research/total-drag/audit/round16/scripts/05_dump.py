# Print grey levels of a native-scan window as a character map (darkness in tenths).
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(int)
x0, y0, x1, y1 = map(int, sys.argv[2:6])
print('     ' + ''.join('%d' % ((x // 10) % 10) if x % 10 == 0 else ' ' for x in range(x0, x1)))
print('     ' + ''.join('%d' % (x % 10) for x in range(x0, x1)))
for y in range(y0, y1):
    row = ''
    for x in range(x0, x1):
        d = (255 - im[y, x]) // 25
        row += '.' if d <= 1 else str(min(d, 9))
    print('%4d ' % y + row)
