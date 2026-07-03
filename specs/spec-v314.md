# roughlogic.com Specification v314 -- Steel Beam-Column Combined Axial and Flexure Interaction (AISC 360 H1.1) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v314..v316 (the steel beam-column-and-connection depth trio --
> the interaction checks the single-action steel tiles never make: combined axial plus flexure (this spec, the AISC H1
> equation that ties compression and bending together), the column effective-length factor K (v315), and the bolt under
> combined tension and shear (v316).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `steel-column-capacity` checks pure compression and
> `steel-beam-flexure`/`steel-beam-ltb` check pure bending, but a column with a moment, a beam with axial drag, or a portal-
> frame member is both at once, and AISC H1 combines them in one interaction equation the catalog never applies. Adds one
> tile to the existing **`calc-steel.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v313.md.
>
> **The gap, and the evidence for it.** AISC 360 Section H1.1 checks combined axial force and flexure with a bilinear
> interaction: for `Pr/Pc >= 0.2`, `Pr/Pc + (8/9)(Mrx/Mcx + Mry/Mcy) <= 1.0`; for `Pr/Pc < 0.2`,
> `Pr/(2 Pc) + (Mrx/Mcx + Mry/Mcy) <= 1.0`, where `Pr`/`Pc` are the required/available axial strengths and `Mr`/`Mc` the
> required/available flexural strengths (from `steel-column-capacity` and `steel-beam-ltb`). For `Pr = 100 kip`,
> `Pc = 400 kip`, `Mrx = 80 kip-ft`, `Mcx = 200 kip-ft` (no weak-axis moment), `Pr/Pc = 0.25 >= 0.2`, so the interaction is
> `0.25 + (8/9)(0.40) = 0.61 <= 1.0` -- the member passes at 61% of its combined capacity, the single number that decides a
> beam-column and one no single-action tile can produce. The member tiles give `Pc` and `Mc`; this tile combines the
> demands against them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The required and available
axial strengths `Pr`, `Pc` are forces (kip); the required and available flexural strengths `Mrx`, `Mcx`, `Mry`, `Mcy` are
moments (kip-ft); the interaction value is dimensionless. The v18/v21 contract: any non-finite input, or an available
strength (`Pc`, `Mcx`, and `Mcy` when a weak-axis moment is present) at or below zero, returns `{ error }`; the tile
branches at `Pr/Pc = 0.2`. Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC 360 H1.1 interaction by name;
`editionNote` names **the AISC 360-22 H1.1 combined-force equations -- `Pr/Pc + (8/9)(Mrx/Mcx + Mry/Mcy)` for
`Pr/Pc >= 0.2` and `Pr/(2Pc) + (Mrx/Mcx + Mry/Mcy)` for `Pr/Pc < 0.2` -- consistent for ASD (available = nominal/Omega) or
LRFD (available = phi x nominal)**, and states that **this evaluates the H1.1 interaction from the required and available
strengths supplied -- it takes `Pc` and `Mc` as already computed (from `steel-column-capacity` and `steel-beam-ltb` in the
same ASD or LRFD basis), assumes the second-order (P-delta/P-Delta) amplification is already in `Mr` (Chapter C / Appendix
8), and does not cover the H1.3 out-of-plane / H2 unsymmetric-member cases; and this is a design aid, not a substitute for
the engineer of record** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `steel-h1-interaction` -- Steel Beam-Column Combined Axial and Flexure (AISC 360 H1.1)

```
inputs:
  Pr_kip    kip     required axial strength (2nd-order)
  Pc_kip    kip     available axial strength (Pn/Omega or phi Pn)
  Mrx_kft   kip-ft  required strong-axis moment (2nd-order)
  Mcx_kft   kip-ft  available strong-axis moment
  Mry_kft   kip-ft  required weak-axis moment (default 0)
  Mcy_kft   kip-ft  available weak-axis moment (if Mry > 0)

ratio = Pr_kip / Pc_kip
interaction = ratio >= 0.2
  ? ratio + (8/9)*(Mrx/Mcx + Mry/Mcy)
  : ratio/2 + (Mrx/Mcx + Mry/Mcy)
pass = interaction <= 1.0
```

**Pinned worked example (Pr = 100, Pc = 400, Mrx = 80, Mcx = 200, no weak-axis).** `ratio = 100/400 = 0.25 >= 0.2`, so
`interaction = 0.25 + (8/9)(80/200 + 0) = 0.25 + (8/9)(0.40) = 0.25 + 0.356 = 0.61 <= 1.0` -- passes at 61%. **Cross-check
(a lightly-loaded column, the low-axial branch).** Drop `Pr` to 50 (`ratio = 0.125 < 0.2`):
`interaction = 0.125/2 + (80/200) = 0.0625 + 0.40 = 0.46` -- the branch change gives axial a lighter half-weight when it is
small, the reason a beam with only incidental axial force is governed almost entirely by its moment. The non-finite and
non-positive-available-strength error paths bracket the result, and the branch flips at `Pr/Pc = 0.2`.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`, matching the steel member tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the AISC 360 H1.1 interaction, `editionNote` naming both
branch equations, the ASD/LRFD-consistent basis, and the second-order-in-Mr, not-H2 caveats);
`test/fixtures/worked-examples.json` (the high-axial example + the low-axial cross-check); `test/fixtures/compute-map.js`
(`steel-h1-interaction` -> `computeSteelH1Interaction` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (->
`steel-column-capacity` / `steel-beam-ltb` / `steel-effective-length-k` / `wood-combined-bending-axial`);
`data/search/aliases.json` ("beam column interaction", "AISC H1", "combined axial and bending steel", "Pr Pc Mr Mc",
"interaction equation steel", "8/9 interaction", "column with moment", "steel unity check", "combined loading"); the id
appended to the existing steel renderers block in `app.js`; the `// dims:` annotation (`Pr`/`Pc` force, moments moment,
interaction dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
`Pr/Pc = 0.2` branch flip, the biaxial term, and the non-positive / non-finite error seams. No new module; re-pin
`calc-steel.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the branch-flip assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `ratio` / interaction / pass stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (Pr 100 Pc 400 -> 0.61 pass).

## 5. Roadmap position

Opens the steel beam-column-and-connection depth batch (v314..v316) in `calc-steel.js`, combining the axial and flexural
member tiles into one interaction. The effective-length factor K (v315) and the bolt under combined tension and shear
(v316) follow. The H1.3 out-of-plane interaction, the Appendix 8 (B1/B2) second-order amplification as its own tile, and the
H2 unsymmetric-member check are the deliberate next follow-ons once the trio lands.
