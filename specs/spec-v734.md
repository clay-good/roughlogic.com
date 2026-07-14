# roughlogic.com Specification v734 -- Filter Area for a Target Loading Rate (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v733.md. Explore sweep #12 (entry 5).
>
> **The gap, and the evidence for it.** The `filter-loading` tile runs the rate forward: from a filter area and flow it
> returns the loading rate and the backwash flow. The design question is the inverse -- **how big a filter a target
> loading rate needs** at the design flow. From `loading = flow / area`, `area = flow / target_loading`. The number this
> settles: **800 GPM** at **4 gpm/ft^2** needs **200 ft^2** of media (3,000 GPM backwash at the 15 gpm/ft^2 default).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`filter-loading` sibling: the design flow and backwash flow are `L^3 T^-1` (gpm), the target loading and backwash rate are
`L T^-1` (gpm/ft^2), and the returned area is `L^2` (ft^2). It reuses the sibling's loading-rate relation, solved for the
area, and the same rapid-sand / high-rate band labels. The v18/v21 contract: any non-finite input, a non-positive flow, a
non-positive target loading, or a non-positive backwash rate returns `{ error }`. Citation discipline (v19/v22): the
loading relation solved for the area, `GOVERNANCE.water` matching the sibling; the reported backwash flow is the flow that
area draws, and the loading band is named so the designer lands the area in the rapid-sand or high-rate range.

## 2. The tile

### 2.1 `filter-area-for-loading` -- Filter Area for a Target Loading Rate

```
inputs:
  flow_gpm                 L^3 T^-1   design flow (gpm, > 0)
  target_loading_gpm_ft2   L T^-1     target loading rate (gpm/ft^2, > 0)
  backwash_rate_gpm_ft2    L T^-1     backwash rate (gpm/ft^2, > 0, default 15)

required_area_ft2 = flow_gpm / target_loading_gpm_ft2
backwash_gpm      = backwash_rate_gpm_ft2 x required_area_ft2
category          = rapid sand (2-5) / high-rate (4-8) / below / above, by target_loading
```

**Pinned worked example.** flow = 800 GPM, target loading = 4 gpm/ft^2, backwash = 15 gpm/ft^2:
`area = 800 / 4 = ` **200 ft^2**, backwash = 15 x 200 = 3,000 GPM, band = rapid sand. Feeding 200 ft^2 back through
`filter-loading` at 800 GPM returns a 4 gpm/ft^2 loading, the target. Asking for a high-rate 8 gpm/ft^2 halves the area to
100 ft^2.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`) placed in the later spec-v659 water section (past the Group M
exact-34 `// Group M`..`// Group N` audit block, beside `detention-basin-volume`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (loading relation solved for the area, `GOVERNANCE.water` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`filter-area-for-loading` ->
`computeFilterAreaForLoading`); `scripts/related-tiles.mjs` (-> `filter-loading` / `detention-basin-volume` /
`detention-time`); `data/search/aliases.json` (5 collision-checked question aliases: "filter area for loading", "how big a
filter", ...); the calc-water `_r` renderer-map entry (three number fields) and the id added to the calc-water declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeFilterLoading`
across a flow/target/backwash sweep, the higher-target-less-area monotonicity, the band labels, and the error seams. The
calc-water.js gzip cap (raised to 28500 B in this spec) covers the addition. Verify at build, including `check-shells`.
Lazy-loaded, absent from home first paint. Home tile count 1,182 -> 1,183.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 200 ft^2 for 800 GPM at 4
gpm/ft^2).

## 5. Roadmap position

Pairs the forward filter tile (`filter-loading`, rate from the area) with its inverse (the area for a rate), the two
halves of the filter-sizing question. Continues Explore sweep #12; further Group M water growth stays evidence-driven.
