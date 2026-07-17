# roughlogic.com Specification v811 -- Asphalt Paver Speed and Production Rate (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,259 -> 1,260 tiles), via the
> `_simpleRenderer` factory beside `asphalt-tonnage` in calc-construction.js. Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v810.md. Construction-equipment production sweep
> (entry 3), beside the existing `asphalt-tonnage` takeoff tile.
>
> **The gap, and the evidence for it.** `asphalt-tonnage` gives the mat quantity (a takeoff) but nothing gives the paving
> **production rate** -- the tons per hour a paver lays at a given forward speed, and the lane-feet per hour that sets the
> day's output. Grep confirmed no paver speed / paving production tile. The number this settles: a 12 ft screed laying a
> 2 in mat at 20 ft/min consumes about **145 tons/hr** of mix and covers **1,000 lane-ft/hr**, so an 8-hour day places
> roughly **1,160 tons** over **8,000 lane-ft** -- the figure that sizes the plant delivery and truck rotation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
construction siblings (`asphalt-tonnage`, `coating-coverage-dft`): the paver speed carries `L T^-1`, the mat width `L`,
the depth `L`, the compacted density `M L^-3`, the working-minutes and day-hours `T`, and both hourly figures are rates
(`M T^-1` tons/hr, `L T^-1` lane-ft/hr) with the "per hour" implicit, matching the earthwork production convention. The
v18/v21 contract: a non-finite or non-positive speed, width, depth, density, working-minutes, or day-hours returns
`{ error }`. Citation discipline (v19/v22): the paving production identity by name (tons/hr = speed x width x depth x
density over the ton), `GOVERNANCE.general`; the note states that the compacted HMA density (typically ~145 pcf for dense
dense-graded mix) and the laydown temperature govern the real tonnage, that the 50-minute hour is a planning default and
not a guarantee, and that to keep the paver moving without starving or waiting the required speed is the plant delivery
rate divided by the tons per lane-foot.

## 2. The tile

### 2.1 `asphalt-paving-speed` -- Asphalt Paver Speed and Production Rate

```
inputs:
  speed_fpm       paver forward speed (ft/min)
  width_ft        mat / screed width (ft)
  depth_in        compacted mat thickness (in)
  density_pcf     compacted HMA unit weight (pcf, default 145)
  eff_min_per_hr  working minutes per hour (default 50)
  hours_per_day   productive hours per day (default 8)

tons_per_hour    = speed_fpm * eff_min_per_hr * width_ft * (depth_in/12) * density_pcf / 2000
lane_ft_per_hour = speed_fpm * eff_min_per_hr
daily_tons       = tons_per_hour * hours_per_day
daily_lane_ft    = lane_ft_per_hour * hours_per_day
```

**Pinned worked example.** Speed 20 ft/min, width 12 ft, depth 2 in, density 145 pcf, 50-minute hour, 8-hour day:
`tons/hr = 20 * 50 * 12 * (2/12) * 145 / 2000 = ` **145 tons/hr**; `lane-ft/hr = 20 * 50 = ` **1,000 ft/hr**;
`daily = 145 * 8 = ` **1,160 tons** over `1,000 * 8 = ` **8,000 lane-ft**. Cross-check: to feed a plant delivering
200 tons/hr the paver must run `200 / (145/1000 tons per lane-ft) / 50 = ` **27.6 ft/min** -- above that the hopper
starves, below it the trucks stack up.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, inside the `// Group E` construction block beside
`asphalt-tonnage`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (tons/hr = speed x width x depth x density over the ton, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the plant-match cross-check); `test/fixtures/compute-map.js`
(`asphalt-paving-speed` -> `computeAsphaltPavingSpeed`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `asphalt-tonnage` / `aggregate` / `haul-cycle-production`); `data/search/aliases.json` (5 collision-checked aliases:
"asphalt paving speed", "paver production rate", "tons per hour paving", "lane feet per hour paver", "hma laydown rate");
a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `asphalt-tonnage` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the tons/hr, lane-ft/hr, the daily figures, and the error seams (non-positive speed, width, depth, density, working-minutes,
day-hours). The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,259 -> 1,260.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20 * 50 * 12 * (2/12) * 145 / 2000 -> 145 tons/hr).

## 5. Roadmap position

Third tile in the construction-equipment production vein: the paving-crew production rate that pairs the `asphalt-tonnage`
takeoff with the plant delivery and truck rotation. Serves the paving contractor (construction / carpentry). Next
candidates in the same vein: tack-coat quantity and roller (compaction) coverage. Stays evidence-driven.
