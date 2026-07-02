# roughlogic.com Specification v268 -- Column Base Plate under Axial Load (AISC Design Guide 1) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v266..v268 (the AISC 360 steel-connection trio). This spec closes the batch
> at the bottom of the column: the base plate that spreads a concentric axial load onto the concrete pier or footing --
> the required bearing area, the cantilever geometry, and the plate thickness. It is the crown of the trio: the member trio
> (v254..v256) sized the column, the bolt tiles (v266, v267) joined the framing, and this is how the whole load path finally
> lands on the foundation.)**
> In-scope catalog expansion under the spec-v106 trades-only charter. The catalog sizes a steel column for axial capacity
> (`steel-column-capacity`, spec-v256) and computes anchor-bolt embedment in concrete (`anchor-embedment`), but nothing
> sizes the plate between them -- the base plate whose area is set by concrete bearing and whose thickness is set by the
> cantilever of the plate beyond the column footprint bending under that bearing pressure. Adds one tile to the
> **`calc-steel.js`** Group E cluster; no new group, module, trade, or dependency. Inherits spec.md through spec-v267.md.
>
> **The gap, and the evidence for it.** A concentrically loaded base plate is a two-part check, and AISC Design Guide 1
> gives both in closed form. First the plate has to be big enough that the concrete does not crush: the required bearing
> area is `A1_req = Pu / (phi_c x 0.85 x f'c)` (with a confinement bonus `sqrt(A2/A1) <= 2` when the pier is larger, taken
> as 1 here for the base case). Then the plate has to be thick enough not to bend up off the concrete at its cantilevered
> edges: with `m = (N - 0.95 d)/2` and `n = (B - 0.80 bf)/2` the two edge cantilevers, `n' = sqrt(d bf)/4` the inner
> yield-line length, and `l = max(m, n, n')`, the required thickness is `tp = l x sqrt( 2 Pu / (phi x Fy x B x N) )`. A
> W10x49 column landing `Pu = 400 kip` on a 14 in square A36 plate over 4 ksi concrete needs about `181 in^2` of bearing
> (the 14 in plate gives `196 in^2`, adequate) and a `1.07 in` plate -- call it a 1-1/8 in plate -- a number that decides
> the single most common steel-to-concrete detail on the job and that no one is going to assemble from three cantilever
> lengths and a yield-line thickness formula by hand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The factored axial load `Pu`
is a force (kip); the concrete strength `f'c` and the plate yield `Fy` are stresses (ksi); the column depth `d` and flange
width `bf`, the plate dimensions `B` and `N`, the cantilevers `m`, `n`, `n'`, `l`, and the required thickness `tp` are
lengths (in); the required and provided bearing areas `A1_req`, `A1` are areas (in^2); the bearing pressure `fpu` is a
stress (ksi). The v18/v21 contract: any non-finite input, a load, concrete strength, yield, column dimension, or plate
dimension at or below zero, or a plate `B`/`N` smaller than the column dimension it must cover (`N < 0.95 d` or
`B < 0.80 bf`, which makes a cantilever negative and the geometry invalid), returns `{ error }`; a provided area below the
required bearing area is a *flag* on an otherwise-valid result, not an error (the tile reports "increase the plate"). The
LRFD form is the base case (`phi_c = 0.65` for bearing, `phi = 0.90` for plate flexure). Citation discipline (v19/v22):
`GOVERNANCE.general` over the base-plate design procedure by name; `editionNote` names **AISC Steel Design Guide 1 (Base
Plate and Anchor Rod Design, 2nd ed.) §3.1 with AISC 360 §J8 concrete bearing -- `A1_req = Pu / (phi_c x 0.85 f'c)` (the
`sqrt(A2/A1) <= 2` confinement factor taken as 1 for the base case), the cantilevers `m = (N - 0.95 d)/2`,
`n = (B - 0.80 bf)/2`, `n' = sqrt(d bf)/4`, `l = max(m, n, lambda n')` with `lambda` conservatively 1.0, and the required
thickness `tp = l x sqrt(2 Pu / (phi Fy B N))`**, notes that **`phi_c = 0.65` is the ACI 318 / Design Guide 1 recommended
bearing factor (raw AISC 360 §J8 lists `0.60`; the Guide recommends the ACI value)**, gives `f'c` a default of **4 ksi
(normal-weight structural concrete)** and `Fy` a default of **36 ksi (ASTM A36 plate)**, and states that **this is a
concentric-axial-compression base plate (no moment, no uplift, no shear transfer); `lambda` is taken as 1.0 (conservative,
and exact whenever the computed `lambda` would cap at 1.0); the anchor rods, the anchor-to-concrete breakout, the shear
lug, and any base-plate moment / uplift are separate checks; and this is a design aid, not a substitute for a licensed
engineer's design** -- the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `column-base-plate` -- Column Base Plate under Concentric Axial Load (AISC Design Guide 1)

```
inputs:
  pu_kip     kip   factored axial compression Pu
  fc_ksi     ksi   concrete compressive strength f'c (default 4)
  fy_ksi     ksi   plate yield strength Fy (default 36)
  d_in       in    column overall depth d
  bf_in      in    column flange width bf
  b_in       in    plate width B (dimension parallel to bf)
  n_in       in    plate length N (dimension parallel to d)

; required concrete bearing area (confinement factor sqrt(A2/A1) = 1, base case), phi_c = 0.65
A1_req = pu_kip / (0.65 * 0.85 * fc_ksi)
A1     = b_in * n_in                          ; provided plate area
area_ok = A1 >= A1_req                         ; flag, not an error
; cantilever dimensions
m   = (n_in - 0.95 * d_in) / 2
n   = (b_in - 0.80 * bf_in) / 2
np  = sqrt(d_in * bf_in) / 4                    ; n' (lambda taken as 1.0)
l   = max(m, n, np)
; required plate thickness, phi = 0.90 flexure
fpu = pu_kip / A1                               ; bearing pressure
tp  = l * sqrt( 2 * pu_kip / (0.90 * fy_ksi * b_in * n_in) )   ; = l * sqrt(2*fpu/(0.90*fy_ksi))
```

