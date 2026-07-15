# roughlogic.com Specification v810 -- Dozer Slot / Blade Production Rate (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v809.md. Construction-equipment production sweep
> (entry 2), beside `haul-cycle-production` and the new `loader-production` (spec-v809).
>
> **The gap, and the evidence for it.** The catalog has no dozer production tile (`dozer`, `blade`, `push` all miss). A
> dozer's output is push-distance-driven -- unlike a loader it re-handles the same blade load over a travel path, so its
> cycle is push time plus return time plus a fixed gear-shift time, and production falls off fast as the push lengthens.
> The number this settles: a large dozer moving an 8 lcy blade on a 100 ft push runs about **500 loose cy/hr**, but
> doubling the push to 200 ft roughly halves it to **258 loose cy/hr** -- the reason dozing is a short-haul tool.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`loader-production`, `haul-cycle-production`): the blade capacity carries `L^3`, the push distance
`L`, both speeds `L T^-1`, every time is `T`, cycles-per-hour is dimensionless, and the production is a volume-rate
`L^3 T^-1` (the "per hour" is implicit, matching the earthwork production convention). The v18/v21 contract: a non-finite
or non-positive blade capacity, push distance, either speed, or working-minutes returns `{ error }`; a non-finite or
negative fixed time returns `{ error }`. Citation discipline (v19/v22): the Caterpillar Performance Handbook slot-dozing
cycle-time production method by name (cycle = push/push-speed + push/return-speed + fixed; production = blade x cycles/hr),
`GOVERNANCE.general`; the note states that the SAE J1265 blade capacity is manufacturer-rated, that grade helps or hurts
(a downhill push boosts the blade load, an uphill push cuts it), that the 50-minute hour is a planning default and not a
guarantee, and that the loose yards convert back to bank (earned) quantity through `soil-swell-shrink`.

## 2. The tile

### 2.1 `dozer-production` -- Dozer Slot / Blade Production Rate

```
inputs:
  blade_cap_lcy      heaped blade capacity (loose cy)
  push_dist_ft       one-way push distance (ft)
  push_speed_fpm     loaded push speed (ft/min)
  return_speed_fpm   empty return speed (ft/min)
  fixed_min          fixed gear-shift/maneuver time (min, default 0.05)
  eff_min_per_hr     working minutes per hour (default 50)

cycle_min         = push_dist_ft/push_speed_fpm + push_dist_ft/return_speed_fpm + fixed_min
cycles_per_hour   = eff_min_per_hr / cycle_min
production_lcy_hr = blade_cap_lcy * cycles_per_hour
```

**Pinned worked example.** Blade 8 lcy, push 100 ft at 200 ft/min, return 400 ft/min, fixed 0.05 min, 50-minute hour:
`push = 100/200 = 0.50`, `return = 100/400 = 0.25`, `cycle = 0.50 + 0.25 + 0.05 = ` **0.80 min**;
`cycles = 50 / 0.80 = ` **62.5/hr**; `production = 8 * 62.5 = ` **500 lcy/hr**. Cross-check: doubling the push to 200 ft
gives `cycle = 1.00 + 0.50 + 0.05 = 1.55 min`, `cycles = 50/1.55 = 32.26/hr`, and **258.1 lcy/hr** -- push distance is
the variable that governs, which is why long moves belong to scrapers and trucks, not a dozer.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block beside
`loader-production`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (cycle + blade x cycles/hr, Caterpillar Performance Handbook slot-dozing method by name,
`GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example plus the doubled-push cross-check);
`test/fixtures/compute-map.js` (`dozer-production` -> `computeDozerProduction`, module `../../calc-earthwork.js`);
`scripts/related-tiles.mjs` (-> `loader-production` / `haul-cycle-production` / `soil-swell-shrink`);
`data/search/aliases.json` (5 collision-checked aliases: "dozer production rate", "bulldozer blade production",
"slot dozing loose cy per hour", "dozer push production", "blade cycle production"); a hand-written renderer in the
`EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the
id added to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the cycle time, cycles/hr, the loose-yard
production, and the error seams (non-positive blade, push distance, either speed, working-minutes; negative fixed time). The
calc-earthwork.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,258 -> 1,259.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(8 * (50 / (100/200 + 100/400 + 0.05)) -> 500 lcy/hr).

## 5. Roadmap position

Second tile in the construction-equipment production vein (after `loader-production`): the push-distance-driven machine
that complements the loader's fixed-cycle output and the truck's haul cycle. Next candidate in the same vein: scraper
cycle production (load/haul/dump/return over long hauls). Serves the earthwork estimator (construction) and grading crew
(surveying). Loose yards tie back to bank quantity through `soil-swell-shrink`.
