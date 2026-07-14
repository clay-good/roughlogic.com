# roughlogic.com Specification v729 -- Drill Point Angle from Tip Length (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v728.md. Fresh Explore sweep #12 (entry 1).
>
> **The gap, and the evidence for it.** The `drill-point-depth` tile runs drill-point geometry forward: from the diameter
> and the included point angle it returns the point length (tip allowance). The shop question is the inverse -- **what
> included angle a ground or measured tip length represents**. From `point_length = (diameter/2) / tan(angle/2)`,
> `angle = 2 x atan( (diameter/2) / point_length )`. The number this settles: a **0.5 in** drill ground to a **0.15 in**
> tip is a **118-degree** point.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`drill-point-depth` sibling: the diameter and point length are `L` (in), and the included and half angles are
dimensionless (degrees). It reuses the sibling's ideal-cone drill-point geometry, solved for the angle. The v18/v21
contract: any non-finite input, a non-positive diameter, or a non-positive point length returns `{ error }`; the recovered
angle is always in (0, 180) because `atan` returns (0, 90), so no explicit range guard is needed on the output. Citation
discipline (v19/v22): the drill-point identity solved for the angle, `GOVERNANCE.general` matching the sibling; the note
states that a **shorter tip for a given diameter is a blunter (larger) angle**, flags a **blunt (>135-degree)** or
**steep (<90-degree)** grind for confirmation, and closes with **geometry only; web thinning, drift, and the actual grind
govern the drilled hole**.

## 2. The tile

### 2.1 `drill-point-angle-from-length` -- Drill Point Angle from Tip Length

```
inputs:
  diameter_in       L   drill diameter (in, > 0)
  point_length_in   L   measured or target point length / tip allowance (in, > 0)

half_angle_deg  = atan( (diameter_in / 2) / point_length_in ) in degrees
point_angle_deg = 2 x half_angle_deg
length_per_diameter = point_length_in / diameter_in
```

**Pinned worked example.** diameter = 0.5 in, point length = 0.15 in:
`half = atan(0.25 / 0.15) = atan(1.6667) = 59.04 deg`, `included angle = ` **118.1 deg** (tip about 0.30 x diameter).
Feeding 118.1 degrees back through `drill-point-depth` at 0.5 in returns a 0.15 in point length, the input. A shorter
0.10 in tip on the same drill is a blunter 136-degree point.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist","mechanic"]`) placed beside `drill-point-depth` in the later
spec-v34 section, well past the Group K exact-count audit block; a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(drill-point identity solved for the angle, `GOVERNANCE.general` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`drill-point-angle-from-length` -> `computeDrillPointAngleFromLength`); `scripts/related-tiles.mjs` (->
`drill-point-depth` / `cutting-speed-rpm` / `countersink-depth`); `data/search/aliases.json` (5 collision-checked
question aliases: "drill point angle", "what angle is my drill", ...); the calc-machining `MACHINING_RENDERERS` map entry
via a hand-written renderer (two number fields) and the id added to the calc-machining declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeDrillPointDepth` across a
diameter/length sweep, the shorter-tip-blunter-angle monotonicity, the (0, 180) range, and the error seams. The
calc-machining.js gzip cap (raised to 18000 B in this spec) covers the addition. Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,177 -> 1,178.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 118.1 deg for a 0.5 in
drill with a 0.15 in tip).

## 5. Roadmap position

Pairs the forward drill tile (`drill-point-depth`, tip length from the angle) with its inverse (the angle from the tip
length), the two halves of the drill-point-grind question. Opens Explore sweep #12; further Group K machining growth stays
evidence-driven.
