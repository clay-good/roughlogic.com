# roughlogic.com Specification v782 -- Ice Cream Overrun by Weight (calc-kitchen.js, Group O, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`** (Group O),
> no new module, group, or dependency. Inherits spec.md through spec-v781.md. Explore sweep #20 (entry 2).
>
> **The gap, and the evidence for it.** A frozen-dessert kitchen measures **overrun** -- the air whipped into the mix by
> the freezer -- to hold product consistency and cost, and it measures it by *weight*: fill one container with mix and the
> same container with finished product, and the weight difference is the air. No tile does this. `overrun% = (mix weight
> - finished weight) / finished weight x 100` for equal volumes. The number this settles: a gallon of mix at **9.0 lb**
> frozen to the FDA-minimum **4.5 lb/gal** is **100% overrun** -- half the finished volume is air. Grep confirmed no
> overrun tile exists (`overrun` hits only cost-overrun in accounting and runway-overrun in the crosswind tiles).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group O
kitchen siblings: the two weights carry `M` (mass), and overrun, air fraction, and the FDA flag are dimensionless. The
weight-of-equal-volumes definition makes the ratio dimensionally clean without a density unit. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive weight, or a finished weight at or above the mix weight (no air
incorporated) returns `{ error }`. Citation discipline (v19/v22): ice cream overrun by name (Goff & Hartel, *Ice Cream*,
7th ed.; FDA 21 CFR 135.110 standard of identity), `GOVERNANCE.general` matching the siblings; the note states that
finished ice cream must weigh at least 4.5 lb/gal and carry at least 1.6 lb of total solids per gallon, gives the overrun
bands (gelato/premium ~20-35%, standard ~50-90%, economy/soft-serve ~90-100%), and states that freezer type, fat,
solids, and draw temperature all move the number so the weighed cup is the shop measurement of record.

## 2. The tile

### 2.1 `overrun-percent` -- Ice Cream Overrun

```
inputs:
  mix_weight_lb        weight of one gallon of unfrozen mix (lb)
  finished_weight_lb   weight of one gallon of finished frozen product (lb)

overrun_pct = (mix_weight_lb - finished_weight_lb) / finished_weight_lb x 100
air_pct     = (mix_weight_lb - finished_weight_lb) / mix_weight_lb x 100
meets_fda   = finished_weight_lb >= 4.5   (21 CFR 135.110 minimum ice-cream density)
```

**Pinned worked example.** Mix 9.0 lb/gal, finished 4.5 lb/gal: `overrun = (9.0 - 4.5) / 4.5 x 100 = ` **100%**;
`air = (9.0 - 4.5) / 9.0 x 100 = ` **50%** of the finished volume; finished density meets the FDA 4.5 lb/gal minimum.
A denser finished product (gelato) whips in less air and returns a lower overrun; a finished weight below 4.5 lb/gal
trips the FDA flag.

## 3. Wiring

A `tools-data.js` row (group `O`, trades `["kitchen", "food-service"]`) beside `drink-abv-dilution` (Group O is not
exact-count-audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (ice cream overrun, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`overrun-percent` ->
`computeOverrunPercent`); `scripts/related-tiles.mjs` (-> `bakers-percentage` / `yield-ep` / `recipe-scale`);
`data/search/aliases.json` (5 collision-checked aliases: "ice cream overrun", "overrun percentage", "how much air in ice
cream", ...); the calc-kitchen `KITCHEN_RENDERERS` map entry via the `_r` renderer factory and the id added to the
calc-kitchen declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the air fraction, the FDA density
flag, the gelato (denser = lower overrun) monotonicity, and the error seams. The calc-kitchen.js gzip cap is unchanged
(the addition fits under the current cap). Verify at build, including `check-shells`. Lazy-loaded, absent from home first
paint. Home tile count 1,230 -> 1,231.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 100% overrun, 50% air,
meets the FDA minimum).

## 5. Roadmap position

Adds the shop measurement every frozen-dessert operation runs -- overrun by weight -- alongside the existing recipe,
yield, and formulation kitchen tiles. Continues the post-inverse forward-coverage vein (Explore sweep #20). A
finished-density-from-target-overrun inverse and a butterfat/total-solids mix-balance tile are the natural next
frozen-dessert additions; they stay evidence-driven.
