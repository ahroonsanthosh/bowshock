"""Download NTRS reports, each into its own new directory under the
scratchpad (downloads are untrusted), and extract their text with
pdftotext. Usage: python3 -I fetch_ntrs.py <scratchpad> <id> [<id> ...]"""
import os
import subprocess
import sys

base = sys.argv[1]
for rid in sys.argv[2:]:
    d = os.path.join(base, f'dl-ntrs-{rid}')
    os.makedirs(d, exist_ok=True)
    pdf = os.path.join(d, f'{rid}.pdf')
    if not os.path.exists(pdf) or os.path.getsize(pdf) < 1000:
        url = f'https://ntrs.nasa.gov/api/citations/{rid}/downloads/{rid}.pdf'
        subprocess.run(['curl', '-sS', '-L', '--max-time', '600', '-o', pdf, url], check=False)
    info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    pages = [l for l in info.splitlines() if l.startswith('Pages')]
    subprocess.run(['pdftotext', '-layout', pdf, os.path.join(d, f'{rid}.txt')], capture_output=True)
    print(rid, pages, os.path.getsize(pdf) if os.path.exists(pdf) else 0)
