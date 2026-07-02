# roughlogic.com Specification v261 -- Rankine Lateral Earth Pressure and Thrust (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v260..v262 (the geotechnical foundation-and-earth-retaining trio). This spec
> is the middle tile -- the lateral load the retained soil applies, which the bearing tile (v260) sits beneath and the
> stability tile (v262) resists.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog counts the blocks in a segmental wall
> (`retaining-wall-block`) and sets back the spoil pile from a trench (`spoil-setback`, which reasons about surcharge), but
> nothing computes the lateral pressure a body of retained soil actually exerts -- the coefficient and the resultant thrust
> that size a basement wall, a shoring system, or the cantilever wall of v262. Adds one tile to the **`calc-geotech.js`**
> Group E cluster opened by v260; no new group, trade, or dependency. Inherits spec.md through spec-v260.md.
>
> **The gap, and the evidence for it.** Every retained-soil problem starts with the same coefficient. Rankine's theory
> reduces the horizontal-to-vertical stress ratio of a cohesionless soil against a vertical, frictionless wall with a level
> backfill to a function of the friction angle alone: the active coefficient (soil pushing out, the wall yielding away) is
> `Ka = tan^2(45 - phi/2) = (1 - sin phi) / (1 + sin phi)`, and the passive coefficient (the wall pushing back into the
> soil) is its reciprocal `Kp = tan^2(45 + phi/2)`. The pressure grows linearly with depth, so the resultant active thrust
> on a wall of height `H` is the area of that triangle, `Pa = 0.5 x Ka x gamma x H^2`, acting at `H/3` above the base; a
> uniform surcharge `q` adds a rectangular `Ka x q x H` at mid-height. For a 10 ft wall retaining a `phi = 30 deg`,
> `gamma = 120 pcf` sand, `Ka = 1/3`, the active thrust is exactly 2,000 lb per foot of wall and the passive resistance is
> 18,000 lb per foot -- the nine-to-one ratio that is why you never count on passive pressure lightly and why the wall in
> v262 needs the weight it does. The catalog reasons about surcharge geometry but has never computed this pressure.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The friction angle `phi` is
an angle carried as dimensionless (degrees in, radians internally); the soil unit weight `gamma` is a force per volume
(pcf); the retained height `H` is a length (ft); the surcharge `q` is a stress (psf); the active and passive coefficients
`Ka`, `Kp` are dimensionless; the resultant thrusts `Pa`, `Pp` are a force per unit length of wall (lb/ft), and their
lines of action are lengths (ft above the base). The v18/v21 contract: any non-finite input, a unit weight or height at or
below zero, a negative surcharge, or a friction angle at or below 0 or at/above 50 degrees returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the Rankine relation by name; `editionNote` names **Rankine (1857) lateral
earth pressure -- `Ka = tan^2(45 - phi/2) = (1 - sin phi)/(1 + sin phi)`, `Kp = 1/Ka = tan^2(45 + phi/2)`, resultant
`Pa = 0.5 Ka gamma H^2` at `H/3` plus a surcharge `Ka q H` at `H/2` -- as compiled in Das, Principles of Foundation
Engineering, and NAVFAC DM-7.02 (Foundations and Earth Structures)**, gives `gamma` a default of **120 pcf** and `q` a
default of **0**, and states that **this is the Rankine case only -- a cohesionless soil (the `2c sqrt(Ka)` tension-crack
reduction of a cohesive backfill is not applied), a vertical wall face with no wall friction (Coulomb theory is required
for an inclined or rough face, and gives a lower active thrust), a dry level backfill with no water table (a submerged
zone must be run with buoyant unit weight plus a separate hydrostatic pressure), and the fully-mobilized active and
passive limit states (the wall must move enough to reach them); take `phi` and `gamma` from the geotechnical report; and
this is a design aid, not a substitute for a geotechnical engineer's report** -- the geotechnical engineer of record's
recommendation governs.

## 2. The tile

### 2.1 `lateral-earth-pressure` -- Rankine Active and Passive Earth Pressure and Thrust

