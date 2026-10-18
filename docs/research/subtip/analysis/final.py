import json,math
S='/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip'
TM={'B':0.6380660296069672,'C':0.4427412179358325,'D':0.5984059618373814}
def load(f):
    F={}
    for l in open(f'{S}/{f}'):
        d=json.loads(l)
        if d.get('anchor') is None and d['start']==1e-3: F[(d['id'],d['nj'])]=d
    return F
def gc(v):
    f1,f2,f3=v; ratio=(f1-f2)/(f2-f3); p=math.log2(ratio) if ratio>0 else float('nan')
    g=2**min(p,2)-1; return ratio,p,f3+(f3-f2)/g,1.25*abs(f2-f3)/g
cap={}
for f in ('captured-run1.jsonl','captured.jsonl'):
    for l in open(f'{S}/{f}'):
        d=json.loads(l)
        if d['kind']=='captured-result': cap[d['id']]=d['result']
for name,f in (('unpatched','fits.jsonl'),('corner one-sided','fits2.jsonl')):
    F=load(f)
    for cid in 'ABCDE':
        if not all((cid,n) in F for n in (20,40,80)): continue
        v=[F[(cid,n)]['drag'] for n in (20,40,80)]
        ratio,p,ext,band=gc(v)
        s=f"{name:16} {cid} {' '.join(f'{x:.7f}' for x in v)} ratio={ratio:.3f} p={p:.2f} ext={ext:.7f} band={band:.2e} ({band/ext:.1e} rel)"
        if cid=='D': s+=f" | vs exact: errs {' '.join(f'{x/TM[cid]-1:+.3e}' for x in v)} ext {ext/TM[cid]-1:+.3e}, band contains exact: {abs(ext-TM[cid])<=band}"
        if cid in cap:
            r=cap[cid]; val=r['estimate']['value']; u=r['uncertainty']
            s+=f" | captured {val:.7f} +- {u:.2e} [{val-u:.7f},{val+u:.7f}] ext inside: {abs(ext-val)<=u}; fine80 inside: {abs(v[2]-val)<=u}; ext-captured {(ext-val)/val:+.2e}"
        print(s)
