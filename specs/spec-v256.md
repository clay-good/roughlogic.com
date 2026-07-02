# roughlogic.com Specification v256 -- Steel Column Compressive Capacity, Flexural Buckling (AISC 360 Ch. E) (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.92.0; was PROPOSED 2026-07-01). Batch spec-v254..v256 (the AISC 360 steel-member trio -- moment, shear, and axial
> capacity of a rolled W-shape). This spec closes the batch with the column check.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: after the beam is sized, the load it delivers has to
> come down a column, and the column's capacity is set by its slenderness, not its area alone -- a tall, lightly-braced
> W-shape can carry a fraction of what its yield strength suggests. The catalog checks the wood equivalent
> (`column-buckling-wood`) but has no steel column. Adds one tile to the **`calc-steel.js`** Group E cluster (beside
> `steel-beam-flexure` and `steel-beam-shear`), completing the member trio; no new module, group, trade, or dependency.
> Inherits spec.md through spec-v255.md.
>
> **The gap, and the evidence for it.** AISC 360-22 Chapter E sets the compressive capacity of a non-slender member from
> its elastic buckling stress `Fe = pi^2 x E / (KL/r)^2` and the inelastic/elastic transition at `KL/r = 4.71 x
> sqrt(E/Fy)`: below it the critical stress is `Fcr = 0.658^(Fy/Fe) x Fy`, above it `Fcr = 0.877 x Fe`, and the capacity
> is `Pn = Fcr x Ag` (§E3). A W10x45 (Ag = 13.3 in^2, ry = 2.01 in) of A992 steel on a 14 ft unbraced length develops an
> allowable axial load of about 239 kips -- the value the AISC Manual column tables print. The catalog can size the wood
> column and the steel beams that frame into the steel column, but not the column itself, the member the whole gravity load
> path finally rests on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The yield stress `Fy`, the
modulus of elasticity `E`, and the buckling stresses `Fe`/`Fcr` are stresses (ksi); the effective length `KL` and the
radius of gyration `r` are lengths (the slenderness `KL/r` is `dimensionless`); the gross area `Ag` is an area (in^2); the
nominal, allowable, and design capacities are forces (kips). The v18/v21 contract: any non-finite input, a non-positive
length / radius of gyration / area / yield stress, or a slenderness that produces a non-finite `Fe`, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the compression relations by name; `editionNote` names **AISC
360-22 §E3 (flexural buckling of members without slender elements: `Fe = pi^2 E/(KL/r)^2`; `Fcr = 0.658^(Fy/Fe) Fy` when
`KL/r <= 4.71 sqrt(E/Fy)`, else `Fcr = 0.877 Fe`; `Pn = Fcr Ag`) and §B3.1/§B3.2 (`phi_c = 0.90` LRFD, `Omega_c = 1.67`
ASD)**, gives the bundled defaults as editable (`E = 29,000 ksi`; `Fy = 50 ksi`; effective-length factor `K = 1.0`,
pinned-pinned), and states that **`r` must be the radius of gyration about the axis that governs buckling (usually the
weak axis `ry` for a W-shape, unless the weak axis is braced at closer spacing), `K` comes from the end fixity or a
§C/App. 7 frame analysis, this is flexural buckling only (torsional and flexural-torsional buckling per §E4 and
slender-element reduction per §E7 are not checked), and this is a design aid, not a licensed engineer's design** -- the
engineer of record's stamped design governs. With `E = 29,000 ksi` and `Fy = 50 ksi`, the transition slenderness is
`4.71 x sqrt(29000/50) = 113.4`.

## 2. The tile

### 2.1 `steel-column-capacity` -- Steel Column Compressive Capacity (Flexural Buckling)

```
inputs:
  fy        ksi     specified minimum yield stress (default 50, A992/A572 Gr. 50)
  e_mod     ksi     modulus of elasticity (default 29000)
  k         -       effective length factor (default 1.0, pinned-pinned)
  l_ft      ft      unbraced length for the governing axis
  r_in      in      radius of gyration about the governing axis (usually ry)
  ag        in^2    gross cross-sectional area
  pu        kips    applied required axial load to check against (optional, default 0 = capacity only)

slender    = k * l_ft * 12 / r_in                    ; slenderness KL/r, dimensionless
fe         = pi^2 * e_mod / slender^2                ; elastic buckling stress, ksi
limit      = 4.71 * sqrt(e_mod / fy)                 ; inelastic/elastic transition slenderness
fcr        = slender <= limit ? 0.658^(fy/fe) * fy   ; inelastic
                              : 0.877 * fe           ; elastic
pn         = fcr * ag                                ; nominal compressive strength, kips
pa         = pn / 1.67                               ; ASD allowable (Omega_c = 1.67)
phi_pn     = 0.90 * pn                               ; LRFD design (phi_c = 0.90)
util_asd   = pu > 0 ? pu / pa : -                    ; demand/capacity ratio, ASD
```

