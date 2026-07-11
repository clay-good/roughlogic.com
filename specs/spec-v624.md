# roughlogic.com Specification v624 -- At-Rest Earth Pressure (Jaky) for a Braced Wall (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`**
> (Group E, geotechnical), no new module, group, or dependency. Inherits spec.md through spec-v623.md.
>
> **The gap, and the evidence for it.** Spec-v261 (`lateral-earth-pressure`) computes the Rankine **active** and
> passive cases and names as a deliberate next follow-on "an at-rest `K0 = 1 - sin phi` case for a braced
> (non-yielding) wall." A Rankine active pressure is only valid once the wall has yielded enough for the soil to
> reach its active limit state. A basement wall, a braced excavation, or a rigid box culvert **cannot** deflect that
> far, so it carries the higher at-rest pressure -- and a designer who reaches for the active tile there under-
> predicts the thrust. Jaky's 1944 relation `K0 = 1 - sin phi'` closes exactly that gap with the same first-
> principles inputs the active tile already takes. The number that catches designers out: the same 10 ft, phi = 30
> sand that pushes **2,000 lb/ft** against a free-to-yield cantilever pushes **3,000 lb/ft** against a braced
> basement wall -- exactly **1.5x** more, because the wall never lets the soil relax to its active state.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The friction angle
and coefficient are `dimensionless`, the unit weight is `M L^-2 T^-2`, the height is `L`, the surcharge is
`M L^-1 T^-2`, the base pressure is `M L^-1 T^-2`, and the thrusts are `M T^-2` (force per unit wall length),
mirroring the `lateral-earth-pressure` sibling. The v18/v21 contract: any non-finite input, a non-positive unit
weight or height, a negative surcharge, or a friction angle outside `(0, 50)` degrees returns `{ error }` (the same
bounds the Rankine tile enforces). Citation discipline (v19/v22): the Jaky (1944) at-rest relation by name, as
compiled in Das (Principles of Foundation Engineering) and NAVFAC DM-7.02; the note states that **this is the
normally-consolidated cohesionless at-rest state (K0 = 1 - sin phi), applicable to a non-yielding wall that cannot
deflect to the active limit (basement wall, braced cut, rigid culvert); an overconsolidated deposit carries a
higher K0 and a submerged zone must be run with buoyant unit weight plus separate hydrostatic pressure; take phi and
gamma from the geotechnical report** -- a design aid, not a substitute for a geotechnical engineer's report.

## 2. The tile

### 2.1 `at-rest-earth-pressure` -- The Push on a Wall That Cannot Yield (Jaky K0)

```
inputs:
  phi        deg    drained friction angle (in (0, 50))
  gamma      pcf    soil unit weight (> 0)
  h_ft       ft     retained height H (> 0)
  q          psf    uniform surcharge (>= 0)

K0        = 1 - sin(phi)                                                  [-]   (Jaky, normally consolidated)
p0_base   = K0 x gamma x H                                                [psf] (at-rest pressure at the base)
p0_soil   = 0.5 x K0 x gamma x H^2                                        [lb/ft] triangular, acts at H/3
p0_surch  = K0 x q x H                                                    [lb/ft] rectangular, acts at H/2
p0_tot    = p0_soil + p0_surch                                           [lb/ft]
y_bar     = (p0_soil x H/3 + p0_surch x H/2) / p0_tot                     [ft]
```

**Pinned worked example (a braced basement wall).** phi = 30 deg, gamma = 120 pcf, H = 10 ft, q = 0:
`K0 = 1 - sin 30 = 1 - 0.5 = ` **0.500**, `p0_base = 0.5 x 120 x 10 = ` **600 psf**, `p0_soil = 0.5 x 0.5 x 120 x
10^2 = ` **3,000 lb/ft** acting at `H/3 = ` **3.33 ft**. The Rankine active tile gives Ka = 0.333 and Pa = 2,000
lb/ft for the same wall, so the braced wall carries **1.5x** the thrust. **Cross-check (with a parking
surcharge).** Same wall, q = 250 psf: `p0_surch = 0.5 x 250 x 10 = ` **1,250 lb/ft**, `p0_tot = 3,000 + 1,250 = `
**4,250 lb/ft** with the resultant lifted to `y_bar = ` **3.82 ft**.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, beside `lateral-earth-pressure`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (Jaky / Das / NAVFAC DM-7.02, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`at-rest-earth-pressure` ->
`computeAtRestEarthPressure` in `../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `lateral-earth-pressure`
/ `retaining-wall-stability` / `boussinesq-surcharge-wall`); `data/search/aliases.json` ("at rest earth pressure",
"k0 coefficient", "jaky", "braced wall pressure", "basement wall soil pressure", plus question rows);
`GEOTECH_RENDERERS["at-rest-earth-pressure"]` via the module's `_simpleRenderer` factory (mirroring
`lateral-earth-pressure`) and the id added to the calc-geotech declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the K0 = 0.5 identity at phi = 30, the 1.5x-active relation, and the error seams (non-finite, non-
positive gamma / H, negative surcharge, phi out of range). Group E has no exact audit-count assertion and the
mechanical-governance test is an explicit list, so no count bump. The calc-geotech.js gzip cap is expected to hold
(verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> K0 0.500, base 600 psf, thrust 3,000 lb/ft at 3.33 ft).

## 5. Roadmap position

Opens the earth-pressure limit-state cluster spec-v261 named beside `lateral-earth-pressure`. The submerged /
hydrostatic backfill companion, the sloped-backfill Rankine coefficient, and the Coulomb wall-friction form remain
deliberate future follow-ons, each a distinct closed-form geometry off the same soil inputs. Further Group E growth
stays evidence-driven.
