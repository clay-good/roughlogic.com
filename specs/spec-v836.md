# roughlogic.com Specification v836 -- Dust-Control Watering Volume and Truck Trips (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v835.md. Site-logistics sweep, pairing with
> `water-for-compaction` on water-truck work.
>
> **The gap, and the evidence for it.** Nothing sizes **dust-control watering** -- the gallons a water truck spreads on a
> haul road and the trips it takes to keep the fugitive-dust permit satisfied. Grep confirmed no dust / watering tile. The
> number this settles: a 2,000 ft by 20 ft haul road at half a gallon per square yard is **2,222 gallons** an application,
> one 4,000-gallon truck load, and at six passes a day that is about **13,300 gallons** and six trips -- the water budget
> and the truck's day.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`water-for-compaction`, `dewatering-rate`): the road length and width carry `L`, the application rate
is a volume-per-area (`L`), the truck capacity and gallon totals are `L^3`, the area is `L^2`, and the trip and
application counts are dimensionless. The v18/v21 contract: a non-finite or non-positive length, width, rate, truck
capacity, or applications-per-day returns `{ error }`. Citation discipline (v19/v22): the watering identity by name
(gallons = area / 9 x rate; trips = ceil(gallons / truck capacity)), `GOVERNANCE.general`; the note states that the
application rate (commonly around 0.5 gal/sy) and the frequency come from the site's fugitive-dust plan and the AHJ air
permit (entered here), that over-watering makes mud and tracks out while under-watering fails the permit, and that the
frequency climbs with wind and heat.

## 2. The tile

### 2.1 `dust-control-water` -- Dust-Control Watering Volume and Truck Trips

```
inputs:
  length_ft            watered area length (ft)
  width_ft             watered area width (ft)
  rate_gal_per_sy      application rate (gal/sy, default 0.5)
  truck_cap_gal        water truck capacity (gal, default 4000)
  applications_per_day passes per day (count, default 6)

area_sy       = length_ft * width_ft / 9
gal_per_app   = area_sy * rate_gal_per_sy
trips_per_app = ceil(gal_per_app / truck_cap_gal)
daily_gal     = gal_per_app * applications_per_day
daily_trips   = trips_per_app * applications_per_day
```

**Pinned worked example.** Road 2,000 ft x 20 ft, rate 0.5 gal/sy, 4,000-gal truck, 6 passes/day:
`area = 2000*20/9 = 4,444 sy`; `gal/app = 4444*0.5 = ` **2,222 gal**; `trips/app = ceil(2222/4000) = ` **1**;
`daily = 2222*6 = ` **13,333 gal** over **6 trips**. Cross-check: a hot windy day at 10 passes needs
`2222*10 = ` **22,220 gal/day** and 10 trips -- frequency, not area, drives the water budget once the road is set.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block near
`water-for-compaction`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (gallons = area/9 x rate; trips = ceil(gal/capacity), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the high-frequency cross-check); `test/fixtures/compute-map.js`
(`dust-control-water` -> `computeDustControlWater`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs`
(-> `water-for-compaction` / `dewatering-rate` / `haul-cycle-production`); `data/search/aliases.json` (5 collision-checked
aliases: "dust control water", "water truck dust", "haul road watering", "dust suppression gallons", "fugitive dust
watering"); a hand-written renderer in the `EARTHWORK_RENDERERS` map mirroring `_v67renderHaulCycleProduction`
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-earthwork declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the area, gallons per application, trips, daily gallons and trips, and the error
seams (non-positive length, width, rate, capacity, applications). The calc-earthwork.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,284 -> 1,285.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2000*20/9 * 0.5 -> 2,222 gal/app).

## 5. Roadmap position

Site-logistics tile pairing with `water-for-compaction` on water-truck work, serving the site crew (construction /
surveying). Stays evidence-driven; the dust plan sets the rate and frequency.
