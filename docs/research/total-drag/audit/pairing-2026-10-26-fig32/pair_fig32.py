"""Neutral pairing of two blind readings of NACA TN 3819 fig. 32 (Love, 1957; NTRS 19930084517, PDF p. 64): the
Langley 9-inch Mach 2.41 triangles (open R = 2.8e6, flagged R = 11.3e6), the faired curve through them, and the two
ref. 26 measured curves as a calibration check.

Usage (from the repository root):
  python3 -I docs/research/total-drag/audit/pairing-2026-10-26-fig32/pair_fig32.py

Reads only committed files on this branch:
  reading 1 (round 6, blind, 2026-10-20): docs/research/total-drag/audit/round6/readings/tn3819_fig32.csv
    (added in 1b57563; its symbol rows re-read by reading 1 itself in 66ad83e; blob ec8f87b, the same on main),
    with its method notes method_tn3819_figs32-35.md beside it and ../scripts/specs/tn3819_fig32.json.
  reading 2 (round 14, blind, 2026-10-26): docs/research/total-drag/audit/round14-fig32/readings/tn3819_fig32.csv,
    with method.md there.
Writes, next to this script: pairs_tn3819_fig32.csv (one row per comparison or one-reading value) and pairing.txt.

Rule. A value agrees when, on each axis both readers state an error for, |reading 1 - reading 2| <= e1 + e2, each
reader's stated reading error summed (reading 1 adds its terms in quadrature, reading 2 linearly; neither states a
confidence level; both are taken as stated). Curves are compared in P_B at the same station only (both read at the
gridline; reading 1 states no x error for a curve value). Symbols are compared on both axes.

Matching. Symbols by station (x/c 1.0, 0.8, ..., 0.0) and by Reynolds number where a reading states one: reading 2
states one for every symbol, reading 1 for none, so where both readers give two values at a station they are paired by
vertical order (upper with upper), and where reading 1 gives one value at a station it is compared with each of
reading 2's symbols there (reading 1 says its one value stands for the overlapping plain and flagged triangles at x/c
0.4, 0.2 and 0.0; at 0.8 and 0.6 it says nothing of a second symbol). Curves by station.

Nothing is resolved toward either reading, nothing is averaged, no band or envelope is formed here. The pairing sets
nothing; 0014 section 10.7 (ad) says the method that uses fig. 32 is written in 0015 after the pairing.
"""
import csv
import json
import os
import re

ROOT = "docs/research/total-drag/audit/"
R1_CSV = ROOT + "round6/readings/tn3819_fig32.csv"
R1_CAL = ROOT + "round6/readings/tn3819_fig32_cal.txt"
R2_CSV = ROOT + "round14-fig32/readings/tn3819_fig32.csv"
OUT = ROOT + "pairing-2026-10-26-fig32/"
STATIONS = (1.0, 0.8, 0.6, 0.4, 0.2, 0.0)
# Reading 2's global-plane scale per scan pixel (method.md, "Calibration").
R2_SCALE = (0.0015661, 0.00031540)

# Reading 2's flags on its symbols, in short (its method.md "Judgement calls and flags" and the CSV notes; F1 to F5 in
# pairing.txt give both readers' alternatives in full).
R2_FLAGS = {
    "S01": "drawn about 2 px right of the frame line, entered as printed at x/c 0.997 (F4)",
    "S02": "flag faint, read as flagged R 11.3e6; alternative open R 2.8e6 (F3)",
    "S03": "x/c 0.8 one or two symbols, low confidence; base hidden; alternative: one flagged symbol at S04's centre (F1)",
    "S04": "x/c 0.8 one or two symbols, low confidence; R 2.8e6 rests only on S03 carrying the flag; alternative: "
           "the whole cluster one flagged symbol here (F1)",
    "S09": "vertex reading adopted; joint template fit about -0.1676 not adopted (F5)",
    "S11": "x/c 0.0, which symbol carries the flag, low confidence; alternatives: (a) flag on S12, S11 open; "
           "(b) S11 not a symbol (F2)",
    "S12": "x/c 0.0, which symbol carries the flag, low confidence; alternatives: (a) S12 flagged; (b) S12 the "
           "only symbol, flagged (F2)",
}

CURVES = (  # (element, reading 1 series, reading 2 series)
    ("faired curve M 2.41", "M2.41_9in_faired", "L9_M241_faired"),
    ("ref. 26 M 1.50 (check)", "M1.50_ref26_measured", "ref26_M150_check"),
    ("ref. 26 M 2.00 (check)", "M2.00_ref26_measured", "ref26_M200_check"),
)


def f4(v):
    return "" if v is None else f"{v:+.4f}"


