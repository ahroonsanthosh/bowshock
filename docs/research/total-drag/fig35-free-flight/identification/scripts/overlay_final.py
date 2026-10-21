import sys
import numpy as np
from PIL import Image, ImageDraw
D = sys.argv[1]; T = f'{D}/work_tracks'
def P(f): A = np.load(f'{T}/{f}'); return [tuple(r) for r in A[:, 1:3]]
FF = P('p_FF_left.npy') + P('p_L1.npy') + [(1970,1722),(1984,1732),(2000,1745),(2020,1762),(2040,1779),(2070,1800),(2100,1819),(2118,1830.7),(2130,1839.6),(2142,1847.2),(2154,1855),(2166,1862.5),(2178,1869.5),(2190,1876.5),(2202,1884.3),(2214,1890.2),(2226,1897.3),(2232,1901.5)] + P('p_Lo2.npy')
EB = P('p_EB_pre.npy') + P('p_L2.npy') + [(1970,1733),(1990,1742),(2010,1756),(2040,1777),(2070,1795),(2100,1813),(2120,1825),(2135,1833)] + P('p_T.npy')
EA = P('p_EA.npy') + [(2133,1845.7),(2148,1854.9),(2160,1859),(2172,1864),(2184,1870.8),(2196,1876.9),(2208,1883),(2220,1888.4),(2232,1894.2)] + P('p_Mi2.npy')
NE = P('p_NE.npy')
base = Image.open(f'{D}/work_rect.png').convert('RGBA')
x0, y0, x1, y1 = 260, 640, 4300, 2700; sc = 0.42
img = base.crop((x0, y0, x1, y1)).resize((int((x1-x0)*sc), int((y1-y0)*sc)), Image.LANCZOS)
lay = Image.new('RGBA', img.size, (0,0,0,0)); d = ImageDraw.Draw(lay)
specs = [(FF, (230,0,0,150), -7, 'Free-flight faired curve, ref. 12 (long-short dash, legend style)'),
         (EB, (0,90,255,150), -7, 'Estimate B, with fins (plain dashes)'),
         (EA, (0,160,0,150), 7, 'Estimate A, with fins (long dashes with groups of short dashes)'),
         (NE, (200,0,200,150), 7, 'Present estimate, no fins (solid; body-alone curve of fig. 18)')]
for pts, col, off, lab in specs:
    a = np.array(pts, float)
    # offset the drawn trace sideways (in source px) so the inked line stays visible
    # drop near-duplicate points, then tangent over a +-6 point span
    keep = np.concatenate([[True], np.linalg.norm(np.diff(a, axis=0), axis=1) > 0.4]); a = a[keep]
    k = 6; ap = np.vstack([np.repeat(a[:1], k, 0), a, np.repeat(a[-1:], k, 0)])
    t = ap[2*k:] - ap[:-2*k]; t /= np.linalg.norm(t, axis=1, keepdims=True) + 1e-9
    n = np.stack([-t[:,1], t[:,0]], axis=1)
    b = (a + n*off - [x0, y0]) * sc
    d.line([tuple(p) for p in b[::3]], fill=col, width=3)
out = Image.alpha_composite(img, lay).convert('RGB')
can = Image.new('RGB', (out.width, out.height + 110), (255,255,255)); can.paste(out, (0, 0))
dd = ImageDraw.Draw(can)
for i, (pts, col, off, lab) in enumerate(specs):
    y = out.height + 12 + i*24
    dd.line([(12, y+6), (60, y+6)], fill=col[:3], width=4); dd.text((70, y), lab, fill=(0,0,0))
dd.text((900, out.height + 12), 'Coloured traces are drawn offset ~7 px beside each inked line.', fill=(90,90,90))
dd.text((900, out.height + 36), 'Rectified (deskewed) 600 dpi render of NACA TN 3819 fig. 35, scaled 0.42.', fill=(90,90,90))
can.save(f'{D}/fig35_identified_overlay.png'); print(can.size)
