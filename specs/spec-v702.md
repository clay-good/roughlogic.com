# roughlogic.com Specification v702 -- PV Shade-Free Sun Angle from Row Pitch (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A, solar
> PV), no new module, group, or dependency. Inherits spec.md through spec-v701.md.
>
> **The gap, and the evidence for it.** The `pv-row-spacing` tile runs the layout geometry forward: from a design profile
> angle it returns the row pitch and GCR. On a constrained roof or lot the pitch is fixed, and the question is the inverse
> -- **with the row spacing I actually have, what is the lowest sun elevation the array stays shade-free to**. From
> `pitch = L cos(tilt) + L sin(tilt) / tan(prof)`, solving for the profile angle gives
> `prof = atan( L sin(tilt) / (pitch - L cos(tilt)) )`, valid when the pitch exceeds the module footprint `L cos(tilt)`.
> The number this settles: a **6.5 ft** module at **30 deg** tilt with **12 ft** of pitch is clear down to a **27 deg**
> sun -- compare it to the winter-design sun elevation to see if the solstice window is protected.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`pv-row-spacing` sibling: the module length and pitch are `L` (ft), the tilt and returned profile angle are dimensionless
(degrees), and the GCR is dimensionless. The v18/v21 contract: any non-finite input, a non-positive module length, a tilt
outside (0, 90], a non-positive pitch, or a pitch at or below the module footprint (the rows overlap) returns `{ error }`.
Citation discipline (v19/v22): the NREL / Sandia row-spacing geometry solved for the profile angle, `GOVERNANCE.general`
matching the sibling; the note states that **the result is the sun elevation at which adjacent rows just begin to shade,
that it should be compared to the winter-design sun elevation (the 9 a.m.-to-3 p.m. solstice altitude from latitude or
solar-times), and that it assumes due-south rows and a level field -- an azimuth offset or a graded slope is a separate
correction**.

## 2. The tile

### 2.1 `pv-row-shade-angle` -- PV Shade-Free Sun Angle from Row Pitch

```
inputs:
  module_length_ft   L             module slope length (> 0)
  tilt_deg           dimensionless array tilt (over 0, up to 90)
  row_pitch_ft       L             available front-to-front row pitch (> module footprint)

base_ft  = module_length_ft x cos(tilt)
rise_ft  = module_length_ft x sin(tilt)
profile_angle_deg = atan( rise_ft / (row_pitch_ft - base_ft) )
gcr = module_length_ft / row_pitch_ft
```

**Pinned worked example.** L = 6.5 ft, tilt = 30 deg, pitch = 12 ft: `base = 5.629 ft`, `rise = 3.25 ft`,
`prof = atan(3.25 / (12 - 5.629)) = atan(0.5102) = ` **27.0 deg** (GCR 0.542); feeding 27.0 deg back through
`pv-row-spacing` at L = 6.5, tilt = 30 returns a 12 ft pitch, the input. Widening the pitch to 20 ft lowers the shade
angle to about 13 deg -- more spacing protects a lower winter sun.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar","electrical"]`) placed beside `pv-row-spacing` (Group A is un-audited);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (row-spacing geometry solved for the profile angle,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`pv-row-shade-angle` -> `computePvRowShadeAngle`); `scripts/related-tiles.mjs`
(-> `pv-row-spacing` / `solar-times` / `pv-energy-yield`); `data/search/aliases.json` (5 collision-checked question
aliases: "what sun angle is my array shade free to", "lowest sun elevation before panels shade", ...); the calc-solar
`SOLAR_RENDERERS` map entry via a hand-written three-input renderer and the id added to the calc-solar declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computePvRowSpacing` across a tilt/pitch sweep,
the more-pitch-lower-angle monotonicity, and the error seams (including the pitch-at-or-below-footprint overlap guard). The
calc-solar.js gzip cap is expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from home first
paint. Home tile count 1,150 -> 1,151.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts); `npm test`
(+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs`
and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (the pinned example -> 27.0 deg for a 6.5 ft module at 30 deg tilt with 12 ft of pitch).

## 5. Roadmap position

Pairs the forward row-spacing tile (`pv-row-spacing`, pitch from a design sun angle) with its inverse (shade-free sun angle
from the pitch you have), the two halves of the constrained-layout question. Further Group A solar growth stays
evidence-driven.
