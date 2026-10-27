"""Write tnd5392_table{1,2,3}.csv from reader B's transcriptions.

usage: python3 -I build_tnd.py outdir
Value notation: a bracket [abc] marks a digit whose glyph is degraded;
the first character is the reading given, the others are the
alternatives. Alternatives are written as every single-digit substitution
and, when two or more digits are uncertain, the all-alternative
combination for each further option index.
"""
import csv
import itertools
import os
import re
import sys

out = sys.argv[1]

# orifice: (label as printed in table I(a), phi deg, s/d)
POS = """1 0 .0000;2* 0 .0267;3 0 .0533;4* 0 .0800;5 0 .1067;6* 0 .1333;7 0 .1600;8* 0 .1867;9 0 .2133;10* 0 .2400;
11 0 .2667;12* 0 .2933;13 0 .3200;14* 0 .3467;15 0 .3733;16* 0 .4000;17 0 .4267;18 0 .4533;19 0 .4800;20 0 .5600;
21 0 .6133;22 0 .6667;23 0 .7200;24 0 .7733;25* 45 .0400;26* 45 .0800;27* 45 .1333;28* 45 .1867;29* 45 .2400;30* 45 .2933;
31* 45 .3467;32* 45 .4000;33 45 .4533;34 45 .5600;35 45 .6133;36 45 .6667;37 45 .7200;38 45 .7733;39* 90 .0267;40* 90 .0533;
41* 90 .0800;42* 90 .1067;43* 90 .1333;44* 90 .1867;45* 90 .2400;46* 90 .2933;47* 90 .3467;48* 90 .4000;49 90 .4400;50 90 .5600;
51 90 .6133;52 90 .6667;53 90 .7200;54 90 .7733;55 90 .0267;56* 180 .0533;57* 180 .0800;58 180 .1067;59* 180 .1333;60* 270 .0267;
61* 270 .0533;62* 270 .0800;63* 270 .1067;64* 270 .1333;65* 180 .1867;66* 180 .2400;67* 180 .2933;68* 180 .3467;69* 180 .4000;70* 270 .1867;
71* 270 .2400;72* 270 .2933;73* 270 .3467;74* 270 .4000"""
pos = []
for item in POS.replace("\n", "").split(";"):
    lab, phi, sd = item.split()
    pos.append([lab, phi, sd])

T1 = """.9[95]70 .9[95]74 .9964 .9[95]64 .9[95]51 .9[95]39 .9875 .9870 .9812 .9795
.9736 .9677 .959[98] .9508 .9370 .9203 .8941 .8574 .7855 .0329
.0227 .0227 .0227 .0240 .9[95]81 .9964 .9[95]40 .9886 .9804 .96[95][89]
.9518 .9232 .8612 .0329 .0227 .0227 .0227 .0240 .9970 .9[95]68
.995[98] .9949 .9925 .9882 .9792 .9682 .9523 .9208 .8587 .0329
.0227 .0227 .0227 .1857 .9964 .9958 .9[95]47 .9[95]38 .9[95]20 .9[95]72
.9[95]64 .[95][95]62 .9[95]53 .[95][95]29 .9867 .9793 .9677 .9519 .920[98] .9866
.9798 .9686 .9525 .9160""".split()
T2 = """.9967 .9967 .9928 .9951 .[95]9[06][89] .9923 .9[83]27 .9863 .9786 .[95]7[89]2
.96[89]5 .[95]664 .9542 .9490 .[95]319 .920[89] .[89]934 .856[89] .7[86]37 .0304
.01[98]3 .01[64]3 .01[89]3 .0203 .9965 .[95]950 .9919 .[95]866 .[95]792 .966[89]
.[95]4[95]7 .9[27]05 .[86]547 .0324 .01[98]3 .0193 .01[89]3 .0183 .9964 .[95]960
.9950 .99[27]7 .9913 .9853 .[95]773 .9656 .[95]497 .91[927]2 .85[27]7 .0324
.01[89]3 .01[89]3 .01[89]3 .0791 .9978 .[95]955 .9943 .990[98] .990[98] .9967
.9961 .9954 .9940 .9914 .[59][89]44 .977[72] .965[98] .[95]500 .920[89] .[95]853
.9769 .[95]65[27] .9484 .[95]1[37]4""".split()
T3 = """.9843 .9843 .9812 .9839 .9812 .9809 .9687 .9765 .9687 .96[95]0
.9589 .9579 .9465 .9417 .9266 .9149 .8867 .8520 .7776 .0323
.0174 .0174 .0174 .0174 .9853 .9840 .9822 .9778 .9707 .9593
.9433 .9156 .8495 .0323 .0174 .0199 .0174 .0174 .9840 .9843
.9836 .982[98] .9814 .9766 .9700 .9589 .9420 .9133 .8471 .0323
.0174 .0174 .0174 .0670 .978[89] .9828 .9822 .9788 .9786 .9839
.9831 .9826 .9814 .9794 .9737 .9680 .9581 .9423 .9141 .9748
.9683 .9584 .9437 .9104""".split()
assert len(T1) == 74 and len(T2) == 74 and len(T3) == 74, (len(T1), len(T2), len(T3))

