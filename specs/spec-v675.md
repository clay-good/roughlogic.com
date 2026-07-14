# roughlogic.com Specification v675 -- Catchment Area for a Target Harvest (calc-cross.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`** (Group G,
> cross-trade / plumbing), no new module, group, or dependency. Inherits spec.md through spec-v674.md.
>
> **The gap, and the evidence for it.** The `rainwater-yield` tile runs the harvest form forward: given a roof area, it
> returns the annual gallons. The system-sizing question a plumber designing a rainwater system asks is the inverse --
> **how much roof do I need to harvest the volume I want**. The forward tile makes you guess areas and re-read the
> gallons; the inverse solves it directly. From `annual_gal = area x annual_in x 0.6233 x efficiency`,
> `area = target_gal / (annual_in x 0.6233 x efficiency)`. The number this settles: harvesting 11,593 gal a year where
> 30 in of rain falls, at 0.62 efficiency, needs about **1,000 ft^2**; a metal roof at 0.85 efficiency needs only
> **730 ft^2**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`rainwater-yield` sibling: the target harvest is `L^3` (gal), the annual rainfall is `L` (in), the efficiency is
`dimensionless`, and the returned area is `L^2` (ft^2). The `0.6233` gal-per-in-per-ft^2 conversion is the sibling's.
The v18/v21 contract: any non-finite input, or a non-positive target / rainfall, or an efficiency outside (0, 1],
returns `{ error }`. Citation discipline (v19/v22): the ARCSA harvest form solved for area, with NOAA precipitation data,
by name and `GOVERNANCE.plumbing` matching the sibling; the note states that **the 0.6233 converts rain to gallons,
efficiency accounts for first-flush and splash losses (about 0.62 sloped shingle to 0.85 metal), the area is the
horizontal footprint not the sloped surface, and this is a planning estimate -- local rainfall records, the storage tank
size, and the demand pattern govern the real system**.

## 2. The tile

### 2.1 `rainwater-catchment-area` -- Catchment Area for a Target Harvest

```
inputs:
  target_annual_gal   gal   target annual harvest (> 0)
  annual_in           in    annual rainfall (> 0)
  efficiency          -     collection efficiency 0-1 (default 0.62)

catchment_ft2 = target_annual_gal / (annual_in x 0.6233 x efficiency)   [ft^2]
```

**Pinned worked example (a sloped shingle roof).** target = 11,593 gal, annual = 30 in, efficiency = 0.62:
`area = 11593 / (30 x 0.6233 x 0.62) = 11593 / 11.59 = ` **1,000 ft^2**; feeding 1,000 ft^2 back through
`rainwater-yield` returns 11,593 gal, the input. **Cross-check (a metal roof).** Same target and rainfall at efficiency
0.85: `area = 11593 / (30 x 0.6233 x 0.85) = ` **729 ft^2** -- the higher-efficiency roof harvests the same volume from
about 27% less footprint.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["plumbing"]`, beside `rainwater-yield`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (ARCSA harvest form solved for area, `GOVERNANCE.plumbing` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`rainwater-catchment-area` ->
`computeRainwaterCatchmentArea` in `../../calc-cross.js`); `scripts/related-tiles.mjs` (-> `rainwater-yield` /
`stormwater-rational` / `roof-drain-sizing`, and the forward tile links back); `data/search/aliases.json` ("catchment
area for a target harvest", "how much roof to collect rainwater", "roof size for cistern", plus adjacent rows); the
calc-cross RENDERERS map entry `"rainwater-catchment-area": renderRainwaterCatchmentArea` via a hand-written renderer
(the module's `_mnG` / `_moG` / `_aeG` / `_debG` / `_fmtG` helpers, mirroring `rainwater-yield`) and the id added to the
calc-cross declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the round-trip through
`computeRainwaterYield`, and the error seams. Because `rainwater-yield` sits INSIDE the parsed `// Group G:
Cross-Trade`..`// Group H:` block, whose audit-coverage test asserts an exact id count, the Group G count in
`citations.test.js` is bumped 31 -> 32 (the only count edit this batch); the explicit governance test that checks
`rainwater-yield` uses plumbing is unaffected (this tile is not on that list, and uses plumbing for consistency). The
calc-cross.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block, the Group G count bump); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> ~1,000 ft^2 for
11,593 gal at 30 in / 0.62).

## 5. Roadmap position

Pairs the forward harvest tile (`rainwater-yield`, gallons from area) with its inverse (area from a target harvest), the
two halves of the rainwater-system sizing question. Further Group G growth stays evidence-driven.
