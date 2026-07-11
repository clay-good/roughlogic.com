# roughlogic.com Specification v626 -- Sloped-Backfill Rankine Earth Pressure (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`**
> (Group E, geotechnical), no new module, group, or dependency. Inherits spec.md through spec-v625.md.
>
> **The gap, and the evidence for it.** Spec-v261/v262 (`lateral-earth-pressure`, `retaining-wall-stability`)
> compute the level-backfill Rankine case and both name **a sloped-backfill Rankine coefficient** as a deliberate
> follow-on; the built tile's note explicitly disclaims "a sloped or submerged backfill." A backfill that rises
> behind the wall at a slope `beta` (a hillside cut, a bermed approach, a terraced lot) pushes harder than a level
> one, and the level `Ka = tan^2(45 - phi/2)` under-predicts it. Rankine's inclined-surface coefficient
> `Ka = cos beta (cos beta - sqrt(cos^2 beta - cos^2 phi)) / (cos beta + sqrt(cos^2 beta - cos^2 phi))` closes that
> gap with the same soil inputs, and its resultant acts *parallel to the backfill slope*, not horizontally. The
> number that catches designers out: a 15-degree backfill slope on a phi = 30 sand raises `Ka` from 0.333 to 0.373
> -- a **12%** heavier thrust that also tilts, adding an uplift component on the heel the level analysis never sees.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The friction angle,
slope angle, and coefficient are `dimensionless`, the unit weight is `M L^-2 T^-2`, the height is `L`, and the
thrusts are `M T^-2` (force per unit wall length), mirroring the `lateral-earth-pressure` sibling. The v18/v21
contract: any non-finite input, a non-positive unit weight or height, a negative slope angle, a friction angle
outside `(0, 50)` degrees, or a slope angle not strictly less than the friction angle returns `{ error }` (at
`beta >= phi` the surface is at or past the angle of repose and the Rankine active state is undefined). Citation
discipline (v19/v22): the Rankine sloped-backfill coefficient by name, as compiled in Das (Principles of Foundation
Engineering) and NAVFAC DM-7.02; the note states that **the resultant acts parallel to the backfill slope (its
horizontal and slope-normal components are reported), the case is cohesionless with a vertical wall face and a
planar sloping surface, and beta must stay below phi** -- a design aid, not a substitute for a geotechnical
engineer's report.

## 2. The tile

### 2.1 `sloped-backfill-earth-pressure` -- The Push of a Backfill That Rises Behind the Wall

```
inputs:
  phi        deg    drained friction angle (in (0, 50))
  beta       deg    backfill slope angle above horizontal (in [0, phi))
  gamma      pcf    soil unit weight (> 0)
  h_ft       ft     retained height H (> 0)

Ka     = cos b x (cos b - sqrt(cos^2 b - cos^2 phi)) / (cos b + sqrt(cos^2 b - cos^2 phi))   [-]
Pa     = 0.5 x Ka x gamma x H^2                              [lb/ft]  acts parallel to the slope, at H/3
Pa_h   = Pa x cos(beta)                                      [lb/ft]  horizontal component (overturns the wall)
Pa_v   = Pa x sin(beta)                                      [lb/ft]  slope-parallel vertical component (on the heel)
Ka0    = (1 - sin phi) / (1 + sin phi)                       [-]      level-backfill coefficient, for contrast
```

**Pinned worked example (a 15-degree bermed backfill).** phi = 30 deg, beta = 15 deg, gamma = 120 pcf, H = 10 ft:
`cos 15 = 0.9659`, `cos 30 = 0.8660`, `sqrt(0.9330 - 0.7500) = 0.4278`, so `Ka = 0.9659 x (0.9659 - 0.4278) /
(0.9659 + 0.4278) = ` **0.373**, `Pa = 0.5 x 0.373 x 120 x 10^2 = ` **2,238 lb/ft** acting 15 degrees above
horizontal, with `Pa_h = 2,238 x cos 15 = ` **2,161 lb/ft** and `Pa_v = 2,238 x sin 15 = ` **579 lb/ft**. The level
tile gives `Ka0 = 0.333` and 2,000 lb/ft, so the slope adds **12%** to the thrust and a vertical component the level
case never has. **Cross-check (the slope approaching the angle of repose).** phi = 30, beta = 29 deg: `Ka = ` **0.660**
and `Pa = ` **3,960 lb/ft**, nearly 2x the level value -- the coefficient runs away as beta -> phi, which is why a
backfill steeper than the soil's own friction angle cannot be retained by a gravity/cantilever wall on Rankine terms.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, beside `submerged-earth-pressure`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (Rankine sloped-backfill / Das / NAVFAC DM-7.02, the note per
§1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`sloped-backfill-earth-pressure` -> `computeSlopedBackfillEarthPressure` in `../../calc-geotech.js`);
`scripts/related-tiles.mjs` (-> `lateral-earth-pressure` / `at-rest-earth-pressure` / `retaining-wall-stability`);
`data/search/aliases.json` ("sloped backfill pressure", "inclined backfill", "rankine sloped ka", "backfill slope
thrust", plus question rows); `GEOTECH_RENDERERS["sloped-backfill-earth-pressure"]` via the module's
`_simpleRenderer` factory (mirroring `lateral-earth-pressure`) and the id added to the calc-geotech declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the beta = 0 reduction to the level coefficient, the parallel-
resultant components, and the error seams (non-finite, non-positive gamma / H, negative beta, phi out of range,
beta >= phi). Group E has no exact audit-count assertion and the mechanical-governance test is an explicit list, so
no count bump. The calc-geotech.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> Ka 0.373, Pa 2,238 lb/ft, Pa_h 2,161 lb/ft).

## 5. Roadmap position

Continues the earth-pressure limit-state cluster spec-v261 named beside `lateral-earth-pressure`, after the at-rest
(spec-v624) and submerged (spec-v625) tiles. The Coulomb wall-friction / inclined-face form remains a deliberate
future follow-on, the last of the five spec-v261 named. Further Group E growth stays evidence-driven.
