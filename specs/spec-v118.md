# roughlogic.com Specification v118 -- Hay Dry-Matter and Safe-Storage Weight (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED 2026-06-20 (package 0.70.0, catalog 676 -> 687 across spec-v112..v119).** In-scope catalog expansion under
> the spec-v106 charter: one agriculture tile from a first-principles moisture mass balance and
> public USDA / Cooperative Extension safe-storage guidance, producer governed, redo-not-harm. Adds
> one tile to **`calc-agriculture.js`** (Group L); no new module, group, or dependency. Inherits
> spec.md through spec-v117.md.
>
> **The gap, and the evidence for it.** Group L has feed-ration (`Pearson-Square Feed Ration`),
> stocking-rate, and grain-bin tiles but nothing that converts a bale's as-fed weight to dry matter
> or flags the moisture above which baled hay heats and molds. Dry-matter accounting and the
> safe-storage moisture threshold are everyday hay-season math.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Weights are `M`, moisture and fractions dimensionless. Bundled defaults (the 20 percent small-square
/ 18 percent large-package safe-storage thresholds) are annotated editable fields. The v18/v21
contract: any non-finite input, a non-positive bale weight, or a moisture percent outside [0, 100),
returns `{ error }`; the only division is by a guarded-positive (1 - target/100). Citation
discipline (v19/v22): `GOVERNANCE.general` over the dry-matter mass balance, with USDA NRCS /
Cooperative Extension hay safe-storage moisture guidance named; the producer governs.

## 2. The tile

### 2.1 `hay-dry-matter` -- Hay Dry-Matter and Safe-Storage Weight

```
inputs:
  bale_weight_lb      M              as-baled (as-fed) weight
  moisture_pct        dimensionless  measured moisture
  target_moisture_pct dimensionless  moisture to restate the weight at (default 15)
  safe_threshold_pct  dimensionless  safe-storage moisture ceiling (default 18 large / 20 small)

dry_matter_lb        = bale_weight_lb x (1 - moisture_pct/100)
weight_at_target_lb  = dry_matter_lb / (1 - target_moisture_pct/100)
flag: moisture_pct > safe_threshold_pct -> "heating/mold risk; do not store tight; consider preservative or further drying"
```

**Pinned worked example.** A 1,200 lb round bale at 22 percent moisture, target 15 percent, safe
ceiling 18: `dry_matter = 1200 x 0.78 = 936 lb`, `weight_at_15% = 936 / 0.85 = 1,101 lb`; flag set
(22 > 18 -> heating/mold risk). **Cross-check:** the same bale at 14 percent moisture -> dry matter
1,032 lb, no flag (14 <= 18). The thresholds are editable; the producer and local extension
guidance govern.

## 3. Wiring

A `tools-data.js` row (group `L`, trade `["agriculture"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, dry-matter balance, USDA NRCS / extension safe-storage
guidance named); worked-examples fixtures (example + cross-check); `compute-map.js`
(`hay-dry-matter` -> `computeHayDryMatter` in `../../calc-agriculture.js`); `related-tiles.mjs` (->
`pearson-square-feed-ration` / `grain-bin-capacity` / `livestock-water-requirement`);
`data/search/aliases.json` ("hay moisture", "dry matter", "bale weight moisture", "safe storage
hay", "forage dry matter"); the id appended to the existing `AGRICULTURE_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the example, cross-check, and error seams. Raise the `calc-agriculture.js` size cap
by ~20 percent if needed; bump the `citations.js` cap if needed. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` +1 tile);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `data:verify`; worked-examples runner; 320 px audit (the dry-matter and restated-weight
lines wrap); render-no-nan + a11y sweep, output read to the value (1,200 lb at 22% -> 936 lb DM,
1,101 lb at 15%).

## 5. Roadmap position

Adds dry-matter accounting and the safe-storage flag to the forage/feed family. Further Group L
growth stays evidence-driven.
