import json, sys
B = sys.argv[1]
V = [513.2,598.5,682.2,766.0,849.1,933.2,1017.2,1100.7,1184.1,1267.3,1350.7,1433.8,1516.8,1600.0,1683.3,1766.6,1850.0]
xv = [9.0+0.25*i for i in range(17)]
lab_x = {9.0,9.5,10.0,10.5,11.0,11.5,12.0}
vlines = [[u, x, x in lab_x] for u, x in zip(V, xv)]
def hl(v0, n, labs):
    out=[]
    for i in range(n):
        y = round(0.02 - 0.02*i, 2)
        out.append([v0 + 83.2*i, y, y in labs])
    return out
spec = {"name":"e51_f7","image":B+"/render/e51/p29-000.jpg","page":29,"thr":150,"panels":{
 "a":{"hlines":hl(334.8,8,{0.0,-0.04,-0.08,-0.12}),"vlines":vlines,"uspan":[520,1845],"vspan":[340,912],"nstrips":20},
 "b":{"hlines":hl(1000.4,10,{0.0,-0.04,-0.08,-0.12,-0.16}),"vlines":vlines,"uspan":[520,1845],"vspan":[1006,1744],"nstrips":20},
 "c":{"hlines":hl(1831.0,10,{0.0,-0.04,-0.08,-0.12,-0.16}),"vlines":vlines,"uspan":[520,1845],"vspan":[1838,2575],"nstrips":20}}}
json.dump(spec, open(B+"/work/f7.json","w"), indent=1)
