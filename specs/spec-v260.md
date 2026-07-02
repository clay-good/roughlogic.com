# roughlogic.com Specification v260 -- Shallow Foundation Bearing Capacity (General Bearing-Capacity Equation) (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v260..v262 (the geotechnical foundation-and-earth-retaining trio -- the
> three questions the ground poses once the structural batches have sized the member: will the soil carry the footing
> (bearing), how hard does the retained soil push (lateral earth pressure), and does the wall that holds it back stay put
> (overturning and sliding). This spec opens the batch with the vertical bearing check.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the steel batch (v254..v256) and the reinforced-
> concrete batch (v257..v259) size the member, and the catalog already divides a service load by an allowable pressure
> keyed to a soil *class* (`footing-area`) and sizes a helical pile from torque (`helical-pile`), but nothing computes the
> allowable pressure itself from the *soil's own strength* -- its cohesion, friction angle, and unit weight. Adds one tile
> to a new **`calc-geotech.js`** Group E cluster (shallow-foundation and earth-retaining geotechnics, beside the concrete-
> placement, steel-member, and reinforced-concrete tiles); no new group, trade, or dependency. Inherits spec.md through
> spec-v259.md.
>
> **The gap, and the evidence for it.** The load path the last two batches trace -- moment into the beam, into the column,
> into the footing -- ends at the soil, and the first question the soil answers is how much pressure it will take before it
> shears out from under the footing. The general bearing-capacity equation makes that a one-line calculation: the ultimate
> gross pressure a strip footing carries is `qu = c x Nc + q x Nq + 0.5 x gamma x B x Ngamma`, the sum of a cohesion term,
> a surcharge (embedment) term, and a footing-width self-weight term, each scaled by a dimensionless bearing-capacity
> factor that depends only on the soil friction angle `phi` (Vesic: `Nq = e^(pi tan phi) x tan^2(45 + phi/2)`,
> `Nc = (Nq - 1) x cot phi`, `Ngamma = 2 x (Nq + 1) x tan phi`), with shape factors for square and circular footings. A
> 6 ft strip footing 4 ft deep on a medium-dense sand (`phi = 32 deg`, `gamma = 120 pcf`, `c = 0`) carries an ultimate
> gross pressure of about 22 ksf and, at the customary factor of safety of 3, an allowable of about 7.3 ksf -- the value a
> foundation-engineering textbook prints for that section. `footing-area` needs that allowable pressure handed to it; this
> tile is where the pressure comes from.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The cohesion `c` is a stress
(psf); the friction angle `phi` is an angle carried as dimensionless (degrees in, radians internally); the soil unit weight
`gamma` is a force per volume (pcf); the footing width `B` and embedment depth `Df` are lengths (ft); the surcharge
`q = gamma x Df`, the ultimate `qu`, and the allowable `q_all` are stresses (psf, reported in ksf alongside); the bearing-
capacity and shape factors are dimensionless; the factor of safety `FS` is dimensionless. The v18/v21 contract: any
non-finite input, a unit weight, width, or factor of safety at or below zero, a negative cohesion or embedment, or a
friction angle below 0 or at/above 50 degrees (outside the theory's calibrated range), returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the bearing-capacity relation by name; `editionNote` names **the general
bearing-capacity equation `qu = c Nc sc + q Nq sq + 0.5 gamma B Ngamma sgamma` with the Vesic (1973) bearing-capacity
factors `Nq = e^(pi tan phi) tan^2(45 + phi/2)`, `Nc = (Nq - 1) cot phi`, `Ngamma = 2 (Nq + 1) tan phi` and the De Beer /
Vesic shape factors, as compiled in Das, Principles of Foundation Engineering, and FHWA-NHI-16-009 (GEC 6, Shallow
Foundations)**, gives `FS` a default of **3.0 (the customary factor of safety on gross bearing for a shallow foundation
under static load)** and `gamma` a default of **120 pcf**, and states that **this returns the gross ultimate and allowable
bearing pressure for a general-shear failure of a level, concentrically loaded footing with a level ground surface and the
water table at or below one footing width beneath the base -- it does not apply the net-bearing, groundwater, load-
inclination, eccentricity, local- or punching-shear, or settlement corrections; the allowable is a strength check only,
and settlement (not this) usually governs the design of a footing on sand; take `c`, `phi`, and `gamma` from the
geotechnical report for the actual site; and this is a design aid, not a substitute for a geotechnical engineer's
report** -- the geotechnical engineer of record's stamped recommendation governs.

## 2. The tile

### 2.1 `soil-bearing-capacity` -- Shallow Foundation Bearing Capacity (General Bearing-Capacity Equation, Vesic Factors)

```
inputs:
  c       psf     soil cohesion (0 for clean sand)
  phi     deg     soil effective friction angle (0 for undrained clay)
  gamma   pcf     soil unit weight (default 120)
  b_ft    ft      footing width (least plan dimension)
  df_ft   ft      embedment depth (ground surface to underside of footing)
  shape   enum    strip | square | circular (default strip)
  fs      -       factor of safety on gross bearing (default 3)

phi_r   = phi * pi / 180
Nq      = exp(pi * tan(phi_r)) * tan(pi/4 + phi_r/2)^2         ; = 1 at phi = 0
Nc      = phi < 0.01 deg ? (2 + pi) : (Nq - 1) / tan(phi_r)     ; 5.14 at phi = 0
Ngamma  = 2 * (Nq + 1) * tan(phi_r)                            ; = 0 at phi = 0
bl      = shape == "strip" ? 0 : 1                             ; width/length ratio
sc      = 1 + bl * (Nq / Nc)                                   ; shape factor, cohesion term
sq      = 1 + bl * tan(phi_r)                                  ; shape factor, surcharge term
sgamma  = 1 - 0.4 * bl                                         ; shape factor, self-weight term
q_surch = gamma * df_ft                                        ; surcharge at footing level, psf
qu      = c*Nc*sc + q_surch*Nq*sq + 0.5*gamma*b_ft*Ngamma*sgamma   ; ultimate gross, psf
q_all   = qu / fs                                              ; allowable gross, psf
```

**Pinned worked example (a 6 ft strip footing on medium-dense sand).** `c = 0`, `phi = 32 deg`, `gamma = 120 pcf`,
`B = 6 ft`, `Df = 4 ft`, shape strip, `FS = 3`: `Nq = e^(pi x 0.6249) x tan^2(61 deg) = 7.122 x 3.255 = 23.18`;
`Nc = (23.18 - 1) x cot 32 = 35.50`; `Ngamma = 2 x 24.18 x 0.6249 = 30.22`; strip shape factors all 1.0;
`q = 120 x 4 = 480 psf`; `qu = 0 + 480 x 23.18 + 0.5 x 120 x 6 x 30.22 = 11,126 + 10,879 = 22,006 psf = ` **22.0 ksf**
ultimate; `q_all = 22,006 / 3 = ` **7,335 psf (7.3 ksf)** allowable. The value matches the standard foundation-engineering
worked example for that section to the printed precision, and lands where a "dense sand" presumptive value (roughly 6 to
8 ksf) would put it. **Cross-check (a 5 ft square footing on stiff undrained clay, the `phi = 0` seam).** `c = 2,000 psf`,
`phi = 0`, `gamma = 115 pcf`, `Df = 3 ft`, square, `FS = 3`: the `phi = 0` branch pins `Nq = 1`, `Nc = 5.14`,
`Ngamma = 0`; square shape factors `sc = 1 + 1 x (1/5.14) = 1.195`, `sq = 1.0`, `sgamma = 0.6`; `q = 345 psf`;
`qu = 2,000 x 5.14 x 1.195 + 345 x 1 + 0 = 12,285 + 345 = 12,630 psf`; `q_all = 4,210 psf`. The self-weight term vanishes
(cohesive undrained soil carries nothing from footing width), the cohesion term dominates, and `Nc = 5.14` is the exact
Prandtl value every soil-mechanics text prints for a smooth strip on `phi = 0` clay -- the branch that keeps the
`(Nq - 1) / tan phi` form from dividing by zero is the seam the fuzzer pins.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the general bearing-capacity relation, `editionNote` naming the Vesic factors and the Das /
FHWA GEC 6 compilation with the gross-bearing, general-shear-only, no-groundwater/eccentricity/settlement, take-`c`/`phi`/
`gamma`-from-the-report, and design-aid caveats); `test/fixtures/worked-examples.json` (the 6 ft strip sand example + the
5 ft square `phi = 0` clay cross-check); `test/fixtures/compute-map.js` (`soil-bearing-capacity` ->
`computeSoilBearingCapacity` in `../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `footing-area` /
`retaining-wall-stability` / `helical-pile`); `data/search/aliases.json` ("bearing capacity", "Terzaghi bearing", "allowable
soil pressure", "ultimate bearing capacity", "qu equals c Nc plus q Nq", "bearing capacity factors", "will the soil hold
the footing", "shallow foundation bearing"); the id appended to a new geotech renderers declare in `app.js`; the
`// dims:` annotation (`c` pressure, `phi` dimensionless, `gamma` force/length^3, `b_ft`/`df_ft` length, `qu`/`q_all`
pressure); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams
(non-finite, `gamma <= 0`, `b_ft <= 0`, `fs <= 0`, `c < 0`, `df_ft < 0`, `phi < 0`, `phi >= 50`) and the `phi = 0`
factor identities (`Nq = 1`, `Nc = 5.14`, `Ngamma = 0`). Add the `calc-geotech.js` size to the `check:module-sizes`
allowlist (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the eight error paths, the `phi = 0` identity assertions); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Nc / Nq / Ngamma / qu /
q_all stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (6 ft strip at phi 32 -> 22.0 ksf
ultimate, 7.3 ksf allowable).

## 5. Roadmap position

Opens the geotechnical foundation-and-earth-retaining batch (v260..v262). The bearing check is the vertical limit state
that the lateral pair -- `lateral-earth-pressure` (v261) and `retaining-wall-stability` (v262) -- lean on for the toe-
pressure check, and it is the pressure `footing-area` has always needed handed to it. A net-bearing form, a Vesic
groundwater correction, a settlement (elastic and consolidation) companion, and eccentric / inclined-load factors are the
deliberate next follow-ons once the base bearing check lands; with the trio complete the geotech cluster stands beside the
steel-member (v254..v256), reinforced-concrete (v257..v259), and building-code (v242..v253) clusters in Group E.
