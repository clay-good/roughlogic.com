# roughlogic.com Specification v745 -- Max Line Pressure for a Thrust Block (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v744.md. Explore sweep #13 (entry 7).
>
> **The gap, and the evidence for it.** The `thrust-block-sizing` tile runs the AWWA M41 method forward: from a line
> pressure it returns the required bearing-face area. The field question is the inverse -- **the highest test/surge
> pressure a thrust block of a given bearing area restrains** at a bend, so a designer checks an existing or standard
> block against a line pressure. From `Ab = 2 P A sin(theta/2) / soil`, `P = Ab x soil / (2 A sin(theta/2))`. The number
> this settles: a **4.13 ft^2** block on an **8 in** main (OD 8.625) at a **90-degree** bend in **2,000 psf** soil holds
> about **100 psi**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`thrust-block-sizing` sibling: the bearing area and pipe area are `L^2` (ft^2, in^2), the OD is `L` (in), the bend is
dimensionless (degrees), the soil bearing and returned pressure are `M L^-1 T^-2` (psf, psi), and the thrust is
`M L T^-2` (lb). It reuses the sibling's AWWA M41 thrust relation, solved for the pressure. The v18/v21 contract: any
non-finite input, a non-positive bearing area, OD, or soil bearing, or a bend outside (0, 180) returns `{ error }`.
Citation discipline (v19/v22): the thrust relation solved for the pressure, `GOVERNANCE.general` matching the sibling; the
note states that the soil takes at most **Ab x allowable bearing** of thrust, that the pressure should be compared against
the **test or surge pressure** (not the working pressure), that a **conservative geotechnical soil value** applies, and
that this checks the bearing face only with the **engineer of record governing**.

## 2. The tile

### 2.1 `thrust-block-max-pressure` -- Max Line Pressure for a Thrust Block

```
inputs:
  bearing_area_ft2    L^2           thrust-block bearing-face area (ft^2, > 0)
  od_in               L             pipe outside diameter (in, > 0)
  bend_deg            dimensionless bend angle (deg, 0 < theta < 180)
  soil_bearing_psf    M L^-1 T^-2   allowable soil bearing (psf, > 0)

area_in2         = (pi/4) x od_in^2
max_thrust_lb    = bearing_area_ft2 x soil_bearing_psf
max_pressure_psi = max_thrust_lb / (2 x area_in2 x sin(bend_deg/2))
```

**Pinned worked example.** Ab = 4.13 ft^2, OD = 8.625 in, bend = 90 deg, soil = 2,000 psf:
`A = (pi/4) x 8.625^2 = 58.4 in^2`, `max_thrust = 4.13 x 2000 = 8,260 lb`,
`max_pressure = 8260 / (2 x 58.4 x sin(45)) = 8260 / 82.6 = ` **100 psi**. Feeding 100 psi back through
`thrust-block-sizing` at the same pipe and bend returns a 4.13 ft^2 bearing area, the input. A 45-degree bend on the same
block holds more pressure (the sin(theta/2) term is smaller).

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","pipefitting"]`) placed beside `thrust-block-sizing` (Group B is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (thrust relation solved for the pressure,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`thrust-block-max-pressure` -> `computeThrustBlockMaxPressure`);
`scripts/related-tiles.mjs` (-> `thrust-block-sizing` / `water-hammer-surge` / `pipe-expansion-loop`);
`data/search/aliases.json` (5 collision-checked question aliases: "thrust block max pressure", "how much pressure thrust
block", ...); the calc-plumbing `PLUMBING_RENDERERS` map entry via a hand-written renderer (four number fields) and the id
added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeThrustBlockSizing` across an area/OD/bend/soil sweep, the bigger-block-more-pressure and sharper-bend-less-pressure
monotonicity, and the error seams. The calc-plumbing.js gzip cap (raised to 73000 B in this spec) covers the addition.
Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,193 -> 1,194.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 100 psi for a 4.13 ft^2
block on an 8 in main at a 90-degree bend in 2,000 psf soil).

## 5. Roadmap position

Pairs the forward thrust tile (`thrust-block-sizing`, area from the pressure) with its inverse (the max pressure for an
area), the two halves of the thrust-block check. Continues Explore sweep #13; further Group B plumbing growth stays
evidence-driven.