**Pinned worked example (a W10x45 column, A992, 14 ft, pinned).** `Fy = 50 ksi`, `E = 29,000 ksi`, `K = 1.0`,
`L = 14 ft`, `r = ry = 2.01 in`, `Ag = 13.3 in^2`: `KL/r = 1.0 x 14 x 12 / 2.01 = 83.6`; `Fe = pi^2 x 29,000 / 83.6^2 =
41.0 ksi`; the transition `4.71 x sqrt(29000/50) = 113.4`, and `83.6 <= 113.4`, so the inelastic branch governs:
`Fcr = 0.658^(50/41.0) x 50 = 0.658^1.220 x 50 = 30.0 ksi`; `Pn = 30.0 x 13.3 = 399 kips`; `Pa = 399 / 1.67 = ` **239
kips** allowable (ASD); `phi_c Pn = 0.90 x 399 = ` **359 kips** design (LRFD) -- matching the AISC Manual Table 4-1 column
capacity for a W10x45 at `KLy = 14 ft`. **Cross-check (the same column stretched to 24 ft).** `KL/r = 24 x 12 / 2.01 =
143.3`, now above the 113.4 transition, so the elastic branch governs: `Fe = pi^2 x 29,000 / 143.3^2 = 13.9 ksi`;
`Fcr = 0.877 x 13.9 = 12.2 ksi`; `Pn = 12.2 x 13.3 = 162 kips`; `Pa = ` **97.4 kips** allowable. Adding ten feet of
unbraced height cuts the same column's capacity by nearly 60%, from 239 to 97 kips -- the slenderness, not the steel,
governs the tall column, which is exactly why the unbraced length is the number to watch.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the compression relations, `editionNote` naming AISC 360-22 §E3 / §B3.1 / §B3.2 with the
governing-axis-r, effective-length-K, flexural-buckling-only, and design-aid caveats); `test/fixtures/worked-examples.json`
(the 14 ft inelastic example + the 24 ft elastic cross-check); `test/fixtures/compute-map.js` (`steel-column-capacity` ->
`computeSteelColumnCapacity` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `steel-beam-flexure` /
`steel-beam-shear` / `column-buckling-wood`); `data/search/aliases.json` ("steel column capacity", "column buckling
steel", "AISC chapter E", "Fcr Pn compression", "KL/r slenderness", "axial capacity W shape", "steel column load",
"Euler buckling steel"); the id appended to the steel renderers declare in `app.js`; the `// dims:` annotation (`fy`/`e_mod`
/`fe`/`fcr` pressure, `l`/`r` length, `ag` area, `slender` dimensionless, capacities force); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the transition-slenderness boundary (the branch switch
at `KL/r = 113.4`), and error seams (non-finite, `fy`/`l`/`r`/`ag` <= 0). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**; the
`check:module-sizes` allowlist now carries the finished `calc-steel.js` three-tile module); `npm test` (+2 fixtures, the
new fuzzer block with the inelastic/elastic branch boundary and the non-positive-input error paths); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the KL/r / Fe / Fcr / Pn /
Pa / phi-Pn / utilization stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (W10x45 at 14 ft
-> 239 kips ASD, 359 kips LRFD).

## 5. Roadmap position

Closes the AISC 360 steel-member batch (v254..v256), completing the rolled-shape trio -- flexure (v254), shear (v255), and
now axial compression -- so the catalog can check a steel beam and the column it lands on with the same fidelity it
already offers for wood and welds. A combined axial-plus-flexure beam-column interaction check (Chapter H, §H1.1, the
`Pr/Pc + 8/9 Mr/Mc` equations) is the natural capstone follow-on, along with a torsional / flexural-torsional buckling
branch (§E4) for the shapes where it governs.
