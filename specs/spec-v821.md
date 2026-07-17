# roughlogic.com Specification v821 -- Water to Reach Optimum Moisture for Compaction (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,269 -> 1,270 tiles). The
> calc-earthwork.js module gzip cap was raised 15 -> 20 KB for the erosion/compaction cluster. Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v820.md. Earthwork/compaction sweep, beside
> `relative-compaction` and `compaction-roller-production`.
>
> **The gap, and the evidence for it.** The catalog checks compaction result (`relative-compaction`) and production
> (`compaction-roller-production`) but nothing tells the grading crew **how much water to add** to bring a dry lift up to
> the Proctor's optimum moisture -- the single biggest reason a lift fails density. Grep confirmed no moisture / optimum-
> moisture-water tile. The number this settles: a 100 bcy lift at 105 pcf dry, sitting at 9% when the optimum is 14%, needs
> about **1,700 gallons** of water mixed in -- one water-truck load -- before the roller will ever hit spec.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`relative-compaction`, `soil-phase-relations`): the lift volume carries `L^3`, the dry density
`M L^-3`, the two moisture contents are dimensionless (percent), the dry weight and water weight are `M`, and the water
gallons are `L^3`. The v18/v21 contract: a non-finite or non-positive lift volume or dry density returns `{ error }`; a
non-finite or negative moisture content returns `{ error }`. Citation discipline (v19/v22): the gravimetric water-content
identity by name (water to add = (optimum - field)/100 x dry soil weight; gallons = pounds / 8.34), `GOVERNANCE.general`;
the note states that the optimum moisture and maximum dry density come from the Proctor (the geotech governs), that the
field moisture comes from a field test, that water is added and mixed before the roller (a dry surface skin over a wet
core still fails), and that a lift wetter than optimum must be aerated and dried, not watered.

## 2. The tile

### 2.1 `water-for-compaction` -- Water to Reach Optimum Moisture for Compaction

```
inputs:
  volume_bcy      lift volume, bank measure (cy)
  dry_density_pcf maximum dry density from the Proctor (pcf)
  omc_pct         optimum moisture content (percent)
  field_pct       current field moisture content (percent)

dry_weight_lb = volume_bcy * 27 * dry_density_pcf
water_lb      = (omc_pct - field_pct) / 100 * dry_weight_lb
water_gal     = water_lb / 8.34
needs_drying  = field_pct > omc_pct
```

**Pinned worked example.** Volume 100 bcy, dry density 105 pcf, optimum 14%, field 9%:
`dry weight = 100 * 27 * 105 = ` **283,500 lb**; `water = (14 - 9)/100 * 283,500 = ` **14,175 lb**;
`gallons = 14,175 / 8.34 = ` **1,700 gal**. Cross-check: a lift already at 12% needs only
`(14 - 12)/100 * 283,500 / 8.34 = ` **680 gal**, and a lift at 16% (above optimum) returns `needs_drying = true` with a
**negative** water figure -- the signal to aerate, not water.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block beside
`relative-compaction`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (water = (omc - field)/100 x dry weight; gal = lb / 8.34, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the near-optimum and the above-optimum drying cross-checks);
`test/fixtures/compute-map.js` (`water-for-compaction` -> `computeWaterForCompaction`, module `../../calc-earthwork.js`);
`scripts/related-tiles.mjs` (-> `relative-compaction` / `soil-phase-relations` / `dust-control-water`);
`data/search/aliases.json` (5 collision-checked aliases: "water for compaction", "optimum moisture water", "add water to
soil", "moisture conditioning gallons", "proctor moisture water"); a hand-written renderer in the `EARTHWORK_RENDERERS`
map mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the dry weight, the water pounds and gallons, the
needs_drying flag, and the error seams (non-positive volume or dry density; negative moisture). The calc-earthwork.js gzip
cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,269 -> 1,270.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+3 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((14-9)/100 * 100*27*105 / 8.34 -> 1,700 gal).

## 5. Roadmap position

Fills the moisture-conditioning step between the loosening/placing tiles and `relative-compaction`, serving the grading
crew (construction / surveying), and pairs with the coming `dust-control-water` tile on water-truck logistics. Stays
evidence-driven; the Proctor governs the optimum.
