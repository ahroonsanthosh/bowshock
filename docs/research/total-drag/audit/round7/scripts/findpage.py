"""Report which PDF page (form-feed separated pdftotext output) holds a phrase.

usage: python3 -I findpage.py TEXT.txt PHRASE [PHRASE ...]
"""
import sys

pages = open(sys.argv[1], errors="replace").read().split("\f")
for ph in sys.argv[2:]:
    for i, t in enumerate(pages, 1):
        if ph.lower() in t.lower():
            print("%r on PDF page %d" % (ph, i))
