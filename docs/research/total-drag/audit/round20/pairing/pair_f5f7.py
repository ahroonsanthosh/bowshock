#!/usr/bin/env python3
"""Pair two blind readings (A and B) of NACA TN 2360 figures 5 and 7.

Reads only f5-readers/A/f5f7.csv and f5-readers/B/f5f7.csv and writes
pairing.csv and pairing.txt next to this script. Run with: python3 -I pair_f5f7.py

Pairing rules applied (project standing rule):
1. Match by identity: same figure, panel, Mach number and configuration
   (legend symbol), then the same symbol in order of increasing x within that
   set. Count mismatches or unclear orderings are reported, not forced.
   Check: is each partner the other reader's nearest symbol in x (within the
   same identity set), in both directions.
2. Per matched symbol: both readings of x and y, each reader's stated errors,
   differences (A minus B) and combined errors (sum of the two stated errors).
3. AGREES only if |dx| <= combined x error and |dy| <= combined y error;
   otherwise BEYOND, with the amount beyond.
4. Symbols with alternatives in either reading: every combination of A's
   readings (primary and alternatives) against B's is tested; AGREES if any
   combination agrees, naming which. Nothing is resolved.
5. Flags and alternatives are carried through unchanged. No value is rounded,
   averaged or corrected: all arithmetic is exact decimal arithmetic on the
   strings as written in the CSVs.
"""

import csv
import hashlib
import re
import sys
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
CSV_A = BASE / "A" / "f5f7.csv"
CSV_B = BASE / "B" / "f5f7.csv"
EXPECTED_SHA = {
    "A": "22d48e5592687e991c1d484bd1529088c30f7ef35910680699c23d8e2b86ea23",
    "B": "a426b5ff4c0c83d6c4c0da3aae3c72558dc3e80c04636f3446e4cd5a46741f75",
}
OUT_CSV = HERE / "pairing.csv"
OUT_TXT = HERE / "pairing.txt"

COLUMNS = ["figure", "panel", "mach", "configuration", "legend_symbol",
           "x_quantity", "x", "y_quantity", "y", "x_error", "y_error",
           "flags", "alternatives"]

# Identity key for each reader's exact configuration string. Explicit, so the
# mapping can be audited; any string not listed stops the script.
CONFIG_KEY = {
    "A": {
        "cruciform tail t/c=0.10, tail location x/c=1.0": "x/c=1.0",
        "cruciform tail t/c=0.10, tail location x/c=0.6": "x/c=0.6",
        "cruciform tail t/c=0.10, tail location x/c=0.2": "x/c=0.2",
        "cruciform tail t/c=0.10, tail location x/c=-0.2": "x/c=-0.2",
        "cruciform tail t/c=0.10, tail location x/c=-0.6": "x/c=-0.6",
        "cruciform tail t/c=0.10, tail location x/c=-1.0": "x/c=-1.0",
        "tail off (body alone)": "tail off",
        "with 10% thick cruciform tail surfaces, x/c=0; present tests": "with tail x/c=0",
        "without tail surface; present tests": "without tail",
    },
    "B": {
        "cruciform tail t/c=0.10, x/c=1.0; roughness added to body": "x/c=1.0",
        "cruciform tail t/c=0.10, x/c=0.6; roughness added to body": "x/c=0.6",
        "cruciform tail t/c=0.10, x/c=0.2; roughness added to body": "x/c=0.2",
        "cruciform tail t/c=0.10, x/c=-0.2; roughness added to body": "x/c=-0.2",
        "cruciform tail t/c=0.10, x/c=-0.6; roughness added to body": "x/c=-0.6",
        "cruciform tail t/c=0.10, x/c=-1.0; roughness added to body": "x/c=-1.0",
        "tail off (body alone); roughness added to body": "tail off",
        "body with 10-percent-thick cruciform tail surfaces, x/c=0; present tests": "with tail x/c=0",
        "body without tail surface (body alone); present tests": "without tail",
    },
}

