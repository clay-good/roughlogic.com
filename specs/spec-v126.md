# roughlogic.com Specification v126 -- PVC Conduit Thermal Expansion and Expansion-Fitting Trigger (NEC 352.44) (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v121..v128.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one electrical tile from the public PVC coefficient of thermal
> expansion and the NEC 352.44 quarter-inch trigger, AHJ governed, redo-not-harm. Adds one tile to
> **`calc-electrical.js`** (Group A); no new module, group, or dependency. Inherits spec.md through
> spec-v125.md.
>
> **The gap, and the evidence for it.** The catalog sizes conduit fill (`conduit-fill`) and cable
> bend radius (`cable-bend-radius`) but never the longitudinal movement of a PVC raceway across its
> temperature swing -- the length change that NEC 352.44 requires an expansion fitting to absorb
> once it reaches 1/4 inch. An outdoor or unconditioned PVC run skipping that check buckles, pulls
> couplings, or shears boxes; the math is a one-liner with no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Run length and the resulting length change are `L`, the temperature difference is `T` (matching the
v112 temperature-difference convention), and the coefficient of thermal expansion carries the per-
degree `L / (L x T)` bridge. The bundled PVC coefficient (3.38 x 10^-5 in/in/deg-F) and the 1/4-inch
(0.25 in) NEC trigger are annotated editable fields. The v18/v21 contract: any non-finite input, or
a non-positive run length, returns `{ error }` (a zero or negative temperature swing is permitted
and yields zero movement); there are no divisions. Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEC 2023 352.44 (expansion fittings for rigid PVC conduit)`,
`editionNote` `NEC_DISCLOSURE`, with the 3.38 x 10^-5 coefficient noted as the public PVC physical
property underlying NEC Table 352.44. The AHJ and the conduit manufacturer govern.

## 2. The tile

### 2.1 `conduit-thermal-expansion` -- PVC Length Change vs the NEC 352.44 Fitting Trigger

```
inputs:
  run_length_ft        L              straight PVC run between anchored points
  temp_change_f        T              max-minus-min temperature the conduit will see
  coeff_in_per_in_f    L/(L x T)      PVC coefficient (default 0.0000338)
  trigger_in           L              expansion-fitting threshold (default 0.25)

delta_l_in = coeff_in_per_in_f x (run_length_ft x 12) x temp_change_f
verdict: delta_l_in >= trigger_in -> expansion fitting required, sized for delta_l_in of travel
```

**Pinned worked example.** 100 ft PVC run, 50 deg-F swing:
`delta_l = 0.0000338 x (100 x 12) x 50 = 0.0000338 x 1,200 x 50 = 2.03 in` -> **expansion fitting
required**, selected for at least ~2 in of travel. **Cross-check.** A 20 ft run over a 30 deg-F
swing: `delta_l = 0.0000338 x 240 x 30 = 0.243 in` -> just under the 1/4-inch trigger, no fitting
required (a borderline result that shows why short runs in mild swings often pass). The AHJ and the
PVC manufacturer's published coefficient govern the final selection.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 352.44, the delta-L formula, the PVC
coefficient and the 1/4-inch trigger listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`conduit-thermal-expansion` -> `computeConduitThermalExpansion` in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `conduit-fill` / `cable-bend-radius` / `conductor-resistance`);
`data/search/aliases.json` ("conduit expansion", "pvc expansion", "352.44", "expansion fitting",
"thermal movement", "conduit growth"); the id appended to the existing `ELECTRICAL_RENDERERS`
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams (non-finite,
run_length <= 0). Raise the `calc-electrical.js` size cap by ~20 percent if needed (dated comment);
bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the delta-L line and the
verdict wrap on a phone); render-no-nan + a11y sweep, output read to the value (100 ft / 50 F ->
2.03 in, fitting required; 20 ft / 30 F -> 0.24 in, none).

## 5. Roadmap position

Adds the thermal-movement check to the raceway family (`conduit-fill`, `cable-bend-radius`). Further
Group A growth stays evidence-driven.
