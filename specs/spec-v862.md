# roughlogic.com Specification v862 -- Roof Underlayment Roll Count (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v861.md. Roofing sweep, beside `roofing-squares` and
> `ice-barrier-coverage`.
>
> **The gap, and the evidence for it.** `ice-barrier-coverage` handles the eave-and-valley ice-and-water membrane but
> nothing counts the **field underlayment** rolls over the whole deck. Grep confirmed no underlayment-roll tile. The number
> this settles: a 2,500 sf deck with 10% laps and waste, on 10-square synthetic rolls, takes **3 rolls** -- and on 15-lb
> felt (4 squares a roll) the same deck takes **7**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
roofing siblings (`roofing-squares`, `ice-barrier-coverage`): the roof area and roll coverage carry `L^2`, the lap/waste
percent is dimensionless, and the roll count is dimensionless. The v18/v21 contract: a non-finite or non-positive roof
area or roll coverage returns `{ error }`; a negative lap/waste returns `{ error }`. Citation discipline (v19/v22): the
roll-count identity by name (rolls = ceil(area x (1 + lap + waste) / roll coverage)), `GOVERNANCE.general`; the note
states that this is full-deck field underlayment (synthetic at about 10 squares a roll, or 15-lb felt at about 4 squares),
that the lap and waste allowance covers the head and side laps plus offcuts, that it is distinct from the eave/valley
`ice-barrier-coverage`, and that the code and manufacturer set the underlayment and lap requirements.

## 2. The tile

### 2.1 `roof-underlayment-rolls` -- Roof Underlayment Roll Count

```
inputs:
  roof_area_sf     roof deck area (ft^2)
  roll_coverage_sf coverage per roll (ft^2, default 1000)
  lap_waste_pct    lap + waste allowance (percent, default 10)

rolls = ceil(roof_area_sf * (1 + lap_waste_pct/100) / roll_coverage_sf)
```

**Pinned worked example.** Roof 2,500 sf, 10-square rolls (1,000 sf), 10% laps and waste:
`rolls = ceil(2500 * 1.10 / 1000) = ceil(2.75) = ` **3 rolls**. Cross-check: on 15-lb felt (4 squares, 400 sf) the same
deck is `ceil(2500*1.10/400) = ceil(6.875) = ` **7 rolls** -- the roll coverage, set by the product, drives the count.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "carpentry"]`, inside the `// Group E` construction block beside
`roofing-squares`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (rolls = ceil(area (1+lap+waste)/coverage), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the felt cross-check); `test/fixtures/compute-map.js`
(`roof-underlayment-rolls` -> `computeRoofUnderlaymentRolls`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `roofing-squares` / `ice-barrier-coverage` / `shingle-nails`);
`data/search/aliases.json` (5 collision-checked aliases: "roof underlayment rolls", "felt roll count", "synthetic
underlayment rolls", "roof deck underlayment", "underlayment coverage"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring the `roofing-squares` renderer (non-exported, so no DOM-sentinel dims row), and the
id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the roll count and the
error seams (non-positive area or coverage; negative lap/waste). The calc-construction.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,310 -> 1,311.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(2500*1.10/1000) -> 3 rolls).

## 5. Roadmap position

Roofing takeoff beside `roofing-squares` (shingles) and `shingle-nails` (fasteners), serving the roofer (roofing /
carpentry). Distinct from eave-only `ice-barrier-coverage`. Stays evidence-driven; the code sets the underlayment.