# Shape named by each reader's exact legend_symbol string, used to check that
# both readers attach the same legend symbol to the same configuration.
SHAPE_KEY = {
    "A": {
        "open circle with centre dot": "circle",
        "open square with centre dot": "square",
        "open diamond with centre dot": "diamond",
        "open triangle (apex up) with centre dot": "triangle apex up",
        "open right triangle (right angle at lower right) with centre dot": "right triangle",
        "open quarter-round (curved upper left, right angle at lower right) with centre dot": "quarter-round",
        "open arch (flat bottom, rounded top) with centre dot": "flat-bottomed round-topped",
    },
    "B": {
        "circle with centre dot (legend: Tail location, x/c = 1.0)": "circle",
        "square with centre dot (legend: Tail location, x/c = 0.6)": "square",
        "diamond with centre dot (legend: Tail location, x/c = 0.2)": "diamond",
        "triangle (apex up) with centre dot (legend: Tail location, x/c = -0.2)": "triangle apex up",
        "right triangle (vertical right side, hypotenuse rising to right) with centre dot (legend: Tail location, x/c = -0.6)": "right triangle",
        "quarter-round (vertical right side, curved upper-left side) with centre dot (legend: Tail location, x/c = -1.0)": "quarter-round",
        "round-topped flat-bottomed symbol with centre dot (legend: Tail off)": "flat-bottomed round-topped",
        'square with centre dot (legend: Present tests, under "With 10% thick cruciform tail surfaces, x/c=0")': "square",
        'circle with centre dot (legend: Present tests, under "Without tail surface")': "circle",
    },
}

BODY_ALONE = {"tail off", "without tail"}
CONFIG_ORDER = ["x/c=1.0", "x/c=0.6", "x/c=0.2", "x/c=-0.2", "x/c=-0.6",
                "x/c=-1.0", "tail off", "with tail x/c=0", "without tail"]
ALT_RE = re.compile(r"^(?P<label>.+): x=(?P<x>-?[0-9]+(?:\.[0-9]+)?) y=(?P<y>-?[0-9]+(?:\.[0-9]+)?)$")


def die(msg):
    sys.stderr.write("STOP: " + msg + "\n")
    sys.exit(1)


def fmt(d):
    """Decimal to plain string, exactly as computed (no rounding)."""
    if d is None:
        return ""
    return format(d, "f")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_alternatives(reader, text, where):
    """Return [(label, x, y)] from 'label: x=.. y=.. | label: x=.. y=..'."""
    if text == "":
        return []
    out = []
    for piece in text.split(" | "):
        m = ALT_RE.match(piece.strip())
        if not m:
            die("%s %s: cannot parse alternative %r" % (reader, where, piece))
        out.append((m.group("label"), Decimal(m.group("x")), Decimal(m.group("y"))))
    return out


def load(reader, path):
    got = sha256(path)
    if got != EXPECTED_SHA[reader]:
        die("%s: SHA-256 %s differs from expected %s" % (path, got, EXPECTED_SHA[reader]))
    with open(path, newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh)
        if rdr.fieldnames != COLUMNS:
            die("%s: columns %r differ from the brief's %r" % (path, rdr.fieldnames, COLUMNS))
        rows = list(rdr)
    syms = []
    for i, r in enumerate(rows, start=2):  # line 1 is the header
        where = "line %d" % i
        if r["configuration"] not in CONFIG_KEY[reader]:
            die("%s %s: unmapped configuration %r" % (reader, where, r["configuration"]))
        if r["legend_symbol"] not in SHAPE_KEY[reader]:
            die("%s %s: unmapped legend_symbol %r" % (reader, where, r["legend_symbol"]))
        for col in ("x", "y"):
            if r[col].strip() == "":
                die("%s %s: empty %s (illegible rows are not expected here)" % (reader, where, col))
        for col in ("x_error", "y_error"):
            if r[col].strip() == "":
                # Rule 5 fallback would apply here (largest error stated in the
                # reader's method.md). No row of either CSV lacks an error, so
                # the fallback is not coded; stop so it is handled by hand.
                die("%s %s: no %s given; apply the method.md fallback by hand" % (reader, where, col))
        s = {
            "reader": reader,
            "line": i,
            "figure": r["figure"],
            "panel": r["panel"],
            "mach": r["mach"],
            "configuration": r["configuration"],
            "legend_symbol": r["legend_symbol"],
            "cfg": CONFIG_KEY[reader][r["configuration"]],
            "shape": SHAPE_KEY[reader][r["legend_symbol"]],
            "x_quantity": r["x_quantity"],
            "y_quantity": r["y_quantity"],
            "x_raw": r["x"], "y_raw": r["y"],
            "x": Decimal(r["x"]), "y": Decimal(r["y"]),
            "ex": Decimal(r["x_error"]), "ey": Decimal(r["y_error"]),
            "ex_raw": r["x_error"], "ey_raw": r["y_error"],
            "flags": r["flags"],
            "alternatives": r["alternatives"],
        }
        s["alts"] = parse_alternatives(reader, r["alternatives"], where)
        # readings: index 0 = primary, 1.. = alternatives in the order written
        s["readings"] = [("primary", s["x"], s["y"])] + s["alts"]
        syms.append(s)
    return rows, syms


