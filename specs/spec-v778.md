# roughlogic.com Specification v778 -- Feed Conversion Ratio and Average Daily Gain (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group L),
> no new module, group, or dependency. Inherits spec.md through spec-v777.md. Explore sweep #19 (entry 4).
>
> **The gap, and the evidence for it.** The catalog rations livestock (`pearson-square-ration`) and stocks pasture
> (`cattle-stocking-rate`) but never measures **performance**: the two universal feedlot/production metrics are average
> daily gain and feed conversion ratio, and no tile computes them. `ADG = (final - initial weight)/days`,
> `FCR = total feed / total gain`. The number this settles: a steer **650 to 1,250 lb** over **200 days** on **3,900 lb**
> of feed gains **3.0 lb/day** at a **6.5:1** FCR. Grep confirmed no `feed conversion` / `average daily gain` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group L
livestock siblings: the weights and feed carry mass (`M`), the gain rate `M T^-1`, and the feed conversion ratio is
dimensionless. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive initial weight, a final
weight not greater than the initial (no gain), non-positive days on feed, or non-positive total feed returns `{ error }`.
Citation discipline (v19/v22): the ADG and FCR definitions by name (USDA / land-grant extension animal science),
`GOVERNANCE.general`; the note states feed is entered on the as-fed basis (standard; convert with the ration DM fraction
for a dry-matter FCR), that a lower FCR is more efficient, and that FCR rises as an animal finishes.

## 2. The tile

### 2.1 `feed-conversion-ratio` -- Feed Conversion Ratio and Average Daily Gain

```
inputs:
  initial_weight_lb   starting weight (lb, > 0)
  final_weight_lb     ending weight (lb, > initial)
  days_on_feed        length of the feeding period (days, > 0)
  total_feed_lb       total feed fed, as-fed (lb, > 0)

total_gain             = final_weight - initial_weight
average_daily_gain     = total_gain / days_on_feed
feed_conversion_ratio  = total_feed / total_gain
```

**Pinned worked example.** 650 -> 1,250 lb, 200 days, 3,900 lb feed:
`gain = 600 lb`; `ADG = 600/200 = ` **3.0 lb/day**; `FCR = 3900/600 = ` **6.5** (lb feed per lb gain). More feed for the
same gain raises the FCR (less efficient); the same gain over more days lowers the ADG -- both pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`) placed with the later Group L agriculture tiles **outside the
exact-count (30) `// Group L: Agriculture` .. `// Group M` audit block** (beside `bunker-silo-capacity`), so the audit is
untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the ADG/FCR definitions, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`feed-conversion-ratio` ->
`computeFeedConversionRatio`); `scripts/related-tiles.mjs` (-> `pearson-square-ration` / `cattle-stocking-rate` /
`livestock-water-requirement`); `data/search/aliases.json` (5 collision-checked aliases: "feed conversion ratio",
"average daily gain", ...); the calc-agriculture `AGRICULTURE_RENDERERS` map entry via a hand-written renderer (initial/
final weight, days, and total-feed fields) and the id added to the calc-agriculture declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the ADG and FCR identities across a sweep, the more-feed/more-days
monotonicity, and the error seams. The calc-agriculture.js gzip cap (raised to 57500 B in this spec) covers the addition.
Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,226 -> 1,227.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 3.0 lb/day ADG and a 6.5:1
FCR for 650 -> 1,250 lb over 200 days on 3,900 lb feed).

## 5. Roadmap position

Adds the performance metrics the livestock bench was missing, alongside the ration and stocking tiles. Continues the
post-inverse forward-coverage vein (Explore sweep #19). A cost-of-gain or break-even-sale-price tile is the natural next
production addition; it stays evidence-driven.
