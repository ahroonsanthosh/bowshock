#!/usr/bin/env python3
"""Pair two blind readings (A and B) of NACA TR 1051 figure 23(b).

Reads only the two readers' f23b.csv files. Writes pairing.csv and
pairing.txt into OUT_DIR. Run with: python3 -I pair_f23b.py

No reading is rounded, averaged or corrected. All arithmetic is exact
decimal arithmetic on the strings exactly as written in the CSVs.

Project pairing rule, as applied here:
 1. Match by identity: same Mach number and legend symbol, and the same
    position in order of increasing d/h within that set. A set whose
    counts differ, or whose order match is unclear, is not paired.
 2. Per matched symbol, per axis: both readings, both stated errors, the
    difference (A minus B) and the combined error (errA + errB).
 3. AGREES only if |diff| <= combined error on both axes; otherwise
    BEYOND, with |diff| - combined for each axis that exceeds.
 4. Flags and alternatives are carried through unchanged.
 5. Errors are taken from each CSV row. A row with no error would need
    the largest error in that reader's method.md; this script reads only
    the CSVs, so it stops and says so if that case arises.
"""
import csv
import hashlib
import io
import os
import re
import sys
from decimal import Decimal, InvalidOperation

BASE = ("/tmp/claude-0/-home-user-bowshock/"
        "dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/f23b-readers")
INPUTS = {
    "A": (os.path.join(BASE, "A", "f23b.csv"),
          "32ee1fcf39dcaf2d0afcfa9123230b45ec6b824b223c64940bf7f5770b2bff89"),
    "B": (os.path.join(BASE, "B", "f23b.csv"),
          "86bb7d8c0d78b820438098d0d048aa6853eee3139144f2a74de2ccdedfe9c724"),
}
OUT_DIR = os.path.join(BASE, "pairing")
COLUMNS = ["mach", "legend_symbol", "d_over_h", "p_b",
           "d_over_h_error", "p_b_error", "flags", "alternatives"]
MACH_ORDER = ["1.5", "2.0", "2.9"]


def fail(msg):
    sys.stderr.write("STOP: " + msg + "\n")
    sys.exit(2)


def dec(s, what):
    s = s.strip()
    if s == "":
        return None
    try:
        return Decimal(s)
    except InvalidOperation:
        fail("cannot parse %s %r" % (what, s))


def f(x):
    """Exact decimal as plain text, no exponent, no rounding."""
    return "" if x is None else format(x, "f")


def fs(x):
    """Exact decimal with explicit sign (none for zero)."""
    if x is None:
        return ""
    return format(x, "f") if x == 0 else format(x, "+f")


def load(reader):
    path, want = INPUTS[reader]
    with open(path, "rb") as fh:
        raw = fh.read()
    got = hashlib.sha256(raw).hexdigest()
    if got != want:
        fail("%s hash %s differs from expected %s" % (path, got, want))
    text = raw.decode("utf-8")
    if text.startswith("\ufeff"):
        fail("%s starts with a byte-order mark" % path)
    crlf = "\r\n" in text
    rows = list(csv.reader(io.StringIO(text, newline="")))
    if not rows or rows[0] != COLUMNS:
        fail("%s header is %r, expected %r" % (path, rows[0] if rows else None, COLUMNS))
    out = []
    for n, r in enumerate(rows[1:], start=2):
        if r == []:
            continue
        if len(r) != len(COLUMNS):
            fail("%s line %d has %d fields, expected %d" % (path, n, len(r), len(COLUMNS)))
        d = dict(zip(COLUMNS, r))
        rec = {
            "reader": reader,
            "line": n,
            "mach": d["mach"].strip(),
            "symbol": d["legend_symbol"].strip(),
            "dh": dec(d["d_over_h"], "d_over_h"),
            "pb": dec(d["p_b"], "p_b"),
            "dh_err": dec(d["d_over_h_error"], "d_over_h_error"),
            "pb_err": dec(d["p_b_error"], "p_b_error"),
            "flags_raw": d["flags"],
            "alts_raw": d["alternatives"],
            "flags": [x.strip() for x in d["flags"].split(";") if x.strip()],
        }
        out.append(rec)
    return out, got, crlf, path


