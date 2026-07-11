# roughlogic.com Specification v627 -- Infinite-Slope Stability with Seepage (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`**
> (Group E, geotechnical), no new module, group, or dependency. Inherits spec.md through spec-v626.md.
>
> **The gap, and the evidence for it.** Spec-v289 (`slope-stability-infinite`) computes the dry infinite-slope
> factor of safety and its own note names the missing case outright: "dry (no seepage or pore pressure; **the
> submerged gamma - gamma_w case is a follow-on**)." Seepage is what actually fails slopes -- the dry sand slope
> that stood all summer slides in the spring when the water table rises to the surface and flows parallel to the
> slope, because the pore pressure cuts the effective normal stress that friction depends on while the driving
> weight stays the same. With steady seepage the friction term uses the *buoyant* weight `gamma_sat - gamma_w` while
> the driving term keeps the *saturated* weight, so the factor of safety drops by the ratio
> `(gamma_sat - gamma_w) / gamma_sat` -- almost exactly **half** for common soils. The number that catches designers
> out: a phi = 32 sand at an 18-degree slope has a dry factor of safety of **1.92**, comfortably safe, but only
> **0.96** once seepage develops -- it slides, and the only thing that changed was the water.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the dry
`slope-stability-infinite` sibling: the slope and friction angles are `dimensionless`, the cohesion is
`M L^-1 T^-2`, the saturated unit weight is `M L^-2 T^-2`, and the depth is `L`. The freshwater unit weight
`gamma_w = 62.4 pcf` is the module constant added in spec-v625. The v18/v21 contract: any non-finite input, a slope
angle outside `(0, 90)`, a friction angle outside `[0, 90)`, a negative cohesion, a saturated unit weight not
greater than `gamma_w`, or a non-positive depth returns `{ error }`. Citation discipline (v19/v22): the
infinite-slope stability equation with seepage on an effective-stress basis by name, as compiled in Das and NAVFAC
slope-stability references; the note states that **the seepage is steady and parallel to the slope with the water
table at the surface (worst case), the friction term uses the buoyant weight while the driving term uses the
saturated weight, the dry factor of safety is shown for contrast, and a working subdrain that relieves the seepage
restores the dry value** -- a screening aid, not a substitute for the geotechnical engineer's stability analysis.

## 2. The tile

### 2.1 `slope-stability-seepage` -- Why a Stable Slope Fails When the Water Rises

```
inputs:
  beta_deg      deg    slope angle (in (0, 90))
  phi_deg       deg    effective friction angle (in [0, 90))
  c_psf         psf    effective cohesion (>= 0, 0 = cohesionless)
  gamma_sat     pcf    saturated soil unit weight (> gamma_w = 62.4)
  h_ft          ft     depth to the failure plane (> 0)

driving   = gamma_sat x H x sin(beta) x cos(beta)                                  [psf]
resisting = c' + (gamma_sat - 62.4) x H x cos^2(beta) x tan(phi')                  [psf]  (buoyant, with seepage)
fs_seep   = resisting / driving                                                    [-]
fs_dry    = (c' + gamma_sat x H x cos^2(beta) x tan(phi')) / driving               [-]    (same slope, no seepage)
```

**Pinned worked example (a cohesionless sand slope that fails wet).** beta = 18 deg, phi = 32 deg, c' = 0,
gamma_sat = 125 pcf, H = 8 ft: `driving = 125 x 8 x sin 18 x cos 18 = ` **293.9 psf**,
`resisting = (125 - 62.4) x 8 x cos^2 18 x tan 32 = ` **283.1 psf**, so `fs_seep = ` **0.96** -- it slides. The same
slope dry has `fs_dry = tan 32 / tan 18 = ` **1.92**, so seepage halves the factor of safety
(`(125 - 62.4)/125 = 0.50`) and turns a safe slope into a failing one. **Cross-check (with a little cohesion).**
c' = 150 psf: the cohesion is a fixed resisting term, so `fs_seep = ` **1.47** and `fs_dry = ` **2.43** -- cohesion
helps, but seepage still cuts nearly a full point off the factor of safety.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, beside `slope-stability-infinite`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (infinite-slope seepage / Das / NAVFAC, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`slope-stability-seepage` ->
`computeSlopeStabilitySeepage` in `../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `slope-stability-infinite`
/ `submerged-earth-pressure` / `soil-bearing-capacity`); `data/search/aliases.json` ("slope stability seepage",
"slope with water table", "seepage factor of safety", "wet slope failure", plus question rows);
`GEOTECH_RENDERERS["slope-stability-seepage"]` via the module's `_simpleRenderer` factory (mirroring
`slope-stability-infinite`) and the id added to the calc-geotech declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the ~0.5x-dry (buoyant/saturated) relation, the cohesionless tan phi / tan beta reduction, and the error
seams. Group E has no exact audit-count assertion and the mechanical-governance test is an explicit list, so no count
bump. The calc-geotech.js gzip cap is near its limit -- if the build reports it over, raise the cap by ~1 KB with a
CHANGELOG note (the established per-module cap-relief pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> fs_seep 0.96, fs_dry 1.92).

## 5. Roadmap position

Closes the seepage follow-on spec-v289 named inside `slope-stability-infinite`, alongside the earth-pressure
limit-state cluster (spec-v624/v625/v626). The Coulomb wall-friction earth-pressure form remains the last deliberate
future follow-on of the spec-v261 set. Further Group E growth stays evidence-driven.
