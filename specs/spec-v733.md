# roughlogic.com Specification v733 -- Countersink Diameter from a Plunge Depth (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v732.md. Explore sweep #12 (entry 3).
>
> **The gap, and the evidence for it.** The `countersink-depth` tile runs the cone geometry forward: from a finished
> countersink diameter it returns the plunge depth to dial. The bench question is the inverse -- **what finished diameter a
> set plunge depth opens**, so a machinist reading a dial or a Z stop can check the diameter. From
> `Z = (D_cs - d_hole) / (2 tan(angle/2))`, `D_cs = 2 Z tan(angle/2) + d_hole`. The number this settles: a **0.1438 in**
> plunge with an **82 deg** tool and a **0.250 in** pilot opens a **0.500 in** countersink.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`countersink-depth` sibling: the plunge depth, pilot hole, and returned diameters are `L` (in), and the included angle is
dimensionless (degrees). It reuses the sibling's cone trigonometry, solved for the diameter. The v18/v21 contract: any
non-finite input, a non-positive plunge depth, a negative pilot hole, or an included angle outside (0, 180) returns
`{ error }`. Citation discipline (v19/v22): the diameter-to-depth relation solved for the diameter, `GOVERNANCE.general`
matching the sibling; the note states that a small **over-plunge** sits a flat-head screw proud or sunken, that **82 deg
inch and 90 deg metric** heads are not interchangeable, and that a **shallower (larger) angle** opens a wider diameter for
the same depth.

## 2. The tile

### 2.1 `countersink-diameter-from-depth` -- Countersink Diameter from a Plunge Depth

```
inputs:
  plunge_depth_in     L             plunge depth below the surface Z (in, > 0)
  included_angle_deg  dimensionless included angle (deg, 0 < a < 180; default 82)
  pilot_hole_dia_in   L             pilot / through-hole diameter (in, >= 0)

cone_dia_in       = 2 x plunge_depth_in x tan(angle/2)
countersink_dia_in = cone_dia_in + pilot_hole_dia_in
```

**Pinned worked example.** Z = 0.1438 in, angle = 82 deg, pilot = 0.250 in:
`cone_dia = 2 x 0.1438 x tan(41 deg) = 2 x 0.1438 x 0.8693 = 0.250 in`, `D_cs = 0.250 + 0.250 = ` **0.500 in**. Feeding
0.500 in back through `countersink-depth` at 82 deg / 0.250 in returns a 0.1438 in plunge, the input. A shallower 100 deg
tool at the same depth opens a wider 0.593 in countersink.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machining","mechanic"]`) placed beside `countersink-depth` in the later
spec-v509 section, well past the Group K exact-count audit block; a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(cone relation solved for the diameter, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json`
(the pinned example); `test/fixtures/compute-map.js` (`countersink-diameter-from-depth` ->
`computeCountersinkDiameterFromDepth`); `scripts/related-tiles.mjs` (-> `countersink-depth` / `drill-point-depth` /
`tap-drill-size`); `data/search/aliases.json` (5 collision-checked question aliases: "countersink diameter from depth",
"read countersink diameter", ...); the calc-machining `MACHINING_RENDERERS` map entry via a hand-written renderer (a
depth field, an angle select, and a pilot field) and the id added to the calc-machining declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeCountersinkDepth` across a
depth/angle/pilot sweep, the shallower-angle-wider-diameter and deeper-plunge-larger-diameter monotonicity, and the error
seams. The calc-machining.js gzip cap (raised to 19500 B in this spec) covers the addition. Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,181 -> 1,182.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.500 in for a 0.1438 in
plunge with an 82 deg tool and a 0.250 in pilot).

## 5. Roadmap position

Pairs the forward countersink tile (`countersink-depth`, depth from the diameter) with its inverse (the diameter from the
depth), the two halves of the countersink-setup question. Continues Explore sweep #12; further Group K machining growth
stays evidence-driven.
