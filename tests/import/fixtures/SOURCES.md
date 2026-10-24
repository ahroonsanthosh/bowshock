# OpenRocket test fixtures: sources and licences

## OpenRocket's example designs (GPLv3 or later)

Six of the example designs that ship with OpenRocket, copied byte for byte
(unmodified, renamed only), from the OpenRocket repository
<https://github.com/openrocket/openrocket>, directory
`core/src/main/resources/datafiles/examples/`, at commit
`591c5e5f7b7377e48f2bd5e501cef25cdfbd61d8` (2026-10-07).

Licence: the OpenRocket project's, "Copyright (C) 2007-2025 Sampo Niskanen
and others", GNU General Public License version 3 or (at your option) any
later version, with the additional permission of its section 7 for
non-compilable data files (`LICENSE.TXT` in that repository). GPLv3 works
may be combined with AGPLv3 works (GPLv3 section 13), so these files can
sit in this AGPL-3.0-or-later repository under their own licence.

| Fixture                           | OpenRocket's file name             | Written by             | SHA-256                                                            |
| --------------------------------- | ---------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `a-simple-model-rocket.ork`       | `A simple model rocket.ork`        | OpenRocket 24.12, 1.10 | `53369c1707ca2f7959c0a2df2ef5af5d508806c7d0d3010026843905de18f4ae` |
| `airstart-timing.ork`             | `Airstart timing.ork`              | OpenRocket 24.12, 1.10 | `254f5251fbd66540c5b8529e10edb20edc851ed87528d59ea8f7779c3a2c5f40` |
| `pods-airframes-and-winglets.ork` | `Pods--airframes and winglets.ork` | OpenRocket 24.12, 1.10 | `0237cd9d96054164b9026ffc5a182949ac2cd7c4fbd87785ead3862cb87a1ba0` |
| `simulation-extensions.ork`       | `Simulation extensions.ork`        | OpenRocket 24.12, 1.10 | `ed66db65f26f21ff722640e5ff3930d80109fbed662bd0f0ec3d60aa32f6bb8b` |
| `tube-fin-rocket.ork`             | `Tube fin rocket.ork`              | OpenRocket 24.12, 1.10 | `dc184622d49050c259b82effb72fd0177da9fddeef2e378335bcc55935dc240f` |
| `two-stage-high-power-rocket.ork` | `Two stage high power rocket.ork`  | OpenRocket 26.xx, 1.11 | `ccb52e5002b0106c005e29b891487f851754d2891d910231eea68023fb171ebd` |

"Written by" is the `creator` and file format `version` of each file's
`<openrocket>` element.

What each exercises: a sport rocket with a launch lug, a motor mount and a
motor reaching aft of the base (`a-simple-model-rocket`); a rocket the
design holds with nothing but its finish noted (`airstart-timing`); pods,
freeform fins (on the nose cone among them) and several fin sets
(`pods-airframes-and-winglets`); three single-fin sets that are one set of
three, an airfoil section and cant (`simulation-extensions`); tube fins with
an automatic radius not stored (`tube-fin-rocket`); two stages, rail
buttons and fin tabs (`two-stage-high-power-rocket`).

## Written for bowshock's tests (AGPL-3.0-or-later)

Written for these tests in OpenRocket's format (the elements and order of
OpenRocket's savers), plain XML, under this repository's licence. Each
file's comment says what it is.

| Fixture                          | What                                                                                                | SHA-256                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `minimum-diameter.ork`           | A Von Karman nose on a 54 mm tube that is the motor mount, three square-section fins at the base.   | `2a4469bc24656c025fb87b479c55575c66351986706a94dc66c7761df1c4531d` |
| `minimum-diameter-gzip.ork`      | `minimum-diameter.ork` gzip-compressed by Python's `gzip.compress(data, compresslevel=9, mtime=0)`. | `c290a129617f2cdf02c7ee9aa13b961c9abcd48a82ec085ae94169c77902a380` |
| `sport-four-fins-launch-lug.ork` | A tangent ogive, four rounded-section fins, a launch lug, a motor mount flush with the base.        | `94e08fe67817bf7d3ae843ed49f90791591e7c94dcca47b321c73c482c3854b0` |
| `boattail.ork`                   | An ogive, a 38 mm tube with three fins, and a conical boat-tail to 29 mm.                           | `e39840c6704395bc508bb1e5016aecb5d4a30b3b529dbfffe2b75792d0da115e` |
| `basic-finner.ork`               | The Basic Finner (DREV TM 9703) in OpenRocket's terms; its fins' section cannot be (see the file).  | `9c322be6849735fefc72a47d38513f5e83d7f7656a4a0f904381e809abf9d53e` |

The tests build further small documents in OpenRocket's format
(`../build.ts`), one per mapping rule.