# glyph notes per table and orifice (1-based)
NOTE = {
    1: {28: "orifice label printed with a broken second digit (looks like 29* or 2A*); taken as 28 from its row position"},
    2: {28: "orifice label printed with a broken second digit (looks like 2A*); taken as 28 from its row position",
        62: "s/d printed .0833 in this table (.0800 in tables I(a) and III(a)); position given as printed",
        59: "third digit printed as the right half of a 0 only; read 0",
        20: "first digit printed as an open-bottomed 0",
        24: "zeros printed open-bottomed",
        54: "first digit printed as a left-half 0",
        36: "first digit printed as a C-shaped 0",
        38: "first digit printed as a C-shaped 0"},
    3: {11: "orifice label printed 11* in this table (11 without asterisk in tables I(a) and II(a))"},
}
GLYPH = {"95": "S-shaped glyph (rounded top, open upper right) read as 9; alternative 5",
         "59": "flat-topped 5 read as 5; alternative 9 (degraded)",
         "98": "9 with a short extra left stroke; alternative 8",
         "89": "A-shaped glyph (closed top loop, two legs) read as 8; alternative 9",
         "83": "8 with a gap on the left; alternative 3",
         "86": "broken glyph read as 8; alternative 6",
         "06": "C-shaped glyph read as 0; alternative 6",
         "64": "broken glyph read as 6; alternative 4",
         "27": "glyph with rounded top and no bottom bar read as 2; alternative 7",
         "72": "glyph with flat top and no bottom bar read as 7; alternative 2",
         "927": "question-mark-shaped glyph read as 9; alternatives 2, 7",
         "37": "partial 3 (upper half and a stub); alternative 7"}


def expand(s):
    parts = re.findall(r"\[[0-9]+\]|.", s)
    opts = [p[1:-1] if p.startswith("[") else p for p in parts]
    primary = "".join(o[0] for o in opts)
    unc = [i for i, o in enumerate(opts) if len(o) > 1]
    alts = []
    for i in unc:
        for c in opts[i][1:]:
            v = [o[0] for o in opts]
            v[i] = c
            alts.append("".join(v))
    if len(unc) > 1:
        for k in range(1, max(len(opts[i]) for i in unc)):
            v = [o[0] for o in opts]
            for i in unc:
                if k < len(opts[i]):
                    v[i] = opts[i][k]
            a = "".join(v)
            if a not in alts:
                alts.append(a)
    reasons = []
    for i in unc:
        reasons.append("digit %d: %s" % (i, GLYPH.get(opts[i], "degraded glyph, options " + opts[i])))
    return primary, alts, reasons


tabs = [(1, "table I(a)", "2.49", 13, T1), (2, "table II(a)", "4.06", 31, T2), (3, "table III(a)", "4.63", 49, T3)]
cols = ["source", "item", "model", "mach", "reynolds", "position", "position_quantity", "location",
        "value", "value_quantity", "alternatives", "flag", "page", "note"]
for t, item, mach, page, vals in tabs:
    rows = []
    for k, (p, v) in enumerate(zip(pos, vals), start=1):
        lab, phi, sd = p
        if t == 2 and k == 62:
            sd = ".0833"
        if t == 2 and k == 11:
            lab = "11"
        if t == 3 and k == 11:
            lab = "11*"
        primary, alts, reasons = expand(v)
        loc = "face" if float(sd) < 0.5 else "afterbody"
        notes = ["orifice %s%s" % (lab, " (asterisk: measured by 1-psi gage)" if lab.endswith("*") else ""),
                 "phi = %s deg" % phi, "alpha = 0 deg column"]
        if loc == "afterbody":
            notes.append("s/d > s2/d = 0.500, so on the cylindrical afterbody")
        notes += reasons
        if k in NOTE.get(t, {}):
            notes.append(NOTE[t][k])
        notes.append("read from the page image at 300 dpi (text layer not used for values)")
        rows.append({"source": "TN D-5392", "item": item,
                     "model": "model 1 (flat-face cylinder; rn/d = infinity, rc/d = 0)",
                     "mach": mach, "reynolds": "1.88 x 10^6",
                     "position": sd,
                     "position_quantity": "s/d (surface length from the axis of symmetry over afterbody diameter d = 7.5 in.) on meridian phi = %s deg" % phi,
                     "location": loc, "value": primary,
                     "value_quantity": "p_l/p_t,2 (local surface pressure over stagnation pressure behind a normal shock at the free-stream Mach number), as the table heads it",
                     "alternatives": ";".join(alts), "flag": "ambiguous" if alts else "ok",
                     "page": page,
                     "note": "; ".join(notes) + "; Reynolds number based on afterbody diameter (text)"})
    with open(os.path.join(out, "tnd5392_table%d.csv" % t), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    print(item, len(rows), "rows,", sum(r["flag"] != "ok" for r in rows), "flagged,",
          sum(r["location"] == "face" for r in rows), "face,", sum(r["location"] == "afterbody" for r in rows), "afterbody")
