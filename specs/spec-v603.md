# roughlogic.com Specification v603 -- Panel-Zone Doubler-Plate Thickness Sizer (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`**
> (Group E, the AISC steel bench); no new module, group, or dependency. Inherits spec.md through spec-v602.md.
>
> **The gap, and the evidence for it.** Spec-v555 (`steel-panel-zone-shear`) names this tile as a deliberate
> follow-on: "a doubler-plate thickness sizer (the plate that makes up the shortfall)," and its output literally ends
> with the flag "DOUBLER PLATE needed" without ever saying **how thick**. When the AISC 360-16 J10.6 panel-zone shear
> check fails, the fix is a doubler plate welded to the column web to add shear area, and the detailer needs the
> thickness. Two limits set it, and the governing one is not always obvious. The **strength** limit is the shortfall
> over the shear the column depth can carry per inch of plate: `t = (Vu - phiRn_bare) / (0.90 x 0.60 x Fy x dc)`. The
> **stability** limit, AISC 360-16 Eq. J10-12, keeps a doubler that is not plug-welded to the web from buckling:
> `t >= (dz + wz) / 90`, where dz and wz are the panel-zone depth and width. On a stocky column with a small shortfall
> the stability minimum governs -- a strength-only calc would spec a plate too thin to be stable -- while on a deep
> beam driving a big shortfall the strength governs and the stability minimum is along for the ride. The tile computes
> both, reports the governing thickness, and rounds up to the next 1/16-inch plate a shop actually stocks, so the
> panel-zone check that failed gets a real, buildable answer instead of a to-do.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The required shear is a
force `M L T^-2` (kip), the yield strength a stress `M L^-1 T^-2` (ksi), the column depth, web thickness, panel-zone
depth and width, and the doubler thicknesses are `L` (in), and the 0.90 / 0.60 / 90 factors are `dimensionless`, all
carried dimensionless to the parse-only lint alongside the `steel-panel-zone-shear` sibling. The v18/v21 contract: any
non-finite input, or a non-positive required shear, yield strength, column depth, web thickness, panel-zone depth, or
panel-zone width returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC 360-16 J10.6
doubler-plate provisions by name (matching the `steel-panel-zone-shear` sibling); `editionNote` prints
`phiRn_bare = 0.90 x 0.60 x Fy x dc x tw`, `t_strength = max(0, Vu - phiRn_bare) / (0.90 x 0.60 x Fy x dc)`,
`t_stability = (dz + wz) / 90` (Eq. J10-12), and `t_required = max(t_strength, t_stability)` when a doubler is needed,
and states that **the stability minimum applies per individual doubler plate when it is not plug-welded to the web (a
plug-welded doubler lets the combined thickness resist buckling), the basic bare strength (J10-9) is used here for the
shortfall (the flange-stiffened bonus is only allowed when panel-zone deformation is modeled), a high column axial load
(Pr > 0.4 Pc) reduces the strength further and is not applied, and AISC 360 and the engineer of record govern** -- a
detailing aid, not a stamped connection design.

## 2. The tile

### 2.1 `steel-doubler-plate` -- Doubler Thickness to Make Up the Panel-Zone Shortfall

```
inputs:
  required_shear_kip   kip   panel-zone shear demand Vu (from steel-panel-zone-shear)
  fy_ksi               ksi   column yield strength (default 50)
  col_depth_dc_in      in    column depth dc (the shear depth)
  col_web_tw_in        in    existing column web thickness
  pz_depth_dz_in       in    panel-zone depth (~ beam depth between flanges)
  pz_width_wz_in       in    panel-zone width (~ column depth between flanges)

phiRn_bare   = 0.90 x 0.60 x fy_ksi x col_depth_dc_in x col_web_tw_in     [kip]
shortfall    = max(0, required_shear_kip - phiRn_bare)                    [kip]
t_strength   = shortfall / (0.90 x 0.60 x fy_ksi x col_depth_dc_in)       [in]
t_stability  = (pz_depth_dz_in + pz_width_wz_in) / 90                     [in]  (Eq. J10-12)
t_required   = shortfall > 0 ? max(t_strength, t_stability) : 0           [in]
t_plate      = ceil(t_required to the next 1/16 in)                       [in]
```

**Pinned worked example (a W14 column, 300-kip demand, deep-beam joint -- stability governs).**
`phiRn_bare = 0.90 x 0.60 x 50 x 14 x 0.485 = ` **183 kip**, so `shortfall = 300 - 183 = 117 kip` and
`t_strength = 117 / (0.90 x 0.60 x 50 x 14) = 0.309 in`. But the panel-zone stability minimum with dz = 22.64 in and
wz = 12.44 in is `t_stability = (22.64 + 12.44) / 90 = ` **0.390 in**, which governs, so `t_required = 0.390 in` rounds
up to a **7/16-inch (0.4375 in)** doubler -- a strength-only calc would have specified 5/16 inch, a plate too thin to
be stable. **Cross-check (the same column, 600-kip demand -- strength governs).**
`shortfall = 600 - 183 = 417 kip`, `t_strength = 417 / 378 = ` **1.102 in**, far above the same 0.390-in stability
minimum, so `t_required = 1.102 in` rounds to a **1-1/8-inch (1.125 in)** doubler -- and at that thickness the engineer
would likely choose a heavier column or a pair of plates instead, exactly the judgment the number surfaces.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "welding"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`steel-doubler-plate` -> `computeSteelDoublerPlate` in `../../calc-steel.js`);
`scripts/related-tiles.mjs` (-> `steel-panel-zone-shear` / `steel-web-local-strength` / `steel-column-capacity`);
`data/search/aliases.json` ("doubler plate", "panel zone doubler", "doubler thickness", "web doubler plate", "panel
zone reinforcement", plus question rows); the id appended to the calc-steel declare list in `app.js` and the
`STEEL_RENDERERS["steel-doubler-plate"] = _simpleRenderer({...})` block at the file end; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the stability-vs-strength governance switch, the no-doubler-needed case, and the error seams (non-finite, non-positive
shear / Fy / dc / tw / dz / wz). Renderer uses the module's `_simpleRenderer` factory (mirroring
`steel-panel-zone-shear`). Group E has no exact per-group audit count (`>= 30`), so no count bump. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the 300-kip example -> 0.390 in / 7/16-in
plate).

## 5. Roadmap position

Answers the "how thick" that `steel-panel-zone-shear` leaves open, beside `steel-web-local-strength` and
`steel-column-capacity`. The v555-named high-axial (Pr > 0.4 Pc) reduction branch remains a deliberate future
follow-on. Further Group E growth stays evidence-driven.
