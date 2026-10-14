# bowshock

Supersonic airflow around model rockets, simulated in your browser on your
own GPU.

> **Status: design stage.** There is no working solver yet. The proposed
> architecture is in [docs/design/0001-architecture.md](docs/design/0001-architecture.md).

## What it is for

Amateur and student rocketry teams who fly beyond Mach 1 and want better drag
estimates than typical hobby tools give, without installing or learning
professional CFD software. bowshock will:

- run entirely in the browser (WebGPU), hosted as a static site, with no
  server-side computation;
- produce drag coefficient versus Mach number in a simple, documented file
  format that other simulators can import;
- show the flow (shocks, expansions) live, so the physics is easy to see.

## Honest scope

bowshock is planned as an inviscid, axisymmetric solver. It computes the
pressure (wave) drag of the nose, body and boat-tail directly. Skin friction,
base drag and fin drag come from published engineering correlations, as in
other hobby tools. No result is presented as reliable until it has been
validated against known solutions or published data; the record will live in
`validation/`.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).

bowshock is an independent implementation of published numerical methods. It
does not contain or derive from FluidX3D code.
