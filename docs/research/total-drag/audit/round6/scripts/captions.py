"""List figure captions found by the scan's OCR text layer, page by page.

Usage: python3 -I captions.py <pdf>
Only reads the PDF's text layer through pdftotext; prints page: caption.
"""
import re
import subprocess
import sys


def main():
    pdf = sys.argv[1]
    info = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout
    n = int(re.search(r"^Pages:\s+(\d+)", info, re.M).group(1))
    pat = re.compile(r"(fig(?:ure|\.)\s*\d+[^\n]{0,70})", re.I)
    for p in range(1, n + 1):
        t = subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), "-layout", pdf, "-"],
                           capture_output=True, text=True).stdout
        hits = pat.findall(t)
        caps = [h.strip() for h in hits if re.match(r"fig(?:ure|\.)\s*\d+\s*[.,:-]", h.strip(), re.I)]
        print(f"{p:3d}: " + " | ".join(caps[:3]))


if __name__ == "__main__":
    main()