def ident(s):
    return (s["figure"], s["panel"], s["mach"], s["cfg"])


def ident_sort_key(k):
    fig, panel, mach, cfg = k
    return (int(fig), panel, Decimal(mach), CONFIG_ORDER.index(cfg))


def test_pair(ra, rb, a, b):
    """ra, rb: (label, x, y); a, b: symbols (for the stated errors)."""
    dx = ra[1] - rb[1]
    dy = ra[2] - rb[2]
    cx = a["ex"] + b["ex"]
    cy = a["ey"] + b["ey"]
    okx = abs(dx) <= cx
    oky = abs(dy) <= cy
    bx = None if okx else abs(dx) - cx
    by = None if oky else abs(dy) - cy
    return {"dx": dx, "dy": dy, "cx": cx, "cy": cy, "okx": okx, "oky": oky,
            "bx": bx, "by": by, "ok": okx and oky}


def x_interval(s):
    xs = [r[1] for r in s["readings"]]
    return min(xs) - s["ex"], max(xs) + s["ex"]


def nearest_check(sym, others, partner):
    """Is partner the nearest (in primary x) of `others` to sym? yes/no/tie."""
    dists = sorted((abs(o["x"] - sym["x"]), id(o)) for o in others)
    best = dists[0][0]
    tied = [d for d in dists if d[0] == best]
    if len(tied) > 1:
        return "tie" if any(d[1] == id(partner) for d in tied) else "no"
    return "yes" if dists[0][1] == id(partner) else "no"


