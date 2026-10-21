# 0018: OpenRocket import

- **Status:** Implemented as a library, no interface: `src/import/`
  reads a `.ork` file into a typed mirror of OpenRocket's rocket and maps
  that into `RocketDesign` (`src/rocket/design.ts`, design record 0017
  section 4.1). The page's import flow and the adapter that decides what
  the drag logic can represent (0017 section 4.2) are the interface's.
- **Date:** 2026-10-21
- **Inputs:** OpenRocket's file loader and savers, read to learn the
  format and not copied (github.com/openrocket/openrocket at
  `591c5e5f7b7377e48f2bd5e501cef25cdfbd61d8`, GPLv3: `core/.../file/
GeneralRocketLoader.java`, `GeneralRocketSaver.java`,
  `file/openrocket/importt/` and `savers/`, `rocketcomponent/` and
  `aerodynamics/barrowman/FinSetCalc.java`); its sixteen example designs;
  `src/geometry/nose.ts`; `src/rocket/design.ts` (commit `e0f4332`).
- **The owner's rule:** accuracy above everything. Every component in the
  file ends up held in the design exactly, held as far as the design can
  hold it with a note saying what is missing, or ignored with the reason;
  nothing is approximated and nothing outside the body is dropped.

Every rule below is asserted by a test in `tests/import/` (section 6).

## 1. What it does

```ts
import { importOrk, OrkReadError } from './src/import';

const { document, mapping } = await importOrk(bytes, { fileName: 'my.ork' });
// document: OrkDocument, the mirror of the file (section 3)
// mapping.design: RocketDesign | null (section 4)
// mapping.represented, notRepresented, ignored: every component, with how or why
// mapping.otherPartDetails: each of design.otherParts, same order, with its size and place
// mapping.finishes: each outside component's finish and roughness height
// mapping.flightFrom: where design.flight came from
```

`readOrk(bytes)` gives the mirror alone and `mapOrk(document, options)`
maps one. Every failure to read is an `OrkReadError` with a `kind`
(`not-openrocket`, `corrupt`, `too-large`, `unsupported`,
`malformed-xml`) and a plain sentence; no input makes the reader throw
anything else (two property tests feed it damaged, truncated and random
bytes).

## 2. The file

### 2.1 Containers

OpenRocket has written three containers, told apart by their first bytes
exactly as OpenRocket's own loader tells them
(`GeneralRocketLoader.loadStep1`):

| First bytes   | Container                               | Written by                         |
| ------------- | --------------------------------------- | ---------------------------------- |
| `PK`          | ZIP archive, the design in `rocket.ork` | OpenRocket 13.04 and later, always |
| `1f 8b`       | gzip-compressed XML                     | older versions, "compress" option  |
| anything else | plain XML                               | older versions                     |

In a ZIP archive the design is, as in OpenRocket, the first entry whose
name ends in `.ork` (OpenRocket writes it first as `rocket.ork`, then
`decals/`, `preview.png` since format 1.11, and `thrustcurves/*.rse`). An
archive holding a `.rkt` or `.cdx1` entry is a RockSim or RASAero design
and is refused with that said.

The ZIP reader (`src/import/container.ts`, with inflation and the CRC
about 300 lines) needs no dependency. It reads the end-of-central-directory record and the
central directory, because OpenRocket writes its entries with data
descriptors (flag bit 3): their local headers carry no sizes. Every
offset is checked against the file; ZIP64, multi-part archives,
encrypted entries and methods other than stored (0) and deflated (8) are
refused by name. Each entry's length and CRC-32 are checked after
inflation.

Inflation uses the platform's `DecompressionStream` (`deflate-raw` and
`gzip`: Chrome 103, Firefox 113, Safari 16.4, Node 18 and later), read
chunk by chunk.

