"""Chains of ink pieces (from comp8.py ids) for each curve of RM A52E01 fig. 8, assigned by me.

Wing identity by line style against the legend in the M = 0.925 panel of each page: wing 2 long
dashes, wing 3 short dashes, wing 4 long and short dashes alternating. See dashes8.py output and
method.md for the dash-length evidence and the calls I was unsure of.
"""

W2 = 'Wing 2 (long-dash line)'
W3 = 'Wing 3 (short-dash line)'
W4 = 'Wing 4 (long-and-short-dash line)'

PANELS = {
    'a_M0.6': dict(panel='M=0.6', curves={
        'left': dict(series=W3, style='short dash', chain=[
            75, 73, 71, 68, 66, 64, 55, 53, 46, 43, 40, 37, 33, 31, 29, 24, 21, 20, 19, 18, 17, 14, 13, 9]),
        'right': dict(series=W4, style='long and short dash', chain=[
            76, 74, 72, 70, 69, 67, 60, 57, 54, 47, 42, 38, 32, 30, 25, 22]),
    }),
    'a_M0.7': dict(panel='M=0.7', curves={
        'left': dict(series=W3, style='short dash', shared=[23], chain=[
            84, 75, 70, 65, 63, 58, 50, 46, 44, 41, 36, 34, 32, 28, 25, 23, 20, 18, 15, 13, 12, 10, 8, 6]),
        'middle': dict(series=W4, style='long and short dash', shared=[23], chain=[
            23, 26, 30, 35, 38, 40, 43, 47, 49, 56, 59, 66, 72, 73, 74, 77, 79, 80, 82]),
        'right': dict(series=W2, style='long dash', chain=[
            3, 4, 7, 9, 17, 21, 27, 31, 33, 39, 42, 45, 48, 54, 60, 67, 69, 71, 76, 83]),
    }),
    'a_M0.8': dict(panel='M=0.8', curves={
        'left': dict(series=W3, style='short dash', chain=[
            57, 54, 50, 47, 46, 43, 40, 38, 36, 34, 28, 25, 24, 20, 19]),
        'middle': dict(series=W4, style='long and short dash', chain=[
            18, 21, 26, 32, 35, 41, 44, 48, 51, 53, 56, 59, 63, 62]),
        'right': dict(series=W2, style='long dash', chain=[
            4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 22, 27, 33, 37, 42, 45, 49, 52, 55, 58, 61]),
    }),
    'a_M0.9': dict(panel='M=0.9', curves={
        'short': dict(series=W3, style='short dash', shared=[33], chain=[
            71, 66, 64, 59, 55, 51, 49, 44, 38, 36, 35, 33]),
        'other': dict(series=W4, style='long and short dash', idflag=('uncertain', 'line style read as long and short dash from dash lengths 65 38 145 68 42 97 px; alternative wing 2'), shared=[33], chain=[
            33, 37, 39, 45, 53, 56, 65, 67, 68, 69, 72]),
    }),
    'a_M0.925': dict(panel='M=0.925', curves={
        'short': dict(series=W3, style='short dash', shared=[98], chain=[
            79, 81, 83, 86, 92, 98, 106]),
        'loop': dict(series=W4, style='long and short dash', shared=[98], chain=[
            93, 94, 95, 98, 100, 101, 105, 104]),
        'right': dict(series=W2, style='long dash', chain=[
            75, 77, 78, 80, 82, 85, 87, 91, 99]),
    }),
    'b_M0.6': dict(panel='M=0.6', curves={
        'left': dict(series=W3, style='short dash', chain=[
            6, 7, 9, 12, 18, 20, 21, 24, 33, 35, 42, 45, 48],
            no_end=[1], boxes=[dict(alphas=[0.5, 1.0, 1.5, 2.0], anchor=-0.195, zero=True,
                        note='below alpha 2.1 this curve runs down the left edge of the x = -0.2 grid line to the '
                             'frame, its ink merged with that line and (alpha 1.2 to 2.1) with the other curve')]),
        'right': dict(series=W2, style='long dash', idflag=('uncertain', 'line style unclear: dashes of about 50 px near the top then one long unbroken stroke, no short dashes seen; read as wing 2, alternative wing 4'), chain=[
            4, 8, 10, 13, 19, 25, 40, 44, 51, 53, 54],
            boxes=[dict(alphas=[1.5, 2.0, 2.5, 3.0, 3.5], anchor=-0.2, skip=(1.4, 3.6),
                        note='from about alpha 1.3 to 3.8 this curve runs on the x = -0.2 grid line, its ink '
                             'merged with that line and with the wing 3 curve')]),
    }),
    'b_M0.7': dict(panel='M=0.7', curves={
        'one': dict(series=W4, style='long and short dash', chain=[
            3, 4, 5, 6, 7, 8, 12, 21, 28, 34, 40, 43, 45, 49, 52]),
        'short': dict(series=W3, style='short dash', chain=[
            10, 9, 13, 14, 26, 30, 33, 39, 41, 48, 51, 54, 55]),
        'right': dict(series=W2, style='long dash', chain=[
            15, 22, 27, 29, 31, 36, 42, 44, 46, 47, 50, 53]),
    }),
    'b_M0.8': dict(panel='M=0.8', curves={
        'short': dict(series=W3, style='short dash', chain=[
            8, 13, 16, 19, 22, 24, 27, 28, 31, 33, 38]),
        'middle': dict(series=W4, style='long and short dash', chain=[
            6, 9, 12, 15, 20, 23, 26, 29, 32, 35, 36, 39]),
        'right': dict(series=W2, style='long dash', chain=[
            14, 21, 25, 30, 34, 37, 40]),
    }),
    'b_M0.9': dict(panel='M=0.9', curves={
        'left': dict(series=W3, style='short dash', chain=[
            10, 11, 13, 17, 19, 20, 27, 28, 32]),
        'hook': dict(series=W4, style='long and short dash', idflag=('uncertain', 'only three strokes (about 119, 44, 84 px); read as long and short dash, alternative wing 2'), chain=[
            21, 23, 29, 30, 31]),
    }),
    'b_M0.925': dict(panel='M=0.925', curves={
        'left': dict(series=W3, style='short dash', chain=[
            64, 65, 66, 67, 68, 69, 71, 74, 77, 83, 84, 87, 89]),
        'middle': dict(series=W4, style='long and short dash', idflag=('uncertain', 'few strokes (about 61, 43, 65 px); read as long and short dash, alternative wing 2'), chain=[
            79, 80, 81, 86, 88, 91]),
        'right': dict(series=W2, style='long dash', chain=[
            72, 73, 75, 78, 85, 90, 92]),
    }),
    'a_M1.2-1.7': dict(panel='M=1.2, 1.4, 1.7', curves={
        'M1.7 A': dict(series=W3, style='short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.7 (arrow); dashes about 35 px'),  chain=[
            162, 137, 135, 131, 123, 118, 111, 99, 92, 80, 74, 62, 55]),
        'M1.7 B': dict(series=W4, style='long and short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.7; strokes 106 49 118 58 116 45 82 px alternate; along the x = -0.2 grid line from alpha 7.8 to 5.1; crosses curve M1.7 C near alpha 4.4 (continuity call)'),  shared=[117], chain=[
            56, 63, 88, 95, 103, 117, 129, 139, 147, 150, 159]),
        'M1.7 C': dict(series=W2, style='long dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.7; strokes 72 to 105 px; top (alpha 11.9 to about 13.6) merged with the third M = 1.7 arrow head'), manual_ends=[dict(x=-0.277, xe=0.004, y=13.6, ye=0.08, note='top of the stroke above the third M = 1.7 arrow head')], boxes=[dict(alphas=[12.0, 12.5, 13.0, 13.5], anchor=-0.27, note='curve continues above alpha 11.9 to about 13.6 with its ink merged with the third M = 1.7 arrow head')], no_end=[0],  shared=[117, 156], chain=[
            35, 49, 64, 76, 81, 97, 104, 117, 124, 133, 138, 149, 156]),
        'M1.4 L1': dict(series=W3, style='short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.4; dashes 30 to 44 px; runs down the left edge of the x = -0.4 grid line from alpha 5.4 to 0.6'), boxes=[dict(alphas=[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0], anchor=-0.395, skip=(0.7, 5.3), note='this curve runs down the left edge of the x = -0.4 grid line here, its ink merged with the line and with curve M1.4 L2')],  chain=[
            25, 36, 46, 65, 77, 89, 93, 105, 115, 163]),
        'M1.4 L2': dict(series=W2, style='long dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.4; dash pattern mixed (30 17 33 78 47 47 46 91 px), wing 2 by elimination, alternative wing 4; on the x = -0.4 grid line from alpha 6.2 down to 0.9'), boxes=[dict(alphas=[3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0], anchor=-0.402, skip=(2.8, 6.1), note='this curve runs on the x = -0.4 grid line here, its ink merged with the line and with curve M1.4 L1')],  shared=[157], chain=[
            24, 37, 41, 66, 87, 94, 134, 141, 157]),
        'M1.4 R': dict(series=W4, style='long and short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.4; strokes 97 102 55 119 47 91 px alternate; above alpha 9.2 on the x = -0.4 grid line under the arrow heads, top end not fixed (between alpha 10 and 12.2)'), boxes=[dict(alphas=[10.0, 10.5, 11.0, 11.5, 12.0], anchor=-0.405, note='above alpha 9.2 this curve runs on the x = -0.4 grid line, merged with the line and the M = 1.4 arrow heads; its top end cannot be fixed')], no_end=[0],  shared=[157], chain=[
            67, 75, 82, 96, 107, 116, 122, 126, 142, 146, 152, 157]),
        'M1.2 G1': dict(series=W2, style='long dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.2; strokes 68 100 107 px; above alpha 4.3 merged with the x = -0.5 grid line, curve M1.2 G3 and an arrow; top taken as the vertical stroke reaching alpha 7.35'), manual_ends=[dict(x=-0.516, xe=0.004, y=7.34, ye=0.08, note='top of the vertical stroke at x about -0.52, taken as this curve top')], boxes=[dict(alphas=[4.5, 5.0, 5.5, 6.0, 6.5, 7.0], anchor=-0.517, note='above alpha 4.3 this curve is merged with the x = -0.5 grid line, curve M1.2 G3 and the third M = 1.2 arrow; box = merged ink')], no_end=[1],  chain=[161, 153, 143, 127, 121]),
        'M1.2 G2': dict(series=W3, style='short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.2; dashes about 30 px; top under the second M = 1.2 arrow head (box at alpha 7 and 7.5)'), boxes=[dict(alphas=[7.0, 7.5], anchor=-0.468, note='top part under the second M = 1.2 arrow head')], no_end=[0],  chain=[98, 114, 120, 130, 132, 136, 144, 154, 160]),
        'M1.2 G3': dict(series=W4, style='long and short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.2; strokes 86 65 50 88 47 92 px alternate; top is the hook at alpha 10 (first M = 1.2 arrow); from alpha 8 to 4.9 merged with the x = -0.5 grid line and curve M1.2 G1'), boxes=[dict(alphas=[5.0, 5.5, 6.0, 6.5, 7.0, 7.5], anchor=-0.506, skip=(4.95, 8.0), note='from alpha 8 to 4.9 this curve runs on the x = -0.5 grid line, merged with it, with curve M1.2 G1 and with an arrow')],  chain=[53, 71, 119, 128, 145, 155, 158]),
    }),
    'b_M1.2-1.7': dict(panel='M=1.2, 1.4, 1.7', curves={
        'M1.7 short': dict(series=W3, style='short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.7; dashes 25 to 38 px; crossed by the second M = 1.7 arrow head near alpha 4.6 to 5.1'),  chain=[15, 35, 48, 57, 69, 74, 78]),
        'M1.7 mid': dict(series=W2, style='long dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.7; long strokes (201 92 134 px); crossed by arrow heads at alpha 6.6 to 8 and 2.6 to 3.6'), boxes=[dict(alphas=[7.0, 7.5, 8.0], anchor=-0.285, skip=(6.65, 8.05), note='ink merged with the first M = 1.7 arrow head'), dict(alphas=[3.0, 3.5], anchor=-0.29, skip=(2.65, 3.6), note='ink merged with the third M = 1.7 arrow head')],  chain=[4, 11, 16, 28, 39, 52, 63]),
        'M1.7 third': dict(series=W4, style='long and short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.7; only one clear stroke (alpha 0.2 to 1.65), wing 4 by elimination; above alpha 1.7 merged with curve M1.7 mid and the third arrow head'),  chain=[70]),
        'M1.4 left': dict(series=W4, style='long and short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.4; strokes 31 53 109 35 15 89 px roughly alternate'),  chain=[17, 20, 32, 40, 58, 60, 71]),
        'M1.4 mid': dict(series=W2, style='long dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.4; strokes 76 82 72 36 px; partly on the x = -0.4 grid line from alpha 2.7 to 3.6'),  chain=[23, 46, 53, 65, 76]),
        'M1.4 right': dict(series=W3, style='short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.4; dashes 27 to 40 px; top merged with an arrow head near alpha 4.7 to 5.9'), boxes=[dict(alphas=[5.0, 5.5], anchor=-0.465, note='top part merged with an M = 1.4 arrow head')], no_end=[0],  chain=[34, 41, 49, 59, 66, 73, 77]),
        'M1.2 paren': dict(series=W2, style='long dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.2; only two curves at M = 1.2 in this panel; strokes 74 131 76 53 px, read as wing 2, alternative wing 4'),  shared=[54, 75], chain=[27, 45, 54, 67, 75]),
        'M1.2 short': dict(series=W3, style='short dash', idflag=('uncertain', 'supersonic panel: curves of three Mach numbers overlap, run along grid lines and are crossed by the label arrows; Mach number from the label arrows and continuity, wing from dash lengths only; M = 1.2; dashes 18 to 53 px; top merged with an M = 1.2 arrow head near alpha 4.5 to 5.1'), boxes=[dict(alphas=[4.5, 5.0], anchor=-0.565, note='top part merged with an M = 1.2 arrow head')], no_end=[0],  shared=[75], chain=[37, 43, 50, 55, 68, 72, 75]),
    }),
}
