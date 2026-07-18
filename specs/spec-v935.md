# roughlogic.com Specification v935 -- Cistern / Storage Reserve Days and Required Volume (calc-water.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v934.md. Water-storage planning sweep, beside the
> accepted `detention-time` and rainwater-yield tiles.
>
> **The gap, and the evidence for it.** The catalog gives rainwater YIELD and catchment area but nothing gives the
> storage RESERVE (days) or the tank a target reserve needs. Grep confirmed no cistern / reserve-days tile. Every off-grid
> or rain-fed tank is sized to a dry-spell target. The number this settles: a 2,500-gal usable cistern at 150 gpd carries
> **16.7 days**, and banking a 30-day dry spell needs **4,500 gal**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling water
tiles: the usable storage and required volume carry `L^3`, the daily demand carries `L^3 T^-1`, and the reserve and
target days carry `T`. The v18/v21 contract: a non-finite or non-positive usable storage, daily demand, or target days
returns `{ error }`. Citation discipline (v19/v22): the storage mass balance by name (reserve = storage / demand;
required = demand x days), `GOVERNANCE.water`; the note states that usable storage is above the pump-intake dead volume
and below overflow (past any fire or first-flush reserve), that a realistic PEAK daily demand must be used, that a
rain-fed cistern must bridge the longest dry spell while a hauled/well-fed tank sets the refill interval, and that the
local rainfall or source yield, the storage detail, and the AHJ govern.

## 2. The tile

### 2.1 `cistern-storage-days` -- Cistern / Storage Reserve Days and Required Volume

```
inputs:
  usable_storage_gal  usable storage (gal, above intake, below overflow, past reserves)
  daily_demand_gpd    peak daily demand (gpd)
  target_days         target reserve to size a tank for (days, default 30)

reserve_days            = usable_storage_gal / daily_demand_gpd
required_gal_for_target = daily_demand_gpd x target_days
```

**Pinned worked example.** 2,500 gal usable, 150 gpd, 30-day target:
`reserve = 2,500 / 150 = ` **16.7 days**; `required = 150 x 30 = ` **4,500 gal** to bank a 30-day dry spell. Cross-check:
a 1,000 gal tank at 50 gpd carries `1,000 / 50 = ` **20 days**, and a 14-day target needs `50 x 14 = ` **700 gal** -- the
reserve is storage over demand, and the tank scales with the demand times the days.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`, beside `iron-manganese-chlorine-dose`); a `tile-meta.js` `_TILES`
entry (`M`); a `citations.js` entry (storage mass balance, `GOVERNANCE.water`); the Group M audit count in
`test/unit/citations.test.js` bumped by one; `test/fixtures/worked-examples.json` (the 2,500-gal example plus the
1,000-gal cross-check, pinning the reserve days and required volume); `test/fixtures/compute-map.js`
(`cistern-storage-days` -> `computeCisternStorageDays`, module `../../calc-water.js`); `scripts/related-tiles.mjs` (->
`detention-time` / `ro-recovery-concentration` / `filter-loading`); `data/search/aliases.json` (5 collision-checked
aliases: "cistern storage days", "reserve days of storage", "cistern sizing", "water storage days", "rain tank
reserve"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `WATER_RENDERERS` map
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-water declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the reserve days and required volume across two tanks and the error seams (non-positive storage / demand /
target, non-finite). The calc-water.js gzip cap is raised 30000 -> 32000 with a ledger note. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,383 ->
1,384.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group M audit bump); `npm run
build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build
(cap raise); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2,500 / 150 -> 16.7 days; 150 x 30 -> 4,500 gal).

## 5. Roadmap position

Water-storage planning tile beside `detention-time`, serving the water / off-grid installer (water). Deliberately a
planning estimate; the local rainfall or source yield, the storage-tank detail, and the AHJ (for potable use) govern.
Stays evidence-driven. Continues the water-storage planning sweep at 1 new spec (v935).
