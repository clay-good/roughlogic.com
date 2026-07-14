# roughlogic.com Specification v767 -- Curve Deflection-Angle Stakeout (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v766.md. Explore sweep #17 (entry 2).
>
> **The gap, and the evidence for it.** The `horizontal-curve` tile gives a circular curve's tangent, length, external,
> middle ordinate, long chord, and PC/PT stations -- the geometry. It does **not** give the field data to *set* the curve:
> the per-station **deflection angle** and **sub-chord** of the deflection-angle stakeout method. From the PC, an arc
> length `l` subtends a deflection from the back tangent `delta = (l/2R)(180/pi)` deg, and the sub-chord from the PC is
> `c = 2R sin(l/2R)`. The number this settles: on a **500 ft radius**, **100 ft** of arc is a **5.7296 deg** deflection
> and a **99.83 ft** chord (degree of curve **11.459**). Grep confirmed no `deflection`, `degree of curve`, or `stakeout`
> tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`horizontal-curve` sibling: the radius, arc length, and chord carry the length treatment (`L`); the deflection angle and
degree of curve are dimensionless. It reuses the sibling's arc definition `D = 5729.58/R` and its radius/degree mode
select. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive radius (or non-positive degree of
curve in degree mode), or a non-positive arc length returns `{ error }`. Citation discipline (v19/v22): the
deflection-angle method by name (FM 5-233; AASHTO Green Book), `GOVERNANCE.engineer_of_record` matching the sibling; the
note states this is a simple circular curve with no spiral/superelevation, the deflection is turned from the back tangent
at the PC, and the deflection at the PT closes on half the total central angle.

## 2. The tile

### 2.1 `curve-deflection-stakeout` -- Curve Deflection-Angle Stakeout

```
inputs:
  mode              "radius" | "degree"
  radius_ft         curve radius R (ft, > 0; radius mode)
  degree_of_curve   arc-definition D (deg, > 0; degree mode -> R = 5729.58 / D)
  arc_length_ft     arc length l from the PC (ft, > 0)

delta_rad       = l / (2R)
deflection_deg  = delta_rad x 180/pi
chord_ft        = 2R sin(delta_rad)
degree_of_curve = 5729.58 / R
```

**Pinned worked example.** R = 500 ft, l = 100 ft:
`delta = (100/1000)(180/pi) = ` **5.7296 deg**; `chord = 1000 sin(0.1) = ` **99.833 ft**; `D = 5729.58/500 = ` **11.459**.
When the arc length equals the full curve length `L = R x (central angle in rad)`, the deflection is exactly half the
total central angle (the PT closure check) and the sub-chord equals `horizontal-curve`'s long chord -- both pinned in the
fuzzer against `computeHorizontalCurve`.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["surveying", "carpentry"]`) placed beside `horizontal-curve` (in the later
Group E civil section, outside the `>= 30` Group E audit block); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(the deflection-angle method, `GOVERNANCE.engineer_of_record` matching the sibling); `test/fixtures/worked-examples.json`
(the pinned example); `test/fixtures/compute-map.js` (`curve-deflection-stakeout` -> `computeCurveDeflectionStakeout`);
`scripts/related-tiles.mjs` (-> `horizontal-curve` / `cogo-forward-point` / `traverse-closure`);
`data/search/aliases.json` (5 collision-checked aliases: "curve deflection angle", "stake out a horizontal curve", ...);
the calc-civil `CIVIL_RENDERERS` map entry via a hand-written renderer (a radius/degree mode select with field-sync plus
an arc-length field) and the id added to the calc-civil declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
example, the degree-mode radius resolution, the horizontal-curve cross-checks across a sweep, the longer-arc-larger-
deflection monotonicity, and the error seams. The calc-civil.js gzip cap (raised to 14000 B in this spec) covers the
addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count
1,215 -> 1,216.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 5.7296 deg deflection and
a 99.83 ft chord for 100 ft of arc on a 500 ft radius).

## 5. Roadmap position

Pairs the forward `horizontal-curve` geometry tile with the field method that sets it (deflection angles and sub-chords),
alongside the new `cogo-forward-point` forward locate -- the survey/route toolkit is filling out. Continues the
post-inverse forward-coverage vein (Explore sweep #17). Further route-survey tiles (spiral transitions, chord-definition
curves) stay evidence-driven.
