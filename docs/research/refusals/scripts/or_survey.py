"""Survey OpenRocket design files (.ork) and component presets (.orc): nose
shapes and fineness, fin sets (count, cross-section, thickness, chords,
sweep, span), transitions at the aft end (boat-tails). Untrusted input:
run with python3 -I, paths as arguments. Output: one line per item, then
summaries.

Usage: python3 -I or_survey.py <examples dir> <presets dir>
"""
import gzip
import io
import math
import os
import sys
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter


def read_ork(path):
    data = open(path, 'rb').read()
    if data[:2] == b'PK':
        z = zipfile.ZipFile(io.BytesIO(data))
        name = [n for n in z.namelist() if n.endswith('.ork') or n.endswith('.xml')]
        data = z.read(name[0] if name else z.namelist()[0])
    elif data[:2] == b'\x1f\x8b':
        data = gzip.decompress(data)
    return ET.fromstring(data)


def num(el, tag, default=None):
    t = el.find(tag)
    if t is None or t.text is None:
        return default
    s = t.text.strip()
    if s.startswith('auto'):
        s = s.split()[-1] if len(s.split()) > 1 else ''
    try:
        return float(s)
    except ValueError:
        return default


def survey_ork(path):
    root = read_ork(path)
    out = []
    for stage in root.iter('stage'):
        # Walk the stage's components in order to find radii.
        comps = list(stage.iter())
        radius = None
        for c in comps:
            if c.tag == 'bodytube':
                r = c.find('radius')
                if r is not None and r.text and not r.text.startswith('auto'):
                    radius = float(r.text)
        for c in comps:
            if c.tag == 'nosecone':
                shape = (c.findtext('shape') or '').strip()
                param = num(c, 'shapeparameter')
                length = num(c, 'length')
                ar = c.find('aftradius')
                aft = None
                if ar is not None and ar.text:
                    t = ar.text.strip().split()
                    aft = float(t[-1]) if t and t[-1] != 'auto' else radius
                fin = length / (2 * aft) if (length and aft) else None
                out.append(('nose', os.path.basename(path), shape, param, length, aft, fin))
            if c.tag in ('trapezoidfinset', 'ellipticalfinset', 'freeformfinset'):
                count = num(c, 'fincount')
                cs = (c.findtext('crosssection') or '').strip()
                th = num(c, 'thickness')
                rc = num(c, 'rootchord')
                tc = num(c, 'tipchord')
                h = num(c, 'height')
                sw = num(c, 'sweeplength')
                le = math.degrees(math.atan2(sw, h)) if (sw is not None and h) else None
                tcr = th / rc if (th and rc) else None
                out.append(('fins', os.path.basename(path), c.tag, count, cs, th, rc, tc, h, le, tcr))
            if c.tag == 'transition':
                fr = c.find('foreradius')
                ar = c.find('aftradius')
                out.append(('transition', os.path.basename(path), (fr.text if fr is not None else ''), (ar.text if ar is not None else ''), num(c, 'length')))
    return out


def survey_orc(path):
    root = ET.parse(path).getroot()
    out = []
    for nc in root.iter('NoseCone'):
        shape = (nc.findtext('Shape') or '').strip()
        od = num(nc, 'OutsideDiameter')
        ln = num(nc, 'Length')
        man = (nc.findtext('Manufacturer') or '').strip()
        out.append(('preset-nose', os.path.basename(path), man, shape, od, ln, (ln / od) if (od and ln) else None))
    return out


def main():
    ex, pr = sys.argv[1], sys.argv[2]
    rows = []
    for f in sorted(os.listdir(ex)):
        if f.endswith('.ork'):
            try:
                rows += survey_ork(os.path.join(ex, f))
            except Exception as e:  # noqa: BLE001
                print('# could not read', f, e)
    for f in sorted(os.listdir(pr)):
        if f.endswith('.orc'):
            rows += survey_orc(os.path.join(pr, f))
    for r in rows:
        if r[0] != 'preset-nose':
            print(*[('%.4g' % x) if isinstance(x, float) else x for x in r], sep=' | ')
    presets = [r for r in rows if r[0] == 'preset-nose']
    print('# presets: nose cones', len(presets))
    for lo, hi in ((0, 0.038), (0.038, 0.2)):
        sel = [r for r in presets if r[4] is not None and lo <= r[4] < hi]
        print(f'# presets with OD in [{lo * 1000:.0f}, {hi * 1000:.0f}) mm:', len(sel), dict(Counter(r[3] for r in sel)))
        fins = sorted(r[6] for r in sel if r[6])
        if fins:
            q = lambda p: fins[min(len(fins) - 1, int(p * len(fins)))]
            print('#   L/D at the 10, 25, 50, 75 and 90th percentiles', ['%.2f' % q(p) for p in (0.1, 0.25, 0.5, 0.75, 0.9)])
    fins = [r for r in rows if r[0] == 'fins']
    print('# example fin sets', len(fins), 'counts', dict(Counter(r[3] for r in fins)), 'cross-sections', dict(Counter(r[4] for r in fins)))


main()