```
inputs:
  phi     deg     soil effective friction angle
  gamma   pcf     soil unit weight (default 120)
  h_ft    ft      retained height
  q       psf     uniform surcharge on the backfill surface (default 0)

phi_r   = phi * pi / 180
Ka      = (1 - sin(phi_r)) / (1 + sin(phi_r))        ; = tan^2(45 - phi/2)
Kp      = 1 / Ka                                     ; = tan^2(45 + phi/2)
pa_base = Ka * gamma * h_ft                          ; active pressure at base, psf
Pa_soil = 0.5 * Ka * gamma * h_ft^2                  ; active thrust from soil, lb/ft, acts at h/3
Pa_surch= Ka * q * h_ft                              ; active thrust from surcharge, lb/ft, acts at h/2
Pa_tot  = Pa_soil + Pa_surch                         ; total active thrust, lb/ft
y_bar   = (Pa_soil*(h_ft/3) + Pa_surch*(h_ft/2)) / Pa_tot   ; resultant height above base, ft
Pp      = 0.5 * Kp * gamma * h_ft^2                  ; passive thrust, lb/ft, acts at h/3
```

**Pinned worked example (a 10 ft wall, medium sand, no surcharge).** `phi = 30 deg`, `gamma = 120 pcf`, `H = 10 ft`,
`q = 0`: `Ka = (1 - 0.5)/(1 + 0.5) = 0.333`; `Kp = 3.0`; base pressure `= 0.333 x 120 x 10 = 400 psf`;
`Pa = 0.5 x 0.333 x 120 x 100 = ` **2,000 lb/ft** at `H/3 = 3.33 ft` above the base; `Pp = 0.5 x 3.0 x 120 x 100 = `
**18,000 lb/ft**. `Ka = 1/3` for `phi = 30` is the identity every soil-mechanics text opens with, and the nine-to-one
passive-to-active ratio is the exact `Kp/Ka = 9` for that angle. **Cross-check (the same wall with a 250 psf surcharge, a
parking-lot or construction load behind it).** `q = 250 psf`: the surcharge adds `Pa_surch = 0.333 x 250 x 10 = 833 lb/ft`
acting at mid-height `5 ft`; total `Pa = 2,000 + 833 = 2,833 lb/ft`; the resultant rises to
`y_bar = (2,000 x 3.33 + 833 x 5.0)/2,833 = (6,667 + 4,167)/2,833 = 3.82 ft` above the base -- the surcharge both grows the
thrust 42% and lifts its line of action, worsening the overturning arm the stability tile (v262) integrates, which is why
a surcharge behind a wall is never a small correction.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the Rankine relation, `editionNote` naming Rankine 1857 / Das / NAVFAC DM-7.02 with the
cohesionless-only, no-wall-friction, dry-level-backfill, and design-aid caveats); `test/fixtures/worked-examples.json`
(the 10 ft no-surcharge example + the 250 psf surcharge cross-check); `test/fixtures/compute-map.js`
(`lateral-earth-pressure` -> `computeLateralEarthPressure` in `../../calc-geotech.js`); `scripts/related-tiles.mjs`
(-> `retaining-wall-stability` / `soil-bearing-capacity` / `spoil-setback`); `data/search/aliases.json` ("earth pressure",
"Rankine", "active pressure coefficient", "Ka Kp", "lateral soil pressure", "passive resistance", "thrust on a retaining
wall", "surcharge on backfill"); the id appended to the geotech renderers declare in `app.js`; the `// dims:` annotation
(`phi` dimensionless, `gamma` force/length^3, `h_ft` length, `q` pressure, `Ka`/`Kp` dimensionless, thrusts force/length,
`y_bar` length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error
seams (non-finite, `gamma <= 0`, `h_ft <= 0`, `q < 0`, `phi <= 0`, `phi >= 50`) and the `Ka x Kp = 1` reciprocal identity.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the five error paths, the `Ka x Kp = 1` assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Ka / Kp / Pa / y_bar / Pp stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (10 ft at phi 30 -> Ka 0.333, Pa 2,000 lb/ft at
3.33 ft, Pp 18,000 lb/ft).

## 5. Roadmap position

The middle tile of the geotech batch (v260..v262). Rankine pressure is the load the stability tile `retaining-wall-stability`
(v262) integrates into overturning and sliding demand, and it stands alone for the shoring and basement-wall trades. A
Coulomb form with wall friction and an inclined face, a sloped-backfill Rankine coefficient, an at-rest `K0 = 1 - sin phi`
case for a braced (non-yielding) wall, and a submerged-backfill hydrostatic companion are the deliberate next follow-ons.
