# roughlogic.com Specification v169 -- Feeder/Service Neutral Demand Load (NEC 220.61) (calc-service.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.79.0; part of catalog 628 -> 639). Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile computing the feeder/service neutral
> (grounded conductor) demand load under NEC 220.61 -- the maximum unbalanced load with the 70%
> reduction permitted above 200 A for the qualifying portion. Adds one tile to **`calc-service.js`**
> (Group A); no new module, group, or dependency. Inherits spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** Completing the dwelling demand trio (range v167, dryer v168),
> the neutral is sized on its own 220.61 rule: it carries the maximum unbalanced load, but the portion
> above 200 A may be taken at 70% (with stated exclusions). The catalog computes phase loads
> (`service-load`) and three-phase neutral current under balanced/imbalanced *operating* conditions
> (`neutral-current-3ph`, `neutral-imbalance`) but never the 220.61 *sizing* demand, which is what
> determines the neutral conductor on the feeder.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
maximum unbalanced load and the resulting neutral demand are current `I`; the 200 A break and the 70%
factor are constants. The v18/v21 contract: any non-finite input, or a negative unbalanced load,
returns `{ error }`; there are no user-denominator divisions (only the fixed 200 A threshold and 0.70
factor). Citation discipline (v19/v22): `GOVERNANCE.electrical`, edition `NEC 2023 220.61 (feeder and
service neutral load)`, `editionNote` `NEC_DISCLOSURE`, with the note that 220.61(B) permits the 70%
reduction on the portion of the unbalanced load over 200 A for the qualifying loads, and 220.61(C)
*prohibits* reduction for nonlinear-load portions (electronic-discharge lighting, data) -- this tile
implements the common 220.61(B)(1) 70% case and names the (C) exclusion rather than assuming it away.

## 2. The tile

### 2.1 `neutral-demand-220-61` -- Feeder/Service Neutral Demand From the Unbalanced Load

```
inputs:
  max_unbalanced_a    I    maximum unbalanced load between any phase and neutral
  nonlinear_excluded  dimensionless  0/1 -- set 1 to keep the whole load at 100% (220.61(C))

if nonlinear_excluded == 1:
  neutral_demand_a = max_unbalanced_a                     # no reduction permitted
else:
  first  = min(max_unbalanced_a, 200)                     # first 200 A at 100%
  excess = max(max_unbalanced_a - 200, 0)                 # portion over 200 A at 70%
  neutral_demand_a = first + 0.70 x excess
```

**Pinned worked example.** Maximum unbalanced load 250 A, ordinary loads:
`first = 200 A` at 100%, `excess = 50 A` at 70% -> `neutral_demand = 200 + 0.70 x 50 = 235 A`. The
neutral is sized for 235 A, not the full 250 A. **Cross-check (under 200 A, and the exclusion).** A
150 A unbalanced load is entirely under 200 A -> `neutral_demand = 150 A` (no reduction available).
And the same 250 A load flagged as nonlinear (220.61(C)) stays at the full **250 A** -- no 70%
reduction. The AHJ and the load classification govern.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 220.61(B)/(C), the 200 A break, the 70%
factor, and the nonlinear exclusion named, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`neutral-demand-220-61` -> `computeNeutralDemand22061` in `../../calc-service.js`);
`scripts/related-tiles.mjs` (-> `service-load` / `range-demand-220-55` / `neutral-current-3ph`);
`data/search/aliases.json` ("neutral demand", "220.61", "neutral load", "70 percent neutral", "feeder
neutral", "grounded conductor sizing"); the id appended to the existing `SERVICE_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the 250 A example, the under-200 A path, the nonlinear-exclusion path, and error seams
(non-finite, unbalanced < 0). Raise the `calc-service.js` size cap by ~20 percent if needed (dated
comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the under-200 and exclusion paths); `npm run
build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px
audit (the first-200/excess split and the neutral demand wrap on a phone); render-no-nan + a11y sweep,
output read to the value (250 A -> 235 A; 150 A -> 150 A; 250 A nonlinear -> 250 A).

## 5. Roadmap position

Completes the dwelling demand-factor trio (range v167, dryer v168, neutral here) alongside
`service-load`. Further Group A growth stays evidence-driven.
