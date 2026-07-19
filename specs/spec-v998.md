# roughlogic.com Specification v998 -- Sailboat Performance Ratios (SA/D and DLR) (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group
> K), no new module, group, or dependency. Inherits spec.md through spec-v997.md. Beside `hull-displacement`,
> `hull-speed`, and the marine tiles.
>
> **The gap, and the evidence for it.** Every existing marine tile is powerboat/engine (`hull-speed`,
> `hull-displacement`, `prop-slip`, `anchor-rode-scope`); the SAILING side is absent. Grep confirmed no SA/D or DLR
> tile. The number this settles: a 500 sq ft, 10,000 lb, 30 ft-waterline boat has an SA/D of **17.2** and a DLR of
> **165**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut -- both outputs are dimensionless ratios),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a
non-positive sail area, displacement, or waterline length returns `{ error }`. Citation discipline (v19/v22): the two
sailboat performance ratios by name (Skene's Elements of Yacht Design; Gerr, The Nature of Boats), `GOVERNANCE.general`;
the note gives the interpretation bands and stresses that the loaded displacement, the measured sail area and waterline,
and a naval architect's velocity-prediction analysis govern real performance.

## 2. The tile

### 2.1 `sailboat-performance-ratios` -- Sailboat Performance Ratios (SA/D and DLR)

```
inputs:
  sail_area_sqft   sail area (sq ft), default 500
  displacement_lb  displacement (lb), default 10000
  lwl_ft           waterline length LWL (ft), default 30

displaced_volume_ft3 = displacement_lb / 64
sa_d_ratio           = sail_area_sqft / displaced_volume_ft3^(2/3)
dl_ratio             = (displacement_lb / 2240) / (0.01 x lwl_ft)^3
```

**Pinned worked example.** 500 sq ft sail, 10,000 lb, 30 ft LWL: `SA/D = 500 / (10,000/64)^(2/3) = ` **17.2** (moderate
cruiser); `DLR = (10,000/2,240) / 0.30^3 = ` **165** (light). Cross-check: 700 sq ft, 12,000 lb, 34 ft LWL: `SA/D = `
**21.4** (performance); `DLR = ` **136** (light).

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["marine", "mechanic"]`, beside `hull-displacement`); a `tile-meta.js`
`_TILES` entry (`K`); a `citations.js` entry (Skene's / Gerr yacht-design ratios, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the moderate base plus the performance cross-check, pinning both ratios);
`test/fixtures/compute-map.js` (`sailboat-performance-ratios` -> `computeSailboatPerformanceRatios`, module
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `hull-speed` / `hull-displacement` / `prop-slip`);
`data/search/aliases.json` (5 collision-checked aliases: "sail area displacement", "displacement length ratio",
"sailboat ratios", "sa/d ratio", "dlr sailboat"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by
the `_simpleRenderer` factory in the `MECHANIC_RENDERERS` map, and the id added to the calc-mechanic declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning both examples, the more-sail / shorter-waterline directions, the class bands,
and the error seams. The calc-mechanic.js gzip cap and the Group K group shell are watched at build (cap raised for this
tile). Home tile count 1,446 -> 1,447.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(500 / 10,000 / 30 -> SA/D 17.2, DLR 165).

## 5. Roadmap position

Sailing marine beside `hull-displacement`, serving the marine surveyor / designer / sailor (marine, mechanic).
Deliberately the comparative screens; the loaded displacement, the measured sail area and waterline, and a naval
architect's velocity-prediction program govern real performance. Stays evidence-driven. Continues the marine sweep at 1
new spec (v998), opening the sailing side of Group K.