def read_r1():
    syms, curves = [], {}
    with open(R1_CSV, newline="") as f:
        for r in csv.DictReader(f):
            s, how = r["series"], r["how"]
            x, y, ey = float(r["x"]), float(r["y"]), float(r["err_y"])
            if s.startswith("tri_"):
                m = re.match(r"tri_xc([0-9.]+)(?:_(upper|lower))?$", s)
                ex = float(re.search(r"x err ([0-9.]+)", how).group(1))
                syms.append(dict(id=s, station=float(m.group(1)), side=m.group(2) or "", x=x, ex=ex, y=y, ey=ey,
                                 overlap="plain and flagged triangles overlap" in how, how=how))
            else:
                curves.setdefault(s, []).append(dict(id=f"{s}@{x:g}", x=x, ex=None, y=y, ey=ey, how=how))
    return syms, curves


def read_r2():
    with open(R2_CSV, newline="") as f:
        rows = list(csv.DictReader(f))
    out = []
    for r in rows:
        d = dict(r)
        for k in ("x_c", "x_err", "y", "y_err", "px_x", "px_y"):
            d[k] = float(r[k]) if r[k] not in ("", None) else None
        out.append(d)
    return out


def verdict(dx, cx, dy, cy):
    bad = []
    if dx is not None and cx is not None and abs(dx) > cx + 1e-12:
        bad.append("x/c")
    if abs(dy) > cy + 1e-12:
        bad.append("P_B")
    return ("disagree" if bad else "agree"), " and ".join(bad)


ROWS = []
COLS = ["element", "station_xc", "reynolds_reading2", "verdict", "outside_on", "r1_id", "r1_x", "r1_x_err", "r1_y",
        "r1_y_err", "r1_basis", "r2_id", "r2_symbol", "r2_x", "r2_x_err", "r2_y", "r2_y_err", "dx_r1_minus_r2",
        "dy_r1_minus_r2", "allowed_x", "allowed_y", "flags"]


def add(element, station, a, b, basis="", reynolds="", flags="", r2_symbol=""):
    """a: reading 1 value or None; b: reading 2 value or None (dicts with id, x, ex, y, ey)."""
    row = dict(element=element, station_xc=f"{station:.2f}" if station is not None else "",
               reynolds_reading2=reynolds, r1_basis=basis, flags=flags, r2_symbol=r2_symbol)
    if a:
        row.update(r1_id=a["id"], r1_x=f"{a['x']:.4f}", r1_x_err="" if a["ex"] is None else f"{a['ex']:.4f}",
                   r1_y=f"{a['y']:.4f}", r1_y_err=f"{a['ey']:.4f}")
    if b:
        row.update(r2_id=b["id"], r2_x=f"{b['x']:.4f}", r2_x_err="" if b["ex"] is None else f"{b['ex']:.4f}",
                   r2_y=f"{b['y']:.4f}", r2_y_err=f"{b['ey']:.4f}")
    res = None
    if a and b:
        compare_x = a["ex"] is not None and b["ex"] is not None
        dx = a["x"] - b["x"] if compare_x else None
        cx = a["ex"] + b["ex"] if compare_x else None
        dy, cy = a["y"] - b["y"], a["ey"] + b["ey"]
        v, on = verdict(dx, cx, dy, cy)
        row.update(verdict=v, outside_on=on, dx_r1_minus_r2=f4(dx), dy_r1_minus_r2=f4(dy),
                   allowed_x="" if cx is None else f"{cx:.4f}", allowed_y=f"{cy:.4f}")
        res = dict(v=v, on=on, dx=dx, cx=cx, dy=dy, cy=cy)
    else:
        row.update(verdict="reading 1 only" if a else ("reading 2 only" if b else ""))
    ROWS.append(row)
    return res


def b2(r):
    return dict(id=r["id"], x=r["x_c"], ex=r["x_err"], y=r["y"], ey=r["y_err"])


