# roughlogic.com Specification v653 -- Two-Stroke Mix Ratio Check (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`**
> (Group L, forestry/landscaping/agriculture), no new module, group, or dependency. Inherits spec.md through
> spec-v652.md.
>
> **The gap, and the evidence for it.** The `two-stroke-mix` tile (spec-v35) prescribes the oil to add for a
> target ratio (`oil = fuel / ratio`). The reverse, verifying a mix you already made, is unbuilt: you poured some
> oil into a can of gas and want to know the ratio you actually achieved and whether it is safe. Inverting the
> sibling gives `ratio = fuel volume / oil volume`. First-principles, no new constant. The pinned example: 2.56
> fl oz of oil in a US gallon is **50:1** (on spec); 3.2 fl oz is a richer **40:1** (too much oil for a 50:1
> target). The safety point the tile flags: a LEAN mix (a higher X:1 than the target, too little oil) starves the
> bearings and risks seizure -- the dangerous error -- while a RICH mix (a lower X:1) only smokes and fouls.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The fuel and oil
amounts are `L^3`, the fuel-unit selection is `dimensionless`, and the achieved ratio, oz-per-gallon, and target
ratio are `dimensionless` (mirroring the sibling's `oz_per_gallon` treatment). The `128 oz/gal` conversion is the
same one `two-stroke-mix` already uses. The v18/v21 contract (mirroring the sibling's `_finiteGuard` over the
numeric fields, excluding the string unit): any non-finite numeric input, or a non-positive fuel or oil amount,
returns `{ error }`. Citation discipline (v19/v22): the mix relation inverted for the ratio, by name; the note
states that **ratio = fuel volume / oil volume (same units), a LEAN mix (higher X:1) is the dangerous under-oiled
error and a RICH mix (lower X:1) smokes but protects, and the equipment manual's ratio and oil grade govern**.

## 2. The tile

### 2.1 `two-stroke-mix-ratio-check` -- The Gas:Oil Ratio You Actually Mixed

```
inputs:
  fuel_amount   gal or L   fuel in the can (> 0)
  fuel_unit     -          "gallon" | "liter"
  oil_amount    oz or mL   oil actually added (fl oz for gallons, mL for liters) (> 0)
  target_ratio  -          the X in the target X:1 (optional; default 50)

ratio          = fuel_amount x 128 / oil_amount        (gallons; = fuel_mL / oil_mL for liters)
oz_per_gallon  = 128 / ratio
verdict        = compare ratio to target_ratio (within 5% on spec; higher = LEAN, lower = RICH)
```

**Pinned worked example.** 1 US gallon, 2.56 fl oz of oil, 50:1 target: `ratio = 128/2.56 = ` **50:1** -- on spec.
**Cross-check (too much oil is richer).** 3.2 fl oz in a gallon: `ratio = 128/3.2 = ` **40:1** -- a lower X:1 than
50, flagged RICH (more oil than the target).
**Cross-check (exact inverse of the mix tile).** The fuel:oil the `two-stroke-mix` tile prescribes for 50:1
(2.56 oz/gal) checks back to exactly 50:1; a lean 2.0 oz/gal reads 64:1 and is flagged LEAN.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["forestry", "landscaping", "agriculture"]`, beside `two-stroke-mix`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (mix inverted, the note per §1); `test/fixtures/worked-
examples.json` (the pinned example plus the richer-mix cross-check); `test/fixtures/compute-map.js`
(`two-stroke-mix-ratio-check` -> `computeTwoStrokeMixRatioCheck`); `scripts/related-tiles.mjs` (<-> `two-stroke-
mix`, `tank-mix`, `fuel-range`, `gpa-rate`); `data/search/aliases.json` ("two stroke mix ratio check", "what ratio
did i mix", "did i mix too much oil", plus question rows, all collision-checked);
`AGRICULTURE_RENDERERS["two-stroke-mix-ratio-check"]` via a hand-written renderer (the module's `makeNumber` /
`makeSelect` (fuel unit) / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring
`two-stroke-mix`) and the id added to the calc-agriculture declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example, the exact inverse round-trip through `computeTwoStrokeMix`, the lean/rich verdicts, the liter path, and the
error seams. The `AGRICULTURE_RENDERERS: 7 ids` test is a spot-check of named ids, not a total-count assertion, so
no test edit is needed. The two `index.html` home-count spots go 1,101 -> 1,102 (check-readme-counts gates them).
The calc-agriculture.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 50:1, on spec).

## 5. Roadmap position

Completes the two-stroke mixing pair: `two-stroke-mix` (target ratio -> oil to add) and now
`two-stroke-mix-ratio-check` (oil added -> achieved ratio), exact inverses through the same volume ratio. Further
Group L growth stays evidence-driven.
