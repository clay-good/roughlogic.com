# roughlogic.com Specification v284 -- Reinforced Concrete Tied Column Axial Capacity (ACI 318-19 22.4) (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.101.0; proposed 2026-07-02). Batch spec-v284..v286 (the reinforced-concrete member depth trio -- the
> ACI checks the beam-flexure/shear/development tiles left open: the tied column's concentric axial capacity (this spec),
> two-way slab punching shear at a column (v285), and the standard hook development length (v286, the companion to the
> straight-bar `rc-development-length`).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `calc-concrete.js` computes the RC beam in flexure and
> shear and the straight-bar development length, but has no column -- the concentrically loaded tied column whose capacity
> is the concrete and the longitudinal steel acting together, capped for accidental eccentricity. Adds one tile to the
> existing **`calc-concrete.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v283.md.
>
> **The gap, and the evidence for it.** ACI 318-19 22.4.2 sets the nominal axial strength of a non-prestressed compression
> member as `Po = 0.85 f'c (Ag - Ast) + fy Ast`, and 22.4.2.1 caps the design strength of a tied column at
> `phi Pn,max = 0.80 phi Po` with `phi = 0.65` (compression-controlled, tied) to account for the accidental eccentricity a
> "concentric" load never truly avoids. For a 16 in square tied column of 4,000 psi concrete with eight #8 Grade 60 bars
> (`Ag = 256 in^2`, `Ast = 6.32 in^2`), `Po = 0.85 x 4 x (256 - 6.32) + 60 x 6.32 = 1,228 kip` and
> `phi Pn,max = 0.80 x 0.65 x 1,228 = 639 kip` -- the number a designer checks a factored column load against, and the
> capacity the beam tiles could never supply. `rc-beam-flexure` bends the member; this tile compresses it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The column gross dimensions
`b`, `h` are lengths (in) giving the gross area `Ag` (in^2); the total longitudinal steel area `Ast` is an area (in^2, from
a bar count and size); `f'c` and `fy` are stresses (entered in psi or ksi consistently, reported in ksi); the nominal `Po`,
the design cap `phi Pn,max`, and the reinforcement ratio `rho_g = Ast/Ag` are a force (kip) and a dimensionless ratio. The
v18/v21 contract: any non-finite input, a dimension or strength at or below zero, or a steel ratio outside the ACI 10.6.1
range `0.01 <= rho_g <= 0.08` (flagged, not necessarily an error) is handled; a non-finite value or a non-positive
dimension/area returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI 318-19 22.4 provisions
by name; `editionNote` names **the ACI 318-19 22.4.2 `Po = 0.85 f'c (Ag - Ast) + fy Ast`, the 22.4.2.1 tied-column cap
`phi Pn,max = 0.80 phi Po` with `phi = 0.65`, and the 10.6.1 `1% to 8%` longitudinal steel ratio**, and states that **this
returns the concentric (pure-axial) design capacity of a short tied column -- it does not include moment interaction (the
P-M diagram), slenderness/second-order effects (short columns only), the spiral-column `0.85`/`phi = 0.75` variant, or the
tie detailing; and this is a design aid, not a substitute for a licensed engineer's design** -- the structural engineer of
record's stamped design governs.

## 2. The tile

### 2.1 `rc-column-axial` -- RC Tied Column Concentric Axial Capacity (ACI 318-19 22.4)

```
inputs:
  b_in     in     column width
  h_in     in     column depth
  fc_psi   psi    concrete compressive strength
  fy_psi   psi    steel yield strength
  Ast_in2  in^2   total longitudinal steel area (bar count x bar area)

Ag    = b_in * h_in                                   ; gross area, in^2
rho_g = Ast_in2 / Ag                                  ; steel ratio (flag if <0.01 or >0.08)
Po    = 0.85*fc_psi*(Ag - Ast_in2) + fy_psi*Ast_in2   ; nominal axial strength, lb
phiPn = 0.80 * 0.65 * Po                              ; tied-column design cap, lb
(report Po and phiPn in kip)
```

**Pinned worked example (a 16 in square tied column, 4,000 psi, eight #8 Grade 60).** `b = h = 16`, `fc = 4,000`,
`fy = 60,000`, `Ast = 8 x 0.79 = 6.32 in^2`: `Ag = 256 in^2`; `rho_g = 6.32/256 = 2.47%` (within 1 to 8%);
`Po = 0.85 x 4,000 x (256 - 6.32) + 60,000 x 6.32 = 848,912 + 379,200 = 1,228,112 lb = 1,228 kip`;
`phi Pn,max = 0.80 x 0.65 x 1,228 = 639 kip`. **Cross-check (raise the concrete to 5,000 psi).** Hold the steel:
`Po = 0.85 x 5,000 x 249.68 + 379,200 = 1,061,140 + 379,200 = 1,440,340 lb = 1,440 kip`; `phi Pn,max = 0.52 x 1,440 = 749 kip`
-- the concrete term carries most of a lightly-reinforced column, so a 25% strength bump lifts the capacity 17%. The
non-finite and non-positive-dimension error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the `rc-beam-*` tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ACI 318-19 22.4 provisions, `editionNote` naming
`Po = 0.85 f'c (Ag - Ast) + fy Ast`, the `0.80 phi` tied cap, `phi = 0.65`, the 1-8% ratio, and the concentric-short-column,
no-P-M-interaction, tied-only caveats); `test/fixtures/worked-examples.json` (the 4,000 psi example + the 5,000 psi
cross-check); `test/fixtures/compute-map.js` (`rc-column-axial` -> `computeRcColumnAxial` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-beam-flexure` / `rc-beam-shear` / `rc-development-length` / `steel-column-capacity`);
`data/search/aliases.json` ("concrete column", "tied column capacity", "column axial load", "ACI 22.4", "Po column",
"reinforced concrete column", "0.80 phi Po", "column design strength", "rho steel ratio"); the id appended to the existing
concrete renderers block in `app.js`; the `// dims:` annotation (dimensions length, areas area, strengths stress, `Po`/
`phiPn` force, `rho_g` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the `rho_g` range flag, the `0.80 x 0.65` cap, and the non-positive / non-finite error seams. No new module;
re-pin `calc-concrete.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `rho_g` flag assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Ag` / `Po` / `phiPn` / `rho_g`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (16 in sq, 8 #8 -> 1,228 kip Po, 639 kip
design).

## 5. Roadmap position

Opens the reinforced-concrete member depth batch (v284..v286) in `calc-concrete.js` with the column the beam tiles never
supplied. Two-way punching shear (v285) and the standard hook (v286) follow. The full P-M interaction diagram, the spiral-
column variant, and slenderness (moment magnification) are the deliberate next follow-ons once the trio lands.
