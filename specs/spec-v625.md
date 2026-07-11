# roughlogic.com Specification v625 -- Submerged-Backfill Earth Pressure (Buoyant + Hydrostatic) (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`**
> (Group E, geotechnical), no new module, group, or dependency. Inherits spec.md through spec-v624.md.
>
> **The gap, and the evidence for it.** Spec-v261 (`lateral-earth-pressure`) computes the dry Rankine case and its
> own note says a **"submerged zone must be run with buoyant unit weight plus separate hydrostatic pressure,"**
> naming a submerged-backfill hydrostatic companion as a deliberate follow-on. When the backfill behind a wall is
> below the water table, two things change at once: the soil skeleton now pushes with its *buoyant* weight
> (`gamma' = gamma_sat - gamma_w`, roughly half its dry value), but the water pushes with the *full* hydrostatic
> pressure at no `Ka` reduction. The net almost always goes up, and the mistake that floods basements and blows out
> walls is counting only the lighter buoyant soil and forgetting the water. The number that catches designers out:
> a 10 ft wall of phi = 30, 125 pcf saturated sand pushes **2,083 lb/ft** dry but **4,163 lb/ft** submerged --
> almost exactly **2x** the thrust, and three-quarters of it is water, not soil. This is why a working drain that
> keeps the backfill unsaturated is the cheapest structural element on the wall.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The friction angle and
coefficient are `dimensionless`, the saturated unit weight is `M L^-2 T^-2`, the height is `L`, the surcharge is
`M L^-1 T^-2`, and the thrusts are `M T^-2` (force per unit wall length), mirroring the `lateral-earth-pressure`
sibling. The freshwater unit weight `gamma_w = 62.4 pcf` is the universal constant already used in
`calc-earthwork.js` (soil-phase-relations). The v18/v21 contract: any non-finite input, a saturated unit weight not
greater than `gamma_w` (a buoyant weight must be positive -- soil is denser than water), a non-positive height, a
negative surcharge, or a friction angle outside `(0, 50)` degrees returns `{ error }`. Citation discipline
(v19/v22): the Rankine active coefficient with the effective-stress / buoyant-weight treatment by name, as compiled
in Das (Principles of Foundation Engineering) and NAVFAC DM-7.02; the note states that **this is the fully-submerged
active case (water table at the top of the retained height), the soil is cohesionless and the wall vertical and
free to reach its active state, the water and soil thrusts both act at H/3 (surcharge at H/2), and a working drain
that relieves the water is the intended design response** -- a design aid, not a substitute for a geotechnical
engineer's report.

## 2. The tile

### 2.1 `submerged-earth-pressure` -- The Push of a Backfill Below the Water Table

```
inputs:
  phi          deg    drained friction angle (in (0, 50))
  gamma_sat    pcf    saturated soil unit weight (> gamma_w = 62.4)
  h_ft         ft     submerged retained height H (> 0)
  q            psf    uniform surcharge (>= 0)

Ka          = (1 - sin phi) / (1 + sin phi)                               [-]
gamma_buoy  = gamma_sat - 62.4                                            [pcf]
pa_soil     = 0.5 x Ka x gamma_buoy x H^2                                 [lb/ft]  effective soil thrust, at H/3
pa_surch    = Ka x q x H                                                  [lb/ft]  surcharge thrust, at H/2
pw          = 0.5 x 62.4 x H^2                                            [lb/ft]  hydrostatic water thrust, at H/3
pa_tot      = pa_soil + pa_surch + pw                                     [lb/ft]
y_bar       = (pa_soil x H/3 + pa_surch x H/2 + pw x H/3) / pa_tot        [ft]
dry_ref     = 0.5 x Ka x gamma_sat x H^2                                  [lb/ft]  the same wall dry, for contrast
```

**Pinned worked example (a fully-submerged sand backfill).** phi = 30 deg, gamma_sat = 125 pcf, H = 10 ft, q = 0:
`Ka = 0.333`, `gamma_buoy = 125 - 62.4 = 62.6 pcf`, `pa_soil = 0.5 x 0.333 x 62.6 x 10^2 = ` **1,043 lb/ft**,
`pw = 0.5 x 62.4 x 10^2 = ` **3,120 lb/ft**, `pa_tot = ` **4,163 lb/ft** at `H/3 = ` **3.33 ft**. The same wall dry
carries `dry_ref = 0.5 x 0.333 x 125 x 100 = ` **2,083 lb/ft**, so submergence **doubles** the thrust and the water
alone (3,120 lb/ft) exceeds the entire dry design. **Cross-check (with a 300 psf surcharge).** `pa_surch = 0.333 x
300 x 10 = ` **1,000 lb/ft**, `pa_tot = ` **5,163 lb/ft**, resultant lifted to `y_bar = ` **3.66 ft**.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, beside `at-rest-earth-pressure`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (Rankine effective-stress / Das / NAVFAC DM-7.02, the note
per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`submerged-earth-pressure` -> `computeSubmergedEarthPressure` in `../../calc-geotech.js`);
`scripts/related-tiles.mjs` (-> `lateral-earth-pressure` / `at-rest-earth-pressure` / `retaining-wall-stability`);
`data/search/aliases.json` ("submerged backfill pressure", "hydrostatic wall pressure", "buoyant unit weight
thrust", "water table behind wall", plus question rows); `GEOTECH_RENDERERS["submerged-earth-pressure"]` via the
module's `_simpleRenderer` factory (mirroring `lateral-earth-pressure`) and the id added to the calc-geotech declare
list in `app.js`; a module-local `_GAMMA_W = 62.4` const; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the ~2x-dry relation,
the water-dominates check, and the error seams (non-finite, gamma_sat <= gamma_w, non-positive H, negative
surcharge, phi out of range). Group E has no exact audit-count assertion and the mechanical-governance test is an
explicit list, so no count bump. The calc-geotech.js gzip cap is expected to hold (verify at build). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> total 4,163 lb/ft, water 3,120 lb/ft, dry ref 2,083 lb/ft).

## 5. Roadmap position

Continues the earth-pressure limit-state cluster spec-v261 named beside `lateral-earth-pressure`, after the at-rest
(Jaky) tile of spec-v624. The sloped-backfill Rankine coefficient and the Coulomb wall-friction form remain
deliberate future follow-ons; a partial water table (drawdown at depth) is a natural extension of this fully-
submerged case. Further Group E growth stays evidence-driven.
