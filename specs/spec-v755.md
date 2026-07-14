# roughlogic.com Specification v755 -- Gas Leak Equivalent Hole Diameter (calc-gas.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-gas.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v754.md. Explore sweep #14 (entry 6, final). Closes
> Explore sweep #14.
>
> **The gap, and the evidence for it.** The `gas-leak-rate` tile runs the orifice-flow leak approximation forward: from an
> orifice diameter it returns the leak rate. The estimator's question is the inverse -- **the equivalent hole diameter
> from a measured leak rate**, so a clocked or metered leak becomes a hole size. From
> `Q = 3550 c (pi d^2 / 4) sqrt(dP / SG)`, `d = sqrt( 4 Q / (3550 c pi sqrt(dP / SG)) )`. This is distinct from the water
> `orifice-diameter-for-flow` tile (which inverts the incompressible `Q = Cd A sqrt(2 g h)` form). The number this settles:
> a **3.15 cfh** natural-gas leak at **0.25 psi** with c **0.7** is about a **0.050 in** hole.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the `gas-leak-rate`
sibling: the leak rate is `L^3 T^-1` (cfh), the upstream pressure is `M L^-1 T^-2` (psi), the gas and discharge coefficient
are dimensionless, and the returned diameter and area are `L`, `L^2` (in, in^2). It reuses the sibling's gas-property table
and 3550-coefficient orifice form, solved for the diameter. The v18/v21 contract: an unknown gas, any non-finite input, or
a non-positive leak rate, pressure, or discharge coefficient returns `{ error }`. Citation discipline (v19/v22): the
orifice-flow relation solved for the diameter, `GOVERNANCE.plumbing` matching the sibling; the note stresses this is an
**estimate of the effective hole**, **not a code leak-test method**, that the discharge coefficient and crack geometry
shift it, and that **any positive leak is a hazard** (find and repair it, follow the code test and the utility's
procedure).

## 2. The tile

### 2.1 `gas-leak-hole-diameter` -- Gas Leak Equivalent Hole Diameter

```
inputs:
  leak_rate_cfh   L^3 T^-1      measured leak rate (cfh, > 0)
  upstream_psi    M L^-1 T^-2   upstream gauge pressure (psi, > 0)
  gas             dimensionless natural_gas | propane (specific gravity from the table)
  c               dimensionless discharge coefficient (> 0; default 0.7)

orifice_area_in2     = leak_rate_cfh / (3550 x c x sqrt(upstream_psi / SG))
orifice_diameter_in  = sqrt( 4 x orifice_area_in2 / pi )
```

**Pinned worked example.** Q = 3.15 cfh, dP = 0.25 psi, natural gas (SG 0.60), c = 0.7:
`sqrt(dP/SG) = sqrt(0.25/0.60) = 0.6455`, `A = 3.15 / (3550 x 0.7 x 0.6455) = 0.00196 in^2`,
`d = sqrt(4 x 0.00196 / pi) = ` **0.050 in**. Feeding 0.050 in back through `gas-leak-rate` at 0.25 psi returns a 3.15 cfh
leak, the input. A bigger 10 cfh leak at the same pressure implies a larger ~0.089 in hole.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`) placed beside `gas-leak-rate` (Group B is not exact-count
audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (orifice relation solved for the diameter,
`GOVERNANCE.plumbing` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`gas-leak-hole-diameter` -> `computeGasLeakHoleDiameter`); `scripts/related-tiles.mjs` (->
`gas-leak-rate` / `gas-pipe-sizing` / `hydrostatic-test`); `data/search/aliases.json` (5 collision-checked question
aliases: "gas leak hole size", "how big is the leak hole", ...); the calc-gas `GAS_RENDERERS` map entry via a hand-written
renderer (three number fields and a gas select) and the id added to the calc-gas declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the example, the round-trip through `computeGasLeakRate` across a leak/pressure/gas/c sweep, the
bigger-leak-bigger-hole and lower-pressure-bigger-hole behavior, and the error seams. The calc-gas.js gzip cap (raised to
10500 B in this spec) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first
paint. Home tile count 1,203 -> 1,204.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.050 in for a 3.15 cfh
natural-gas leak at 0.25 psi).

## 5. Roadmap position

Pairs the forward leak tile (`gas-leak-rate`, rate from the hole) with its inverse (the hole from the rate), the two
halves of the gas-leak estimate. Closes Explore sweep #14 (all 9 clean candidates landed); a fresh sweep opens the next
batch. Further Group B fuel-gas growth stays evidence-driven.
