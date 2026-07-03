# roughlogic.com Specification v337 -- Horizontal Sightline Offset for Stopping Sight Distance on a Curve (AASHTO) (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v335..v337 (the roadway geometric-design trio -- superelevation
> (v335), vertical-curve sight distance (v336), the horizontal sightline offset (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: on a horizontal curve, a wall, cut slope, barrier, or
> guardrail on the inside can block the driver's sightline; AASHTO gives the horizontal sightline offset (the middle
> ordinate) that must be kept clear so the stopping sight distance is available. The catalog computes SSD and curve geometry
> but not this clearance. Adds one tile to the existing **`calc-civil.js`** module (Group E); no new group, trade, or
> dependency. Inherits spec.md through spec-v336.md.
>
> **The gap, and the evidence for it.** For a sight distance `S` measured along a curve of radius `R` (to the centerline of
> the inside lane), the horizontal sightline offset -- the middle ordinate `M` from the sightline chord to the obstruction
> -- is `M = R (1 - cos(28.65 S / R))` (the `28.65 = 90/pi` puts the half-angle in degrees). For a 1,000 ft radius curve
> and a 570 ft stopping sight distance, `M = 1,000 (1 - cos(28.65 x 570/1,000)) = 1,000 (1 - cos 16.33 deg) = 40.3 ft` -- the
> width that must be cleared of obstructions on the inside of the curve for a driver to stop in time. A tighter radius or a
> longer required sight distance pushes `M` out fast, which is why inside cut slopes and barriers so often control curve
> design. `stopping-sight-distance` gives `S`; this tile turns it into the clear-zone the curve needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The radius `R`, the sight
distance `S`, and the horizontal sightline offset `M` are lengths (ft); the internal half-angle is in degrees via the
`28.65` factor. The v18/v21 contract: any non-finite input, or a radius or sight distance at or below zero, returns
`{ error }`; the tile also solves the inverse (the maximum `S` available for a given cleared `M`). Citation discipline
(v19/v22): `GOVERNANCE.general` over the AASHTO horizontal-sightline-offset relation by name; `editionNote` names **the
AASHTO Green Book middle-ordinate `M = R (1 - cos(28.65 S / R))` (with `R` to the inside-lane centerline), the inverse
`S = (R/28.65) arccos(1 - M/R)`, and that the offset is measured from the sightline to the sight obstruction**, and states
that **this returns the horizontal sightline offset (clear-zone width) for the entered sight distance and radius -- it uses
`R` to the vehicle's path (inside-lane centerline, not the curve centerline), assumes the sight obstruction is continuous
along the curve, and does not account for the driver-to-obstruction geometry at the curve ends or a variable offset; and
this is a design aid, not a substitute for a licensed civil engineer's design** -- the engineer of record and the AASHTO /
state DOT manual govern.

## 2. The tile

### 2.1 `horizontal-sightline-offset` -- Horizontal Sightline Offset for SSD on a Curve (AASHTO)

```
inputs:
  R_ft     ft    curve radius (to the inside-lane centerline)
  S_ft     ft    sight distance (for offset); OR
  M_ft     ft    available cleared offset (for max sight distance)

M = R_ft * (1 - cos(28.65 * S_ft / R_ft [deg]))       ; horizontal sightline offset (mode 1)
S = (R_ft / 28.65) * acos(1 - M_ft / R_ft) [deg]      ; max sight distance (mode 2)
```

**Pinned worked example (a 1,000 ft radius curve, 570 ft SSD).** `R = 1,000`, `S = 570`:
`M = 1,000 (1 - cos(28.65 x 570/1,000)) = 1,000 (1 - cos 16.33 deg) = 1,000 (1 - 0.9596) = 40.3 ft` -- the inside clearance
the curve needs. **Cross-check (a tighter 600 ft radius).** Same `S = 570`: `M = 600 (1 - cos(28.65 x 570/600)) = 600 (1 - cos 27.22 deg) = 600 (1 - 0.8894) = 66.4 ft`
-- a 40% smaller radius drives the clear-zone 65% wider, the reason a sharp curve against a rock cut or a barrier so often
fails sight distance and must be flattened or the obstruction pulled back. The non-finite and non-positive error paths
bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["surveying","civil"]`, matching `horizontal-curve`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the AASHTO middle-ordinate relation, `editionNote` naming
`M = R(1 - cos(28.65 S/R))`, the inverse, the inside-lane-centerline basis, and the continuous-obstruction, no-end-geometry
caveats); `test/fixtures/worked-examples.json` (the 1,000 ft example + the 600 ft cross-check);
`test/fixtures/compute-map.js` (`horizontal-sightline-offset` -> `computeHorizontalSightlineOffset` in
`../../calc-civil.js`); `scripts/related-tiles.mjs` (-> `horizontal-curve` / `stopping-sight-distance` / `superelevation` /
`vertical-curve-sight-distance`); `data/search/aliases.json` ("horizontal sightline offset", "HSO", "sight distance around
curve", "clear zone curve", "middle ordinate sight", "AASHTO horizontal sight", "curve sight obstruction", "barrier sight
distance", "cut slope sight distance"); the id appended to the existing civil renderers block in `app.js`; the `// dims:`
annotation (`R`/`S`/`M` length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the forward/inverse round-trip, the tighter-radius sensitivity, and the non-positive / non-finite error seams. No new
module; re-pin `calc-civil.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the forward/inverse round-trip assertion); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `M` (or `S`) output wraps on a
phone); render-no-nan + a11y sweep, output read to the value (R 1,000, S 570 -> M 40.3 ft).

## 5. Roadmap position

Closes the roadway geometric-design batch (v335..v337) in `calc-civil.js`: superelevation, crest sight distance, and the
horizontal sightline offset now give the safety design behind the curve-layout and elevation tiles. A variable-offset
sightline along the curve, the driver-eye-height sensitivity, and a chain from design speed through `stopping-sight-distance`
into all three are the deliberate next follow-ons once the trio lands. With this batch the civil roadway cluster spans
horizontal and vertical geometry plus superelevation and sight distance.