def main():
    rows_a, syms_a = load("A", CSV_A)
    rows_b, syms_b = load("B", CSV_B)

    sets = {}
    for s in syms_a + syms_b:
        sets.setdefault(ident(s), {"A": [], "B": []})[s["reader"]].append(s)

    problems = []
    pairs = []
    set_notes = []
    for key in sorted(sets, key=ident_sort_key):
        ga = sorted(sets[key]["A"], key=lambda s: s["x"])
        gb = sorted(sets[key]["B"], key=lambda s: s["x"])
        label = "fig %s(%s) M=%s %s" % key
        if len(ga) != len(gb):
            problems.append("%s: A has %d symbols, B has %d; not paired" % (label, len(ga), len(gb)))
            continue
        # shape consistency
        shapes = {s["shape"] for s in ga + gb}
        if len(shapes) != 1:
            problems.append("%s: legend shapes differ between or within readers: %s; not paired"
                            % (label, sorted(shapes)))
            continue
        # ordering clarity: equal primary x, or overlapping x intervals
        unclear = []
        min_gap = {}
        for rd, g in (("A", ga), ("B", gb)):
            gaps = []
            for s1, s2 in zip(g, g[1:]):
                if s1["x"] == s2["x"]:
                    unclear.append("%s: two symbols at the same x %s" % (rd, s1["x_raw"]))
                lo2 = x_interval(s2)[0]
                hi1 = x_interval(s1)[1]
                if lo2 <= hi1:
                    unclear.append("%s: x ranges (all readings +- stated error) of symbols at %s and %s overlap"
                                   % (rd, s1["x_raw"], s2["x_raw"]))
                gaps.append(s2["x"] - s1["x"])
            min_gap[rd] = min(gaps) if gaps else None
        set_notes.append((label, len(ga), next(iter(shapes)), min_gap))
        if unclear:
            problems.append("%s: order in x unclear (%s); not paired" % (label, "; ".join(unclear)))
            continue
        for rank, (a, b) in enumerate(zip(ga, gb), start=1):
            nn_ab = nearest_check(a, gb, b)
            nn_ba = nearest_check(b, ga, a)
            prim = test_pair(a["readings"][0], b["readings"][0], a, b)
            has_alts = bool(a["alts"] or b["alts"])
            combos = []
            for i, ra in enumerate(a["readings"]):
                for j, rb in enumerate(b["readings"]):
                    t = test_pair(ra, rb, a, b)
                    t["name"] = "A%d-B%d" % (i, j)
                    combos.append(t)
            agreeing = [c["name"] for c in combos if c["ok"]]
            verdict = "AGREES" if agreeing else "BEYOND"
            pairs.append({"key": key, "rank": rank, "a": a, "b": b, "prim": prim,
                          "has_alts": has_alts, "combos": combos,
                          "agreeing": agreeing, "verdict": verdict,
                          "nn_ab": nn_ab, "nn_ba": nn_ba})

    def all_readings(p):
        parts = []
        for rd, s in (("A", p["a"]), ("B", p["b"])):
            for i, r in enumerate(s["readings"]):
                parts.append("%s%d(x=%s y=%s)" % (rd, i, fmt(r[1]), fmt(r[2])))
        return "; ".join(parts)

    # ---------------- pairing.csv ----------------
    header = ["figure", "panel", "mach", "config_key", "shape", "rank_in_x",
              "A_configuration", "B_configuration", "A_legend_symbol", "B_legend_symbol",
              "A_x_quantity", "B_x_quantity", "A_y_quantity", "B_y_quantity",
              "A_x", "B_x", "A_x_error", "B_x_error", "dx_A_minus_B", "combined_x_error",
              "x_within", "x_beyond_by",
              "A_y", "B_y", "A_y_error", "B_y_error", "dy_A_minus_B", "combined_y_error",
              "y_within", "y_beyond_by",
              "primary_verdict", "has_alternatives", "combinations_tested",
              "agreeing_combinations", "verdict",
              "least_x_beyond_over_combinations", "least_y_beyond_over_combinations",
              "partner_is_B_nearest_to_A", "partner_is_A_nearest_to_B",
              "A_flags", "B_flags", "A_alternatives", "B_alternatives", "all_readings",
              "A_csv_line", "B_csv_line"]
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        for p in pairs:
            a, b, t = p["a"], p["b"], p["prim"]
            if p["verdict"] == "BEYOND":
                lbx = min((c["bx"] or Decimal(0)) for c in p["combos"])
                lby = min((c["by"] or Decimal(0)) for c in p["combos"])
            else:
                lbx = lby = None
            w.writerow([a["figure"], a["panel"], a["mach"], a["cfg"], a["shape"], p["rank"],
                        a["configuration"], b["configuration"], a["legend_symbol"], b["legend_symbol"],
                        a["x_quantity"], b["x_quantity"], a["y_quantity"], b["y_quantity"],
                        a["x_raw"], b["x_raw"], a["ex_raw"], b["ex_raw"], fmt(t["dx"]), fmt(t["cx"]),
                        "yes" if t["okx"] else "no", fmt(t["bx"]),
                        a["y_raw"], b["y_raw"], a["ey_raw"], b["ey_raw"], fmt(t["dy"]), fmt(t["cy"]),
                        "yes" if t["oky"] else "no", fmt(t["by"]),
                        "AGREES" if t["ok"] else "BEYOND", "yes" if p["has_alts"] else "no",
                        len(p["combos"]), " ".join(p["agreeing"]), p["verdict"],
                        fmt(lbx), fmt(lby),
                        p["nn_ab"], p["nn_ba"],
                        a["flags"], b["flags"], a["alternatives"], b["alternatives"],
                        all_readings(p), a["line"], b["line"]])

    # ---------------- pairing.txt ----------------
    L = []
    W = L.append
    W("NACA TN 2360 figures 5 and 7: pairing of blind readings A and B")
    W("=" * 66)
    W("")
    W("Inputs (read only; SHA-256 checked by this script before use):")
    W("  A: %s  %s" % (CSV_A, EXPECTED_SHA["A"]))
    W("  B: %s  %s" % (CSV_B, EXPECTED_SHA["B"]))
    W("Rows read: A %d, B %d. Matched symbols: %d." % (len(rows_a), len(rows_b), len(pairs)))
    W("")
    W("Conventions")
    W("  dx, dy are A minus B. comb = A stated error + B stated error (each reader's own")
    W("  one-standard-deviation reading error, as given on the row). A pair AGREES only if")
    W("  |dx| <= comb x and |dy| <= comb y. 'beyond by' = |d| - comb where it exceeds.")
    W("  All arithmetic is exact decimal arithmetic on the CSV strings: nothing is rounded,")
    W("  averaged or corrected. Figure 5 x is Reynolds number R in units of 10^6 (both")
    W("  readers); figure 7 x is Mach number M. y is the base-pressure coefficient P_b.")
    W("  Every row of both CSVs states x_error and y_error, so the rule 5 fallback (largest")
    W("  error stated in the reader's method.md) was not needed.")
    W("  Reading labels: A0 / B0 = the reader's primary reading; A1, A2.. / B1, B2.. = the")
    W("  reader's alternatives in the order written. Alternatives are tested with the row's")
    W("  stated errors (no reader states a separate error for an alternative).")
    W("  Nearest check: within the same identity set (figure, panel, Mach, configuration),")
    W("  is the partner the other reader's nearest symbol in primary x, from A to B and from")
    W("  B to A.")
    W("")
    W("Identity mapping (each reader's exact configuration string -> key)")
    for rd in ("A", "B"):
        for k, v in CONFIG_KEY[rd].items():
            W("  %s  %-16s <- %s" % (rd, v, k))
    W("Legend shape check: for every identity set both readers name the same shape:")
    for label, n, shape, mg in set_notes:
        W("  %-34s n=%d each  shape: %-27s min x gap A %s, B %s"
          % (label, n, shape, fmt(mg["A"]) if mg["A"] is not None else "-",
             fmt(mg["B"]) if mg["B"] is not None else "-"))
    W("")
    W("Pairing problems (count differences, shape differences, unclear order): %s"
      % ("none" if not problems else ""))
    for pr in problems:
        W("  " + pr)
    W("")

    # main table
    W("Matched symbols (primary readings)")
    W("-" * 34)
    hdr = ("%-4s %-3s %-16s %1s | %-6s %-6s %-5s %-5s %-6s %-5s %-3s | %-7s %-7s %-6s %-6s %-7s %-6s %-3s | %-6s %-6s | %-3s %-3s"
           % ("fig", "M", "config", "#", "A x", "B x", "A ex", "B ex", "dx", "comb", "in",
              "A y", "B y", "A ey", "B ey", "dy", "comb", "in", "primary", "verdict", "nAB", "nBA"))
    W(hdr)
    W("-" * len(hdr))
    for p in pairs:
        a, b, t = p["a"], p["b"], p["prim"]
        W("%-4s %-3s %-16s %1d | %-6s %-6s %-5s %-5s %-6s %-5s %-3s | %-7s %-7s %-6s %-6s %-7s %-6s %-3s | %-7s %-6s | %-3s %-3s"
          % ("%s%s" % (a["figure"], "" if a["panel"] == "single" else "(%s)" % a["panel"]),
             a["mach"], a["cfg"], p["rank"],
             a["x_raw"], b["x_raw"], a["ex_raw"], b["ex_raw"], fmt(t["dx"]), fmt(t["cx"]),
             "yes" if t["okx"] else "NO",
             a["y_raw"], b["y_raw"], a["ey_raw"], b["ey_raw"], fmt(t["dy"]), fmt(t["cy"]),
             "yes" if t["oky"] else "NO",
             "AGREES" if t["ok"] else "BEYOND", p["verdict"], p["nn_ab"], p["nn_ba"]))
    W("")
    W("  in = difference within combined error; primary = primary-vs-primary test;")
    W("  verdict = rule 4 result over all reading combinations (same as primary where")
    W("  neither reader gives alternatives); nAB / nBA = nearest check A->B / B->A.")
    W("")
    beyond = [p for p in pairs if p["verdict"] == "BEYOND"]
    prim_beyond = [p for p in pairs if not p["prim"]["ok"]]
    W("BEYOND pairs (rule 4 verdict): %s" % ("none" if not beyond else len(beyond)))
    for p in beyond:
        t = p["prim"]
        W("  fig %s(%s) M=%s %s #%d: primary x beyond by %s, y beyond by %s"
          % (p["a"]["figure"], p["a"]["panel"], p["a"]["mach"], p["a"]["cfg"], p["rank"],
             fmt(t["bx"]) or "0", fmt(t["by"]) or "0"))
    W("Pairs whose primary readings alone fall BEYOND: %s"
      % ("none" if not prim_beyond else ", ".join(
          "fig %s(%s) %s #%d" % (p["a"]["figure"], p["a"]["panel"], p["a"]["cfg"], p["rank"])
          for p in prim_beyond)))
    W("")

    # alternatives section
    W("Symbols with alternatives in either reading (rule 4: every combination tested)")
    W("-" * 78)
    for p in pairs:
        if not p["has_alts"]:
            continue
        a, b = p["a"], p["b"]
        W("fig %s(%s) M=%s %s #%d   verdict %s; agreeing combinations: %s"
          % (a["figure"], a["panel"], a["mach"], a["cfg"], p["rank"], p["verdict"],
             " ".join(p["agreeing"]) if p["agreeing"] else "none"))
        W("  A flags: %s | B flags: %s" % (a["flags"] or "-", b["flags"] or "-"))
        W("  A errors x %s y %s | B errors x %s y %s"
          % (a["ex_raw"], a["ey_raw"], b["ex_raw"], b["ey_raw"]))
        for rd, s in (("A", a), ("B", b)):
            for i, r in enumerate(s["readings"]):
                W("  %s%d  x=%-6s y=%-8s  %s" % (rd, i, fmt(r[1]), fmt(r[2]), r[0]))
        for c in p["combos"]:
            W("    %-6s dx %-7s (comb %s, %s)  dy %-8s (comb %s, %s)  %s"
              % (c["name"], fmt(c["dx"]), fmt(c["cx"]), "in" if c["okx"] else "beyond by " + fmt(c["bx"]),
                 fmt(c["dy"]), fmt(c["cy"]), "in" if c["oky"] else "beyond by " + fmt(c["by"]),
                 "AGREES" if c["ok"] else "BEYOND"))
        W("")

    # flags carried through
    W("Flags and alternatives as written by each reader (carried through unchanged)")
    W("-" * 76)
    for p in pairs:
        a, b = p["a"], p["b"]
        if not (a["flags"] or b["flags"] or a["alternatives"] or b["alternatives"]):
            continue
        W("fig %s(%s) M=%s %s #%d" % (a["figure"], a["panel"], a["mach"], a["cfg"], p["rank"]))
        W("  A flags: %s" % (a["flags"] or "-"))
        W("  A alternatives: %s" % (a["alternatives"] or "-"))
        W("  B flags: %s" % (b["flags"] or "-"))
        W("  B alternatives: %s" % (b["alternatives"] or "-"))
    W("")

    # ---------------- body-alone summary ----------------
    W("Body without tail surfaces only")
    W("=" * 31)
    W("Figure 5 'Tail off' symbols in 5(a) (M=1.5) and 5(b) (M=2.0), and figure 7")
    W("'without tail surface' points at M=1.5 and 2.0. Envelope = [min, max] of P_b over")
    W("every reading of both readers (primary and alternatives). Widened envelope (for")
    W("information only) = lower end minus the y error of the reader whose reading sets")
    W("the lower end, upper end plus the y error of the reader whose reading sets the")
    W("upper end (where both readers reach an end, the larger of their y errors is used")
    W("and both are named).")
    W("")
    body = [p for p in pairs if p["a"]["cfg"] in BODY_ALONE]
    for p in body:
        a, b = p["a"], p["b"]
        pts = []
        for rd, s in (("A", a), ("B", b)):
            for i, r in enumerate(s["readings"]):
                pts.append((r[2], rd, i, s["ey"]))
        lo = min(q[0] for q in pts)
        hi = max(q[0] for q in pts)
        lo_rd = sorted({q[1] for q in pts if q[0] == lo})
        hi_rd = sorted({q[1] for q in pts if q[0] == hi})
        lo_err = max(q[3] for q in pts if q[0] == lo)
        hi_err = max(q[3] for q in pts if q[0] == hi)
        lo_lab = ",".join("%s%d" % (q[1], q[2]) for q in pts if q[0] == lo)
        hi_lab = ",".join("%s%d" % (q[1], q[2]) for q in pts if q[0] == hi)
        if a["x_quantity"].startswith("Reynolds"):
            re_txt = "R (x 10^6): A %s +- %s, B %s +- %s" % (a["x_raw"], a["ex_raw"], b["x_raw"], b["ex_raw"])
            alt_x = sorted({fmt(r[1]) for s in (a, b) for r in s["readings"][1:]})
            if alt_x:
                re_txt += "; alternatives' R: %s" % ", ".join(alt_x)
        else:
            re_txt = ("Reynolds number: none in either CSV (figure 7 x axis is Mach number; "
                      "M read: A %s, B %s)" % (a["x_raw"], b["x_raw"]))
        W("fig %s(%s) M=%s %s #%d: %s%s"
          % (a["figure"], a["panel"], a["mach"], a["cfg"], p["rank"], p["verdict"],
             "" if not p["has_alts"] else " (agreeing combinations: %s)"
             % (" ".join(p["agreeing"]) or "none")))
        W("  %s" % re_txt)
        W("  P_b readings: %s" % "; ".join("%s%d %s" % (q[1], q[2], fmt(q[0])) for q in pts))
        W("  envelope [%s, %s]  (low end %s, high end %s)" % (fmt(lo), fmt(hi), lo_lab, hi_lab))
        W("  widened, information only: [%s, %s]  (low end - %s from %s, high end + %s from %s)"
          % (fmt(lo - lo_err), fmt(hi + hi_err), fmt(lo_err), "/".join(lo_rd),
             fmt(hi_err), "/".join(hi_rd)))
        W("  flags: A %s | B %s" % (a["flags"] or "-", b["flags"] or "-"))
        W("")

    # ---------------- counts ----------------
    def count(ps):
        ag = sum(1 for p in ps if p["verdict"] == "AGREES")
        return ag, len(ps) - ag, len(ps)

    def count_prim(ps):
        ag = sum(1 for p in ps if p["prim"]["ok"])
        return ag, len(ps) - ag, len(ps)

    tailed = [p for p in pairs if p["a"]["cfg"] not in BODY_ALONE]
    W("Counts (rule 4 verdicts; primary-only test in brackets)")
    W("=" * 55)
    for name, ps in (("all matched symbols", pairs),
                     ("tailed configurations (fig 5 x/c = 1.0..-1.0, fig 7 with tail x/c=0)", tailed),
                     ("body without tail surfaces (fig 5 tail off, fig 7 without tail)", body)):
        ag, be, n = count(ps)
        pag, pbe, _ = count_prim(ps)
        W("  %s: n=%d  AGREES %d  BEYOND %d  [primary only: AGREES %d, BEYOND %d]"
          % (name, n, ag, be, pag, pbe))
    W("")

    with open(OUT_TXT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))

    if len(pairs) != 60:
        sys.stderr.write("NOTE: %d symbols matched, not 60\n" % len(pairs))
    print("wrote %s and %s; %d matched; problems: %d" % (OUT_CSV, OUT_TXT, len(pairs), len(problems)))


if __name__ == "__main__":
    main()
