# roughlogic.com Specification v338 -- Grain Drying Shrink and Net Market Bushels (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.119.0). Batch spec-v338..v340 (the farm-operations trio -- the grain-marketing
> and livestock/land numbers the existing ag tiles never compute: the grain drying shrink and net market bushels (this
> spec), the livestock dry-matter intake and as-fed ration (v339), and the nutrient-based manure application rate (v340).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `grain-bin-capacity` gives storage volume and
> `hay-dry-matter` restates a bale's weight at a target moisture, but neither computes the grain-market shrink -- the weight
> a load of wet corn loses drying to market moisture, plus the handling shrink, and the net bushels the elevator settles on.
> That is the number a grower checks against the scale ticket. Adds one tile to the existing **`calc-agriculture.js`**
> module (Group L); no new group, trade, or dependency. Inherits spec.md through spec-v337.md.
>
> **The gap, and the evidence for it.** Selling grain above market moisture costs weight two ways: the water removed to dry
> it down, and a handling/invisible shrink the elevator adds. The moisture shrink is `(M_wet - M_dry)/(100 - M_dry)` as a
> fraction of weight, the dried weight is `W x (100 - M_wet)/(100 - M_dry)`, and the net market weight applies an extra
> handling-shrink percentage before converting to bushels at the market test weight. For 10,000 lb of corn at 20% moisture
> dried to a 15% market with a 0.5% handling shrink, the dried weight is `10,000 x 80/85 = 9,412 lb`, the handling shrink
> takes another `47 lb`, and the net `9,365 lb / 56 lb per bushel = 167.2 bu` -- the settled quantity, a `6.3%` total shrink
> off the wet scale weight, and the reason wet corn is discounted at the scale. The bin tile stores it; this tile settles it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The gross weight and net
weights are forces (lb); the wet and dry (market) moisture contents and the handling shrink are dimensionless percentages;
the market test weight is a force per volume (lb/bushel); the net bushels are a dimensionless count. The v18/v21 contract:
any non-finite input, a weight or test weight at or below zero, or a dry moisture at or above 100% (`100 - M_dry <= 0`)
returns `{ error }`; drying UP (M_dry > M_wet) is flagged rather than computed. Citation discipline (v19/v22):
`GOVERNANCE.general` over the grain-shrink relations by name; `editionNote` names **the moisture shrink
`(M_wet - M_dry)/(100 - M_dry)`, the dried weight `W (100 - M_wet)/(100 - M_dry)`, an added handling/invisible shrink
(commonly ~0.5 to 1.5%), and the market test weights (56 lb/bu corn, 60 wheat/soybeans), as compiled in the grain-marketing
references**, and states that **this returns the drying shrink and net settled bushels -- it uses the entered market
moisture and handling shrink (elevators vary; a shrink factor of ~1.18 per point is an alternative convention), the market
test weight, and does not apply dockage for foreign material/damage or a drying-charge cost (a separate deduction); and
this is a marketing aid** -- the elevator's posted shrink policy and grades govern.

## 2. The tile

### 2.1 `grain-shrink-moisture` -- Grain Drying Shrink and Net Market Bushels

```
inputs:
  W_lb       lb        gross (wet) weight
  M_wet_pct  %         wet moisture content
  M_dry_pct  %         market (dry) moisture
  handling   %         handling/invisible shrink (default 0.5)
  tw_lbbu    lb/bu     market test weight (56 corn, 60 wheat/soy)

moist_shrink = (M_wet_pct - M_dry_pct)/(100 - M_dry_pct)          ; fraction
W_dry = W_lb * (100 - M_wet_pct)/(100 - M_dry_pct)               ; dried weight, lb
W_net = W_dry * (1 - handling/100)                               ; net weight, lb
bushels = W_net / tw_lbbu                                        ; net market bushels
total_shrink = (W_lb - W_net)/W_lb * 100                         ; total shrink, %
```

**Pinned worked example (10,000 lb corn, 20% to a 15% market, 0.5% handling, 56 lb/bu).** `moist_shrink = (20 - 15)/85 = 5.88%`;
`W_dry = 10,000 x 80/85 = 9,412 lb`; `W_net = 9,412 x 0.995 = 9,365 lb`; `bushels = 9,365/56 = 167.2 bu`; total shrink
`= (10,000 - 9,365)/10,000 = 6.35%`. **Cross-check (dry harder, to 14%).** `W_dry = 10,000 x 80/86 = 9,302 lb`,
`W_net = 9,255 lb`, `bushels = 165.3 bu`, total shrink `7.45%` -- each extra point of drying costs more than a point of
weight, the trade a grower weighs against the moisture discount. The non-finite, non-positive, and `M_dry >= 100` /
drying-up error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, matching `grain-bin-capacity`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the grain-shrink relations, `editionNote` naming the moisture-shrink
and dried-weight forms, the handling shrink, the test weights, and the no-dockage, elevator-policy-governs caveats);
`test/fixtures/worked-examples.json` (the 15% example + the 14% cross-check); `test/fixtures/compute-map.js`
(`grain-shrink-moisture` -> `computeGrainShrinkMoisture` in `../../calc-agriculture.js`); `scripts/related-tiles.mjs` (->
`grain-bin-capacity` / `hay-dry-matter` / `crop-yield` / `livestock-dry-matter-intake`); `data/search/aliases.json`
("grain shrink", "drying shrink", "corn moisture shrink", "net bushels", "grain moisture discount", "elevator shrink",
"market moisture", "grain settlement", "test weight bushels"); the id appended to the existing agriculture renderers block
in `app.js`; the `// dims:` annotation (weights force, moistures/shrink percent, test weight force/volume, bushels
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
moisture-shrink and handling terms, the bushel conversion, and the `M_dry >= 100` / drying-up / non-finite error seams. No
new module; re-pin `calc-agriculture.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the shrink-and-bushel assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the shrink / net weight / bushels stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (10,000 lb 20->15% -> 167.2 bu, 6.35% shrink).

## 5. Roadmap position

Opens the farm-operations batch (v338..v340) in `calc-agriculture.js`, adding grain-market settlement to the storage and
yield tiles. The livestock dry-matter intake (v339) and manure application rate (v340) follow. The per-point shrink-factor
(1.18) convention, a drying-energy/cost deduction, and a dockage/grade discount are the deliberate next follow-ons once the
trio lands.
