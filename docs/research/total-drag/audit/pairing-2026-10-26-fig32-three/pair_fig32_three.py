"""Three-way neutral pairing of the three blind readings of NACA TN 3819 fig. 32 (Love, 1957; NTRS 19930084517,
PDF p. 64): the Langley 9-inch Mach 2.41 triangles (open R = 2.8e6, flagged R = 11.3e6), the faired curve through
them, and the two ref. 26 measured curves as a calibration check.

Usage (from the repository root):
  python3 -I docs/research/total-drag/audit/pairing-2026-10-26-fig32-three/pair_fig32_three.py

Reads only committed files on this branch:
  reading 1 (round 6, 2026-10-20): round6/readings/tn3819_fig32.csv, method_tn3819_figs32-35.md beside it.
  reading 2 (round 14, 2026-10-26): round14-fig32/readings/tn3819_fig32.csv and round14-fig32/method.md.
  reading 3 (round 16, 2026-10-26): round16/readings/tn3819_fig32.csv, round16/method.md and
    round16/scripts/22_alternatives.out.
  the two-way pairing of readings 1 and 2 (pairing-2026-10-26-fig32/pairs_tn3819_fig32.csv), only to check that
    the reading 1 and 2 verdicts recomputed here are the same.
Writes, next to this script: pairs_tn3819_fig32_three.csv and pairing.txt.

Rule (as the two-way pairing): two values agree when, on each axis both readers state an error for,
|difference| <= e_a + e_b, each reader's stated reading error, summed. Curves are compared in P_B at the same
station only, except the right end of the faired curve, which is not at a station and is compared on both axes.
Every pair of readers is compared (1 with 2, 1 with 3, 2 with 3). Where two readers agree and the third differs it
is said so and left at that: nothing is resolved toward any reading, nothing averaged, no band or envelope formed,
and two against one is not treated as settled. Flags and alternatives are quoted verbatim from the readers' files.

Matching. Symbols by station (x/c 1.0, 0.8, ..., 0.0). Readings 2 and 3 each give two symbols at every station
with an identity each; they are paired by vertical order (upper with upper) and their identities then compared.
Reading 1 gives an identity for none: where it gives two values (x/c 1.0) they are paired by vertical order, and
where it gives one value it is compared with each of the other readings' symbols at that station.
"""
import csv
import os
import re

ROOT = "docs/research/total-drag/audit/"
OUT = ROOT + "pairing-2026-10-26-fig32-three/"
R1_CSV = ROOT + "round6/readings/tn3819_fig32.csv"
R1_MD = ROOT + "round6/readings/method_tn3819_figs32-35.md"
R2_CSV = ROOT + "round14-fig32/readings/tn3819_fig32.csv"
R2_MD = ROOT + "round14-fig32/method.md"
R3_CSV = ROOT + "round16/readings/tn3819_fig32.csv"
R3_MD = ROOT + "round16/method.md"
R3_ALT = ROOT + "round16/scripts/22_alternatives.out"
TWO_WAY = ROOT + "pairing-2026-10-26-fig32/pairs_tn3819_fig32.csv"
STATIONS = (1.0, 0.8, 0.6, 0.4, 0.2, 0.0)
CURVE_STATIONS = (1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0)
NAMES = {1: "reading 1 (round 6)", 2: "reading 2 (round 14)", 3: "reading 3 (round 16)"}
PAIRS = ((1, 2), (1, 3), (2, 3))
CURVES = (  # element, series in readings 1, 2, 3
    ("faired curve M 2.41", "M2.41_9in_faired", "L9_M241_faired", "faired_M2.41"),
    ("ref. 26 M 1.50 (check)", "M1.50_ref26_measured", "ref26_M150_check", "ref26_M1.50"),
    ("ref. 26 M 2.00 (check)", "M2.00_ref26_measured", "ref26_M200_check", "ref26_M2.00"),
)
# Hashes each reader recorded for its source (round14-fig32/method.md "Source"; round16/method.md section 2 and
# scripts/01_cut_wrapper.out). Round 6 recorded none (its method notes name the URL, 68 pages and PDF p. 64).
HASHES = {
    2: ("9acd67dc393b26162f773602f477be6e9bf3b5e2823edb18df105a1159c9ce55",
        "c0c3a964d17c93c0133202ed512bbc10018ce7b228ad5f4edc079f73b32693af",
        "c3ea56ee79ac39d780b36b93563ea4ba7542c37db771f09703a6d44f46fa6fd0"),
    3: ("9acd67dc393b26162f773602f477be6e9bf3b5e2823edb18df105a1159c9ce55",
        "c0c3a964d17c93c0133202ed512bbc10018ce7b228ad5f4edc079f73b32693af",
        "c3ea56ee79ac39d780b36b93563ea4ba7542c37db771f09703a6d44f46fa6fd0"),
}


