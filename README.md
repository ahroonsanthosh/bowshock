# bowshock

**Drag for supersonic model rockets, worked out in your browser on your own GPU.**

Build your rocket, pick a Mach number, and bowshock solves the airflow
around it and tells you the drag, along with how sure it is about that number.
Nothing to install and nothing to pay.

**[Try it](https://ahroonsanthosh.github.io/bowshock/)** (needs WebGPU, such
as a recent Chrome or Edge).

![The app at 2880 by 1800: the Basic Finner at Mach 1.8 in the 3D view, its flow on the finest grid, 160 cells across, with streaks coloured by Mach number around the cone; the builder on the left; on the right the drag curve, a point every 0.1 in Mach number, run to Mach 1.8 only, where it reads Estimate, CD 0.612 (0.517 to 0.748), with no number below Mach 1.8](docs/images/hero.webp)

> Early days. Please don't use it for flight decisions yet.

## The idea

Most rocket tools give you a drag number without saying how wrong it might
be. bowshock does the opposite: every number comes with a band, and every
band has been checked against exact theory or wind-tunnel data. If a part of
your rocket hasn't been checked yet, bowshock says so and gives no total,
rather than guessing.

## Where it stands

**Solid:**

- **Nose drag** for cones, ogives, parabolic and ellipsoid noses from Mach
  1.2 to 5, and Von Kármán noses from Mach 1.5 to 3 (1 to 5 calibers long,
  up to 6 at Mach 3). The band covers the numerical error; tunnel tests sit
  from a few percent to about a third off the inviscid answer, and that gap
  isn't on the page yet.
- **Skin friction**, within -12% to +19% of 23 measurements.
- **Fins and base**, wherever wind-tunnel data or exact theory covers the
  shape.
- **The solver itself**, against exact shock, expansion and cone solutions.

**The honest catch:** a total needs every part checked, and most real
rockets have at least one part that isn't yet. The usual blockers are
anything below Mach 1.5, rounded nose tips, Haack and power-series noses
outside the range above, fins at the base swept in ways no test has
measured, fins that end just ahead of the base, boat-tails, and square or
rounded fin edges. In our test set of 2,000 typical rockets, each flown at
four speeds (8,000 cases), 235 cases get a total today. For the rest,
bowshock lists every reason, says what you could change, shows the parts it
can work out, and gives a "drag is at least this much" floor where that is
safe.

**Not built yet:** viscous (RANS) flow, angle of attack, motor plume.

## How we keep it honest

- Tests are written down before they're run, against data held back for
  the purpose.
- Every figure taken from a report is read twice, independently.
- Every change to the method gets an independent review.
- No checked band, no number.

The details are in [docs/design/](docs/design/) and
[docs/validation/sources.md](docs/validation/sources.md).

## Run it locally

You need Node.js 22.12 or newer.

```sh
npm ci
npm run dev        # serve the pages
npm run check      # formatting, lint, types and unit tests
npm run test:gpu   # WebGPU tests in headless Chromium
```

## Contributing

Accuracy comes first: published methods only, written from scratch, cited
and tested. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE](NOTICE). bowshock is
an independent implementation of published methods. Its look is inspired by
FluidX3D, but it contains none of FluidX3D's code.
