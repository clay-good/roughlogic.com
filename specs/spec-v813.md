# roughlogic.com Specification v813 -- Roller Compaction Production Rate (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,260 -> 1,261 tiles; spec-v812
> not yet landed, so the anchored count differs from this spec's assumed 1,261 -> 1,262). Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v812.md. Construction-equipment production sweep
> (entry 4), beside `loader-production`, `dozer-production`, and the QA-side `relative-compaction`.
>
> **The gap, and the evidence for it.** The catalog checks compaction quality (`relative-compaction`, field density vs
> Proctor) but nothing gives the compaction **production rate** -- the compacted cubic yards per hour a roller turns out,
> which is what sizes the fill schedule and the number of rollers. Grep confirmed no roller / compaction production tile.
> The number this settles: a 7 ft drum at 3 mph over 6 passes covers about **13,860 sf/hr**, which on an 8 in lift is
> roughly **342 compacted cy/hr** -- and doubling the passes for a tighter spec halves it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`relative-compaction`, `haul-cycle-production`): the drum width and lift carry `L`, the speed
`L T^-1`, the passes and efficiency are dimensionless, both area rates are `L^2 T^-1`, and the compacted-volume rate is
`L^3 T^-1` (the "per hour" implicit). The v18/v21 contract: a non-finite or non-positive drum width, speed, lift, passes,
or efficiency returns `{ error }`. Citation discipline (v19/v22): the roller production identity by name -- compacted
cy/hr = 16.3 x width x speed x lift x efficiency / passes, where 16.3 = 5280 / (12 x 27) folds the mile, the inch, and
the cubic yard -- `GOVERNANCE.general`; the note states that the number of passes comes from a project test strip and the
spec density (not the formula), that the lift thickness is limited by the roller's ability to compact to the bottom of
the lift, that the 0.75 efficiency is a planning default, and that the surface-area rate is independent of lift thickness.

## 2. The tile

### 2.1 `compaction-roller-production` -- Roller Compaction Production Rate

```
inputs:
  drum_width_ft   compacting drum width (ft)
  speed_mph       roller speed (mph)
  lift_in         compacted lift thickness (in)
  passes          passes to reach spec density (from test strip)
  efficiency      job efficiency (dimensionless, default 0.75)

area_sf_hr         = drum_width_ft * speed_mph * 5280 * efficiency / passes
area_sy_hr         = area_sf_hr / 9
production_ccy_hr  = area_sf_hr * (lift_in/12) / 27
```

**Pinned worked example.** Drum 7 ft, speed 3 mph, lift 8 in, 6 passes, efficiency 0.75:
`area = 7 * 3 * 5280 * 0.75 / 6 = ` **13,860 sf/hr** (1,540 sy/hr); `production = 13,860 * (8/12) / 27 = ` **342 ccy/hr**.
The compact form `16.3 * 7 * 3 * 8 * 0.75 / 6` gives the same **342 compacted cy/hr**. Cross-check: a stiffer spec needing
12 passes halves the output to `13,860/2 = 6,930 sf/hr` and **171 ccy/hr** -- passes, set by the test strip, are the lever.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block beside
`relative-compaction`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (compacted cy/hr = 16.3 x width x speed x lift x efficiency / passes, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the doubled-passes cross-check); `test/fixtures/compute-map.js`
(`compaction-roller-production` -> `computeCompactionRollerProduction`, module `../../calc-earthwork.js`);
`scripts/related-tiles.mjs` (-> `relative-compaction` / `haul-cycle-production` / `loader-production`);
`data/search/aliases.json` (5 collision-checked aliases: "roller compaction production", "compactor production rate",
"compacted cy per hour", "roller coverage rate", "passes for compaction production"); a hand-written renderer in the
`EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the area rates, the compacted-volume
rate, and the error seams (non-positive width, speed, lift, passes, efficiency). The calc-earthwork.js gzip cap is watched
at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home
first paint. Home tile count 1,261 -> 1,262.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(16.3 * 7 * 3 * 8 * 0.75 / 6 -> 342 ccy/hr).

## 5. Roadmap position

Fourth tile in the construction-equipment production vein: the compaction-side production that closes the load-haul-place
loop (`loader-production`, `dozer-production`, `haul-cycle-production`) and complements the QA-side `relative-compaction`.
Serves the earthwork estimator (construction) and grading crew (surveying). Stays evidence-driven; the test strip governs
the passes.
