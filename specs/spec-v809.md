# roughlogic.com Specification v809 -- Wheel-Loader / Excavator Bucket Production Rate (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v808.md. Construction-equipment production sweep
> (entry 1), beside the existing `haul-cycle-production` tile.
>
> **The gap, and the evidence for it.** The catalog matches trucks to a loader (`haul-cycle-production`) but never gives
> the **loader's own bench production** -- the loose-yards-per-hour a wheel loader or excavator digs and dumps, which is
> the number the fleet match silently assumes. Grep confirmed no loader / excavator / bucket production tile (`loader`,
> `excavator`, `dozer`, `bucket` all miss). The number this settles: a 3.5 cy bucket at a 0.95 fill factor on a half-minute
> cycle produces about **332 loose cy/hr**, or **2,660 loose cy** in an 8-hour day -- the figure that tells the estimator
> whether the loader or the haul road is the bottleneck.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`haul-cycle-production`, `soil-swell-shrink`): the bucket capacity carries `L^3`, the fill factor and
cycles-per-hour are dimensionless, every time is `T`, and both production figures are volume-rates `L^3 T^-1` (the "per
hour"/"per day" is implicit, matching the `haul-cycle-production` dims convention). The v18/v21 contract: a non-finite or
non-positive bucket capacity, cycle time, working-minutes, or hours returns `{ error }`; a non-finite or non-positive fill
factor returns `{ error }`. Citation discipline (v19/v22): the Caterpillar Performance Handbook cycle-time production
method by name (production = bucket payload x cycles per hour), `GOVERNANCE.general`; the note states that the
manufacturer's rated bucket capacity, the operator's fill factor, and the machine's rated cycle time govern the answer,
that the 50-minute hour is a planning default (real-world delays) and not a guarantee, and that the loose yards convert
back to bank (earned) quantity through `soil-swell-shrink`.

## 2. The tile

### 2.1 `loader-production` -- Wheel-Loader / Excavator Bucket Production Rate

```
inputs:
  bucket_cap_lcy    heaped bucket capacity (loose cy)
  fill_factor       bucket fill factor (dimensionless, default 0.95)
  cycle_min         one dig-dump cycle time (min)
  eff_min_per_hr    working minutes per hour (default 50)
  hours_per_day     productive hours per day (default 8)

bucket_payload_lcy = bucket_cap_lcy * fill_factor
cycles_per_hour    = eff_min_per_hr / cycle_min
production_lcy_hr  = bucket_payload_lcy * cycles_per_hour
daily_lcy          = production_lcy_hr * hours_per_day
```

**Pinned worked example.** Bucket 3.5 lcy, fill factor 0.95, cycle 0.50 min, 50-minute hour, 8-hour day:
`payload = 3.5 * 0.95 = ` **3.325 lcy**; `cycles = 50 / 0.50 = ` **100/hr**; `production = 3.325 * 100 = ` **332.5 lcy/hr**;
`daily = 332.5 * 8 = ` **2,660 lcy**. Cross-check: a longer 0.60 min cycle (soft floor, long tram) drops it to
`50 / 0.60 = 83.33` cycles/hr and **277.1 lcy/hr** -- cycle time, which grows with travel and dig conditions, is the
variable that moves the answer.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block beside
`haul-cycle-production`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (production = payload x cycles/hr, Caterpillar Performance Handbook method by name, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the longer-cycle cross-check); `test/fixtures/compute-map.js`
(`loader-production` -> `computeLoaderProduction`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs`
(-> `haul-cycle-production` / `soil-swell-shrink` / `relative-compaction`); `data/search/aliases.json` (5
collision-checked aliases: "loader production rate", "excavator bucket production", "bank yards per hour loader",
"bucket loads per hour", "loose cy per hour excavator"); a hand-written renderer in the `EARTHWORK_RENDERERS` map
mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the payload, cycles/hr, the loose-yard production,
the daily figure, and the error seams (non-positive bucket, cycle, fill factor, working-minutes). The calc-earthwork.js
gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,257 -> 1,258.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(3.5 * 0.95 * (50 / 0.50) -> 332.5 lcy/hr).

## 5. Roadmap position

Opens the construction-equipment production vein beside the haul-side `haul-cycle-production`: this is the load-side
counterpart the fleet match assumes, serving the earthwork estimator (construction) and the grading crew (surveying).
Next candidates in the same vein: dozer blade production and scraper cycle production, each a distinct standard formula.
Stays evidence-driven; the loose yards tie back to bank quantity through `soil-swell-shrink`.
