# roughlogic.com Specification v339 -- Livestock Dry-Matter Intake and As-Fed Ration (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v338..v340 (the farm-operations trio -- grain shrink (v338),
> livestock dry-matter intake (this spec), manure application rate (v340)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pearson-square-ration` balances two feeds to a
> nutrient target and `livestock-water-requirement` sizes water, but neither computes the dry-matter intake -- the pounds of
> dry matter an animal eats per day and, once a feed's dry-matter percentage is known, the as-fed weight actually loaded in
> the bunk. Dry hay and wet silage differ enormously as-fed for the same nutrition. Adds one tile to the existing
> **`calc-agriculture.js`** module (Group L); no new group, trade, or dependency. Inherits spec.md through spec-v338.md.
>
> **The gap, and the evidence for it.** Animals eat to a dry-matter target, not an as-fed weight: the dry-matter intake is
> `DMI = body_weight x intake_fraction` (about 2.0 to 3.0% of body weight for growing/finishing beef, higher for lactating
> dairy), and the as-fed amount of any feed is `DMI / (feed_DM%)`. For a 1,200 lb steer at a 2.5% intake, `DMI = 30 lb/day`;
> fed a dry hay at 88% DM that is `30/0.88 = 34.1 lb` as-fed, but fed a corn silage at 35% DM it is `30/0.35 = 85.7 lb`
> as-fed -- the same 30 lb of dry matter, but two and a half times the bunk weight, the number that sizes the mixer load and
> the feed budget. The Pearson-square tile mixes the ration; this tile sizes the intake behind it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The body weight and the
dry-matter and as-fed intakes are forces (lb); the intake fraction and the feed dry-matter content are dimensionless
percentages; the herd count scales the total. The v18/v21 contract: any non-finite input, a body weight or dry-matter
percentage at or below zero, or an intake fraction outside a plausible `0 < f < 6%` (flagged) returns `{ error }` on the
non-finite/non-positive cases. Citation discipline (v19/v22): `GOVERNANCE.general` over the dry-matter-intake relations by
name; `editionNote` names **the dry-matter intake `DMI = BW x intake%`, the as-fed conversion `as_fed = DMI / feed_DM%`,
typical intake fractions (~2.0 to 2.5% growing/finishing beef, ~1.8 to 2.2% mature cows, ~3.5 to 4.0% high-producing dairy),
and the NRC nutrient-requirement basis**, and states that **this returns the dry-matter intake and the as-fed feed weight
-- it uses the entered intake fraction (which varies with class, body weight, and ration energy/quality per the NRC tables)
and a single feed's dry-matter content (a mixed ration blends several), and does not balance the ration's protein/energy
(`pearson-square-ration`) or set the water requirement (`livestock-water-requirement`); and this is a feeding aid** -- the
NRC requirements and a nutritionist's ration govern.

## 2. The tile

### 2.1 `livestock-dry-matter-intake` -- Dry-Matter Intake and As-Fed Ration

```
inputs:
  BW_lb     lb    body weight
  intake    %     dry-matter intake as % of body weight
  feed_DM   %     feed dry-matter content (88 dry hay, 35 corn silage)
  head      -     number of animals (default 1)

DMI_lb   = BW_lb * intake/100                     ; dry-matter intake, lb/day
asfed_lb = DMI_lb / (feed_DM/100)                 ; as-fed intake, lb/day
herd_asfed = asfed_lb * head                      ; total as-fed, lb/day
```

**Pinned worked example (a 1,200 lb steer at 2.5% intake, dry hay 88% DM).** `DMI = 1,200 x 0.025 = 30 lb/day`;
`as_fed = 30/0.88 = 34.1 lb/day`. **Cross-check (feed corn silage at 35% DM instead).** Same 30 lb of dry matter:
`as_fed = 30/0.35 = 85.7 lb/day` -- 2.5x the bunk weight for the same nutrition, the reason a silage ration fills a mixer
and a feed budget so differently from dry hay, and why intake is always figured on a dry-matter basis. For a 100-head pen,
that is `8,570 lb/day` of silage. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, matching `pearson-square-ration`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the DMI relations, `editionNote` naming `DMI = BW x intake%`,
`as_fed = DMI/feed_DM%`, the intake ranges, the NRC basis, and the single-feed, not-ration-balance caveats);
`test/fixtures/worked-examples.json` (the hay example + the silage cross-check); `test/fixtures/compute-map.js`
(`livestock-dry-matter-intake` -> `computeLivestockDryMatterIntake` in `../../calc-agriculture.js`);
`scripts/related-tiles.mjs` (-> `pearson-square-ration` / `livestock-water-requirement` / `hay-dry-matter` /
`cattle-stocking-rate`); `data/search/aliases.json` ("dry matter intake", "DMI", "as fed ration", "feed intake livestock",
"percent body weight intake", "cattle feed amount", "silage as fed", "bunk weight", "dry matter basis"); the id appended
to the existing agriculture renderers block in `app.js`; the `// dims:` annotation (weights force, intake/`feed_DM`
percent, `head` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the as-fed conversion, the herd multiplier, and the non-positive / non-finite error seams. No new module; re-pin
`calc-agriculture.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the as-fed conversion assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `DMI` / as-fed / herd stack wraps on
a phone); render-no-nan + a11y sweep, output read to the value (1,200 lb at 2.5% -> 30 lb DMI, 34.1 lb as-fed hay).

## 5. Roadmap position

Middle of the farm-operations batch (v338..v340) in `calc-agriculture.js`, sizing the intake behind the ration and water
tiles. The manure application rate (v340) follows. A multi-feed as-fed blend, an NRC intake-fraction lookup by class and
body weight, and an energy/protein requirement chain into `pearson-square-ration` are the deliberate next follow-ons once
the trio lands.