def main():
    r1_syms, r1_curves = read_r1()
    r2 = read_r2()
    r2_by_id = {r["id"]: r for r in r2}
    r2_syms = [r for r in r2 if r["data_or_key"] == "data" and r["id"].startswith("S")]
    r2_keys = [r for r in r2 if r["data_or_key"] == "legend key"]
    L = []
    P = L.append

    # ---------------------------------------------------------------- symbols
    sym_res = {}  # r2 id -> result
    station_lines = []
    for st in STATIONS:
        a_list = sorted([s for s in r1_syms if abs(s["station"] - st) < 1e-9], key=lambda s: s["y"])
        b_list = sorted([s for s in r2_syms if abs(round(s["x_c"] * 5) / 5 - st) < 1e-9], key=lambda s: s["px_y"])
        station_lines.append((st, a_list, b_list))
        if len(a_list) == len(b_list):
            pairs = list(zip(a_list, b_list))
            basis = {a["id"]: f"{a['side']} of two at the station, paired by vertical order; Reynolds number not stated"
                     for a in a_list}
        elif len(a_list) == 1:
            a = a_list[0]
            pairs = [(a, b) for b in b_list]
            if a["overlap"]:
                basis = {a["id"]: "one value for the overlapping plain and flagged triangles (reading 1's words); "
                                  "Reynolds number not stated; compared with each of reading 2's symbols"}
            else:
                basis = {a["id"]: "one value at the station, no overlap or second symbol noted; Reynolds number not "
                                  "stated; compared with each of reading 2's symbols"}
        else:
            raise SystemExit(f"unexpected counts at x/c {st}")
        for a, b in pairs:
            flags = []
            if b["id"] in R2_FLAGS:
                flags.append("reading 2: " + R2_FLAGS[b["id"]])
            elif "UNSURE" in b["notes"] or "AMBIGUOUS" in b["notes"] or "unsure" in b["symbol"]:
                raise SystemExit(f"{b['id']}: reading 2 flags it but no flag text is set here")
            if a["overlap"]:
                flags.append("reading 1: plain and flagged triangles overlap, extra error")
            res = add("symbol M 2.41", st, dict(id=a["id"], x=a["x"], ex=a["ex"], y=a["y"], ey=a["ey"]), b2(b),
                      basis=basis[a["id"]], reynolds=b["reynolds"], flags="; ".join(flags), r2_symbol=b["symbol"])
            sym_res[b["id"]] = (a, b, res)

    # reading 2's alternatives that change a value (from its method.md "Judgement calls" and CSV notes)
    s04, s09, s12, c00 = (r2_by_id[k] for k in ("S04", "S09", "S12", "C00"))
    r1_by = {s["id"]: s for s in r1_syms}
    a08, a02, a00 = r1_by["tri_xc0.8"], r1_by["tri_xc0.2"], r1_by["tri_xc0.0"]
    alt = []

    def a1(s):
        return dict(id=s["id"], x=s["x"], ex=s["ex"], y=s["y"], ey=s["ey"])

    alt.append(("x/c 0.8 as ONE symbol (flagged, R 11.3e6)", 0.8, a1(a08),
                dict(id="ALT-0.8-one", x=0.800, ex=s04["x_err"], y=s04["y"], ey=s04["y_err"]),
                "reading 2 method.md call 1: one tall symbol centred (538.0, 1516.0) px, x/c 0.800, P_B -0.158; that "
                "centre is 0.1 px from S04's (538.00, 1515.90), so S04's value (-0.1582) and errors are used; "
                "reading 2 states no separate error for it"))
    alt.append(("x/c 0.0 as ONE symbol (S12, flagged, R 11.3e6)", 0.0, a1(a00), b2(s12),
                "reading 2 method.md call 2(b): only S12 is a symbol and carries the flag; value is S12's"))
    alt.append(("S09 by the joint template fit", 0.2, a1(a02),
                dict(id="ALT-S09-template", x=s09["x_c"], ex=s09["x_err"], y=-0.1676, ey=s09["y_err"]),
                "reading 2 method.md call 5: template fit 1.9 px lower on the page, P_B about -0.1676 (not adopted "
                "by reading 2: pulled by the faired curve); S09's errors used"))
    alt_res = []
    for name, st, a, b, src in alt:
        res = add("symbol M 2.41, reading 2 alternative", st, a, b,
                  basis="as in the symbol rows", reynolds="11.3e6", flags=f"{name}: {src}")
        alt_res.append((name, st, a, b, res, src))

    # ---------------------------------------------------------------- curves
    curve_res = {}
    for element, s1, s2 in CURVES:
        a_pts = {round(p["x"], 3): p for p in r1_curves.get(s1, [])}
        b_pts = {}
        for r in r2:
            if r["series"] == s2:
                b_pts[round(r["x_c"], 4)] = dict(id=r["id"], x=r["x_c"], ex=None, y=r["y"], ey=r["y_err"],
                                                 notes=r["notes"], how=r["how"])
        xs = sorted(set(a_pts) | set(b_pts), reverse=True)
        out = []
        for x in xs:
            a, b = a_pts.get(x), b_pts.get(x)
            flags = ""
            if b and element.startswith("faired"):
                n = b["notes"]
                if "Bridged" in n or "bridged" in n:
                    flags = "reading 2: bridged across the symbols"
                if "carried" in n or "ENDS" in n:
                    flags = "reading 2: curve ends 7 px short; value carried to the station, not ink"
                if b["id"] == "C00":
                    flags = "reading 2: left end where the ink leaves the frame line; alternative to S02's apex"
                if b["id"] == "C11":
                    flags = "reading 2: right end of the curve (last ink), not at a station"
            if a and "extra" in a["how"]:
                flags = (flags + "; " if flags else "") + "reading 1: " + a["how"]
            res = add(element, x if a else None, a, b, basis=(a["how"] if a else ""), flags=flags)
            out.append((x, a, b, res))
        curve_res[element] = out

    c00_alt = add("faired curve M 2.41, reading 2 alternative", 1.0,
                  next(p for p in r1_curves["M2.41_9in_faired"] if abs(p["x"] - 1.0) < 1e-9),
                  dict(id="ALT-C00-hidden", x=1.0, ex=None, y=-0.0636, ey=c00["y_err"]),
                  flags="reading 2 method.md call 6 and C00 notes: the curve may continue hidden in the frame line "
                        "to S02's apex, P_B about -0.0636; C00's error used (none stated for the alternative)")

    for k in r2_keys:
        add("legend key (not data)", None, None, dict(id=k["id"], x=0.0, ex=None, y=0.0, ey=0.0),
            reynolds=k["reynolds"], r2_symbol=k["symbol"], flags="reading 2's legend key; reading 1 lists none")
        ROWS[-1].update(r2_x="", r2_y="", r2_y_err="", verdict="not paired (legend key)")

    with open(OUT + "pairs_tn3819_fig32.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        for r in ROWS:
            w.writerow({c: r.get(c, "") for c in COLS})

    # ---------------------------------------------------------------- text
    cal1 = json.load(open(R1_CAL))
    sx1, sy1 = 2 * cal1["x_per_px"], 2 * cal1["y_per_px"]
    chk = [r for e in CURVES[1:] for r in curve_res[e[0]] if r[3]]
    chk_max = max(abs(r[3]["dy"]) for r in chk)
    chk_ratio = max(abs(r[3]["dy"]) / r[3]["cy"] for r in chk)

    P("Pairing of two blind readings of NACA TN 3819 fig. 32 (Love 1957, NTRS 19930084517, PDF p. 64), 2026-10-26.")
    P("By a neutral party who made neither reading and did not look at the figure, the page images or either reader's")
    P("overlays: only the two CSV files, the two readers' method notes and reading 1's spec and calibration files were")
    P("used. scratchpad/decisions.md was not opened.")
    P("  reading 1: round 6, " + R1_CSV + " (blob ec8f87b, same on main; symbol rows")
    P("    re-read by reading 1 itself in 66ad83e), method notes round6/readings/method_tn3819_figs32-35.md, spec")
    P("    round6/scripts/specs/tn3819_fig32.json, calibration round6/readings/tn3819_fig32_cal.txt.")
    P("  reading 2: round 14, " + R2_CSV + ", method round14-fig32/method.md.")
    P("Registration: 0014 section 10.7 (ad) names the Mach 2.41 symbols for the position members at Mach 2.0 to 3.0;")
    P("the method that uses them is written in 0015 after this pairing. This pairing sets nothing.")
    P("Rule: agree when |reading 1 - reading 2| <= e1 + e2 on each axis both readers state (stated reading errors summed;")
    P("reading 1 adds its terms in quadrature, reading 2 linearly; neither states a confidence level). Curves: P_B only,")
    P("at the same station. Nothing is resolved toward either reading, nothing averaged, no envelope formed.")
    P("Sign of differences: reading 1 minus reading 2.")
    P("")

    P("=== 1. Conventions (checked first)")
    P("  1. x/c axis direction. Reading 1: +1.0 at the left frame to -1.5 at the right, 26 lines 0.1 apart (method notes;")
    P("     spec xvals listed left to right). Reading 2: the same, 26 lines, +1.0 the left frame, -1.5 the unlabelled")
    P("     right frame, every label checked against its line. AGREE.")
    P("  2. Meaning of the sign of x/c. Reading 2: positive when the fin trailing edge is ahead of the base (symbol list,")
    P("     PDF p. 6; text PDF pp. 22 and 23); 'shifted to right' means toward negative x/c. Reading 1 does not state what")
    P("     the sign means; it reads against the same printed labels, so its values carry the same sign, and nothing in")
    P("     it says otherwise. NOT A DISAGREEMENT; the meaning is stated by reading 2 only.")
    P("  3. P_B axis direction. Reading 1: -0.40 at the top frame to +0.08 at the bottom, 25 lines 0.02 apart (spec yvals")
    P("     listed top to bottom). Reading 2: -0.40 at the top to +0.08 at the bottom, up is more negative, every label")
    P("     checked. AGREE.")
    P("  4. P_B sign. Both give every triangle and every faired-curve value as negative P_B (-0.06 to -0.17), and the")
    P(f"     {len(chk)} common ref. 26 check values agree within the summed errors (largest |difference| {chk_max:.4f},")
    P(f"     at most {chk_ratio:.2f} of the allowed), which a flipped or shifted axis in either reading would not give.")
    P("     Reading 2 quotes P_B = (p_B - p_inf)/q_inf from the symbol list; reading 1 does not state the definition.")
    P("     AGREE.")
    P(f"  5. Scale per scan pixel (300 ppi). Reading 1: {sx1:.7f} x/c, {sy1:.8f} P_B (its cal.txt, per 600 dpi render")
    P(f"     px, times 2). Reading 2: {R2_SCALE[0]:.7f} x/c, {R2_SCALE[1]:.8f} P_B (global plane). Apart by "
      f"{abs(sx1 / R2_SCALE[0] - 1) * 100:.2f}% and {abs(sy1 / R2_SCALE[1] - 1) * 100:.2f}%. AGREE.")
    P("  6. Which symbol is which Reynolds number, in the legend. Reading 1: plain triangle R = 2.8e6, flagged triangle")
    P("     R = 11.3e6. Reading 2: open triangle R = 2.8e6 (key K01), flagged R = 11.3e6 (key K02, a short stroke up and")
    P("     right from the apex). AGREE.")
    P("  7. Which symbol is which Reynolds number, symbol by symbol. Reading 2 gives one for each of its 12 symbols")
    P("     (with stated doubt at x/c 1.0 lower, 0.8 and 0.0). Reading 1 gives none: its CSV has no Reynolds number or")
    P("     flag on any row, and its method says the plain and flagged triangles 'overlap at most stations and are read")
    P("     as one symbol each where they do'. NOT A DISAGREEMENT BUT A GAP, the main one this pairing finds:")
    P("     no value can be paired by Reynolds number; every per-Reynolds-number value below rests on reading 2's")
    P("     assignment alone, and reading 1's value is the same number on both sides wherever it gives one value.")
    P("  8. Triangle centre. Both take the point one third of the height above the base. AGREE.")
    P("  9. What the symbols are. Both: Langley 9-in. tunnel, Mach 2.41, plain and flagged triangles. AGREE.")
    P(" 10. Which curves are ref. 26's. Both: the Mach 1.50 and 2.00 long-short dashed 'measured P_B' curves, by their")
    P("     labels on the plot. Neither read the calculated curves (circles, squares, Prandtl-Meyer). AGREE.")
    P(" 11. Faired curve. Both: the solid curve through the triangles, read over x/c 0 to 1. AGREE (ends differ, below).")
    P("")

    # counts
    n1_sym = len(r1_syms)
    n1_cur = {e: len(r1_curves.get(s1, [])) for e, s1, _ in CURVES}
    n2_cur = {e: sum(1 for r in r2 if r["series"] == s2) for e, _, s2 in CURVES}
    sym_v = [v[2]["v"] for v in sym_res.values()]
    P("=== 2. Counts")
    P(f"  reading 1: {n1_sym} symbol values at 6 stations, " + ", ".join(f"{e} {n1_cur[e]}" for e in n1_cur)
      + f"; {n1_sym + sum(n1_cur.values())} rows.")
    P(f"  reading 2: {len(r2_syms)} symbols (10 under its own one-symbol alternatives at x/c 0.8 and 0.0), "
      f"{len(r2_keys)} legend keys (not data), " + ", ".join(f"{e} {n2_cur[e]}" for e in n2_cur)
      + f"; {len(r2)} rows.")
    P("  symbols per station (reading 1 / reading 2):")
    for st, a_list, b_list in station_lines:
        note = ""
        if len(a_list) == 1 and a_list[0]["overlap"]:
            note = "  reading 1's one value is stated as both overlapping triangles"
        elif len(a_list) == 1:
            note = "  reading 1 notes no overlap or second symbol"
        P(f"    x/c {st:.1f}: {len(a_list)} / {len(b_list)}{note}")
    P(f"  symbol comparisons (each of reading 2's {len(r2_syms)} symbols against reading 1's value at its station): "
      f"{len(sym_v)}; agree {sym_v.count('agree')}; disagree {sym_v.count('disagree')}")
    P(f"  reading 2's value-changing alternatives compared: {len(alt_res) + 1}; agree "
      f"{sum(1 for x in alt_res if x[4]['v'] == 'agree') + (c00_alt['v'] == 'agree')}; disagree "
      f"{sum(1 for x in alt_res if x[4]['v'] == 'disagree') + (c00_alt['v'] == 'disagree')}")
    for e, _, _ in CURVES:
        rs = curve_res[e]
        both = [r for r in rs if r[3]]
        P(f"  {e}: paired {len(both)}; agree {sum(1 for r in both if r[3]['v'] == 'agree')}; disagree "
          f"{sum(1 for r in both if r[3]['v'] == 'disagree')}; reading 1 only {sum(1 for r in rs if r[1] and not r[2])}; "
          f"reading 2 only {sum(1 for r in rs if r[2] and not r[1])}")
    P("")

    P("=== 3. Symbols, station by station (P_B; x/c in brackets; errors as stated)")
    for st, a_list, b_list in station_lines:
        P(f"  x/c {st:.1f}")
        for a in a_list:
            P(f"    reading 1 {a['id']}: {a['y']:+.4f} +-{a['ey']:.4f} (x/c {a['x']:.4f} +-{a['ex']:.4f}); "
              f"Reynolds number not stated; {a['how']}")
        for b in b_list:
            a, _, res = sym_res[b["id"]]
            P(f"    reading 2 {b['id']} {b['symbol']}, R {b['reynolds']}: {b['y']:+.4f} +-{b['y_err']:.4f} "
              f"(x/c {b['x_c']:.4f} +-{b['x_err']:.4f})")
            P(f"      against reading 1 {a['id']}: dP_B {res['dy']:+.4f} (allowed {res['cy']:.4f}), dx/c {res['dx']:+.4f} "
              f"(allowed {res['cx']:.4f}): {res['v'].upper()}" + (f" on {res['on']}" if res["on"] else ""))
    P("")

    P("=== 4. Faired curve and ref. 26 check curves (P_B at the station)")
    for e, _, _ in CURVES:
        P(f"  {e}")
        for x, a, b, res in curve_res[e]:
            s1 = f"r1 {a['y']:+.4f} +-{a['ey']:.4f}" if a else "r1 --"
            s2 = f"r2 {b['id']} {b['y']:+.4f} +-{b['ey']:.4f}" if b else "r2 --"
            v = (f"d {res['dy']:+.4f} (allowed {res['cy']:.4f}) {res['v'].upper()}" if res
                 else ("reading 1 only" if a else "reading 2 only"))
            if b and not a:
                s2 += f" at x/c {b['x']:.4f}"
            P(f"    x/c {x:+.3f}: {s1:<20} {s2:<26} {v}")
    P("")

    # every disagreement
    P("=== 5. Every disagreement (unresolved; no winner picked, nothing averaged)")
    k = 0
    for bid, (a, b, res) in sym_res.items():
        if res["v"] == "disagree":
            k += 1
            P(f"  D{k}. Symbol {bid} (x/c {round(b['x_c'] * 5) / 5:.1f}, {b['symbol']}, R {b['reynolds']} by reading 2): "
              f"reading 1 {a['id']} {a['y']:+.4f} +-{a['ey']:.4f}, reading 2 {b['y']:+.4f} +-{b['y_err']:.4f}; "
              f"difference {res['dy']:+.4f}, allowed {res['cy']:.4f}, outside on {res['on']}.")
    for name, st, a, b, res, src in alt_res:
        if res["v"] == "disagree":
            k += 1
            P(f"  D{k}. Reading 2's alternative '{name}': reading 1 {a['id']} {a['y']:+.4f} +-{a['ey']:.4f}, "
              f"alternative {b['y']:+.4f} +-{b['ey']:.4f}; difference {res['dy']:+.4f}, allowed {res['cy']:.4f}.")
    for e, _, _ in CURVES:
        for x, a, b, res in curve_res[e]:
            if res and res["v"] == "disagree":
                k += 1
                P(f"  D{k}. {e} at x/c {x:.1f}: reading 1 {a['y']:+.4f} +-{a['ey']:.4f}, reading 2 {b['id']} "
                  f"{b['y']:+.4f} +-{b['ey']:.4f}; difference {res['dy']:+.4f}, allowed {res['cy']:.4f}.")
    if c00_alt["v"] == "disagree":
        k += 1
        P(f"  D{k}. Faired curve left end, reading 2's alternative (hidden in the frame line to S02's apex, about "
          f"-0.0636): reading 1 -0.0737; difference {c00_alt['dy']:+.4f}, allowed {c00_alt['cy']:.4f} (with C00's "
          f"error; reading 2 states none for the alternative).")
    k += 1
    one_no = [(st, b_list) for st, a_list, b_list in station_lines if len(a_list) == 1 and not a_list[0]["overlap"]]
    one_ov = [(st, b_list) for st, a_list, b_list in station_lines if len(a_list) == 1 and a_list[0]["overlap"]]

    def sep(b_list):
        return f"{abs(b_list[1]['px_y'] - b_list[0]['px_y']):.1f} px"

    P(f"  D{k}. Number of symbols. Reading 1: {n1_sym} values at 6 stations; reading 2: {len(r2_syms)} symbols (10 under")
    P("       its alternatives). Where reading 1 gives one value and notes no second symbol: "
      + " and ".join(f"x/c {st:.1f}" for st, _ in one_no) + "; reading 2 resolves two there ("
      + " and ".join(sep(b) for _, b in one_no) + " apart in page y).")
    P("       Where reading 1 states one value for the overlapping pair: " + ", ".join(f"x/c {st:.1f}" for st, _ in one_ov)
      + "; reading 2 resolves two there (" + ", ".join(sep(b) for _, b in one_ov) + " apart in page y).")
    k += 1
    P(f"  D{k}. Reynolds number per symbol: stated by reading 2 only (conventions item 7). Not a numeric disagreement;")
    P("       listed so that no per-Reynolds-number value is taken as read twice.")
    P("  Stated as fact only, no conclusion drawn: where reading 1 gives one value and reading 2 two symbols, the")
    P("  symbols reading 1's value agrees with:")
    for st, a_list, b_list in station_lines:
        if len(a_list) == 1 and len(b_list) == 2:
            ok = [f"{b['id']} ({'upper' if i == 0 else 'lower'}, {b['symbol']})" for i, b in enumerate(b_list)
                  if sym_res[b["id"]][2]["v"] == "agree"]
            P(f"    x/c {st:.1f}: " + (" and ".join(ok) if ok else "neither"))
    P("")

    P("=== 6. Every flagged or ambiguous point, with both readers' alternatives (all unresolved)")
    s = {i: r2_by_id[i] for i in r2_by_id}
    r = {i: sym_res[i][2] for i in sym_res}
    P("  F1. x/c 0.8, one or two symbols.")
    P(f"      Reading 2: two overlapping outlines, S03 upper, clear flag, R 11.3e6, {s['S03']['y']:+.4f} +-"
      f"{s['S03']['y_err']:.4f} (base hidden), and S04 lower, no flag seen, R 2.8e6 resting only on S03 carrying the")
    P(f"      flag, {s['S04']['y']:+.4f} +-{s['S04']['y_err']:.4f}; low confidence. Alternative: ONE tall symbol at (538.0,"
      f" 1516.0) px, x/c 0.800, P_B -0.158, flagged (R 11.3e6).")
    P(f"      Reading 1: one value, {a08['y']:+.4f} +-{a08['ey']:.4f} (x/c {a08['x']:.4f}; {a08['how']}); no Reynolds "
      "number, no overlap noted.")
    P(f"      Pairing: with S03 {r['S03']['v']} ({r['S03']['dy']:+.4f}, allowed {r['S03']['cy']:.4f}); with S04 "
      f"{r['S04']['v']} ({r['S04']['dy']:+.4f}, allowed {r['S04']['cy']:.4f}); with the one-symbol alternative "
      f"{alt_res[0][4]['v']} ({alt_res[0][4]['dy']:+.4f}, allowed {alt_res[0][4]['cy']:.4f}, with S04's error).")
    P("  F2. x/c 0.0, which symbol carries the flag (and one or two symbols).")
    P(f"      Reading 2: S11 upper, middle of its base not visible, flagged R 11.3e6, {s['S11']['y']:+.4f} +-"
      f"{s['S11']['y_err']:.4f}; S12 lower, full outline, open R 2.8e6, {s['S12']['y']:+.4f} +-{s['S12']['y_err']:.4f};")
    P("      low confidence. Alternatives: (a) the flag is S12's and S11 is open (the flag line meets the axis between")
    P("      the two apexes); (b) only S12 is a symbol, and it carries the flag.")
    P(f"      Reading 1: one value for the overlapping plain and flagged triangles, {a00['y']:+.4f} +-{a00['ey']:.4f} "
      f"(x/c {a00['x']:.4f}; {a00['how']}); no Reynolds number.")
    P(f"      Pairing: with S11 {r['S11']['v']} ({r['S11']['dy']:+.4f}, allowed {r['S11']['cy']:.4f}); with S12 "
      f"{r['S12']['v']} ({r['S12']['dy']:+.4f}, allowed {r['S12']['cy']:.4f}); so in every one of reading 2's")
    P("      alternatives the values agree; which Reynolds number goes with which value is reading 2's alone, in doubt.")
    P("  F3. x/c 1.0 lower symbol (S02), flag faint.")
    P(f"      Reading 2: flagged R 11.3e6 by a faint tick about 3 px above the apex, where the faired curve meets the")
    P(f"      frame line; alternative open R 2.8e6 (two R 2.8e6 symbols at the station). {s['S02']['y']:+.4f} +-"
      f"{s['S02']['y_err']:.4f}.")
    P(f"      Reading 1: lower symbol {r1_by['tri_xc1.0_lower']['y']:+.4f} +-0.0003, no Reynolds number.")
    P(f"      Pairing: values {r['S02']['v']} ({r['S02']['dy']:+.4f}, allowed {r['S02']['cy']:.4f}); the Reynolds "
      "number is reading 2's alone, with its alternative.")
    P("  F4. S01 at x/c 0.997.")
    P(f"      Reading 2: drawn about 2 px right of the frame line, entered as printed, x/c {s['S01']['x_c']:.4f} +-"
      f"{s['S01']['x_err']:.4f}. Reading 1: upper symbol at x/c {r1_by['tri_xc1.0_upper']['x']:.4f} +-0.0017.")
    P(f"      Pairing: {r['S01']['v']} (dx/c {r['S01']['dx']:+.4f}, allowed {r['S01']['cx']:.4f}); both place it inside "
      "the frame, right of x/c 1.0; neither moves it to 1.0.")
    P("  F5. S09 (x/c 0.2 upper, flagged).")
    P(f"      Reading 2: vertex reading {s['S09']['y']:+.4f} +-{s['S09']['y_err']:.4f} adopted; the joint template fit, "
      "about -0.1676, not adopted (pulled down the page by the faired curve).")
    P(f"      Reading 1: one value for the overlapping pair, {a02['y']:+.4f} +-{a02['ey']:.4f}.")
    P(f"      Pairing: with S09 {r['S09']['v']} ({r['S09']['dy']:+.4f}, allowed {r['S09']['cy']:.4f}); with the template "
      f"alternative {alt_res[2][4]['v']} ({alt_res[2][4]['dy']:+.4f}, allowed {alt_res[2][4]['cy']:.4f}); with S10 {r['S10']['v']} ({r['S10']['dy']:+.4f}, allowed "
      f"{r['S10']['cy']:.4f}).")
    fc = {x: (a, b, res) for x, a, b, res in curve_res["faired curve M 2.41"]}
    a, b, res = fc[1.0]
    P("  F6. Faired curve, left end (x/c 1.0).")
    P(f"      Reading 2: C00 {b['y']:+.4f} +-{b['ey']:.4f}, the last point where the ink is separate from the frame "
      "line (y 1801 to 1806 px); alternative: hidden in the frame line down to S02's apex, about -0.0636.")
    P(f"      Reading 1: {a['y']:+.4f} +-{a['ey']:.4f}, by row tracking between x/c 0.9 and 1.0 ({a['how']}).")
    P(f"      Pairing: with C00 {res['v']} ({res['dy']:+.4f}, allowed {res['cy']:.4f}); with the alternative "
      f"{c00_alt['v']} ({c00_alt['dy']:+.4f}, allowed {c00_alt['cy']:.4f} with C00's error).")
    a, b, res = fc[0.0]
    c11 = r2_by_id["C11"]
    P("  F7. Faired curve, right end (x/c 0).")
    P(f"      Reading 2: the curve ends at x/c {c11['x_c']:.4f} (C11, {c11['y']:+.4f} +-{c11['y_err']:.4f}) at the left")
    P(f"      side of the x/c 0 symbols; C10 at x/c 0 ({b['y']:+.4f} +-{b['ey']:.4f}) is that level carried 7 px, not ink.")
    P(f"      Reading 1: x/c 0 read as a curve value, {a['y']:+.4f} +-{a['ey']:.4f} ({a['how']}); it states no end.")
    P(f"      Pairing: with C10 {res['v']} ({res['dy']:+.4f}, allowed {res['cy']:.4f}). Stated as fact only: reading 2's")
    P(f"      S11 is {s['S11']['y']:+.4f}; reading 1 does not say whether its x/c 0 value is curve ink.")
    P("  F8. Faired curve bridged behind the symbols at x/c 0.8, 0.6, 0.4, 0.2 (reading 2; 0.6 read by hand where the")
    P("      curve lies along the -0.16 gridline). Reading 1: traced values there, no bridge noted.")
    P("      Pairing: " + "; ".join(f"x/c {x:.1f} {fc[x][2]['v']} ({fc[x][2]['dy']:+.4f}, allowed {fc[x][2]['cy']:.4f})"
                                     for x in (0.8, 0.6, 0.4, 0.2)) + ".")
    P("  F9. Reading 1's own markers: extra error 0.002, 0.003, 0.002 at x/c 0.4, 0.2, 0.0 (overlap); lowest template")
    P("      scores 0.59 (x/c 0.6) and 0.61 (x/c 0.0); M 2.00 ref. 26 extra 0.002 at x/c -0.1 and -0.6 to -1.0 (outside")
    P("      reading 2's check stations, not paired).")
    P(" F10. Reading 2: the model's support and the length the Reynolds numbers are based on are not stated in the text")
    P("      it read. Reading 1 does not address them. Not a figure value; listed for completeness.")
    P("")

    P("=== 7. Read by one reader only (not paired)")
    for e, _, _ in CURVES:
        only1 = [f"{x:+.2f}" for x, a, b, res in curve_res[e] if a and not b]
        only2 = [f"{b['id']} x/c {b['x']:.4f}" for x, a, b, res in curve_res[e] if b and not a]
        if only1:
            P(f"  {e}, reading 1 only ({len(only1)}): x/c " + ", ".join(only1))
        if only2:
            P(f"  {e}, reading 2 only ({len(only2)}): " + ", ".join(only2))
    P(f"  legend keys, reading 2 only ({len(r2_keys)}): " + ", ".join(k_["id"] for k_ in r2_keys)
      + " (not data; reading 1 lists none)")
    P("")
    P("Files: pairs_tn3819_fig32.csv (one row per comparison, alternative, one-reading value or legend key), this file.")

    with open(OUT + "pairing.txt", "w") as f:
        f.write("\n".join(L) + "\n")
    print("\n".join(L))


if __name__ == "__main__":
    main()
