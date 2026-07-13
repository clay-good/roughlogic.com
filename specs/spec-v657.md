# roughlogic.com Specification v657 -- Conductivity from Total Dissolved Solids (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, water/wastewater), no new module, group, or dependency. Inherits spec.md through spec-v656.md.
>
> **The gap, and the evidence for it.** The `tds-from-conductivity` tile (spec-v407) estimates TDS from a
> conductivity reading (`TDS = k EC`). The reverse -- predicting the conductivity a target or permit TDS should
> read, or setting an EC alarm setpoint -- is unbuilt. Inverting the sibling gives `EC = TDS / k`. First-principles;
> the k factor (default 0.65, band 0.55-0.75) is already in the sibling. The pinned example: **650 mg/L** at k 0.65
> is **1,000 uS/cm**, with an 867-1,182 uS/cm band from the k range.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Mirroring the sibling,
the TDS, k factor, and conductivity are all `dimensionless` (the water-chemistry convention in this module). The k
factor range guard (0.4-0.9) is the same one `tds-from-conductivity` uses. The v18/v21 contract (mirroring the
sibling's inline finite checks): a non-finite or non-positive TDS, or a k factor outside 0.4-0.9, returns
`{ error }`. Citation discipline (v19/v22): the TDS-EC correlation solved for conductivity (Standard Methods 2510),
the inverse of the TDS estimate, by name and with `GOVERNANCE.water`; the note states that **EC = TDS/k, the band
EC = TDS/0.75 to TDS/0.55 shows the number is not exact, and the result is an estimate to calibrate against a paired
lab TDS and EC** -- the operator of record and the primacy agency govern compliance.

## 2. The tile

### 2.1 `conductivity-from-tds` -- Electrical Conductivity from a TDS Value

```
inputs:
  tds_mgl    mg/L   total dissolved solids (> 0)
  k_factor   -      TDS/EC correlation factor (0.4-0.9; default 0.65)

conductivity_us_cm = tds_mgl / k_factor
band: EC = tds_mgl / 0.75 (low) to tds_mgl / 0.55 (high)
```

**Pinned worked example.** `TDS = 650 mg/L`, `k = 0.65`: `EC = 650 / 0.65 = ` **1,000 uS/cm** -- the exact inverse
of the sibling's 1,000 uS/cm -> 650 mg/L example.
**Cross-check (the factor sets the band).** For 650 mg/L, k 0.75 gives **867 uS/cm** and k 0.55 gives **1,182
uS/cm** -- the +/-15% conductivity band from the k range.
**Cross-check (exact inverse).** The fuzzer feeds the 1,000 uS/cm back through `tds-from-conductivity` at k 0.65 and
recovers 650 mg/L.

## 3. Wiring

A `tools-data.js` row inside the `// Group M: Water` block (group `M`, trades `["water"]`, beside
`tds-from-conductivity`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.water`, the note per
§1); `test/fixtures/worked-examples.json` (the pinned example plus the k-band cross-check); `test/fixtures/compute-
map.js` (`conductivity-from-tds` -> `computeConductivityFromTds`); `scripts/related-tiles.mjs` (<->
`tds-from-conductivity`, `langelier-index`, `softener-sizing`, `coagulant-dose`); `data/search/aliases.json`
("conductivity from tds", "ec from tds", "predict conductivity from tds", plus question rows, all
collision-checked); `TREATMENT_RENDERERS["conductivity-from-tds"]` via a hand-written renderer (the module's
`makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring
`tds-from-conductivity`) and the id added to the calc-treatment declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example, the exact inverse round-trip through `computeTdsFromConductivity`, the k-band, and the error seams; and the
**Group M citation-audit count bump (32 -> 33 in citations.test.js)**. The two `index.html` home-count spots go
1,105 -> 1,106 (check-readme-counts gates them). The calc-treatment.js gzip cap is expected to hold (verify at
build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block, the Group M count
bump); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px
audit; render + output read to the value (the pinned example -> 1,000 uS/cm).

## 5. Roadmap position

Completes the TDS-conductivity pair: `tds-from-conductivity` (EC -> TDS) and now `conductivity-from-tds` (TDS ->
EC), exact inverses through the same `TDS = k EC` correlation. Further Group M growth stays evidence-driven.
