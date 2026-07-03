# roughlogic.com Specification v288 -- Deep Pile Axial Capacity in Clay (Alpha Method) (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v287..v289 (the geotechnical foundation depth trio -- elastic
> settlement (v287), deep-pile axial capacity (this spec), infinite-slope stability (v289)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `helical-pile` gives a torque-to-capacity correlation
> for a screw pile, but the catalog has no analytical axial capacity for a driven or bored pile from the soil's own
> strength -- the skin friction along the shaft plus the end bearing at the tip that a foundation engineer computes when
> there is no torque correlation to lean on. Adds one tile to the existing **`calc-geotech.js`** module (Group E); no new
> group, trade, or dependency. Inherits spec.md through spec-v287.md.
>
> **The gap, and the evidence for it.** In a cohesive soil, the alpha method takes the ultimate axial capacity as the shaft
> friction plus the tip bearing: `Qult = Qs + Qp`, with the unit skin friction `fs = alpha cu` acting over the shaft
> surface `As = pi D L` and the unit end bearing `qp = 9 cu` acting over the tip area `Ap = pi D^2/4`, where `alpha` is the
> adhesion factor (about 0.55 for a medium stiff clay) and `cu` is the undrained shear strength. For a 16 in driven pile
> 40 ft long in a `cu = 1,000 psf` clay with `alpha = 0.55`, `Qs = 0.55 x 1 x (pi x 1.33 x 40) = 92.2 kip` and
> `Qp = 9 x 1 x (pi x 1.33^2/4) = 12.6 kip`, so `Qult = 105 kip` and, at a factor of safety of 3, an allowable `35 kip` --
> the working capacity a designer assigns the pile, from the soil rather than a torque gauge. `helical-pile` reads capacity
> off installation torque; this tile reads it off the shear strength.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pile diameter `D` and
embedded length `L` are lengths (ft); the undrained shear strength `cu` is a pressure (ksf); the adhesion factor `alpha` and
factor of safety `FS` are dimensionless; the shaft area `As` and tip area `Ap` are areas (ft^2); the skin, tip, ultimate,
and allowable capacities are forces (kip). The v18/v21 contract: any non-finite input, a diameter/length/strength at or
below zero, or a factor of safety at or below zero returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general`
over the alpha-method pile capacity by name; `editionNote` names **the alpha (total-stress) method for a pile in clay --
`Qult = alpha cu (pi D L) + 9 cu (pi D^2/4)`, with the adhesion factor `alpha` (~1.0 soft to ~0.5 stiff) and the tip bearing
factor `Nc = 9`, as compiled in the FHWA and Das foundation texts -- and the customary factor of safety of 2 to 3 without a
load test**, and states that **this returns the ultimate and allowable static axial (compression) capacity of a single
straight-shaft pile in a uniform cohesive soil -- it uses the total-stress alpha method (not the beta effective-stress
method for sand), one soil layer, no group efficiency, no negative skin friction or uplift, and no pile-driving or dynamic
capacity; and this is a design aid, not a substitute for a geotechnical engineer's report and a load test** -- the
geotechnical engineer of record and, where required, a load test govern.

## 2. The tile

### 2.1 `pile-axial-capacity` -- Deep Pile Axial Capacity in Clay (Alpha Method)

```
inputs:
  D_ft     ft     pile diameter
  L_ft     ft     embedded length
  cu_ksf   ksf    undrained shear strength
  alpha    -      adhesion factor (~0.55 medium stiff)
  FS       -      factor of safety (default 3)

As   = pi * D_ft * L_ft                 ; shaft surface area, ft^2
Ap   = pi * D_ft^2 / 4                   ; tip area, ft^2
Qs   = alpha * cu_ksf * As              ; skin friction, kip
Qp   = 9 * cu_ksf * Ap                  ; end bearing (Nc = 9), kip
Qult = Qs + Qp                          ; ultimate capacity, kip
Qall = Qult / FS                        ; allowable capacity, kip
```

**Pinned worked example (a 16 in driven pile, 40 ft, cu = 1 ksf clay, alpha 0.55, FS 3).** `D = 16/12 = 1.333 ft`,
`L = 40`, `cu = 1`, `alpha = 0.55`, `FS = 3`: `As = pi x 1.333 x 40 = 167.6 ft^2`; `Ap = pi x 1.333^2/4 = 1.396 ft^2`;
`Qs = 0.55 x 1 x 167.6 = 92.2 kip`; `Qp = 9 x 1 x 1.396 = 12.6 kip`; `Qult = 104.7 kip`; `Qall = 104.7/3 = 34.9 kip`. Skin
friction carries 88% of the capacity, the usual result for a slender friction pile in clay. **Cross-check (double the
length to 80 ft).** `As = pi x 1.333 x 80 = 335.1 ft^2`; `Qs = 0.55 x 335.1 = 184.3 kip`; `Qp` unchanged at `12.6 kip`;
`Qult = 196.9 kip`, `Qall = 65.6 kip` -- the shaft friction scales with length while the tip does not, so a friction pile is
lengthened, not fattened, to add capacity. The non-finite, non-positive, and `FS <= 0` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching `helical-pile`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the alpha-method pile capacity, `editionNote` naming
`Qult = alpha cu (pi D L) + 9 cu (pi D^2/4)`, the adhesion factor, `Nc = 9`, the FS range, and the single-layer-clay,
total-stress, no-group, no-load-test caveats); `test/fixtures/worked-examples.json` (the 40 ft example + the 80 ft cross-
check); `test/fixtures/compute-map.js` (`pile-axial-capacity` -> `computePileAxialCapacity` in `../../calc-geotech.js`);
`scripts/related-tiles.mjs` (-> `helical-pile` / `soil-bearing-capacity` / `soil-settlement-elastic` / `footing-area`);
`data/search/aliases.json` ("pile capacity", "alpha method", "driven pile capacity", "skin friction pile", "end bearing",
"deep foundation capacity", "friction pile", "pile axial load", "cu pile"); the id appended to the existing geotech
renderers block in `app.js`; the `// dims:` annotation (`D`/`L` length, `cu` pressure, `alpha`/`FS` dimensionless, areas
area, capacities force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
length-scales-shaft-not-tip behavior, and the non-positive / `FS <= 0` / non-finite error seams. No new module; re-pin
`calc-geotech.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the shaft-vs-tip scaling assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Qs` / `Qp` / `Qult` / `Qall` stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (16 in, 40 ft, cu 1 -> 105 kip ult, 35 kip
allowable).

## 5. Roadmap position

Middle of the geotechnical foundation depth batch (v287..v289) in `calc-geotech.js`, giving the deep-foundation analytical
capacity beside the `helical-pile` torque correlation. Infinite-slope stability (v289) follows. The beta effective-stress
method for a pile in sand, pile-group efficiency, and negative skin friction (downdrag) are the deliberate next follow-ons
once the trio lands.
