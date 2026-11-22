"""Set-up trial: the cone's level 1 (Mach 2, corrected wedge) from cone3M2's level 0, with another gradient limiter."""
import os, shutil, sys
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import w6ref, ladder
root, grad = sys.argv[1], sys.argv[2]
iters = int(sys.argv[3]) if len(sys.argv) > 3 else 30000
src = "/tmp/claude-0/-home-user-bowshock/328f6bc6-7d2a-543f-a832-b5d31d25c169/scratchpad/of/cone3M2/L0"
if not os.path.exists(f"{root}/L0"):
    shutil.copytree(src, f"{root}/L0")
spec = w6ref.sharp_spec("cone", 3, 2.0)
ladder.run(root, spec, 2, [30000, iters], [1, 1], grad=grad, maxco=0.2)