**Zip bombs.** The design may inflate to at most 64 MiB
(`DEFAULT_MAX_INFLATED_BYTES`, an option). A ZIP entry declaring more is
refused before any inflation; a ZIP entry is inflated only up to its
declared size (more output is damage); gzip output is counted as it
comes and the stream cancelled at the limit. OpenRocket's own examples
inflate to 0.26 to 1.6 MB, nearly all of it simulation results; the
refusal tells the user to save without simulation data if a real design
is larger.

### 2.2 Text and XML

The text's encoding comes from a byte-order mark or the XML declaration
(UTF-8 by default; OpenRocket writes `encoding='utf-8'`), decoded by
`TextDecoder` with `fatal: true`.

The XML reader (`src/import/xml.ts`) is written here rather than taken
from a dependency, so that the browser and the tests run the same code
(Node has no `DOMParser`). It takes elements, attributes, the five
predefined entities, character references, CDATA, comments and
processing instructions, normalises line ends and attribute white space
as XML 1.0 requires, and refuses anything not well-formed with the
character offset. It refuses a document type declaration outright:
OpenRocket never writes one, and refusing it rules out entity expansion
attacks. Nesting is limited to 256. The simulations' time series
(`<databranch>`, most of a file's bulk) and display settings
(`<photostudio>`, `<docprefs>`, `<datatypes>`) are checked but not kept.

It was checked against Python's `xml.etree.ElementTree` on all sixteen of
OpenRocket's example designs: the same tree (names, attributes, text) for
every element kept (a one-off check, not a test, since the tests take no
Python).

**No dependency was added.**

## 3. The format, and the mirror

`OrkDocument` (`src/import/model.ts`) holds the format version and
creator of `<openrocket>`, the first `<rocket>` (as OpenRocket, later ones
are ignored with a warning), each simulation's launch altitude and
summary result (`<flightdata maxmach ...>`), and the reader's warnings.
`OrkRocket` holds its stages; each stage and component holds its
children in the file's order.

Components, by element (`DocumentConfig.constructors` in OpenRocket):
`nosecone`, `transition`, `bodytube`, `trapezoidfinset`,
`ellipticalfinset`, `freeformfinset`, `tubefinset`, `launchlug`,
`railbutton`, `innertube`, `tubecoupler`, `engineblock`, `centeringring`,
`bulkhead`, `masscomponent`, `shockcord`, `parachute`, `streamer`,
`stage`, `parallelstage` (and its older name `boosterset`), `podset`. An
element of any other name is kept as `unknown`, with a warning.

Each keeps every attribute the outside could depend on, in metres and
degrees as stored: lengths, radii (with OpenRocket's "automatic" flag),
thickness (or `filled`), shape and shape parameter, shoulders, the flipped
flag, fin count, root and tip chord, sweep length, height, fin points,
thickness, cross section, cant, tab, fillet radius and material, angle
and radius offsets, instance counts and separations, the motor mount's
overhang and motors, the finish and material, the drag and mass
overrides, and the position with its reference.

How OpenRocket reads them, and so how the mirror does:

- **Order.** Parameters are applied in the file's order, so a later
  element overrides an earlier: each position is written twice
  (`<axialoffset method>` and the older `<position type>`), each fin count
  twice (`<instancecount>`, `<fincount>`), each fin's roll twice
  (`<angleoffset>`, `<rotation>`). Setting a shape resets the shape
  parameter to that shape's default (ogive 1, power 0.5, parabolic 1,
  Haack 0, others 0), so a parameter written before its shape is lost, as
  in OpenRocket.
- **Numbers** are read as Java's `Double.parseDouble` reads decimal
  numbers (an `f` or `d` suffix allowed); anything else, and `NaN` or
  `Infinity`, is reported and read as absent.
- **Automatic radii** are written `auto 0.0125` (the radius OpenRocket
  computed when saving) or, in older files, `auto` alone; the mirror keeps
  both the flag and the number.
- **Defaults.** Where an element every version writes is absent (`cant`,
  `crosssection`, `finish`, `shape`), OpenRocket's default is taken and
  said in a warning. Elements added in later versions (`filletradius`,
  `isflipped`, `radiusoffset`, tabs) take OpenRocket's default silently,
  since older files lack them by design. A missing dimension stays
  absent, and the mapping says the file does not give it.
- **Positions** (`AxialMethod`): `after` (the default, not written) puts
  a component behind the previous sibling; `top` measures from the
  parent's front to the component's front, `middle` between their
  middles, `bottom` from the parent's aft end to the component's aft end,
  `absolute` from the rocket's tip. OpenRocket sets a relative position
  under 1 micrometre to zero, and so does the mapping. A component's
  length for placing is OpenRocket's `getLength()`: a fin set's root
  chord (a freeform's last point), a mass object's packed length, a rail
  button's zero, a stage's or pod set's sum of its `after` children.
- **Where OpenRocket attaches what** (`isCompatible`): a rocket takes
  stages; stages, pod sets and parallel stages take nose cones, body tubes
  and transitions; a body tube takes pods, boosters, inside components
  and outside components other than body sections; nose cones and
  transitions take inside components and freeform fin sets; inner tubes,
  couplers and mass components take inside components. OpenRocket's
  loader ignores anything else with everything in it; the mapping says
  so and ignores it too.

## 4. The mapping into RocketDesign

`mapOrk` fills `RocketDesign` completely: what the design can hold, it
holds as it is; what it cannot, it holds as far as it can, with a
`DesignNote` saying what is missing. Whether the drag logic can represent
the design is the adapter's question (0017 section 4.2): the adapter
names each feature it cannot represent, with its reason, so nothing here
judges the drag.

### 4.1 The table

| In the file                                                                     | In the design                                                                          | Note                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| the first nose cone (not flipped)                                               | `nose`: its `NoseShape` (4.2), length, diameter twice the aft radius                   |                                                                   |
| every stage's body tubes, front to back                                         | `body`: a `tube` each, its length and diameter                                         |                                                                   |
| transitions                                                                     | `body`: a `transition`, length, fore and aft diameters, `NoseShape`                    | if OpenRocket clips its profile (4.4)                             |
| a flipped nose cone (a tail cone), or a nose cone not first                     | `body`: a `transition` to or from diameter 0, its shape                                |                                                                   |
| trapezoidal fin sets                                                            | `finSets`: `trapezoidal`, root and tip chord, span (OpenRocket's height), sweep length |                                                                   |
| elliptical fin sets                                                             | `finSets`: `elliptical`, root chord, span                                              |                                                                   |
| freeform fin sets                                                               | `finSets`: `freeform`, the points; `trapezoidal` when the outline is exactly one (4.3) |                                                                   |
| fin section square / rounded / airfoil                                          | `flat` with square edges / `flat` with rounded edges / `airfoil` (4.3)                 | an unknown name: OpenRocket's default, square, noted              |
| fin thickness, cant, fillet radius, roll                                        | `thickness`, `cant`, `filletRadius`, `rotation`                                        |                                                                   |
| fin position                                                                    | `rootLeadingEdge`, from the nose's tip, by OpenRocket's position rules                 |                                                                   |
| identical fin sets at one position, evenly spaced together                      | one fin set of all their fins (4.3)                                                    |                                                                   |
| launch lugs                                                                     | `otherParts`: `launch-lug`, name, count                                                | size and place                                                    |
| rail buttons                                                                    | `otherParts`: `rail-button`, name, count                                               | size, place, spacing                                              |
| pod sets                                                                        | `otherParts`: `pod`, name, count                                                       | their contents                                                    |
| parallel stages (boosters), tube fins                                           | `otherParts`: `other`, name, count                                                     | what they are                                                     |
| an inside component reaching aft of the base                                    | `otherParts`: `other`                                                                  | how far it reaches                                                |
| a motor reaching aft of the base (mount's aft end plus overhang)                | `otherParts`: `other`, "motor in" the mount                                            | how far it reaches                                                |
| a component this importer does not know                                         | `otherParts`: `other`                                                                  | that it may stand outside                                         |
| a second (or later) stage                                                       | its body and fins, in the stack                                                        | that the stages separate                                          |
| OpenRocket's drag-coefficient override                                          |                                                                                        | the override, not used                                            |
| surface finishes                                                                |                                                                                        | one note: each finish, its roughness height, its components (4.5) |
| inside: inner tubes, couplers, rings, bulkheads, engine blocks, within the body | ignored: inside the body, they do not change the outside                               |                                                                   |
| inside: mass components, shock cords, parachutes, streamers                     | ignored: masses inside the body                                                        |                                                                   |
| fin tabs                                                                        | ignored: inside the body tube                                                          |                                                                   |
| the nose's shoulder                                                             | (inside the body tube); `otherParts`: `other` if wider than the nose's base            | if wider than the nose's base                                     |
| components OpenRocket does not attach                                           | ignored, as OpenRocket ignores them                                                    |                                                                   |
| materials, appearance, mass and centre-of-gravity overrides                     | not read into the design: they do not change the outside                               |                                                                   |

**Other parts.** Every part outside the body that the drag model does not
include is in `design.otherParts` (kind, name, count), so that the page
can name it and offer to compute without it (the adapter's `without`,
0017 section 4.2): launch lugs, rail buttons, pods, boosters, tube fins,
a nose shoulder standing out of the body, an inside part or motor
reaching aft of the base (or one the file does not give enough to place),
and any component this importer does not know. `OtherPart` has no place
for sizes, so `mapping.otherPartDetails` carries them, one per other
part in the same order (`PartSize`, metres: length, diameter, inner
diameter, height and the rail button's base, flange and screw heights,
wall thickness, spacing, a pod's axis-to-axis offset by OpenRocket's
radius methods, how far a part reaches aft of the base), with its front
from the nose's tip and roll angle; the notes say the same in words. A
motor mount holds one motor per flight configuration; a motor's diameter
and length are the largest among them, and its reach aft of the base
does not depend on which (it is the mount's aft end plus the overhang).

**Notes.** `design.notes` holds every `notRepresented` entry with
`effect: 'note'`, then every ignored component, its reason starting
"ignored:", so that the page can say what was not taken and why.

**No design** (`design: null`, each reason with `effect: 'no-design'`):
no stage or no body; a first component that is not a nose cone pointing
forward (the design needs a nose); a shape `NoseShape` cannot hold (4.2)
or a parameter outside OpenRocket's range; a body section placed by an
offset rather than behind the one before (a gap or an overlap, which the
design has no place for); a fin count, cant or thickness outside what
OpenRocket accepts (1 to 8 fins, cant within 15 degrees, thickness not
negative); and any dimension the file does not give.

**The flight.** `design.flight` is the caller's (`options.flight`) if
given; otherwise the highest maximum Mach number among the file's
simulation results that are up to date with the design (any results, if
none is, which is said), at that simulation's launch-site altitude;
otherwise Mach 3.0 at 0 m, the page's defaults (0017 section 2).
`mapping.flightFrom` says which, in words. These are OpenRocket's own
estimates: of the sixteen examples, one flies past Mach 1 by them.

**Tolerances.** Fin sets are at one position, and an inside part flush
with the base, within 1 nanometre: far below any rocket's tolerances and
far above the rounding of positions in metres. Fin sets are evenly spaced
within 1e-6 degrees (OpenRocket's own files write 120 degrees as
119.99999999999999). Nothing else is compared with a tolerance.

### 4.2 Nose shapes

`src/geometry/nose.ts` takes OpenRocket's own shape definitions, and each
was compared here with OpenRocket's formula (`Transition.Shape.getRadius`)
over 401 points of the profile, at three sizes including a nose shorter
than its radius (`tests/import/nose-shapes.test.ts`, 72 cases):

| OpenRocket | NoseShape   | Parameter                                    | Largest difference measured, over the base radius                                                                                                                    |
| ---------- | ----------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| conical    | `conical`   | none                                         | 2.0e-16                                                                                                                                                              |
| ogive      | `ogive`     | 0 to 1 (below 0.001 the cone, as OpenRocket) | 6.5e-15 to 3.1e-14 at parameters 0.25 to 1; 2.0e-13 at 0.05 and 1.3e-11 at 0.0011, where OpenRocket's own form subtracts two nearly equal terms; 2.0e-16 below 0.001 |
| ellipsoid  | `ellipsoid` | none                                         | 6.6e-16                                                                                                                                                              |
| power      | `power`     | exponent, above 1e-5 to 1                    | 0                                                                                                                                                                    |
| parabolic  | `parabolic` | 0 to 1                                       | 4.0e-16                                                                                                                                                              |
| haack      | `haack`     | 0 to 1/3                                     | 0                                                                                                                                                                    |

The test holds each to 1e-13 of the base radius, and the ogive under
parameter 0.1 to 1e-10.

A power series of parameter 1e-5 or less is drawn by OpenRocket as a
cylinder with a flat face; `NoseShape` cannot hold that, so there is no
design. Nose cones are never clipped in OpenRocket, so clipping does not
arise for them.

The comparison found a fault in `src/geometry/nose.ts`: a tangent ogive
no longer than its radius (a quarter circle, its arc centred on the
axis) gave NaN at the tip, the rearranged radius being 0 / 0 there. It
is fixed in its own commit with a test (`tests/geometry/nose.test.ts`).

### 4.3 Fins

**Sections.** OpenRocket offers three cross sections of uniform
thickness (`FinSet.CrossSection`). It draws none of them (neither its 3D
view nor its OBJ export renders the section); they are defined by name
and by OpenRocket's drag estimate (`FinSetCalc`):

- **square**: a plate cut square at both edges; OpenRocket takes the
  stagnation pressure on the leading edge and a full base drag at the
  trailing edge. Held as `flat`, both edges `square`.
- **rounded**: a plate with both edges rounded; OpenRocket takes the
  leading edge's drag as that of a round edge over the span times the
  thickness (a circular edge of diameter equal to the thickness) and half
  the base drag at the trailing edge, and gives the section 0.99 of the
  plate's volume. Held as `flat`, both edges `rounded` (the design's
  rounded edge is half a circle of the thickness). That the radius is
  half the thickness is read from OpenRocket's drag estimate, not from a
  drawing, since OpenRocket has none.
- **airfoil**: OpenRocket's "airfoil" names no profile (no thickness
  distribution, no edge radius; 0.85 of the plate's volume, a rounded
  leading edge and no base drag in its estimate). Held as `airfoil`,
  the design's own name for it.

**Merged sets.** OpenRocket designs often hold a fin set of N fins as N
sets of one fin at different roll angles (three of the sixteen examples
do). Sets that are identical (outline, section, thickness, cant, fillet)
and at one position, whose fins together are evenly spaced round the
body, are one set of all their fins, its rotation the first set's. Sets
that are not stay apart, each with its own rotation.

**Freeform outlines** of four points with the tip exactly parallel to the
root (the two tip points' heights equal), or of three points (a
triangle), are trapezoids, held as `trapezoidal`: the tip chord is the
difference of the tip points' positions, so the outline is the same to
the rounding of one subtraction. Any other outline stays `freeform`, its
points as written.

**Position.** `rootLeadingEdge` is the root's leading edge from the
nose's tip, by OpenRocket's position rules (section 3), and fins may sit
on any body section (OpenRocket allows freeform fins on nose cones and
transitions). The base, `baseStation(design)`, is a sum of lengths, so
fins whose trailing edges OpenRocket puts at the base give
`baseStation - rootLeadingEdge - rootChord` within a few units of
rounding of zero, not always exactly zero (below 1e-15 m on the 0.85 m
minimum-diameter fixture): the adapter must take such a difference
within a tolerance as
"at the base", since `src/base` serves the fins-on-base factor only at
exactly zero.

### 4.4 Transitions

OpenRocket's transition profile is its shape laid between the two radii,
the shape's tip at the narrower end (a boat-tail is the shape pointing
aft). For the ellipsoid, power and Haack shapes OpenRocket by default
clips the profile instead: it is then the part of a nose of the larger
radius that lies between the two radii (`Transition.getRadius`,
`calculateClip`). The design's transition has no flag for clipping, so a
clipped transition is held with its shape and a note saying the profile
differs. Tail cones (flipped nose cones) are never clipped.

### 4.5 Surface finish

OpenRocket's finishes and roughness heights (`ExternalComponent.Finish`):
rough 500, rough unfinished 250, unfinished 150, regular paint
(`normal`) 60, smooth paint 20, optimum paint 5, aircraft sheet-metal
(`polished`) 2, finished/polished 0.5 and mirror 0 micrometres. The design
has no place for roughness, and the drag model takes roughness only as a
band with its source (0008 section 2.3), so the import makes no band:
`mapping.finishes` lists each outside component's finish and roughness
height, and one note says them in words.

## 5. What the design has no place for

Each of these is held in a note today; a field would hold it exactly:

1. **Clipping of a transition's profile** (4.4), and the convention that
   the shape's tip is at the narrower end.
2. **The size and place of other parts**: carried beside the design in
   `mapping.otherPartDetails` (section 4.1) until `OtherPart` has fields
   for them; a field such as `size?: PartSize`, `front?: number` and
   `rotation?: number` on `OtherPart` would hold them in the design. A
   pod's own shape (its nose, tubes and fins) would need more.
3. **Surface roughness** (4.5).
4. **Stages**: that the stack separates.

## 6. Tests and fixtures

Fixtures in `tests/import/fixtures/` (provenance, licences and checksums
in `SOURCES.md` there): six of OpenRocket's example designs, unmodified
(GPLv3 or later, compatible with this repository's AGPL); five written
for these tests (AGPL), among them a gzip file made by Python's `gzip`
module and plain XML. Further documents are built in the tests
(`tests/import/build.ts`), one per rule.

| File                   | What it checks                                                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `xml.test.ts`          | the XML reader: entities, CDATA, line ends, skipped content, and 15 malformed documents refused with clear messages                                                                                                                                                                                                         |
| `container.test.ts`    | ZIP (a real file, stored and deflated entries), gzip and plain XML; empty, random, truncated and damaged files; no `.ork` entry; RockSim; encryption; unknown methods; ZIP64; zip bombs four ways; two property tests that no input ends in anything but a design or an `OrkReadError`                                      |
| `read.test.ts`         | the mirror of real files value for value; OpenRocket's reading rules; RockSim, foreign, malformed and entity-bomb XML                                                                                                                                                                                                       |
| `nose-shapes.test.ts`  | each nose shape against OpenRocket's formula; the shapes the design cannot hold                                                                                                                                                                                                                                             |
| `mapping.test.ts`      | a minimum-diameter three-fin rocket (exact); the same from gzip and plain XML; a four-fin sport rocket with a launch lug; a boat-tail; two stages (built and real); every rule of section 4, with each other part's size and place; every component of six real files accounted for                                         |
| `basic-finner.test.ts` | the Basic Finner in OpenRocket's terms reads back as `src/validation/basic-finner.ts` and the drag page's `basicFinnerForm` within 1e-9 calibres in every dimension OpenRocket can express; its fins' section (a single wedge with a rounded leading edge) is the one thing OpenRocket cannot express, and the test says so |

Mutation checks: eight bugs planted one at a time (a radius taken for a
diameter, OpenRocket's `bottom` position misread, fin spacing not
checked, the lowest Mach number taken, the overhang forgotten, the CRC
not checked, the inflation limit lifted, the first of two roll angles
taken) each made a test fail.
