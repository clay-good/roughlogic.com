# roughlogic.com Specification v618 -- Panel-Zone Shear Under High Column Axial (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`**
> (Group E, structural steel); no new module, group, or dependency. Inherits spec.md through spec-v617.md.
>
> **The gap, and the evidence for it.** Spec-v555 (`steel-panel-zone-shear`) names this tile as a deliberate
> follow-on: "a high-axial (Pr > 0.4 Pc) reduction branch," and its own note concedes the limit -- "a high column
> axial load (Pr > 0.4 Pc) reduces the strength by a further factor (not applied here - low-axial case)." The
> doubler sizer (spec-v603) inherited the same low-axial assumption. But moment-frame columns carry real axial
> load, and **AISC 360-16 J10.6** cuts the panel-zone shear strength exactly there: past `Pr = 0.4 Pc` the basic
> strength takes the factor `(1.4 - Pr/Pc)` (Eq. J10-10), and past `Pr = 0.75 Pc` the deformation-modeled strength
> takes `(1.9 - 1.2 Pr/Pc)` (Eq. J10-12), with `Pc = Py = Fy Ag` (LRFD). The number that surprises people: a
> W14-class column at 45% of its axial yield loses only 5% of its panel zone -- but at 83% of yield the modeled
> strength drops 10% and is falling 1.2% for every additional percent of axial. The tile takes the same panel-zone
> geometry as the sibling plus the axial demand and the column area, picks the governing equation, and returns the
> reduced strength -- the capacity the low-axial tiles quietly overstate when the column is working hard.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The yield strength is
a stress (`M L^-1 T^-2`, ksi); the depths, thicknesses, and widths are `L` (in); the column area is `L^2` (in^2);
the axial demand, axial yield, and shear strengths are forces (`M L T^-2`, kip); the axial ratio and reduction
factor are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive yield / depth / web
thickness / column area / axial demand, an axial demand at or above the axial yield (`Pr >= Py` -- the column
itself is past yield), or, when the panel-zone deformation is modeled, a non-positive flange width / flange
thickness / beam depth returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over **AISC 360-16
Section J10.6** by name (matching the `steel-panel-zone-shear` sibling); `editionNote` prints the four-branch
selection -- `Pr <= 0.4 Pc: Rn = 0.60 Fy dc tw` (J10-9), `Pr > 0.4 Pc: x (1.4 - Pr/Pc)` (J10-10),
`Pr <= 0.75 Pc: Rn = 0.60 Fy dc tw [1 + 3 bcf tcf^2/(db dc tw)]` (J10-11), `Pr > 0.75 Pc: x (1.9 - 1.2 Pr/Pc)`
(J10-12), with `Pc = Py = Fy Ag` and `phi = 0.90` -- and states that **the flange-stiffened equations are permitted
only when the panel-zone deformation is accounted for in the frame analysis, below the axial threshold the tile
reproduces the sibling's low-axial strength unchanged, and AISC 360 and the engineer of record govern** -- a design
aid, not a connection design.

## 2. The tile

### 2.1 `steel-panel-zone-axial` -- What the Column's Axial Load Takes Off the Panel Zone

```
inputs:
  fy_ksi              ksi   column yield strength (default 50)
  col_depth_dc_in     in    column depth dc
  col_web_tw_in       in    column web (panel-zone) thickness tw
  col_area_ag_in2     in^2  column gross area Ag (Py = Fy x Ag)
  pr_kip              kip   required axial strength Pr in the column at the joint
  pz_in_analysis      -     "no" (J10-9/J10-10) or "yes" (J10-11/J10-12, needs bcf / tcf / db)
  col_flange_bcf_in   in    column flange width bcf (yes-branch)
  col_flange_tcf_in   in    column flange thickness tcf (yes-branch)
  beam_depth_db_in    in    beam depth db (yes-branch)

py_kip     = fy_ksi x col_area_ag_in2
axial_ratio = pr_kip / py_kip                                  (error if >= 1)
no:  factor = ratio <= 0.40 ? 1.0 : (1.4 - ratio);   rn = 0.60 Fy dc tw x factor
yes: bonus  = 1 + 3 bcf tcf^2 / (db dc tw)
     factor = ratio <= 0.75 ? 1.0 : (1.9 - 1.2 x ratio);   rn = 0.60 Fy dc tw x bonus x factor
phi_rn_kip = 0.90 x rn_kip
```

**Pinned worked example (Eq. J10-10).** A 14 in deep column, 0.5 in web, Fy 50 ksi, Ag 26.5 in^2 (Py = 1,325 kip)
carrying Pr = 600 kip, deformation not modeled: `ratio = 0.4528 > 0.40`, `factor = 1.4 - 0.4528 = 0.9472`,
`Rn = 0.60 x 50 x 14 x 0.5 x 0.9472 = ` **198.9 kip**, `phiRn = ` **179.0 kip** -- the axial load takes 5.3% off
the 210 kip basic strength. **Cross-check (Eq. J10-12).** The same column with the panel zone modeled (bcf 14.5,
tcf 0.75, db 24) at Pr = 1,100 kip: `ratio = 0.8302 > 0.75`, `bonus = 1.1456`,
`factor = 1.9 - 1.2 x 0.8302 = 0.9038`, `Rn = ` **217.4 kip**, `phiRn = ` **195.7 kip**. Below the thresholds the
factor is 1.0 and the strengths match `steel-panel-zone-shear` exactly.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`, beside `steel-panel-zone-shear`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`steel-panel-zone-axial` ->
`computeSteelPanelZoneAxial` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `steel-panel-zone-shear` /
`steel-doubler-plate` / `steel-column-capacity`); `data/search/aliases.json` ("panel zone high axial", "high axial
panel zone", "panel zone axial reduction", "aisc j10-10", plus question rows);
`STEEL_RENDERERS["steel-panel-zone-axial"]` via the module's `_simpleRenderer` factory (select for
`pz_in_analysis`, mirroring the sibling) and the id added to the steel declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the low-axial identity (factor 1.0, matching the sibling's numbers), the threshold seams (ratio
exactly 0.40 / 0.75 take factor 1.0), and the error seams (non-finite, non-positive inputs, Pr >= Py, missing
yes-branch geometry). The calc-steel.js gzip cap (24000, 89.6% used) is expected to hold without a raise (verify
at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 179.0 kip).

## 5. Roadmap position

Closes the last v555-named follow-on: `steel-panel-zone-shear` covers the low-axial branches, `steel-doubler-plate`
sizes the fix, and this tile applies the J10-10 / J10-12 axial reductions the both of them flag but do not carry.
No further panel-zone follow-on is named; further Group E growth stays evidence-driven.
