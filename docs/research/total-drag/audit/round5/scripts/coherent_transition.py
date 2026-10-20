"""Round 5: the transition input taken as one state of the boundary layer, not two independent ends.

0010 section 4.1 adds to the tolerance the friction change of the laminar runs (low side) and, on both sides,
the trailing edges' laminar band, which exists only where a run leaves a fin laminar at its trailing edge.
A fin laminar at its trailing edge is laminar over its whole chord, so its friction is then laminar too. Here
the high end of the transition input is taken over the states Re_T in {fully turbulent, 5e5, 1.6e6, 3e6}:
  friction change at Re_T + (the trailing-edge band's high end if Re_T >= Re_c, else 0),
and the low end likewise; and the friction change of the fins alone (the body may stay turbulent) is used for
the most favourable state with laminar fins and a turbulent body."""
import json
import math
import sys
import indep_lib as L
import bf_total_indep as B

res = json.load(open(sys.argv[1]))
print("shot        M      TE lam hi  fin friction laminar - turbulent  coherent high  as added  tolerance high"
      " too wide by (points)  vacuum excess removed")
for o in res:
    M, Rc = o["M"], o["ReL"] / 10
    Rec = Rc * B.CHORD
    ff_t = o["fin_friction"]
    ff_l = L.flat_plate_CF(Rec, M, B.T_AIR, ReT=1e12) * 2 * B.CHORD * B.SPAN * B.N_FIN / B.A_REF
    d_fins = ff_l - ff_t
    states = [0.0]
    for ReT, d in zip(B.RE_T, o["transition"]):
        if ReT >= Rec:
            states.append(d + o["te_lam_hi"])          # whole run (body and fins)
            states.append(d_fins + o["te_lam_hi"])     # fins laminar, body turbulent
        else:
            states.append(d)
    hi_coh = max(states)
    added = o["te_lam_hi"]
    print(f"{o['shot']} {M:.3f}  {added:+.4f}    {d_fins:+.4f}                            {hi_coh:+.4f}        "
          f"{added:+.4f}    {100 * (added - hi_coh) / o['total']:.2f}")