def main():
    data = {}
    meta = {}
    for rd in ("A", "B"):
        rows, h, crlf, path = load(rd)
        data[rd] = rows
        meta[rd] = (path, h, crlf, len(rows))

    # Rule 5: every row must state both errors (script reads only CSVs).
    missing = [(r["reader"], r["line"]) for rd in data for r in data[rd]
               if r["dh_err"] is None or r["pb_err"] is None]
    if missing:
        fail("rows without a stated error %r: the largest error in that "
             "reader's method.md is needed; supply it by hand" % missing)

    # Group by (mach, legend symbol).
    groups = {}
    for rd in ("A", "B"):
        for r in data[rd]:
            groups.setdefault((r["mach"], r["symbol"]), {"A": [], "B": []})[rd].append(r)

    def gkey(k):
        m = MACH_ORDER.index(k[0]) if k[0] in MACH_ORDER else len(MACH_ORDER)
        return (m, k[0], k[1])

    pairs = []        # matched pairs
    set_notes = []    # per-set matching notes
    unpaired = []     # sets not paired, with reason
    for key in sorted(groups, key=gkey):
        a, b = groups[key]["A"], groups[key]["B"]
        reasons = []
        if len(a) != len(b):
            reasons.append("counts differ: A %d, B %d" % (len(a), len(b)))
        for rd, lst in (("A", a), ("B", b)):
            if any(r["dh"] is None for r in lst):
                reasons.append("reader %s has a symbol with no d/h, so the order is unclear" % rd)
        if not reasons:
            for rd, lst in (("A", a), ("B", b)):
                vals = sorted(r["dh"] for r in lst)
                if len(set(vals)) != len(vals):
                    reasons.append("reader %s has tied d/h values, so the order is unclear" % rd)
        if not reasons:
            a_s = sorted(a, key=lambda r: r["dh"])
            b_s = sorted(b, key=lambda r: r["dh"])
            # Order-match sanity: each matched partner must be the other
            # reader's nearest symbol in d/h, both ways.
            for i in range(len(a_s)):
                da = [abs(a_s[i]["dh"] - x["dh"]) for x in b_s]
                db = [abs(b_s[i]["dh"] - x["dh"]) for x in a_s]
                if min(range(len(da)), key=lambda j: da[j]) != i or \
                   min(range(len(db)), key=lambda j: db[j]) != i or \
                   da.count(da[i]) > 1 or db.count(db[i]) > 1:
                    reasons.append("order match at position %d is not the nearest "
                                   "neighbour in d/h both ways" % (i + 1))
        if reasons:
            unpaired.append((key, reasons, a, b))
            continue
        a_order_file = [r["line"] for r in a] == [r["line"] for r in a_s]
        b_order_file = [r["line"] for r in b] == [r["line"] for r in b_s]
        set_notes.append((key, len(a_s), a_order_file, b_order_file))
        for i, (ra, rb) in enumerate(zip(a_s, b_s), start=1):
            dd = ra["dh"] - rb["dh"]
            dc = ra["dh_err"] + rb["dh_err"]
            pd = ra["pb"] - rb["pb"]
            pc = ra["pb_err"] + rb["pb_err"]
            d_in = abs(dd) <= dc
            p_in = abs(pd) <= pc
            pairs.append({
                "mach": key[0], "symbol": key[1], "n": i, "of": len(a_s),
                "A": ra, "B": rb,
                "dd": dd, "dc": dc, "d_in": d_in,
                "d_beyond": None if d_in else abs(dd) - dc,
                "pd": pd, "pc": pc, "p_in": p_in,
                "p_beyond": None if p_in else abs(pd) - pc,
                "verdict": "AGREES" if (d_in and p_in) else "BEYOND",
                "ambiguous": ("ambiguous" in ra["flags"]) or ("ambiguous" in rb["flags"]),
            })

    # ---------------- pairing.csv ----------------
    hdr = ["mach", "legend_symbol", "order_by_increasing_d_over_h", "set_size",
           "A_d_over_h", "A_d_over_h_error", "B_d_over_h", "B_d_over_h_error",
           "d_over_h_diff_A_minus_B", "d_over_h_combined_error",
           "d_over_h_within", "d_over_h_beyond_by",
           "A_p_b", "A_p_b_error", "B_p_b", "B_p_b_error",
           "p_b_diff_A_minus_B", "p_b_combined_error",
           "p_b_within", "p_b_beyond_by",
           "verdict", "ambiguous_either_reader",
           "A_flags", "B_flags", "A_alternatives", "B_alternatives",
           "A_csv_line", "B_csv_line", "error_source"]
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(hdr)
    for p in pairs:
        A, B = p["A"], p["B"]
        w.writerow([p["mach"], p["symbol"], p["n"], p["of"],
                    f(A["dh"]), f(A["dh_err"]), f(B["dh"]), f(B["dh_err"]),
                    f(p["dd"]), f(p["dc"]),
                    "yes" if p["d_in"] else "no", f(p["d_beyond"]),
                    f(A["pb"]), f(A["pb_err"]), f(B["pb"]), f(B["pb_err"]),
                    f(p["pd"]), f(p["pc"]),
                    "yes" if p["p_in"] else "no", f(p["p_beyond"]),
                    p["verdict"], "yes" if p["ambiguous"] else "no",
                    A["flags_raw"], B["flags_raw"], A["alts_raw"], B["alts_raw"],
                    A["line"], B["line"], "CSV row (both readers)"])
    csv_text = buf.getvalue()

    # ---------------- pairing.txt ----------------
    L = []
    add = L.append
    add("PAIRING OF TWO BLIND READINGS: NACA TR 1051, FIGURE 23(b)")
    add("Base pressure coefficient P_b against sting diameter over base diameter d/h")
    add("=" * 78)
    add("")
    add("INPUTS (read by this script; nothing else is read)")
    for rd in ("A", "B"):
        path, h, crlf, n = meta[rd]
        add("  Reader %s: %s" % (rd, path))
        add("    SHA-256 %s (matches the expected hash)" % h)
        add("    %d data rows; line endings %s" % (n, "CRLF" if crlf else "LF"))
    add("")
    add("CONVENTIONS")
    add("  Difference = reader A minus reader B, exact decimal subtraction of the")
    add("  values as written. Combined error = A's stated error + B's stated error.")
    add("  A pair is within on an axis when |difference| <= combined error")
    add("  (equality counts as within). AGREES = within on both d/h and p_b.")
    add("  BEYOND amount = |difference| - combined error, for each axis that exceeds.")
    add("  Nothing is rounded, averaged or corrected. Reader B writes d/h to three")
    add("  decimals and reader A to four; each value is used exactly as written.")
    add("  Error source: every row of both CSVs states both errors, so each row's own")
    add("  errors are used. The method.md fallback (rule 5) was not needed.")
    add("  Error standard, as stated in each reader's method.md (noted by the pairing")
    add("  party; the script does not read method.md): both readers give one standard")
    add("  deviation of their own reading error, excluding draftsman placement error.")
    add("")
    add("MATCHING (rule 1)")
    for key, n, ao, bo in set_notes:
        add("  M=%s %-8s : A %d, B %d symbols; matched 1..%d by increasing d/h."
            % (key[0], key[1], n, n, n))
    add("  Every matched partner is also the other reader's nearest symbol in d/h,")
    add("  both ways, so no order match is unclear." if set_notes and not unpaired
        else "  See the unpaired sets below.")
    if unpaired:
        add("  NOT PAIRED:")
        for key, reasons, a, b in unpaired:
            add("    M=%s %s: %s" % (key[0], key[1], "; ".join(reasons)))
    else:
        add("  All sets have equal counts in both readers. No set was left unpaired.")
    add("")

    def row_id(p):
        return "%-3s %-8s %d/%d" % (p["mach"], p["symbol"], p["n"], p["of"])

    add("TABLE 1. d/h (rule 2)")
    h1 = "%-18s %8s %7s %8s %7s %8s %7s %-6s %s" % (
        "Mach symbol #", "A d/h", "A err", "B d/h", "B err", "A-B", "comb", "within", "beyond by")
    add(h1)
    add("-" * len(h1))
    for p in pairs:
        A, B = p["A"], p["B"]
        add("%-18s %8s %7s %8s %7s %8s %7s %-6s %s" % (
            row_id(p), f(A["dh"]), f(A["dh_err"]), f(B["dh"]), f(B["dh_err"]),
            fs(p["dd"]), f(p["dc"]), "yes" if p["d_in"] else "NO", f(p["d_beyond"])))
    add("")
    add("TABLE 2. p_b (rule 2)")
    h2 = "%-18s %8s %7s %8s %7s %8s %7s %-6s %s" % (
        "Mach symbol #", "A p_b", "A err", "B p_b", "B err", "A-B", "comb", "within", "beyond by")
    add(h2)
    add("-" * len(h2))
    for p in pairs:
        A, B = p["A"], p["B"]
        add("%-18s %8s %7s %8s %7s %8s %7s %-6s %s" % (
            row_id(p), f(A["pb"]), f(A["pb_err"]), f(B["pb"]), f(B["pb_err"]),
            fs(p["pd"]), f(p["pc"]), "yes" if p["p_in"] else "NO", f(p["p_beyond"])))
    add("")
    add("TABLE 3. Verdict and flags (rules 3 and 4; flags exactly as each reader wrote them)")
    h3 = "%-18s %-7s %-22s %-14s %-14s" % ("Mach symbol #", "verdict", "beyond by", "A flags", "B flags")
    add(h3)
    add("-" * len(h3))
    for p in pairs:
        if p["verdict"] == "AGREES":
            by = ""
        else:
            parts = []
            if p["d_beyond"] is not None:
                parts.append("d/h " + f(p["d_beyond"]))
            if p["p_beyond"] is not None:
                parts.append("p_b " + f(p["p_beyond"]))
            by = ", ".join(parts)
        add("%-18s %-7s %-22s %-14s %-14s" % (
            row_id(p), p["verdict"], by,
            p["A"]["flags_raw"] or "-", p["B"]["flags_raw"] or "-"))
    n_ag = sum(1 for p in pairs if p["verdict"] == "AGREES")
    n_be = sum(1 for p in pairs if p["verdict"] == "BEYOND")
    add("")
    add("COUNT: %d matched pairs; AGREES %d; BEYOND %d." % (len(pairs), n_ag, n_be))
    add("")
    add("FLAGS AND ALTERNATIVES CARRIED THROUGH (rule 4; text verbatim, not resolved)")
    any_flag = False
    for p in pairs:
        A, B = p["A"], p["B"]
        if not (A["flags_raw"] or B["flags_raw"] or A["alts_raw"] or B["alts_raw"]):
            continue
        any_flag = True
        add("  M=%s %s %d/%d  (A d/h %s, p_b %s; B d/h %s, p_b %s)" % (
            p["mach"], p["symbol"], p["n"], p["of"],
            f(A["dh"]), f(A["pb"]), f(B["dh"]), f(B["pb"])))
        add("    A flags: %s" % (A["flags_raw"] or "(none)"))
        add("    B flags: %s" % (B["flags_raw"] or "(none)"))
        add("    A alternatives: %s" % (A["alts_raw"] or "(none)"))
        add("    B alternatives: %s" % (B["alts_raw"] or "(none)"))
        if p["ambiguous"]:
            add("    Ambiguous in %s. Primary reading as given by both readers: M=%s %s."
                % ("both readers" if ("ambiguous" in A["flags"] and "ambiguous" in B["flags"])
                   else ("reader A only" if "ambiguous" in A["flags"] else "reader B only"),
                   p["mach"], p["symbol"]))
            add("    Paired here under that primary reading, by legend symbol and order.")
            add("    The alternatives above are listed, not resolved.")
    if not any_flag:
        add("  (no flags or alternatives in either CSV)")
    add("")

    # ---------------- summary ----------------
    add("=" * 78)
    add("SUMMARY: THINNEST MEASURED SYMBOL AT EACH MACH NUMBER")
    add("=" * 78)
    alt_re = re.compile(r"mach=(\d+(?:\.\d+)?)")
    machs = sorted({k[0] for k in groups}, key=lambda m: (MACH_ORDER.index(m) if m in MACH_ORDER else 99, m))
    for m in machs:
        add("")
        add("M = %s" % m)
        mins = {}
        for rd in ("A", "B"):
            cand = [r for r in data[rd] if r["mach"] == m and r["dh"] is not None]
            mins[rd] = min(cand, key=lambda r: r["dh"]) if cand else None
        mp = [p for p in pairs if p["mach"] == m and p["A"] is mins["A"] and p["B"] is mins["B"]]
        if len(mp) != 1:
            add("  The two readers' smallest-d/h symbols are not one matched pair.")
            add("  It cannot be paired.")
            continue
        p = mp[0]
        A, B = p["A"], p["B"]
        add("  Thinnest measured symbol: %s %d of %d (smallest d/h in this set for both readers)."
            % (p["symbol"], p["n"], p["of"]))
        add("    d/h: A %s (err %s), B %s (err %s); A-B %s, combined %s"
            % (f(A["dh"]), f(A["dh_err"]), f(B["dh"]), f(B["dh_err"]), fs(p["dd"]), f(p["dc"])))
        add("    p_b: A %s (err %s), B %s (err %s); A-B %s, combined %s"
            % (f(A["pb"]), f(A["pb_err"]), f(B["pb"]), f(B["pb_err"]), fs(p["pd"]), f(p["pc"])))
        add("    Flags: A %s; B %s" % (A["flags_raw"] or "none", B["flags_raw"] or "none"))
        # Ambiguous symbols that list this Mach number as an alternative.
        for q in pairs:
            if not q["ambiguous"] or q["mach"] == m:
                continue
            alts = set(alt_re.findall(q["A"]["alts_raw"])) | set(alt_re.findall(q["B"]["alts_raw"]))
            if m in alts:
                smaller = q["A"]["dh"] < A["dh"] or q["B"]["dh"] < B["dh"]
                add("    The ambiguous M=%s %s %d/%d (d/h A %s, B %s) lists M=%s as an"
                    % (q["mach"], q["symbol"], q["n"], q["of"], f(q["A"]["dh"]), f(q["B"]["dh"]), m))
                add("    alternative. Its d/h is %s than this symbol's in both readings, so"
                    % ("smaller" if smaller else "larger"))
                add("    it %s the thinnest under that alternative. Not resolved here."
                    % ("WOULD BE" if smaller else "would not be"))
        if p["verdict"] != "AGREES":
            parts = []
            if p["d_beyond"] is not None:
                parts.append("d/h beyond by " + f(p["d_beyond"]))
            if p["p_beyond"] is not None:
                parts.append("p_b beyond by " + f(p["p_beyond"]))
            add("  Verdict: BEYOND (%s). It cannot be paired." % "; ".join(parts))
            continue
        add("  Verdict: AGREES (d/h and p_b both within combined error).")
        if A["pb"] == B["pb"]:
            add("  p_b readings are equal (%s); the rule's least/most negative sides are"
                % f(A["pb"]))
            add("  not distinct. Plain envelope: %s. Widened by each reader's own error:"
                % f(A["pb"]))
            add("  A %s to %s; B %s to %s." % (f(A["pb"] - A["pb_err"]), f(A["pb"] + A["pb_err"]),
                                               f(B["pb"] - B["pb_err"]), f(B["pb"] + B["pb_err"])))
            continue
        hi, lo = (A, B) if A["pb"] > B["pb"] else (B, A)   # hi = least negative
        add("  Plain envelope of p_b (no widening):")
        add("    most negative  %s (reader %s)" % (f(lo["pb"]), lo["reader"]))
        add("    least negative %s (reader %s)" % (f(hi["pb"]), hi["reader"]))
        w_lo = lo["pb"] - lo["pb_err"]
        w_hi = hi["pb"] + hi["pb_err"]
        add("  Widened envelope (each end widened by its own reader's stated error, outward):")
        add("    most negative  %s = %s - %s (reader %s)" % (f(w_lo), f(lo["pb"]), f(lo["pb_err"]), lo["reader"]))
        add("    least negative %s = %s + %s (reader %s)" % (f(w_hi), f(hi["pb"]), f(hi["pb_err"]), hi["reader"]))
        add("  Envelope: plain [%s, %s]; widened [%s, %s]."
            % (f(lo["pb"]), f(hi["pb"]), f(w_lo), f(w_hi)))
        # Note where the inner reading's own band reaches past a widened end.
        if hi["pb"] - hi["pb_err"] < w_lo:
            add("  Note: reader %s's own band reaches %s on the more negative side, past the"
                % (hi["reader"], f(hi["pb"] - hi["pb_err"])))
            add("  widened end %s. As specified, only the outer reading is widened." % f(w_lo))
        if lo["pb"] + lo["pb_err"] > w_hi:
            add("  Note: reader %s's own band reaches %s on the less negative side, past the"
                % (lo["reader"], f(lo["pb"] + lo["pb_err"])))
            add("  widened end %s. As specified, only the outer reading is widened." % f(w_hi))
    add("")
    add("COUNT: AGREES %d, BEYOND %d, of %d matched pairs. Unpaired sets: %d."
        % (n_ag, n_be, len(pairs), len(unpaired)))
    txt = "\n".join(L) + "\n"
    if "\u2014" in txt or "\u2014" in csv_text:
        fail("output would contain an em dash")

    with open(os.path.join(OUT_DIR, "pairing.csv"), "w", encoding="utf-8", newline="") as fh:
        fh.write(csv_text)
    with open(os.path.join(OUT_DIR, "pairing.txt"), "w", encoding="utf-8", newline="") as fh:
        fh.write(txt)
    sys.stdout.write(txt)


if __name__ == "__main__":
    main()
