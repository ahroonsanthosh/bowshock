import sys
sys.path.insert(0, sys.argv[1])
import digi
p = digi.load(sys.argv[2])
x0,y0,x1,y1 = map(int, sys.argv[3:7])
chars = " .:-=+*#%@"
print("     " + "".join(str((x//10)%10) if x%10==0 else " " for x in range(x0,x1)))
for y in range(y0,y1):
    print(f"{y:5d}" + "".join(chars[min(9,int(p[y,x]*10))] for x in range(x0,x1)))