**Pinned worked example (a W10x49 column, 400 kip, 14 in square A36 plate on 4 ksi concrete).** `Pu = 400 kip`,
`f'c = 4 ksi`, `Fy = 36 ksi`, `d = 9.98 in`, `bf = 10.0 in`, `B = N = 14 in`. Bearing:
`A1_req = 400 / (0.65 x 0.85 x 4) = 400 / 2.21 = ` **181 in^2**; provided `A1 = 14 x 14 = 196 in^2 >= 181`, so the plan
size is adequate. Cantilevers: `m = (14 - 0.95 x 9.98)/2 = (14 - 9.481)/2 = ` **2.26 in**;
`n = (14 - 0.80 x 10.0)/2 = (14 - 8.0)/2 = ` **3.00 in**; `n' = sqrt(9.98 x 10.0)/4 = sqrt(99.8)/4 = 9.99/4 = ` **2.50 in**;
`l = max(2.26, 3.00, 2.50) = 3.00 in` (the `n` edge governs). Thickness:
`tp = 3.00 x sqrt( 2 x 400 / (0.90 x 36 x 14 x 14) ) = 3.00 x sqrt(800 / 6,350) = 3.00 x sqrt(0.1260) = 3.00 x 0.3549 = `
**1.07 in** -- specify a 1-1/8 in plate. Both numbers match AISC Design Guide 1 §3.1 worked practice.
**Cross-check (raise the load to `Pu = 700 kip`).** Hold the plate and column: `A1_req = 700 / 2.21 = 317 in^2 > 196`, so
the tile *flags* the 14 in plate as too small in bearing (the designer must grow it); and the thickness scales with
`sqrt(Pu)`, `tp = 3.00 x sqrt(1,400 / 6,350) = 3.00 x 0.4696 = ` **1.41 in** -- the expected `sqrt` growth and the
bearing-area flag the tile exists to raise. The negative-cantilever geometry error (`N < 0.95 d` or `B < 0.80 bf`), the
non-finite input, and the below-range error seams bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the base-plate procedure, `editionNote` naming AISC Design Guide 1 §3.1 / AISC 360 §J8 with
the `A1_req` bearing formula, the `m`/`n`/`n'`/`l` cantilevers, the `tp` thickness formula, the `phi_c = 0.65` ACI-vs-AISC
nuance, the `lambda = 1.0` and concentric-axial-only scope, the separate-anchor-check exclusions, and the design-aid
caveat); `test/fixtures/worked-examples.json` (the 400 kip example + the 700 kip bearing-flag cross-check);
`test/fixtures/compute-map.js` (`column-base-plate` -> `computeColumnBasePlate` in `../../calc-steel.js`);
`scripts/related-tiles.mjs` (-> `steel-column-capacity` / `anchor-embedment` / `bolt-shear-bearing`);
`data/search/aliases.json` ("base plate", "column base plate", "base plate thickness", "AISC design guide 1", "concrete
bearing", "steel column footing", "base plate sizing", "how thick base plate", "column to concrete", "plate cantilever
m n"); the id appended to the `STEEL_RENDERERS["column-base-plate"]=` block at the file end of `app.js`'s steel bundle; the
`// dims:` annotation (`pu_kip` force, `fc_ksi`/`fy_ksi` pressure, `d_in`/`bf_in`/`b_in`/`n_in`/thickness length, areas
length^2); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `A1_req` /
`m` / `n` / `n'` / `l` / `tp` intermediates, the bearing-adequate and bearing-flag branches, and the error seams
(non-finite, `pu_kip <= 0`, `fc_ksi <= 0`, `fy_ksi <= 0`, `d_in <= 0`, `bf_in <= 0`, `N < 0.95 d`, `B < 0.80 bf`). Bump
the `calc-steel.js` size in the `check:module-sizes` allowlist if the gate flags it (dated comment). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block asserting the bearing area, the cantilevers, the thickness, the bearing-adequate vs
bearing-flag branches, and the error seams); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit (the A1_req / A1 / m / n / n' / l / tp stack, the longest output in the trio, wraps on
a phone); render-no-nan + a11y sweep, output read to the value (W10x49, 400 kip, 14 in square -> A1_req 181 in^2, tp 1.07
in).

## 5. Roadmap position

Closes the AISC 360 steel-connection batch (v266..v268) and, with it, the catalog's steel load path: member capacity
(v254..v256), the bolt group that transfers eccentric shear (v266), the per-bolt shear/bearing limit (v267), and now the
base plate that lands the column on concrete. A moment-plus-axial base plate (Design Guide 1 §3.4, the bearing/uplift
triangle and anchor tension), the anchor-rod concrete breakout / pullout (ACI 318 Ch. 17), a shear-lug / friction shear
transfer, and the `sqrt(A2/A1)` confinement bonus for an oversized pier are the deliberate next follow-ons. With this trio
the steel cluster stands complete beside the wood (v263..v265), reinforced-concrete (v257..v259), and geotechnical
(v260..v262) clusters in Group E.
