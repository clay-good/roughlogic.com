# roughlogic.com Specification v995 -- Carcass Dressing Percentage and Freezer Yield (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group
> L), no new module, group, or dependency. Inherits spec.md through spec-v994.md. Beside `cattle-heart-girth-weight`
> and the livestock tiles.
>
> **The gap, and the evidence for it.** The catalog has stocking, intake, and now live-weight tiles, but nothing on the
> carcass side -- dressing percentage and freezer meat yield, which producers and lockers use to price freezer beef and
> pork. Grep confirmed no carcass / dressing tile. The number this settles: a 1,200 lb steer with a 744 lb carcass
> dresses at **62.0%**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a percent and lb from weights), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive weight, a
carcass heavier than the live weight, or a cutting yield outside (0, 100] returns `{ error }`. Citation discipline
(v19/v22): carcass dressing percentage and cutting yield by name (standard meat-science figures), `GOVERNANCE.general`;
the note gives the typical dressing ranges (beef ~60-64%, pork ~72-75%, lamb ~50%) and the ~65-70% beef cutting yield,
and stresses that the processor's certified scale, the cut sheet, and aging shrink govern the freezer yield.

## 2. The tile

### 2.1 `dressing-percentage` -- Carcass Dressing Percentage and Freezer Yield

```
inputs:
  live_weight_lb          live weight (lb), default 1200
  hot_carcass_weight_lb   hot carcass weight (lb), default 744
  cutting_yield_pct       boneless cutting yield (% of carcass), default 67

dressing_pct       = 100 x hot_carcass_weight_lb / live_weight_lb
boneless_yield_lb  = hot_carcass_weight_lb x cutting_yield_pct / 100
```

**Pinned worked example.** 1,200 lb steer, 744 lb carcass, 67% cutting yield: `dressing = 744 / 1,200 x 100 = ` **62.0%**;
`boneless = 744 x 0.67 = ` **498 lb**. Cross-check: a 260 lb hog with a 190 lb (skin-on) carcass: `dressing = 190 /
260 x 100 = ` **73.1%** -- pork runs higher than beef.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside `corn-yield-estimate`); a `tile-meta.js` `_TILES`
entry (`L`); a `citations.js` entry (dressing percentage / cutting yield, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the beef base plus the pork cross-check, pinning the dressing percent and
boneless yield); `test/fixtures/compute-map.js` (`dressing-percentage` -> `computeDressingPercentage`, module
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `cattle-heart-girth-weight` / `cattle-stocking-rate` /
`livestock-dry-matter-intake`); `data/search/aliases.json` (5 collision-checked aliases: "dressing percentage",
"carcass yield", "dressing percent", "freezer beef yield", "hanging weight"), then
`node scripts/build-alias-shards.mjs`; the tile is rendered by the `_r` factory in the `AGRICULTURE_RENDERERS` map, and
the id added to the calc-agriculture declare list in `app.js`; the `// dims:` annotation directly above the compute;
the Group L citation-coverage audit count bumped; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the pork-higher direction, the boneless-below-carcass bound, and
the error seams. The calc-agriculture.js gzip cap and the Group L group shell are watched at build. Home tile count
1,443 -> 1,444.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group L count bump);
`npm run build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs`
post-build; `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(744 / 1,200 -> 62.0%, 498 lb).

## 5. Roadmap position

Livestock marketing beside `cattle-heart-girth-weight`, serving the producer / custom locker (agriculture).
Deliberately the pricing and planning aid; the processor's certified scale, the specific cut sheet, the aging shrink,
and the packer or locker govern the freezer yield. Stays evidence-driven. Continues the agriculture sweep at 1 new spec
(v995).
