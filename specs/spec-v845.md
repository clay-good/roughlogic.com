# roughlogic.com Specification v845 -- Dump Truck Governing Payload and Load Count (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v844.md. Site-logistics sweep, beside
> `haul-cycle-production` and the production tiles.
>
> **The gap, and the evidence for it.** `haul-cycle-production` times a truck but nothing works out its **governing
> payload** -- whether the box volume or the legal weight limit fills the truck first -- or the resulting load count. Grep
> confirmed no dump-truck-loads / payload tile. The number this settles: 625 loose cy in 12 cy boxes is **53 loads** when
> the box governs, but haul wet, heavy material and the 40,000 lb weight limit caps each truck at 11 cy -- **57 loads** --
> and loading to the box would put every truck over legal weight.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`haul-cycle-production`, `soil-swell-shrink`): the total and box volumes carry `L^3`, the weight limit
is a force `M L T^-2`, the material density is a weight-density `M L^-2 T^-2` (lb per loose cy), the governing payload is
`L^3`, and the load count is dimensionless. The v18/v21 contract: a non-finite or non-positive total volume, box volume,
weight limit, or material density returns `{ error }`. Citation discipline (v19/v22): the governing-payload identity by
name (weight-limited volume = weight limit / density; payload = min(weight-limited, box); loads = ceil(total / payload)),
`GOVERNANCE.general`; the note states that the box heaped capacity comes from the truck, that the legal payload comes from
the axle and GVW limits, that weight governs heavy material (wet clay, rock) while volume governs light material (wood
chips, dry loam), and that this pairs with `haul-cycle-production` for the cycle time.

## 2. The tile

### 2.1 `dump-truck-loads` -- Dump Truck Governing Payload and Load Count

```
inputs:
  total_lcy                  total loose volume to haul (cy)
  box_vol_cy                 heaped box capacity (cy, default 12)
  weight_limit_lb            legal payload weight limit (lb, default 40000)
  material_density_lb_per_lcy loose material density (lb/cy, default 2800)

weight_limited_cy = weight_limit_lb / material_density_lb_per_lcy
payload_cy        = min(weight_limited_cy, box_vol_cy)
governs           = weight_limited_cy < box_vol_cy ? "weight" : "volume"
loads             = ceil(total_lcy / payload_cy)
```

**Pinned worked example.** Total 625 lcy, box 12 cy, weight limit 40,000 lb, density 2,800 lb/cy:
`weight-limited = 40000/2800 = ` **14.29 cy** > 12, so `payload = ` **12 cy** (**volume** governs); `loads = ceil(625/12) = `
**53**. Cross-check: hauling wet material at 3,600 lb/cy, `weight-limited = 40000/3600 = ` **11.11 cy** < 12, so weight
governs and `loads = ceil(625/11.11) = ` **57** -- the same dirt, four more loads, because it is heavy.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "trucking"]`, inside the `// Group E` earthwork block near
`haul-cycle-production`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (payload = min(weight limit/density, box); loads = ceil(total/payload), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned volume-governs example plus the weight-governs cross-check);
`test/fixtures/compute-map.js` (`dump-truck-loads` -> `computeDumpTruckLoads`, module `../../calc-earthwork.js`);
`scripts/related-tiles.mjs` (-> `haul-cycle-production` / `soil-swell-shrink` / `haul-road-resistance`);
`data/search/aliases.json` (5 collision-checked aliases: "dump truck loads", "truck payload governing", "weight vs volume
payload", "haul load count", "truck load count"); a hand-written renderer in the `EARTHWORK_RENDERERS` map mirroring
`_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id added to the calc-earthwork declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the weight-limited volume, the governing payload and label, the
load count (both governing cases), and the error seams (non-positive total, box, weight limit, density). The
calc-earthwork.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,293 -> 1,294.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(min(40000/2800, 12) -> 12 cy, ceil(625/12) -> 53 loads).

## 5. Roadmap position

Site-logistics tile beside `haul-cycle-production` (time) and `haul-road-resistance` (rimpull): the governing payload that
turns loose yards into a truck count, serving the estimator and dispatcher (construction / trucking). Stays evidence-driven;
the axle limits govern the weight.
