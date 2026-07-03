# roughlogic.com Specification v289 -- Infinite Slope Stability Factor of Safety (c'-phi', No Seepage) (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v287..v289 (the geotechnical foundation depth trio -- elastic
> settlement (v287), deep-pile capacity (v288), infinite-slope stability (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog checks retaining walls and bearing, but
> has no slope-stability check -- the factor of safety of a long natural or cut slope against a shallow translational slide
> parallel to the surface, the screen an excavator or site engineer runs before benching a hillside cut. Adds one tile to
> the existing **`calc-geotech.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v288.md.
>
> **The gap, and the evidence for it.** For a slide plane parallel to a long, uniform slope at depth `H`, the infinite-slope
> factor of safety is the ratio of available shear strength to driving shear stress,
> `FS = (c' + gamma H cos^2(beta) tan(phi')) / (gamma H sin(beta) cos(beta))`, where `beta` is the slope angle, `gamma` the
> soil unit weight, and `c'`, `phi'` the effective strength parameters; for a cohesionless soil (`c' = 0`) it collapses to
> the elegant `FS = tan(phi')/tan(beta)` -- independent of depth and unit weight, which is why a dry sand slope stands
> exactly at its angle of repose. For a 25 degree cut in a `c' = 200 psf`, `phi' = 30 degree`, `gamma = 120 pcf` soil at a
> `H = 8 ft` failure depth, `FS = (200 + 120 x 8 x cos^2 25 x tan 30)/(120 x 8 x sin 25 x cos 25) = 655/368 = 1.78` --
> above the customary 1.5, so the cut holds, and the number that decides whether it needs a flatter angle or a wall.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The slope angle `beta` and
friction angle `phi'` are angles (degrees, converted to radians internally); the effective cohesion `c'` is a pressure
(psf); the unit weight `gamma` is a unit weight (pcf); the failure depth `H` is a length (ft); the factor of safety `FS` is
dimensionless. The v18/v21 contract: any non-finite input, a unit weight/depth at or below zero, a slope angle outside
`0 < beta < 90`, or a friction angle outside `0 <= phi' < 90` returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the infinite-slope stability model by name; `editionNote` names **the infinite-slope factor of
safety `FS = (c' + gamma H cos^2(beta) tan(phi')) / (gamma H sin(beta) cos(beta))` and its cohesionless reduction
`FS = tan(phi')/tan(beta)`, as compiled in the Das and NAVFAC slope-stability references**, and states that **this returns
the factor of safety against a shallow translational slide on a plane parallel to a long, uniform slope with no seepage
(dry, or water table below the failure plane) -- it is not a circular/rotational (Bishop/Spencer) analysis, assumes a
uniform soil and an infinite slope (edge effects and finite geometry ignored), takes drained effective-stress parameters,
and excludes pore pressure / steady seepage (the `(gamma - gamma_w)` submerged case is a follow-on) and seismic loading;
and this is a design/screening aid, not a substitute for a geotechnical engineer's stability analysis** -- the geotechnical
engineer of record governs.

## 2. The tile

### 2.1 `slope-stability-infinite` -- Infinite Slope Factor of Safety (c'-phi', No Seepage)

```
inputs:
  beta_deg  deg   slope angle
  phi_deg   deg   effective friction angle
  c_psf     psf   effective cohesion (0 for cohesionless)
  gamma_pcf pcf   soil unit weight
  H_ft      ft    depth to the failure plane

b = beta_deg * pi/180 ; p = phi_deg * pi/180
driving   = gamma_pcf * H_ft * sin(b) * cos(b)                 ; driving shear stress, psf
resisting = c_psf + gamma_pcf * H_ft * cos(b)^2 * tan(p)       ; available shear strength, psf
FS = resisting / driving
; cohesionless check: if c_psf == 0, FS == tan(p)/tan(b)
```

**Pinned worked example (a 25 degree cut, c' = 200 psf, phi' = 30 degree, gamma = 120 pcf, H = 8 ft).** `driving = 120 x 8 x sin25 x cos25 = 960 x 0.383 = 367.7 psf`;
`resisting = 200 + 120 x 8 x cos^2 25 x tan30 = 200 + 960 x 0.8214 x 0.5774 = 200 + 455.3 = 655.3 psf`;
`FS = 655.3/367.7 = 1.78`, above the customary 1.5, so the slope holds. **Cross-check (strip the cohesion, cohesionless
sand at phi' = 32 degree, beta = 20 degree).** With `c' = 0` the depth and unit weight cancel and
`FS = tan32/tan20 = 0.6249/0.3640 = 1.72` -- a dry sand slope's safety depends only on how its friction angle compares to
its face angle, and it stands at `FS = 1` exactly when `beta = phi'` (the angle of repose). The non-finite, non-positive,
and out-of-range-angle error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the geotech tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the infinite-slope model, `editionNote` naming the full
`FS = (c' + gamma H cos^2 beta tan phi')/(gamma H sin beta cos beta)` and the `tan phi'/tan beta` reduction, and the
translational-only, no-seepage, uniform-soil caveats); `test/fixtures/worked-examples.json` (the cohesive-cut example + the
cohesionless cross-check); `test/fixtures/compute-map.js` (`slope-stability-infinite` -> `computeSlopeStabilityInfinite` in
`../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `retaining-wall-stability` / `lateral-earth-pressure` /
`trench-slope` / `soil-bearing-capacity`); `data/search/aliases.json` ("slope stability", "infinite slope", "factor of
safety slope", "translational slide", "cut slope safety", "angle of repose", "hillside stability", "tan phi tan beta",
"shallow slide"); the id appended to the existing geotech renderers block in `app.js`; the `// dims:` annotation (`beta`/
`phi` angle, `c` pressure, `gamma` unit weight, `H` length, `FS` dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the cohesionless `tan phi/tan beta` identity, the `beta = phi'` gives
`FS = 1` cohesionless check, and the out-of-range-angle / non-positive / non-finite error seams. No new module; re-pin
`calc-geotech.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the cohesionless-identity assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `driving` / `resisting` / `FS` stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (25 deg cut, c' 200 -> FS 1.78).

## 5. Roadmap position

Closes the geotechnical foundation depth batch (v287..v289) in `calc-geotech.js`: settlement, pile, and slope now stand
beside bearing capacity, earth pressure, and retaining-wall stability. The steady-seepage `(gamma - gamma_w)` submerged
case, a circular/rotational (simplified Bishop) analysis, and a pseudo-static seismic slope check are the deliberate next
follow-ons once the trio lands. With this batch the geotechnical cluster spans bearing, settlement, deep foundations,
lateral pressure, walls, and slopes.
