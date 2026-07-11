# roughlogic.com Specification v628 -- Coulomb Active Earth Pressure with Wall Friction and Batter (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`**
> (Group E, geotechnical), no new module, group, or dependency. Inherits spec.md through spec-v627.md.
>
> **The gap, and the evidence for it.** Spec-v261 (`lateral-earth-pressure`) names as a deliberate follow-on
> "a Coulomb form with wall friction and an inclined face," and its own note says Coulomb theory "is required for an
> inclined or rough face and gives a lower active thrust." Rankine assumes a perfectly smooth vertical wall, which
> throws away two real effects: a rough wall carries part of the soil's weight in shear along the face (wall
> friction `delta`), and a battered or inclined face (`theta`) changes the wedge geometry. Coulomb's coefficient
> captures both and is the case a wall designer actually wants, because it gives a lower, more economical active
> thrust than Rankine while also handling a sloped backfill (`alpha`). The number that catches designers out: the
> same 10 ft, phi = 30 wall that Rankine loads at 2,000 lb/ft carries only **1,676 lb/ft** of *horizontal* thrust
> once two-thirds-phi wall friction is credited -- a **16%** cut in the force that overturns the wall, plus a 610
> lb/ft downward drag on the face that actually helps resist sliding.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The four angles and the
coefficient are `dimensionless`, the unit weight is `M L^-2 T^-2`, the height is `L`, and the thrusts are `M T^-2`,
mirroring the `lateral-earth-pressure` sibling. The v18/v21 contract: any non-finite input, a non-positive unit
weight or height, a friction angle outside `(0, 50)`, a wall friction `delta` outside `[0, phi]`, a wall batter
`theta` outside `[0, 40)`, or a backfill slope `alpha` outside `[0, phi)` returns `{ error }` (these ranges keep the
Coulomb radical non-negative and the denominator positive; at `alpha = phi` the backfill is at repose and at
`delta + theta >= 90` the geometry is degenerate). Citation discipline (v19/v22): the Coulomb (1776) active
coefficient by name, as compiled in Das (Principles of Foundation Engineering) and NAVFAC DM-7.02; the note states
that **the resultant acts at angle `delta + theta` from the horizontal (its horizontal and vertical components are
reported, the vertical acting downward on the face to resist sliding), Coulomb gives a lower active thrust than
Rankine for a rough wall, and the level-frictionless case reduces exactly to the Rankine coefficient shown for
contrast** -- a design aid, not a substitute for a geotechnical engineer's report.

## 2. The tile

### 2.1 `coulomb-earth-pressure` -- Active Thrust on a Rough, Battered Wall (Coulomb)

```
inputs:
  phi        deg    soil friction angle (in (0, 50))
  delta      deg    wall friction angle (in [0, phi], ~2/3 phi typical, 0 = smooth)
  theta      deg    wall face batter from vertical (in [0, 40), 0 = vertical)
  alpha      deg    backfill slope above horizontal (in [0, phi), 0 = level)
  gamma      pcf    soil unit weight (> 0)
  h_ft       ft     retained height H (> 0)

Ka   = cos^2(phi - theta) / [ cos^2(theta) x cos(delta + theta) x (1 + sqrt( sin(phi + delta) x sin(phi - alpha)
                                                                    / (cos(delta + theta) x cos(theta - alpha)) ))^2 ]
Pa   = 0.5 x Ka x gamma x H^2                     [lb/ft]  acts at (delta + theta) from horizontal
Pa_h = Pa x cos(delta + theta)                    [lb/ft]  horizontal component (overturns the wall)
Pa_v = Pa x sin(delta + theta)                    [lb/ft]  vertical component (downward drag on the face)
Ka0  = (1 - sin phi) / (1 + sin phi)              [-]      Rankine level-frictionless coefficient, for contrast
```

**Pinned worked example (a rough vertical wall, level backfill).** phi = 30 deg, delta = 20 deg, theta = 0, alpha =
0, gamma = 120 pcf, H = 10 ft: `Ka = ` **0.297** (vs the Rankine `Ka0 = 0.333`), `Pa = 0.5 x 0.297 x 120 x 10^2 = `
**1,784 lb/ft** acting 20 degrees below horizontal, with `Pa_h = 1,784 x cos 20 = ` **1,676 lb/ft** and `Pa_v = `
**610 lb/ft** downward on the face. The Rankine tile gives 2,000 lb/ft horizontal, so crediting wall friction cuts
the overturning thrust **16%** and adds a stabilizing vertical drag. **Cross-check (a 15-degree sloped backfill).**
alpha = 15 deg: `Ka = ` **0.371**, `Pa = ` **2,224 lb/ft**, `Pa_h = ` **2,090 lb/ft** -- the slope more than cancels
the wall-friction credit, the combined case Rankine cannot express in one coefficient.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, beside `sloped-backfill-earth-pressure`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (Coulomb 1776 / Das / NAVFAC DM-7.02, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`coulomb-earth-pressure` ->
`computeCoulombEarthPressure` in `../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `lateral-earth-pressure`
/ `sloped-backfill-earth-pressure` / `retaining-wall-stability`); `data/search/aliases.json` ("coulomb earth
pressure", "wall friction active pressure", "rough wall thrust", "battered wall earth pressure", plus question
rows); `GEOTECH_RENDERERS["coulomb-earth-pressure"]` via the module's `_simpleRenderer` factory (mirroring
`lateral-earth-pressure`) and the id added to the calc-geotech declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the exact reduction to the Rankine coefficient at `delta = theta = alpha = 0`, the wall-friction-lowers-
the-thrust relation, and the error seams. Group E has no exact audit-count assertion and the mechanical-governance
test is an explicit list, so no count bump. The calc-geotech.js gzip cap is at its limit; this landing raises it from
16,500 to 18,000 with a `check-module-sizes.mjs` note (the established per-module cap-relief pattern). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> Ka 0.297, Pa_h 1,676 lb/ft).

## 5. Roadmap position

Closes the five-tile earth-pressure limit-state cluster spec-v261 named beside `lateral-earth-pressure`: at-rest
(spec-v624), submerged (spec-v625), sloped-backfill (spec-v626), the seepage slope companion (spec-v627), and now
the Coulomb wall-friction form. The spec-v261 earth-pressure follow-on queue is complete. Further Group E growth
stays evidence-driven.
