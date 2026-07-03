# roughlogic.com Specification v285 -- Two-Way Slab Punching Shear at a Column (ACI 318-19 22.6) (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.101.0; proposed 2026-07-02). Batch spec-v284..v286 (the reinforced-concrete member depth trio --
> tied column (v284), two-way punching shear (this spec), the standard hook (v286)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `rc-beam-shear` covers one-way (beam) shear, but a
> flat slab or footing fails a different way -- the column punches a truncated cone through the slab, a two-way shear on the
> critical perimeter `d/2` from the column face. The catalog has no punching-shear check, the limit state that governs flat-
> plate thickness and footing depth. Adds one tile to the existing **`calc-concrete.js`** module (Group E); no new group,
> trade, or dependency. Inherits spec.md through spec-v284.md.
>
> **The gap, and the evidence for it.** ACI 318-19 Table 22.6.5.2 sets the two-way concrete shear stress as the least of
> `4 lambda sqrt(f'c)`, `(2 + 4/beta) lambda sqrt(f'c)`, and `(2 + alpha_s d/bo) lambda sqrt(f'c)`, where `beta` is the
> ratio of the long to short column side, `alpha_s` is 40/30/20 for an interior/edge/corner column, `bo` is the critical
> perimeter at `d/2` from the column face, and `phi = 0.75`; the design capacity is `phi Vc = phi (least stress) bo d`. For
> an interior 20 in square column on a slab with `d = 6 in` and 4,000 psi concrete, `bo = 4(20 + 6) = 104 in`, the
> `4 sqrt(f'c) = 253 psi` term governs, and `phi Vc = 0.75 x 253 x 104 x 6 = 118.4 kip` -- the punching capacity a flat-
> plate designer checks the column's tributary factored load against, and the number that decides whether the slab needs a
> drop panel or shear reinforcement. `rc-beam-shear` handles the beam's one-way tear; this tile handles the slab's two-way
> punch.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The column plan dimensions and
the effective slab depth `d` are lengths (in); the critical perimeter `bo` is a length (in); `f'c` is a stress (psi); the
concrete lightweight factor `lambda` and the aspect ratio `beta` are dimensionless; `alpha_s` is the position constant
(40/30/20); the shear stress is a stress (psi) and the design capacity `phi Vc` is a force (kip). The v18/v21 contract: any
non-finite input, or a dimension or strength at or below zero, returns `{ error }`; `alpha_s` is selected from the column
position (interior/edge/corner). Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI 318-19 22.6 provisions by
name; `editionNote` names **the ACI 318-19 Table 22.6.5.2 two-way shear stress as the least of `4 lambda sqrt(f'c)`,
`(2 + 4/beta) lambda sqrt(f'c)`, `(2 + alpha_s d/bo) lambda sqrt(f'c)`, the `d/2` critical perimeter, `alpha_s` = 40/30/20
interior/edge/corner, and `phi = 0.75`**, and states that **this returns the concrete two-way shear capacity on the
`d/2` critical section for a rectangular column -- it assumes shear without unbalanced-moment transfer (no `gamma_v` eccentric-
shear amplification), no shear reinforcement or shear-cap/drop-panel, and a rectangular interior/edge/corner column with the
full perimeter available; and this is a design aid, not a substitute for a licensed engineer's design** -- the structural
engineer of record's stamped design governs.

## 2. The tile

### 2.1 `rc-punching-shear` -- Two-Way Slab Punching Shear at a Column (ACI 318-19 22.6)

```
inputs:
  c1_in    in     column dimension 1
  c2_in    in     column dimension 2
  d_in     in     effective slab depth
  fc_psi   psi    concrete compressive strength
  position -      interior | edge | corner  (alpha_s = 40 | 30 | 20)
  lambda   -      lightweight factor (default 1.0)

bo    = 2*(c1_in + d_in) + 2*(c2_in + d_in)          ; critical perimeter, in (interior)
beta  = max(c1_in,c2_in) / min(c1_in,c2_in)          ; column aspect ratio
vc    = min( 4, (2 + 4/beta), (2 + alpha_s*d_in/bo) ) * lambda * sqrt(fc_psi)   ; psi
phiVc = 0.75 * vc * bo * d_in                         ; lb  (report in kip)
```

**Pinned worked example (an interior 20 in square column, slab d = 6 in, 4,000 psi).** `c1 = c2 = 20`, `d = 6`,
`fc = 4,000`, `position = interior` (`alpha_s = 40`), `lambda = 1`: `bo = 4 x (20 + 6) = 104 in`; `beta = 1`; the three terms
are `4`, `(2 + 4/1) = 6`, `(2 + 40 x 6/104) = 4.31`, least is `4`, so `vc = 4 x sqrt(4,000) = 253 psi`;
`phi Vc = 0.75 x 253 x 104 x 6 = 118,400 lb = 118.4 kip`. **Cross-check (a big 36 in square column on the same thin slab, the
`alpha_s` term governs).** `c1 = c2 = 36`, `d = 6`, interior: `bo = 4 x 42 = 168 in`; `(2 + 40 x 6/168) = 3.43`, now less
than `4`, so `vc = 3.43 x sqrt(4,000) = 216.8 psi` and `phi Vc = 0.75 x 216.8 x 168 x 6 = 163.9 kip` -- the perimeter grew
faster than the depth, so the "thin slab / large column" branch takes over, the case a drop panel or thicker slab fixes. The
non-finite and non-positive-dimension error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the `rc-beam-*` tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ACI 318-19 22.6 provisions, `editionNote` naming the
three-term least, the `d/2` perimeter, `alpha_s` 40/30/20, `phi = 0.75`, and the no-moment-transfer, no-shear-reinf,
rectangular-column caveats); `test/fixtures/worked-examples.json` (the interior-square example + the large-column `alpha_s`
cross-check); `test/fixtures/compute-map.js` (`rc-punching-shear` -> `computeRcPunchingShear` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-beam-shear` / `rc-column-axial` / `footing-area` / `soil-bearing-capacity`);
`data/search/aliases.json` ("punching shear", "two-way shear", "flat plate shear", "slab column shear", "ACI 22.6",
"critical perimeter", "footing punching", "bo d/2", "drop panel shear"); the id appended to the existing concrete renderers
block in `app.js`; the `// dims:` annotation (dimensions length, `bo` length, `fc` stress, `beta`/`lambda` dimensionless,
`vc` stress, `phiVc` force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
three-term-least selection (which branch governs), the `alpha_s` position map, and the non-positive / non-finite error
seams. No new module; re-pin `calc-concrete.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the governing-branch assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `bo` / `vc` / `phiVc` stack wraps on
a phone); render-no-nan + a11y sweep, output read to the value (20 in interior, d=6 -> 253 psi, 118.4 kip).

## 5. Roadmap position

Middle of the reinforced-concrete depth batch (v284..v286) in `calc-concrete.js`: one-way beam shear now has its two-way
slab counterpart. The standard hook (v286) follows. The unbalanced-moment `gamma_v` eccentric-shear amplification, headed
shear-stud reinforcement, and the edge/corner reduced-perimeter geometry are the deliberate next follow-ons once the trio
lands.
