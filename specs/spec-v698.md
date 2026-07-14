# roughlogic.com Specification v698 -- Product Pull-Down Time (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`** (Group C,
> commercial refrigeration), no new module, group, or dependency. Inherits spec.md through spec-v697.md.
>
> **The gap, and the evidence for it.** The `product-pull-down-load` tile runs the pull-down forward: from the product
> mass, specific heats, temperatures, and a chosen pull-down time it returns the heat Q and the rate. The sizing question
> is the inverse -- **given the refrigeration capacity my compressor can put into product load, how long will the
> pull-down take, and does it fit the design window**. Since the forward tile is `rate = Q / hours`, the inverse is
> `hours = Q / capacity`. The number this settles: 2,000 lb of produce (cp 0.9, 80 -> 35 F, Q = 81,000 Btu) served by
> **3,375 Btu/hr** of product capacity pulls down in **24 hours** -- exactly the forward tile's design case, read the other
> way.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`product-pull-down-load` sibling: the mass is `M`, temperatures are `T`, the capacity is `M L^2 T^-3` (Btu/hr), and the
returned time is dimensionless (hours). To keep the sensible-plus-latent heat geometry (including the freezer branch:
sensible-to-freezing + latent heat of fusion + frozen sensible) in one place, the compute calls
`computeProductPullDownLoad` at `hours = 1` and reads its `q_btu`, then divides by the capacity. The v18/v21 contract:
any non-finite input, a non-positive capacity, a non-positive heat (product not entering warmer than storage), and the
sibling's own guards (non-positive mass or specific heat) return `{ error }`. Citation discipline (v19/v22): the ASHRAE
Refrigeration pull-down relation solved for time, `GOVERNANCE.general` matching the sibling; the note states that **Q is
the same sensible (and, for a freezer, latent-plus-frozen-sensible) load as the forward tile, and when the returned time
exceeds the design window (commonly 24 h) you add capacity or stage the loading -- a sizing aid, the ASHRAE product-
property tables govern**.

## 2. The tile

### 2.1 `product-pull-down-time` -- Product Pull-Down Time

```
inputs:
  mass_lb        M    product mass (> 0)
  cp_above       -    specific heat above freezing (Btu/lb-F, > 0)
  t_enter_f      T    entering temperature (F)
  t_storage_f    T    storage (target) temperature (F)
  t_freeze_f     T    freezing point (F, optional -- triggers the freezer branch)
  hif_btu_lb     -    latent heat of fusion (Btu/lb, optional)
  cp_below       -    specific heat below freezing (Btu/lb-F, optional)
  capacity_btuh  M L^2 T^-3   refrigeration capacity for product load (Btu/hr, > 0)

Q     = product pull-down heat (sibling relation; sensible, or freezer three-term)
hours = Q / capacity_btuh
```

**Pinned worked example (above freezing).** 2,000 lb, cp 0.9, 80 -> 35 F, capacity 3,375 Btu/hr:
`Q = 2000 x 0.9 x (80 - 35) = 81,000 Btu`, `hours = 81000 / 3375 = ` **24 hr**; feeding 24 hr back through
`product-pull-down-load` returns a rate of 3,375 Btu/hr, the capacity. **Cross-check (freezer).** 2,000 lb to 0 F
(freeze 28, hif 120, cp_below 0.45) is Q = 358,800 Btu, so at 3,375 Btu/hr the pull-down is **106 hr** -- the latent load
dominates and the time balloons, the signal to add capacity.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["refrigeration"]`) placed beside `product-pull-down-load`, a spec-vNN section
past every exact-count audit range; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (pull-down relation solved for
time, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`product-pull-down-time` -> `computeProductPullDownTime`); `scripts/related-tiles.mjs`
(-> `product-pull-down-load` / `walk-in-cooler-load` / `evaporator-td-dtd` / `refrigeration-cop`); `data/search/aliases.json`
(5 collision-checked question aliases: "how long to pull down the walk in cooler", "will the box pull down in 24 hours",
...); the calc-refrigerant `REFRIGERANT_RENDERERS` map entry via a hand-written renderer that mirrors the sibling's inputs
but swaps the pull-down-time field for a capacity field, and the id added to the calc-refrigerant declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeProductPullDownLoad` (the hours reproduce
the capacity as the rate), the freezer latent path, the more-capacity-less-time monotonicity, and the error seams. The
calc-refrigerant.js gzip cap is expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from home
first paint. Home tile count 1,146 -> 1,147.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts);
`npm test` (+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 24 hr at 3,375 Btu/hr).

## 5. Roadmap position

Pairs the forward pull-down tile (`product-pull-down-load`, rate from a chosen time) with its inverse (time from the
capacity you have), the two halves of the pull-down-sizing question. Further Group C refrigeration growth stays
evidence-driven.
