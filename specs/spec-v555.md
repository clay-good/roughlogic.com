# roughlogic.com Specification v555 -- Column Web Panel-Zone Shear (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`**
> (Group E, the steel design bench); no new module, group, or dependency. Inherits spec.md through spec-v554.md.
>
> **The gap, and the evidence for it.** `steel-web-local-strength` covers the J10.2/J10.3 transverse yielding and
> crippling of a column web under a concentrated force, but the **panel zone** -- the column web bounded by the beam and
> column flanges at a moment connection -- is a different limit state (J10.6), and the bench has none. In a moment
> frame, the joint often fails here before the beam or column does, and the fix is a doubler plate. The catch is the
> two-branch strength: the basic strength is `0.60 Fy dc tw`, but a bonus term from the column-flange stiffness is only
> allowed **when the panel-zone deformation is included in the frame analysis**. A connection whose demand exceeds the
> basic strength can still pass on the flange-stiffened branch, but only if the engineer modeled the panel-zone yielding.
> The tile takes the column and beam geometry, the yield strength, and the connection demand, and returns both branch
> strengths and whether a doubler is needed -- the panel-zone check the web-local tile does not make.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The yield strength is a
stress (`M L^-1 T^-2`, in ksi); the column depth, web thickness, flange width and thickness, and beam depth are lengths
(`L`, in inches); the panel-zone strength and the demand are forces (`M L T^-2`, in kip); the resistance factor and the
bonus ratio are `dimensionless`. This tile models the low-axial case (`Pr <= 0.4 Pc`); a high-axial reduction is noted.
The v18/v21 contract: any non-finite input, a non-positive yield strength, column depth, web thickness, or beam depth,
or a negative demand returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the panel-zone
relations by name (AISC 360-16 Section J10.6, Eq. J10-9 and J10-11); `editionNote` names the **AISC 360-16 J10.6 panel-
zone shear**, prints the basic `Rn = 0.60 x Fy x dc x tw` (Eq. J10-9), the deformation-included
`Rn = 0.60 x Fy x dc x tw x [1 + 3 x bcf x tcf^2 / (db x dc x tw)]` (Eq. J10-11), `phiRn = 0.90 x Rn`, and the demand
`Vpz = sum(Mf) / (db - tf) - Vcol`, and states that **the flange-stiffened bonus term is permitted only when the panel-
zone deformation is accounted for in the frame analysis (otherwise use the basic strength), a high column axial load
(Pr > 0.4 Pc) reduces the strength by a further factor, the moment-frame joint often fails here before the beam or
column and a doubler plate is the fix, and AISC 360 and the engineer of record govern** -- a design aid, not the
engineer of record.

## 2. The tile

### 2.1 `steel-panel-zone-shear` -- The Two-Branch Strength (and When You May Use the Flange Bonus)

```
inputs:
  fy_ksi              ksi   column yield strength
  col_depth_dc_in     in    column depth dc
  col_web_tw_in       in    column web thickness tw
  col_flange_bcf_in   in    column flange width bcf
  col_flange_tcf_in   in    column flange thickness tcf
  beam_depth_db_in    in    beam depth db
  beam_flange_tf_in   in    beam flange thickness tf
  demand_moment_kin   kip-in sum of beam flange-force moments at the joint (sum Mf)
  col_shear_kip       kip   column shear Vcol
  pz_in_analysis      bool  is panel-zone deformation included in the frame analysis?

Rn_basic = 0.60 x fy x col_depth_dc x col_web_tw                                                    [kip]
Rn_pz    = Rn_basic x (1 + 3 x col_flange_bcf x col_flange_tcf^2 / (beam_depth_db x col_depth_dc x col_web_tw))
Rn       = pz_in_analysis ? Rn_pz : Rn_basic
phiRn    = 0.90 x Rn                                                                                [kip]
demand   = demand_moment_kin / (beam_depth_db - beam_flange_tf) - col_shear_kip                     [kip]
doubler  = demand > phiRn
```

**Pinned worked example (a W14 column, Fy 50, dc 14, tw 0.5, bcf 14.5, tcf 0.75; a 24 in beam, tf 1.0; sum Mf 5,500
kip-in, Vcol 40 kip).** The basic strength is `0.60 x 50 x 14 x 0.5 = 210 kip`, so `phiRn = 189 kip`. The demand is
`5,500 / (24 - 1.0) - 40 = 239 - 40 = ` **199 kip** -- which **exceeds** the basic 189, so without accounting for panel-
zone deformation the joint needs a **doubler plate**. **Cross-check (the flange bonus can save it, if it was modeled).**
If the panel-zone deformation was included in the frame analysis, the flange-stiffened branch applies:
`bonus = 1 + 3 x 14.5 x 0.75^2 / (24 x 14 x 0.5) = 1.146`, so `Rn = 210 x 1.146 = 241 kip` and `phiRn = ` **217 kip** --
now above the 199 demand, so **no doubler is needed**. The same joint passes or fails depending on whether the analysis
captured the panel-zone yielding, the exact J10.6 catch. The tile returns both branch strengths, the demand, and the
doubler flag.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "welding"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the basic-
governs example + the flange-bonus cross-check); `test/fixtures/compute-map.js` (`steel-panel-zone-shear` ->
`computeSteelPanelZoneShear` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `steel-web-local-strength` /
`steel-beam-shear` / `steel-prying-action`); `data/search/aliases.json` ("panel zone", "column web shear", "aisc
j10.6", "doubler plate", "moment connection panel zone", "panel zone deformation", "j10-9 j10-11", "column panel
shear"); the id appended to the steel renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the two branch strengths, the demand relation, the
doubler flag flipping with pz_in_analysis, and the error seams (non-finite, non-positive Fy / dc / tw / db, negative
demand). Hand-writes its renderer (mirroring the calc-steel.js `steel-web-local-strength` pattern). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the basic / bonus / demand / doubler stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the base example -> 189 kip basic, 199 kip demand, doubler).

## 5. Roadmap position

Adds the panel-zone limit state beside `steel-web-local-strength` (the J10.2/J10.3 web checks) and `steel-beam-shear`. A
doubler-plate thickness sizer (the plate that makes up the shortfall) and a high-axial (Pr > 0.4 Pc) reduction branch
are deliberate future follow-ons. Further Group E growth stays evidence-driven.
