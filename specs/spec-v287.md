# roughlogic.com Specification v287 -- Shallow Foundation Elastic (Immediate) Settlement (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v287..v289 (the geotechnical foundation depth trio -- the
> checks the bearing-capacity and earth-pressure tiles left open: the immediate elastic settlement of a footing (this spec,
> the settlement `soil-bearing-capacity` says "usually governs on sand and is separate"), the axial capacity of a deep
> pile (v288), and the infinite-slope stability of a natural or cut slope (v289).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `soil-bearing-capacity` returns the ultimate bearing
> strength and notes "settlement usually governs on sand and is separate" -- that settlement is this gap. A footing can be
> far below its bearing capacity yet settle too much; the elastic (immediate) settlement is the serviceability check that
> often sizes a spread footing on granular soil. Adds one tile to the existing **`calc-geotech.js`** module (Group E); no
> new group, trade, or dependency. Inherits spec.md through spec-v286.md.
>
> **The gap, and the evidence for it.** The elastic (immediate) settlement of a flexible footing follows the theory-of-
> elasticity form `Se = q B (1 - nu^2) Is / Es`, where `q` is the net contact pressure, `B` the footing width, `nu` the
> soil Poisson's ratio, `Es` the soil elastic modulus, and `Is` a shape-and-rigidity influence factor (about 0.82 for a
> rigid square, ~0.95 average for a flexible square, larger for strip footings). For a 6 ft square footing carrying a net
> 3 ksf on a medium sand (`Es = 250 ksf`, `nu = 0.3`, rigid `Is = 0.82`), `Se = 3 x 6 x (1 - 0.09) x 0.82 / 250 = 0.0537 ft = 0.64 in`
> -- comfortably under the customary 1 in limit, but the number that decides it, and one `soil-bearing-capacity` explicitly
> does not give. `soil-bearing-capacity` sizes the footing against strength; this tile sizes it against movement.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The net contact pressure `q`
is a pressure (ksf); the footing width `B` is a length (ft); the soil elastic modulus `Es` is a pressure (ksf); Poisson's
ratio `nu` and the influence factor `Is` are dimensionless; the settlement `Se` is a length (reported in inches). The
v18/v21 contract: any non-finite input, a pressure/width/modulus at or below zero, or a Poisson's ratio outside
`0 <= nu < 0.5` returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the elasticity-based
immediate-settlement form by name; `editionNote` names **the theory-of-elasticity immediate settlement
`Se = q B (1 - nu^2) Is / Es`, with the shape-and-rigidity influence factor `Is` (~0.82 rigid square, ~0.95 flexible
average, larger for strips) as compiled in Bowles and the customary geotechnical texts**, and states that **this returns the
immediate (elastic) settlement of a footing on a deep, uniform elastic layer -- it is not the consolidation settlement of a
clay (a separate, time-dependent calculation), assumes a single homogeneous soil modulus (no layering or modulus increase
with depth), takes the influence factor as entered, and excludes the embedment (depth) correction; and this is a design
aid, not a substitute for a geotechnical engineer's report** -- the geotechnical engineer of record's report governs.

## 2. The tile

### 2.1 `soil-settlement-elastic` -- Shallow Foundation Elastic (Immediate) Settlement

```
inputs:
  q_ksf    ksf    net contact pressure at the footing base
  B_ft     ft     footing width (least plan dimension)
  Es_ksf   ksf    soil elastic modulus
  nu       -      Poisson's ratio (0.3 sand, 0.4-0.5 clay)
  Is       -      shape/rigidity influence factor (0.82 rigid square default)

Se_ft = q_ksf * B_ft * (1 - nu^2) * Is / Es_ksf       ; elastic settlement, ft
Se_in = Se_ft * 12                                     ; reported in inches
```

**Pinned worked example (a 6 ft square rigid footing, 3 ksf on medium sand).** `q = 3`, `B = 6`, `Es = 250`, `nu = 0.3`,
`Is = 0.82`: `Se = 3 x 6 x (1 - 0.3^2) x 0.82 / 250 = 3 x 6 x 0.91 x 0.82 / 250 = 13.43 / 250 = 0.0537 ft = 0.64 in`,
under the usual 1 in serviceability limit. **Cross-check (a softer, looser sand at half the modulus).** Drop `Es` to
`125 ksf`: `Se = 13.43 / 125 = 0.107 ft = 1.29 in` -- double, and now over the 1 in limit, so the same footing that passes
bearing fails settlement on the softer soil, exactly the case `soil-bearing-capacity` warned is separate. The non-finite,
non-positive, and `nu >= 0.5` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching `soil-bearing-capacity`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the elasticity-based settlement form, `editionNote` naming
`Se = q B (1 - nu^2) Is / Es`, the influence-factor values, and the immediate-not-consolidation, uniform-modulus,
no-embedment caveats); `test/fixtures/worked-examples.json` (the medium-sand example + the soft-sand cross-check);
`test/fixtures/compute-map.js` (`soil-settlement-elastic` -> `computeSoilSettlementElastic` in `../../calc-geotech.js`);
`scripts/related-tiles.mjs` (-> `soil-bearing-capacity` / `footing-area` / `pile-axial-capacity` / `helical-pile`);
`data/search/aliases.json` ("elastic settlement", "immediate settlement", "footing settlement", "settlement calculator",
"foundation settlement", "elastic modulus settlement", "1 inch settlement", "spread footing settlement", "settlement on
sand"); the id appended to the existing geotech renderers block in `app.js`; the `// dims:` annotation (`q`/`Es` pressure,
`B` length, `nu`/`Is` dimensionless, `Se` length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the `1/Es` scaling, and the non-positive / `nu >= 0.5` / non-finite error seams. No new module;
re-pin `calc-geotech.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `1/Es` scaling assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Se_ft` / `Se_in` pair with the
influence-factor note wraps on a phone); render-no-nan + a11y sweep, output read to the value (6 ft, 3 ksf, Es 250 ->
0.64 in).

## 5. Roadmap position

Opens the geotechnical foundation depth batch (v287..v289) in `calc-geotech.js`, closing the settlement gap
`soil-bearing-capacity` names. The pile (v288) and infinite-slope stability (v289) follow. Consolidation settlement of a
clay (the time-dependent `Cc`/`Cr` calculation), the Schmertmann strain-influence method, and the embedment/depth
correction are the deliberate next follow-ons once the trio lands.
