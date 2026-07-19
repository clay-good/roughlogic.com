# roughlogic.com Specification v1001 -- As-Purchased Quantity from Edible Portion (calc-kitchen.js, Group O, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`** (Group O),
> no new module, group, or dependency. Inherits spec.md through spec-v1000.md. The purchasing inverse of the accepted
> `yield-ep` tile.
>
> **The gap, and the evidence for it.** `yield-ep` runs forward -- from an as-purchased weight to the edible portion --
> but the everyday purchasing question runs the other way: how much to BUY for a needed edible portion. Grep confirmed
> `yield-ep` takes `ap_weight` as an input and has no purchasing output. The number this settles: to serve 20 lb of
> trimmed tenderloin at a 75% yield you must buy **26.67 lb**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut), bounds-fuzzer, worked-example registry, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive edible-portion quantity, a yield
outside (0, 100], or a negative unit weight returns `{ error }`. Citation discipline (v19/v22): the as-purchased
quantity calculation by name (standard culinary math; CIA The Professional Chef, On Cooking, ServSafe),
`GOVERNANCE.general` (matching the other kitchen-math tiles); the note stresses that you always DIVIDE by the yield (so
the buy exceeds what is served) and that the real yield varies with grade, season, and trimming -- a yield test on the
actual product governs.

## 2. The tile

### 2.1 `as-purchased-quantity` -- As-Purchased Quantity from Edible Portion

```
inputs:
  ep_quantity_needed  edible-portion quantity needed (lb or each), default 20
  yield_pct           yield (%), default 75
  unit_weight         weight per purchase unit (0 to skip), default 0

ap_quantity = ep_quantity_needed / (yield_pct / 100)
ap_units    = unit_weight > 0 ? ap_quantity / unit_weight : n/a
```

**Pinned worked example.** Need 20 lb EP trimmed tenderloin at a 75% yield: `AP = 20 / 0.75 = ` **26.67 lb**.
Cross-check: 10 lb EP diced onion at an 88% yield: `AP = 10 / 0.88 = ` **11.36 lb**. Because you divide by a fraction,
the buy always exceeds the edible portion; a 50% yield doubles it.

## 3. Wiring

A `tools-data.js` row (group `O`, trades `["kitchen"]`, beside `yield-ep`); a `tile-meta.js` `_TILES` entry (`O`); a
`citations.js` entry (CIA / On Cooking culinary math, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
tenderloin base plus the onion cross-check, pinning the AP quantity); `test/fixtures/compute-map.js`
(`as-purchased-quantity` -> `computeAsPurchasedQuantity`, module `../../calc-kitchen.js`); `scripts/related-tiles.mjs`
(-> `yield-ep` / `recipe-scale` / `plate-cost`); `data/search/aliases.json` (5 collision-checked aliases: "as
purchased", "ap quantity", "how much to buy", "purchase quantity", "as purchased quantity"), then
`node scripts/build-alias-shards.mjs`; the tile is rendered by the `_r` factory in the `KITCHEN_RENDERERS` map, and the
id added to the calc-kitchen declare list in `app.js`; the `// dims:` annotation directly above the compute; the Group
O citation-coverage audit count bumped; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the AP-exceeds-EP / lower-yield-buys-more directions, the units-to-
order path, and the error seams. The calc-kitchen.js gzip cap and the Group O group shell are watched at build. Home
tile count 1,449 -> 1,450.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group O count bump);
`npm run build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs`
post-build; `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20 / 0.75 -> 26.67 lb).

## 5. Roadmap position

Kitchen purchasing beside `yield-ep`, serving the chef / buyer (kitchen). Deliberately the purchasing estimate; the
real yield varies with grade, season, and trimming, so a yield test on the actual product governs the order. Stays
evidence-driven. Continues the culinary sweep at 1 new spec (v1001).
