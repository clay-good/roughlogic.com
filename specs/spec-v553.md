# roughlogic.com Specification v553 -- Unbalanced Snow Load on Gable Roof (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, the construction bench); no new module, group, or dependency. Inherits spec.md through spec-v552.md.
>
> **The gap, and the evidence for it.** The bench has balanced snow (`snow-load`), drift (`snow-drift-load`), sliding
> (`sliding-snow-load`), and rain-on-snow, but not the **unbalanced** gable case, which is a distinct load pattern ASCE
> 7-22 Section 7.6.1 requires on its own. When wind blows snow across a gable ridge, the windward slope sheds to `0.3 ps`
> while the leeward slope carries the balanced load **plus** a wind-blown drift surcharge near the ridge. The catch is
> that it is only checked in a specific slope band (roughly 1/2-on-12 to 7-on-12), so a low or steep roof escapes it,
> and it sizes the **leeward** rafter and the ridge, which the balanced case underestimates. The tile takes the ground
> and flat-roof snow loads, the roof slope, and the eave-to-ridge length, and returns the windward load, the leeward
> peak with its surcharge, and the horizontal extent of the drift -- the asymmetric case a gable roof must also be
> designed for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The ground, flat-roof,
windward, leeward, and surcharge loads are pressures (`M L^-1 T^-2`, in psf); the snow density is `M L^-3` (pcf); the
drift height, eave-to-ridge length, and horizontal extent are lengths (`L`, in ft); the slope run and roof-slope terms
are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive ground or flat-roof snow load, a non-
positive eave-to-ridge length, or a slope outside the applicable band returns a result flagged as not requiring the
unbalanced case (or `{ error }` for non-finite / non-positive). Citation discipline (v19/v22): `ASCE` over Section 7.6;
`editionNote` names **ASCE 7-22 Section 7.6.1 (unbalanced snow load, gable roofs)**, prints the snow density
`gamma = min(0.13 x pg + 14, 30)`, the drift height `hd = 0.43 x W^(1/3) x (pg + 10)^(1/4) - 1.5`, the windward
`0.3 x ps`, the leeward surcharge `hd x gamma / sqrt(S)` (S the horizontal run per unit rise) added to `ps`, and the
surcharge horizontal extent `8 x hd x sqrt(S) / 3`, and states that **the unbalanced case applies only in the slope
band of about 2.38 to 30.2 degrees (roughly 1/2-on-12 to 7-on-12) with an eave-to-ridge length over 20 ft, the windward
slope drops to 0.3 ps while the leeward carries ps plus a ridge drift surcharge, this sizes the leeward rafter and ridge
that the balanced case misses, and ASCE 7 and the engineer of record govern** -- a design aid, not the engineer of
record.

## 2. The tile

### 2.1 `snow-unbalanced-gable` -- The Leeward Drift Surcharge the Balanced Case Misses

```
inputs:
  ground_snow_pg_psf   psf   ground snow load pg
  flat_roof_ps_psf     psf   sloped/flat-roof balanced snow load ps
  roof_rise_on_12      -     roof slope as rise-on-12 (e.g. 4 for 4:12)
  eave_to_ridge_ft     ft    horizontal eave-to-ridge distance W

slope_deg   = atan(roof_rise_on_12 / 12) in degrees
applicable  = 2.38 <= slope_deg <= 30.2 and eave_to_ridge_ft > 20
gamma       = min(0.13 x pg + 14, 30)                                   [pcf]
S           = 12 / roof_rise_on_12                                      [-]   horizontal run per unit rise
hd          = 0.43 x eave_to_ridge_ft^(1/3) x (pg + 10)^(1/4) - 1.5     [ft]
windward    = 0.3 x flat_roof_ps_psf                                    [psf]
surcharge   = hd x gamma / sqrt(S)                                      [psf]
leeward_peak = flat_roof_ps_psf + surcharge                            [psf]
extent      = 8 x hd x sqrt(S) / 3                                      [ft]  from the ridge
```

**Pinned worked example (pg = 30 psf, ps = 25 psf, a 4:12 roof, 30 ft eave-to-ridge).** The slope is `18.4 degrees`
(inside the band) and W > 20 ft, so the case applies. The snow density is `0.13 x 30 + 14 = 17.9 pcf`, and the drift
height is `hd = 0.43 x 30^(1/3) x 40^(1/4) - 1.5 = ` **1.86 ft**. The windward slope carries only
`0.3 x 25 = ` **7.5 psf**, while the leeward slope carries `25 + (1.86 x 17.9 / sqrt(3)) = 25 + 19.2 = ` **44.2 psf** at
the ridge, tapering over `8 x 1.86 x sqrt(3) / 3 = ` **8.6 ft** -- nearly double the balanced load on the leeward
rafter. **Cross-check (a steep roof escapes the case).** Make it an 8:12 roof: the slope is `33.7 degrees`, above the
30.2-degree limit, so the unbalanced case **does not apply** and only the balanced load governs. The tile returns the
windward load, the leeward peak and surcharge, and the drift extent (or the not-applicable flag).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`ASCE`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 4:12 example + the 8:12
not-applicable cross-check); `test/fixtures/compute-map.js` (`snow-unbalanced-gable` -> `computeSnowUnbalancedGable` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `snow-load` / `snow-drift-load` / `sliding-snow-load`);
`data/search/aliases.json` ("unbalanced snow", "gable snow load", "asce 7 7.6", "leeward snow drift", "windward 0.3 ps",
"snow ridge surcharge", "unbalanced roof snow", "gable drift"); the id appended to the construction renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the slope-band applicability, the density and drift-height relations, the windward and leeward loads, and the
error seams (non-finite, non-positive pg / ps / W, out-of-band flag). Hand-writes its renderer (mirroring the
calc-construction.js `snow-drift-load` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the windward / leeward / extent stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 4:12 example -> 7.5 psf windward, 44.2 psf leeward).

## 5. Roadmap position

Completes the roof-snow family (`snow-load`, `snow-drift-load`, `sliding-snow-load`, `rain-on-snow-surcharge`,
`minimum-roof-snow`) with the unbalanced gable case. A hip-and-monoslope unbalanced variant and an unbalanced load for
roofs with a windward eave step are deliberate future follow-ons. Further Group E growth stays evidence-driven.