def text(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def section(md, heading):
    """Lines from the heading that starts with `heading` to before the next heading of the same or higher level."""
    lines = md.split("\n")
    i = next(k for k, l in enumerate(lines) if l.startswith(heading))
    level = len(heading) - len(heading.lstrip("#"))
    out = [lines[i]]
    for l in lines[i + 1:]:
        m = re.match(r"^(#+) ", l)
        if m and len(m.group(1)) <= level:
            break
        out.append(l)
    while out and not out[-1].strip():
        out.pop()
    return out


def paragraph(md, start):
    lines = md.split("\n")
    i = next(k for k, l in enumerate(lines) if l.startswith(start))
    out = []
    for l in lines[i:]:
        if not l.strip():
            break
        out.append(l)
    return out


def must(s, needle):
    if needle not in s:
        raise SystemExit(f"expected text not found: {needle!r}")
    return needle


# ------------------------------------------------------------------------------------------------ readings
def load_r1():
    syms, curves = [], {}
    with open(R1_CSV, newline="") as f:
        for r in csv.DictReader(f):
            s, how = r["series"], r["how"]
            x, y, ey = float(r["x"]), float(r["y"]), float(r["err_y"])
            if s.startswith("tri_"):
                m = re.match(r"tri_xc([0-9.]+)(?:_(upper|lower))?$", s)
                syms.append(dict(reader=1, id=s, station=float(m.group(1)), side=m.group(2) or "", x=x,
                                 ex=float(re.search(r"x err ([0-9.]+)", how).group(1)), y=y, ey=ey,
                                 identity="not stated", R="not stated", tag="", note=how,
                                 overlap="plain and flagged triangles overlap" in how, px=None, py=None))
            else:
                curves.setdefault(s, {})[round(x, 2)] = dict(reader=1, id=f"{s}@{x:g}", x=x, ex=None, y=y, ey=ey,
                                                              note=how)
    return syms, curves


def load_rn(n, path, tags):
    syms, keys, curves = [], [], {}
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            g = lambda k: float(r[k]) if r[k] not in ("", None) else None  # noqa: E731
            if r["data_or_key"] == "legend key":
                keys.append(dict(reader=n, id=r["id"], symbol=r["symbol"], R=r["reynolds"], px=g("px_x"),
                                 py=g("px_y"), note=r["notes"]))
                continue
            note = r["notes"]
            if r["id"].startswith("S"):
                ident = "flagged" if r["symbol"].startswith("flagged") else "open"
                syms.append(dict(reader=n, id=r["id"], station=round(g("x_c") * 5) / 5, side="", x=g("x_c"),
                                 ex=g("x_err"), y=g("y"), ey=g("y_err"), identity=ident, R=r["reynolds"],
                                 symbol=r["symbol"], tag=tags.get(r["id"], ""), note=note, how=r["how"],
                                 overlap=False, px=g("px_x"), py=g("px_y")))
            else:
                end = "right end" in (note + " " + r["how"]).lower()
                st = "end" if end else round(g("x_c") * 10) / 10
                curves.setdefault(r["series"], {})[st] = dict(reader=n, id=r["id"], x=g("x_c"), ex=g("x_err"),
                                                             y=g("y"), ey=g("y_err"), note=note, how=r["how"])
    return syms, keys, curves


def r3_tags(md):
    """Reading 3's own one-word flags: the last column of its method.md values table."""
    tags = {}
    for l in md.split("\n"):
        m = re.match(r"^\| (S\d\d) \|(.*)\|\s*$", l)
        if m:
            tags[m.group(1)] = m.group(2).split("|")[-1].strip()
    return tags


def cmp(a, b, use_x=True):
    if a is None or b is None:
        return None
    dx = a["x"] - b["x"] if use_x and a.get("ex") is not None and b.get("ex") is not None else None
    cx = a["ex"] + b["ex"] if dx is not None else None
    dy, cy = a["y"] - b["y"], a["ey"] + b["ey"]
    bad = []
    if dx is not None and abs(dx) > cx + 1e-12:
        bad.append("x/c")
    if abs(dy) > cy + 1e-12:
        bad.append("P_B")
    return dict(v="disagree" if bad else "agree", on=" and ".join(bad), dx=dx, cx=cx, dy=dy, cy=cy)


def pattern(res):
    """res: {(i, j): result or None}. Plain words for which readers agree."""
    have = {k: v for k, v in res.items() if v is not None}
    if not have:
        return "no pair"
    ag = [k for k, v in have.items() if v["v"] == "agree"]
    if len(have) == 3:
        if len(ag) == 3:
            return "all three agree"
        if len(ag) == 0:
            return "no two agree"
        if len(ag) == 1:
            i, j = ag[0]
            k = ({1, 2, 3} - {i, j}).pop()
            return f"readings {i} and {j} agree; reading {k} differs from both"
        ok = " and ".join(f"{i}-{j}" for i, j in ag)
        bad = [k for k in have if k not in ag][0]
        return f"pairs {ok} agree but {bad[0]}-{bad[1]} do not (no two against one)"
    if len(have) == 2:
        return "; ".join(f"{i}-{j} {v['v']}" for (i, j), v in have.items()) + " (the third pair not compared)"
    (i, j), v = next(iter(have.items()))
    return f"readings {i} and {j} {v['v']} (only two readings give a value)"


def f4(v):
    return "" if v is None else f"{v:+.4f}"


def vs(r):
    return "--" if r is None else (f"{r['v']} ({r['dy']:+.4f}/{r['cy']:.4f}"
                                   + (f"; x/c {r['dx']:+.4f}/{r['cx']:.4f}" if r["dx"] is not None else "") + ")")


# ------------------------------------------------------------------------------------------------ main
def main():
    md1, md2, md3 = text(R1_MD), text(R2_MD), text(R3_MD)
    s1, c1 = load_r1()
    s2, k2, c2 = load_rn(2, R2_CSV, {})
    s3, k3, c3 = load_rn(3, R3_CSV, r3_tags(md3))
    by = {(s["reader"], s["id"]): s for s in s1 + s2 + s3}
    ROWS = []
    L = []
    P = L.append

    # ---------------- symbols, slot by slot
    slots = []
    station_view = []
    for st in STATIONS:
        a = sorted([s for s in s1 if abs(s["station"] - st) < 1e-9], key=lambda s: s["y"])
        b = sorted([s for s in s2 if abs(s["station"] - st) < 1e-9], key=lambda s: s["py"])
        c = sorted([s for s in s3 if abs(s["station"] - st) < 1e-9], key=lambda s: s["py"])
        station_view.append((st, a, b, c))
        if len(b) != 2 or len(c) != 2 or len(a) not in (1, 2):
            raise SystemExit(f"unexpected counts at x/c {st}: {len(a)} {len(b)} {len(c)}")
        for i in (0, 1):
            ra = a[i] if len(a) == 2 else a[0]
            res = {(1, 2): cmp(ra, b[i]), (1, 3): cmp(ra, c[i]), (2, 3): cmp(b[i], c[i])}
            if len(a) == 2:
                basis1 = f"{ra['side']} of two, paired by vertical order"
            elif ra["overlap"]:
                basis1 = "one value for the overlapping plain and flagged triangles"
            else:
                basis1 = "one value at the station, no second symbol noted"
            slot = dict(st=st, pos="upper" if i == 0 else "lower", a=ra, b=b[i], c=c[i], res=res, basis1=basis1,
                        same_id=b[i]["identity"] == c[i]["identity"], pat=pattern(res))
            slots.append(slot)

    # ---------------- value-changing alternatives (quoted in section 7)
    r1 = {s["id"]: s for s in s1}
    S = lambda n, i: by[(n, i)]  # noqa: E731
    alt3 = text(R3_ALT)
    must(alt3, "x/c 0.8 single tall symbol only (apex 1502.0, base 1521.14)                      x/c 0.7984  P_B -0.1584")
    alts = []
    a2_08 = dict(id="R2-ALT-0.8-one", x=0.800, ex=S(2, "S04")["ex"], y=S(2, "S04")["y"], ey=S(2, "S04")["ey"])
    a3_08 = dict(id="R3-ALT-0.8-one", x=0.7984, ex=S(3, "S04")["ex"], y=-0.1584, ey=S(3, "S04")["ey"])
    alts.append(("x/c 0.8 as ONE flagged symbol (R 11.3e6), named by readings 2 and 3",
                 "reading 2: method.md call 1, 'one tall symbol at (538.0, 1516.0) px, x/c 0.800, P_B -0.158', "
                 "0.1 px from its S04 centre, so S04's value -0.1582 and errors are used (no error stated); reading "
                 "3: 22_alternatives.out 'single tall symbol only' x/c 0.7984, P_B -0.1584, its S04 errors used "
                 "(no error stated; its centre is 1.7 px from S04's)",
                 {(1, 2): cmp(r1["tri_xc0.8"], a2_08), (1, 3): cmp(r1["tri_xc0.8"], a3_08), (2, 3): cmp(a2_08, a3_08)},
                 (r1["tri_xc0.8"], a2_08, a3_08)))
    a2_09 = dict(id="R2-ALT-S09-template", x=S(2, "S09")["x"], ex=S(2, "S09")["ex"], y=-0.1676, ey=S(2, "S09")["ey"])
    alts.append(("S09 by reading 2's joint template fit (not adopted by reading 2)",
                 "reading 2: method.md call 5, 'joint template fit (1.9 px lower on the page, P_B about -0.1676)'; "
                 "S09's errors used",
                 {(1, 2): cmp(r1["tri_xc0.2"], a2_09), (1, 3): cmp(r1["tri_xc0.2"], S(3, "S09")),
                  (2, 3): cmp(a2_09, S(3, "S09"))},
                 (r1["tri_xc0.2"], a2_09, S(3, "S09"))))

    # ---------------- curves
    curve_rows = []
    for element, n1, n2, n3 in CURVES:
        d1, d2, d3 = c1.get(n1, {}), c2.get(n2, {}), c3.get(n3, {})
        keys = [k for k in CURVE_STATIONS + (0.95, 0.85) if k in d1 or k in d2 or k in d3]
        keys += sorted([k for k in d1 if isinstance(k, float) and k < 0], reverse=True)
        if "end" in d2 or "end" in d3:
            keys.append("end")
        keys = sorted(set(keys), key=lambda k: (-0.0115 if k == "end" else -k))
        for k in keys:
            a, b, c = d1.get(k), d2.get(k), d3.get(k)
            use_x = k == "end"
            res = {(1, 2): cmp(a, b, use_x), (1, 3): cmp(a, c, use_x), (2, 3): cmp(b, c, use_x)}
            pat = pattern(res)
            if pat == "no pair":
                pat = "reading " + " and ".join(str(n) for n, v in ((1, a), (2, b), (3, c)) if v) + " only"
            curve_rows.append(dict(element=element, st=k, a=a, b=b, c=c, res=res, pat=pat))
    c00 = c2[CURVES[0][2]][1.0]
    a2_c00 = dict(id="R2-ALT-C00-hidden", x=1.0, ex=None, y=-0.0636, ey=c00["ey"])
    alt_c00 = {(1, 2): cmp(c1[CURVES[0][1]][1.0], a2_c00, False), (1, 3): None,
               (2, 3): cmp(a2_c00, c3[CURVES[0][3]][1.0], False)}

    # ---------------- CSV
    cols = ["element", "station_xc", "slot", "pattern"]
    for n in (1, 2, 3):
        cols += [f"r{n}_id", f"r{n}_identity", f"r{n}_x", f"r{n}_x_err", f"r{n}_y", f"r{n}_y_err"]
    for i, j in PAIRS:
        cols += [f"v{i}{j}", f"dy{i}{j}", f"allowed_y{i}{j}", f"dx{i}{j}", f"allowed_x{i}{j}"]
    cols += ["r2_r3_dpx_x", "r2_r3_dpx_y", "r1_basis", "r1_note", "r2_note", "r3_note"]

    def row(element, st, slot, vals, res, pat, extra=None):
        d = dict(element=element, station_xc=st, slot=slot, pattern=pat)
        for n, v in zip((1, 2, 3), vals):
            if v:
                d.update({f"r{n}_id": v["id"], f"r{n}_identity": v.get("identity", ""), f"r{n}_x": f"{v['x']:.4f}",
                          f"r{n}_x_err": "" if v.get("ex") is None else f"{v['ex']:.4f}", f"r{n}_y": f"{v['y']:.4f}",
                          f"r{n}_y_err": f"{v['ey']:.4f}", f"r{n}_note": v.get("note", "")})
        for (i, j), r in res.items():
            if r:
                d.update({f"v{i}{j}": r["v"], f"dy{i}{j}": f4(r["dy"]), f"allowed_y{i}{j}": f"{r['cy']:.4f}",
                          f"dx{i}{j}": f4(r["dx"]), f"allowed_x{i}{j}": "" if r["cx"] is None else f"{r['cx']:.4f}"})
        d.update(extra or {})
        ROWS.append(d)

    for s in slots:
        b, c = s["b"], s["c"]
        row("symbol M 2.41", f"{s['st']:.1f}", s["pos"], (s["a"], b, c), s["res"], s["pat"],
            {"r2_r3_dpx_x": f"{b['px'] - c['px']:+.2f}", "r2_r3_dpx_y": f"{b['py'] - c['py']:+.2f}",
             "r1_basis": s["basis1"]})
    for name, src, res, vals in alts:
        row("symbol M 2.41, alternative", "0.8" if name.startswith("x/c 0.8") else "0.2", name, vals, res,
            pattern(res), {"r1_basis": src})
    for cr in curve_rows:
        st = "right end" if cr["st"] == "end" else f"{cr['st']:.2f}"
        row(cr["element"], st, "", (cr["a"], cr["b"], cr["c"]), cr["res"], cr["pat"])
    row("faired curve M 2.41, alternative", "1.00", "reading 2's hidden left end",
        (c1[CURVES[0][1]][1.0], a2_c00, c3[CURVES[0][3]][1.0]), alt_c00, pattern(alt_c00),
        {"r1_basis": "reading 2 method.md call 6: the curve 'may continue hidden in the frame line to S02's apex' "
                     "(P_B about -0.0636); C00's error used"})
    for kb, kc in zip(k2, k3):
        ROWS.append(dict(element="legend key (not data)", slot=f"{kb['symbol']} / {kc['symbol']}",
                         r2_id=kb["id"], r3_id=kc["id"], r2_note=kb["note"], r3_note=kc["note"],
                         r2_r3_dpx_x=f"{kb['px'] - kc['px']:+.2f}", r2_r3_dpx_y=f"{kb['py'] - kc['py']:+.2f}",
                         pattern="not paired (legend keys; reading 1 lists none)"))
    with open(OUT + "pairs_tn3819_fig32_three.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in ROWS:
            w.writerow({k: r.get(k, "") for k in cols})

    # ---------------- check against the two-way pairing (readings 1 and 2)
    two = list(csv.DictReader(open(TWO_WAY, newline="")))
    same = diff = 0
    for r in two:
        if r["element"] == "symbol M 2.41":
            s = next(x for x in slots if x["b"]["id"] == r["r2_id"])
            ok = s["res"][(1, 2)]["v"] == r["verdict"]
        elif r["element"] in [e[0] for e in CURVES] and r["verdict"] in ("agree", "disagree"):
            k = round(float(r["station_xc"]), 2)
            cr = next(x for x in curve_rows if x["element"] == r["element"] and x["st"] == k)
            ok = cr["res"][(1, 2)]["v"] == r["verdict"]
        else:
            continue
        same += ok
        diff += not ok

    # ------------------------------------------------------------------------------------------ pairing.txt
    P("Three-way pairing of the three blind readings of NACA TN 3819 fig. 32 (Love 1957, NTRS 19930084517, PDF p. 64),")
    P("2026-10-26, by a neutral party who made none of the readings and did not look at the figure, the page images or")
    P("any reader's overlays or renders; scratchpad/decisions.md was not opened. Used: the three CSV files, the three")
    P("method files, reading 3's 22_alternatives.out, and the two-way pairing of readings 1 and 2.")
    P("  reading 1: round 6 (2026-10-20), " + R1_CSV + ", method round6/readings/method_tn3819_figs32-35.md.")
    P("  reading 2: round 14 (2026-10-26), " + R2_CSV + ", method round14-fig32/method.md.")
    P("  reading 3: round 16 (2026-10-26), " + R3_CSV + ", method round16/method.md.")
    P("  two-way pairing of readings 1 and 2: pairing-2026-10-26-fig32/ (commit e15934c).")
    P("Rule: two values agree when |difference| <= the two readers' stated errors summed, on each axis both state.")
    P("Curves: P_B at the same station (the right end of the faired curve, not at a station, on both axes).")
    P("Every pair of readers is compared. Differences are 'first minus second' of the pair. Nothing is resolved toward")
    P("any reading, nothing averaged, no envelope formed; where two readings agree and the third differs it is said")
    P("so and not treated as settled. This pairing sets nothing: by 0014 section 10.7 (ad) and its narrowing of")
    P("2026-10-26, fig. 32 sets nothing until its readings are settled and its method is written in 0015.")
    P(f"Consistency: the reading 1 and 2 verdicts recomputed here equal the two-way pairing's in {same} of "
      f"{same + diff} values.")
    P("")

    P("=== 1. Source file and pixels")
    for n in (2, 3):
        d, c, p = HASHES[n]
        P(f"  {NAMES[n]}: download SHA-256 {d}; cut at the first %PDF- (byte 436) {c}; page 64 image {p}.")
    P("  Readings 2 and 3: all three hashes are the same (the cut PDF c0c3a964... matches). Both worked in the native")
    P("  pixels of that same page image (2258 x 3092 px, 300 ppi), so their pixel positions can be compared directly")
    P("  (section 4, last column).")
    P("  Reading 1 recorded no hash: its method notes name the same URL, 68 pages, PDF p. 64, scans at 300 ppi, rendered")
    P("  with pdftoppm at 600 dpi grey. Whether its file matches cannot be checked from the record. (The only earlier")
    P("  TN 3819 hash in the repository, round 7's for fig. 18, is the same download hash 9acd67dc...; it is not")
    P("  reading 1's record.)")
    P("")

    P("=== 2. Conventions, three readers")
    P("  x/c axis: all three have +1.0 at the left frame to -1.5 at the right, 26 lines 0.1 apart. AGREE.")
    P("  Sign of x/c: readings 2 and 3 both quote the symbol list (positive when the trailing edge is ahead of the base);")
    P("    reading 1 does not state it but reads against the same labels. NOT A DISAGREEMENT.")
    P("  P_B axis: all three have -0.40 at the top frame to +0.08 at the bottom (up is more negative). AGREE.")
    P("  P_B definition: readings 2 and 3 quote P_B = (p_B - p_inf)/q_inf; reading 1 does not state it. Values are")
    P("    negative in all three and the ref. 26 check values agree in every pair (section 5). AGREE.")
    P("  Scale per scan pixel: reading 1 0.0015653 x/c and 0.00031505 P_B (its cal.txt, 600 dpi px times 2); reading 2")
    P("    0.0015661 and 0.00031540; reading 3 63.85 px per 0.1 x/c (0.0015661) and 63.40 px per 0.02 P_B (0.00031546).")
    P("    AGREE (within 0.12%).")
    P("  Legend: all three: open (plain) triangle R = 2.8e6, flagged triangle R = 11.3e6. AGREE.")
    P("  Identity per symbol: readings 2 and 3 give one for each of their 12 symbols and give the SAME identity to every")
    P("    one (station by station, upper and lower); reading 1 gives none. Readings 2 and 3 both mark x/c 0.0 as")
    P("    uncertain with the swap as the alternative; reading 2 also marks x/c 1.0 lower (faint flag) and x/c 0.8.")
    P("  Triangle centre: all three use the point one third of the height above the base. AGREE.")
    P("  Error basis: reading 1 quadrature sum; readings 2 and 3 linear sums of components (reading 3's centring term")
    P("    is twice a Monte Carlo standard deviation). None states a confidence level. Summed as stated.")
    P("")

    P("=== 3. Per station: how many symbols each reader found, each one's identity and value (P_B; x/c)")
    for st, a, b, c in station_view:
        P(f"  x/c {st:.1f}")
        if len(a) == 2:
            cnt = "2 values"
        elif a[0]["overlap"]:
            cnt = "1 value, given for 'plain and flagged triangles overlap' (two symbols named, one value)"
        else:
            cnt = "1 value, no second symbol noted"
        P(f"    reading 1: {cnt}")
        for s in a:
            P(f"      {s['id']}: identity not stated, {s['y']:+.4f} +-{s['ey']:.4f} (x/c {s['x']:.4f} +-{s['ex']:.4f})")
        for n, lst in ((2, b), (3, c)):
            P(f"    reading {n}: {len(lst)} symbols")
            for i, s in enumerate(lst):
                tag = s["symbol"] if n == 2 else s["symbol"] + (f"; its flag column: '{s['tag']}'" if s["tag"] else "")
                if n == 2 and re.search(r"AMBIGUOUS|UNSURE", s["note"]):
                    tag += "; its notes: " + ", ".join(sorted(set(re.findall(r"AMBIGUOUS|UNSURE", s["note"]))))
                P(f"      {s['id']} {'upper' if i == 0 else 'lower'}: {s['identity']}, R {s['R']}, {s['y']:+.4f} "
                  f"+-{s['ey']:.4f} (x/c {s['x']:.4f} +-{s['ex']:.4f}) [{tag}]")
    P("  Symbols only one reader gives: none. Every symbol of reading 2 has a counterpart in reading 3 at the same")
    P("  station, in the same vertical order and with the same identity, and the other way round. Reading 1 gives")
    P("  separate values only at x/c 1.0; at the other five stations it gives one value where readings 2 and 3 give two.")
    P("")

    P("=== 4. Symbols, pair by pair (difference/allowed in P_B; then x/c)")
    P("  Columns: 1-2, 1-3, 2-3 verdicts; pattern; reading 2 minus reading 3 in page pixels (same page image).")
    for s in slots:
        a, b, c = s["a"], s["b"], s["c"]
        P(f"  x/c {s['st']:.1f} {s['pos']}: r1 {a['id']} {a['y']:+.4f}; r2 {b['id']} {b['identity']} {b['y']:+.4f}; "
          f"r3 {c['id']} {c['identity']} {c['y']:+.4f}; identities 2/3 {'same' if s['same_id'] else 'DIFFERENT'}")
        P(f"      1-2 {vs(s['res'][(1, 2)])}")
        P(f"      1-3 {vs(s['res'][(1, 3)])}")
        P(f"      2-3 {vs(s['res'][(2, 3)])}; pixels {b['px'] - c['px']:+.2f}, {b['py'] - c['py']:+.2f}")
        P(f"      {s['pat']}" + ("" if len([x for x in station_view if x[0] == s['st']][0][1]) == 2
                                  else f"  [reading 1: {s['basis1']}]"))
    P("  Legend keys (not data; reading 1 lists none), reading 2 minus reading 3 in page pixels: "
      + "; ".join(f"{kb['id']}/{kc['id']} {kb['px'] - kc['px']:+.2f}, {kb['py'] - kc['py']:+.2f}" for kb, kc in zip(k2, k3)))
    P("")

    P("=== 5. Faired curve and ref. 26 check curves (P_B at the station; difference/allowed)")
    for element, *_ in CURVES:
        P(f"  {element}")
        for cr in [x for x in curve_rows if x["element"] == element]:
            st = "right end" if cr["st"] == "end" else f"x/c {cr['st']:+.2f}"
            vals = []
            for n, v in ((1, cr["a"]), (2, cr["b"]), (3, cr["c"])):
                vals.append(f"r{n} --" if v is None else f"r{n} {v['y']:+.4f}" + (f" at {v['x']:.4f}" if cr["st"] == "end" else ""))
            ver = "; ".join(f"{i}-{j} {cr['res'][(i, j)]['v']} ({cr['res'][(i, j)]['dy']:+.4f}/{cr['res'][(i, j)]['cy']:.4f})"
                            for i, j in PAIRS if cr["res"][(i, j)])
            P(f"    {st:>12}: {', '.join(vals)}" + (f"; {ver}" if ver else "") + f"; {cr['pat']}")
    P("")

    # ---------------- disagreements and two-against-one
    P("=== 6. Every disagreement, and where two readings agree and the third differs (nothing settled)")
    k = 0
    for s in slots:
        for (i, j), r in s["res"].items():
            if r and r["v"] == "disagree":
                k += 1
                vi = {1: s["a"], 2: s["b"], 3: s["c"]}
                P(f"  D{k}. x/c {s['st']:.1f} {s['pos']} symbol ({s['b']['identity']} by readings 2 and 3), readings {i} "
                  f"and {j}: {vi[i]['y']:+.4f} +-{vi[i]['ey']:.4f} against {vi[j]['y']:+.4f} +-{vi[j]['ey']:.4f}, "
                  f"difference {r['dy']:+.4f}, allowed {r['cy']:.4f}, outside on {r['on']}"
                  + (f" [reading 1: {s['basis1']}]" if i == 1 else "") + ".")
    for name, src, res, vals in alts:
        for (i, j), r in res.items():
            if r and r["v"] == "disagree":
                k += 1
                P(f"  D{k}. Alternative '{name}', readings {i} and {j}: {vals[i - 1]['y']:+.4f} against "
                  f"{vals[j - 1]['y']:+.4f}, difference {r['dy']:+.4f}, allowed {r['cy']:.4f}.")
    for cr in curve_rows:
        for (i, j), r in cr["res"].items():
            if r and r["v"] == "disagree":
                k += 1
                vi = {1: cr["a"], 2: cr["b"], 3: cr["c"]}
                P(f"  D{k}. {cr['element']} at x/c {cr['st']}, readings {i} and {j}: {vi[i]['y']:+.4f} +-{vi[i]['ey']:.4f} "
                  f"against {vi[j]['y']:+.4f} +-{vi[j]['ey']:.4f}, difference {r['dy']:+.4f}, allowed {r['cy']:.4f}.")
    for (i, j), r in alt_c00.items():
        if r and r["v"] == "disagree":
            k += 1
            P(f"  D{k}. Reading 2's alternative left end (hidden in the frame line to S02's apex, about -0.0636), against "
              f"reading {i if i != 2 else j}: difference {r['dy']:+.4f}, allowed {r['cy']:.4f} (with C00's error).")
    k += 1
    P(f"  D{k}. Number of values: readings 2 and 3 give 12 symbols (two at every station); reading 1 gives 7 values,")
    P("       two at x/c 1.0 and one at each other station (at 0.4, 0.2 and 0.0 stated as both overlapping triangles;")
    P("       at 0.8 and 0.6 with no second symbol noted).")
    k += 1
    P(f"  D{k}. Identity per symbol: given by readings 2 and 3 (the same at all 12), not by reading 1.")
    P("")
    P("  Two readings agree and the third differs (stated as found, not settled):")
    for s in slots:
        if "differs from both" in s["pat"]:
            P(f"    x/c {s['st']:.1f} {s['pos']} ({s['b']['identity']}): {s['pat']}: r1 {s['a']['y']:+.4f}, r2 "
              f"{s['b']['y']:+.4f}, r3 {s['c']['y']:+.4f} [reading 1: {s['basis1']}]")
    for cr in curve_rows:
        if "differs from both" in cr["pat"]:
            P(f"    {cr['element']} x/c {cr['st']}: {cr['pat']}: r1 {cr['a']['y']:+.4f}, r2 {cr['b']['y']:+.4f}, "
              f"r3 {cr['c']['y']:+.4f}")
    for name, src, res, vals in alts:
        p = pattern(res)
        if "differs from both" in p:
            P(f"    alternative '{name}': {p}: r1 {vals[0]['y']:+.4f}, r2 {vals[1]['y']:+.4f}, r3 {vals[2]['y']:+.4f}")
    P("    count at x/c 0.8, 0.6, 0.4, 0.2, 0.0: readings 2 and 3 two symbols each; reading 1 one value (D above).")
    P("    identities: readings 2 and 3 the same at every symbol; reading 1 none.")
    others = [x["pat"] for x in slots + curve_rows if "differs from both" in x["pat"] and not x["pat"].startswith(
        "readings 2 and 3")] + [x["pat"] for x in slots + curve_rows if "no two" in x["pat"] or "do not" in x["pat"]]
    if others:
        raise SystemExit("other agreement patterns found; list them before using this text: " + "; ".join(others))
    P("  In no case do readings 1 and 2, or 1 and 3, agree against the third, and no symbol, curve or check value has")
    P("  all three readings apart. No pair of readings disagrees on any other symbol, curve value or check value.")
    P("")

    # ---------------- flags, verbatim
    P("=== 7. Every reader's flags and alternatives, verbatim (quoted lines start with '>')")

    def quote(title, lines):
        P(f"  {title}")
        for l in lines:
            P("    > " + l if l.strip() else "    >")

    quote("Reading 1, method notes, the fig. 32 section:", section(md1, "## Fig. 32"))
    P("  Reading 1, CSV 'how' of each symbol row:")
    for s in s1:
        P(f"    > {s['id']}: {s['note']}")
    P("  Reading 1, CSV 'how' of the faired curve at x/c 1 and 0:")
    for x in (1.0, 0.0):
        P(f"    > M2.41_9in_faired x/c {x:g}: {c1[CURVES[0][1]][x]['note']}")
    quote("Reading 2, method.md, overlaps:", section(md2, "### Overlaps and how each pair was read"))
    quote("Reading 2, method.md, faired curve:", section(md2, "## Faired curve"))
    quote("Reading 2, method.md, judgement calls and flags:", section(md2, "## Judgement calls and flags"))
    quote("Reading 2, method.md, confidence:", section(md2, "## Confidence"))
    quote("Reading 3, method.md, per station:", section(md3, "### Per station"))
    quote("Reading 3, method.md, faired curve left end:", paragraph(md3, "**Left end (x/c 1.0).**"))
    quote("Reading 3, method.md, faired curve right end:", paragraph(md3, "**Right end.**"))
    quote("Reading 3, method.md, every judgement call:", section(md3, "## 10. Every judgement call"))
    quote("Reading 3, scripts/22_alternatives.out (values of its named alternatives):", alt3.rstrip("\n").split("\n"))
    P("  The full CSV notes of every reader for every value are in pairs_tn3819_fig32_three.csv (r1_note, r2_note,")
    P("  r3_note), unedited.")
    P("")
    P("  Alternatives compared (values only; identities in the quotes above):")
    for name, src, res, vals in alts:
        P(f"    {name}: r1 {vals[0]['y']:+.4f}, r2 {vals[1]['y']:+.4f}, r3 {vals[2]['y']:+.4f}; "
          + "; ".join(f"{i}-{j} {vs(r)}" for (i, j), r in res.items()) + f"; {pattern(res)}")
        P(f"      ({src})")
    P(f"    reading 2's hidden left end (about -0.0636): 1-2 {vs(alt_c00[(1, 2)])}; 2-3 {vs(alt_c00[(2, 3)])}. Reading 3")
    P("      states the curve does not reach the lower symbol (rows 1803 to 1804 clean); reading 1 gives -0.0737.")
    P("    Identity-only alternatives (no value changes): x/c 0.0 swap (upper open, lower flagged), named by readings 2")
    P("      and 3; x/c 0.0 one symbol only (the lower, flagged), named by reading 2 only (reading 3: count high);")
    P("      x/c 1.0 lower symbol open, named by reading 2 only (reading 3: identities high, flag 7.9 px).")
    P("")

    P("=== 8. Values given by fewer than three readers")
    for element, *_ in CURVES:
        rows_ = [x for x in curve_rows if x["element"] == element]
        only1 = [f"{x['st']:+.2f}" for x in rows_ if x["a"] and not x["b"] and not x["c"]]
        two = [x for x in rows_ if sum(1 for v in (x["a"], x["b"], x["c"]) if v) == 2]
        if only1:
            P(f"  {element}, reading 1 only ({len(only1)}): x/c " + ", ".join(only1))
        for x in two:
            who = " and ".join(str(n) for n, v in ((1, x["a"]), (2, x["b"]), (3, x["c"])) if v)
            P(f"  {element}, {'right end' if x['st'] == 'end' else 'x/c ' + str(x['st'])}: readings {who} only")
    P("  legend keys: readings 2 and 3 (K01, K02 each); reading 1 lists none.")
    P("")
    P("Files: pairs_tn3819_fig32_three.csv (one row per symbol slot, alternative, curve station or legend key, with all")
    P("three readers' values, the three pairwise verdicts and every reader's own notes), this file.")

    with open(OUT + "pairing.txt", "w") as f:
        f.write("\n".join(L) + "\n")
    print("\n".join(L))


if __name__ == "__main__":
    main()
