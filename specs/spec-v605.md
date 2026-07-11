# roughlogic.com Specification v605 -- Tanker Shuttle Fill-Site-Limited Fleet Size (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, the fire-ground engineering bench); no new module, group, or dependency. Inherits spec.md through
> spec-v604.md.
>
> **The gap, and the evidence for it.** Spec-v580 (`tanker-shuttle-flow`) names this tile as a deliberate follow-on:
> "a fill-site-limited maximum-fleet-size solver," and both it and `tanker-shuttle-cycle` (spec-v599) warn that "an
> extra tanker adds nothing if the fill pump cannot turn it around" -- but neither says **how many tankers is enough.**
> That is the question an incident commander asks when calling for mutual-aid tankers: past some fleet size the water
> supply stops climbing, because the bottleneck is the slowest fixed site (the fill pump or the dump), not the number
> of trucks. A tanker's whole cycle is fill plus dump plus the round-trip drive, but the fill site can only service
> **one tanker every fill time**, so the sustainable flow caps at the tank load over that service time no matter how
> many trucks are shuttling. The smallest fleet that reaches the cap is the cycle time over the bottleneck service
> time, rounded up; every tanker beyond that just queues at the fill site burning fuel. A 3,000-gallon operation
> filling and dumping at 1,000 gpm over a 2-mile haul needs **5 tankers to reach its 1,000-gpm fill-limited ceiling**,
> and a sixth adds nothing; slow the fill site to 500 gpm and **3 tankers** cap it at 500 gpm. The tile turns the
> vague "add more tankers" into the exact fleet the sites can actually feed, and flags the bottleneck to fix if more
> water is needed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The tank load is `L^3`
(gal), the fill and dump rates `L^3 T^-1` (gpm), the haul distance `L` (mi), the road speed `L T^-1` (mph); the fill,
dump, travel, and cycle times and the bottleneck service time are `T` (min), the fleet size `dimensionless`, and the
site-limited flow `L^3 T^-1` (gpm), all carried dimensionless to the parse-only lint alongside the `tanker-shuttle-flow`
sibling. The v18/v21 contract: any non-finite input, or a non-positive tank load, fill rate, dump rate, distance, or
speed returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the shuttle fleet-size relation by
name (IFSTA / NFPA 1142 rural water-supply practice, matching the `tanker-shuttle-flow` and `tanker-shuttle-cycle`
siblings); `editionNote` prints `fill_min = tank_gal / fill_gpm`, `dump_min = tank_gal / dump_gpm`,
`travel_min = 2 x distance_mi / speed_mph x 60`, `cycle_min = fill_min + dump_min + travel_min`,
`bottleneck_min = max(fill_min, dump_min)`, `fleet_for_max = ceil(cycle_min / bottleneck_min)`, and
`site_limited_flow_gpm = tank_gal / bottleneck_min`, and states that **the bottleneck is the slower of the two fixed
sites (fill or dump), the sustainable flow caps at the tank load over that service time no matter the fleet, every
tanker beyond the solved fleet queues and adds nothing, the tank load is the usable water moved (ISO ~90% of nominal),
and the fill-site capacity and the operation govern** -- a planning aid, not incident command.

## 2. The tile

### 2.1 `tanker-fleet-size` -- Fill-Site-Limited Fleet and Ceiling Flow

```
inputs:
  tank_gal        gal     usable water moved per trip (ISO ~90% of nominal)
  fill_gpm        gpm     fill-site pump rate
  dump_gpm        gpm     unload / dump rate at the scene
  distance_mi     mi      one-way haul, source to scene
  speed_mph       mph     average road speed

fill_min             = tank_gal / fill_gpm
dump_min             = tank_gal / dump_gpm
travel_min           = 2 x distance_mi / speed_mph x 60
cycle_min            = fill_min + dump_min + travel_min
bottleneck_min       = max(fill_min, dump_min)                       (the slower fixed site)
fleet_for_max        = ceil(cycle_min / bottleneck_min)              [tankers]
site_limited_flow_gpm = tank_gal / bottleneck_min                    [gpm]
```

**Pinned worked example (3,000-gal load, 1,000 gpm fill and dump, 2-mile haul at 35 mph).**
`fill = 3.0 min`, `dump = 3.0 min`, `travel = 6.86 min`, `cycle = 12.86 min`. The bottleneck is the 3.0-min fill,
so `fleet_for_max = ceil(12.86 / 3.0) = ceil(4.29) = ` **5 tankers**, which reach the
`site_limited_flow = 3,000 / 3.0 = ` **1,000 gpm** ceiling -- a sixth tanker just queues at the fill site.
**Cross-check (a slow fill site halves both).** 3,000-gal load, 500 gpm fill, 1,000 gpm dump, same haul:
`fill = 6.0 min` now the bottleneck, `cycle = 15.86 min`, so `fleet_for_max = ceil(15.86 / 6.0) = ceil(2.64) = `
**3 tankers** capped at `3,000 / 6.0 = ` **500 gpm** -- half the fleet reaches half the flow, and the fix for more
water is a faster fill site, not more trucks.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`, placed inside the Group F comment block after
`tanker-shuttle-cycle` -- the `citations.test.js` **Group F audit count bumps 34 -> 35**); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`tanker-fleet-size` -> `computeTankerFleetSize` in `../../calc-fire.js`);
`scripts/related-tiles.mjs` (-> `tanker-shuttle-flow` / `tanker-shuttle-cycle` / `nfpa-1142-water-supply`);
`data/search/aliases.json` ("tanker fleet size", "how many tankers", "water shuttle fleet", "fill site limit",
"tanker bottleneck", plus question rows); the id appended to the calc-fire declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the bottleneck selection, the ceiling flow, and the error seams (non-finite, non-positive tank / fill /
dump / distance / speed). Renderer hand-written mirroring `tanker-shuttle-cycle` (`makeNumber` / `makeOutputLine`).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group F audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 3,000-gal example
-> 5 tankers / 1,000 gpm).

## 5. Roadmap position

Completes the rural water-shuttle trio spec-v580 opened: `tanker-shuttle-cycle` (the cycle time), `tanker-shuttle-flow`
(the fleet flow), and this solver (the fleet the sites can feed). No further shuttle follow-on is named; further Group
F growth stays evidence-driven.
