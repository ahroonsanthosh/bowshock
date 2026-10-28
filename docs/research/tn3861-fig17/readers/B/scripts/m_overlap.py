# Strokes that overlap a grid line, and faint strokes, on the de-jogged image.
import sys
sys.path.insert(0, sys.argv[1])
import measure_lib as M
ink = M.load(sys.argv[2])
# grid line alone is measured just above or below the symbol, in the same columns (the line tilts 0.0065 px/row: < 0.3 px over 40 rows)
print('#8 cross vertical vs Mc 2.0 grid line:', M.residual_stroke(ink, 'v', 964, 977, [(985, 1000)], [(1014, 1019), (1030, 1034)]))
print('#9 right side vs Mc 2.0 grid line:  ', M.residual_stroke(ink, 'v', 964, 979, [(1067, 1095)], [(1045, 1050), (1054, 1062)]))
print('#15 right side vs Mc 3.5 grid line: ', M.residual_stroke(ink, 'v', 1332, 1346, [(1100, 1127)], [(1133, 1143), (1150, 1158)]))
print('#21 right side vs Mc 6.0 grid line: ', M.residual_stroke(ink, 'v', 1944, 1960, [(1165, 1190)], [(1144, 1148), (1152, 1156)]))
print('#15 top (faint):', M.faint_side(ink, 'h', 1126, 1137, [(1316, 1323), (1331, 1335)]))
