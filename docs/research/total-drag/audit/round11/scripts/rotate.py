"""Turn a page image upright, losslessly (round 11: TN 3548 p. 17 is printed sideways).

usage: python3 -I rotate.py IN.png OUT.png
Converts to grey (L) and rotates 90 deg clockwise (PIL ROTATE_270), an exact
pixel transpose with no resampling: the pixel (u, v) of IN becomes the pixel
(H - 1 - v, u) of OUT, where H is IN's height.
"""
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None


def main():
    im = Image.open(sys.argv[1]).convert("L").transpose(Image.Transpose.ROTATE_270)
    im.save(sys.argv[2])
    print(sys.argv[2], im.size)


if __name__ == "__main__":
    main()
