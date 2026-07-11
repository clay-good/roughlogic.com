# roughlogic.com Specification v599 -- Tanker Shuttle Cycle Time (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, the fire-ground engineering bench); no new module, group, or dependency. Inherits spec.md through
> spec-v598.md.
>
> **The gap, and the evidence for it.** Spec-v580 (`tanker-shuttle-flow`) names this tile as a deliberate follow-on:
> "a cycle-time builder (fill + dump + travel from distance and speed)." The shuttle-flow tile takes the cycle time as
> a given input and warns that the fleet flow is capped by it -- but it never builds that number, so the operator has
> to guess the one figure the whole rural water supply hinges on. The cycle is the round-trip a single tanker makes:
> **fill at the source, drive to the scene, dump into the portable tank or pumper, drive back.** Each piece is simple
> arithmetic -- fill time is the load divided by the fill-site pump rate, dump time is the load divided by the unload
> rate, and the travel is the one-way distance over the road speed, doubled for the round trip -- but techs routinely
> forget the dump time or count only one direction of travel, and either error understates the cycle and oversizes the
> sustainable flow. A 3,000-gallon tanker filling and dumping at 1,000 gpm over a 2-mile haul at 35 mph runs a
> **12.9-minute cycle** and sustains only about **233 gpm** by itself. The tile builds that cycle from the four field
> measurements and hands it straight to `tanker-shuttle-flow` for the fleet flow.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The tank load is `L^3`
(gal), the fill and dump rates `L^3 T^-1` (gpm), the haul distance `L` (mi), the road speed `L T^-1` (mph); the fill,
dump, travel, and cycle times are `T` (min) and the single-tanker sustained flow `L^3 T^-1` (gpm), all carried
dimensionless to the parse-only lint alongside the `tanker-shuttle-flow` sibling. The v18/v21 contract: any non-finite
input, or a non-positive tank load, fill rate, dump rate, distance, or speed returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the shuttle cycle-time relation by name (IFSTA / NFPA 1142 rural water-supply
practice, matching the `tanker-shuttle-flow` sibling); `editionNote` prints `fill_min = tank_gal / fill_gpm`,
`dump_min = tank_gal / dump_gpm`, `travel_min = 2 x distance_mi / speed_mph x 60`,
`cycle_min = fill_min + dump_min + travel_min`, and `single_tanker_gpm = tank_gal / cycle_min`, and states that **the
travel is the round trip (both directions), the tank load is the usable water actually moved (ISO credits about 90% of
nominal -- use that here), fill and dump rates are the site-limited rates not the pump nameplate, and this cycle feeds
`tanker-shuttle-flow` for the fleet flow; the fill-site capacity and the operation govern** -- a planning aid, not
incident command.

## 2. The tile

### 2.1 `tanker-shuttle-cycle` -- Round-Trip Cycle Time From Fill, Dump, and Haul

```
inputs:
  tank_gal        gal     usable water moved per trip (ISO ~90% of nominal)
  fill_gpm        gpm     fill-site pump rate
  dump_gpm        gpm     unload / dump rate at the scene
  distance_mi     mi      one-way haul, source to scene
  speed_mph       mph     average road speed

fill_min          = tank_gal / fill_gpm                       [min]
dump_min          = tank_gal / dump_gpm                       [min]
travel_min        = 2 x distance_mi / speed_mph x 60          [min]  (round trip)
cycle_min         = fill_min + dump_min + travel_min          [min]
single_tanker_gpm = tank_gal / cycle_min                      [gpm]
```

**Pinned worked example (3,000-gal load, 1,000 gpm fill and dump, 2-mile haul at 35 mph).**
`fill = 3,000 / 1,000 = 3.0 min`, `dump = 3.0 min`, `travel = 2 x 2 / 35 x 60 = ` **6.86 min** round trip, so
`cycle = 3 + 3 + 6.86 = ` **12.86 min** and one tanker sustains `3,000 / 12.86 = ` **233 gpm** on its own -- which is
why rural supply needs a fleet, and why the number goes straight into `tanker-shuttle-flow`. **Cross-check (a bigger
tanker with a slow fill site).** 5,000-gal load, 750 gpm fill, 1,500 gpm dump, 3-mile haul at 40 mph:
`fill = 6.67 min`, `dump = 3.33 min`, `travel = 2 x 3 / 40 x 60 = 9.0 min`, `cycle = ` **19.0 min**,
`single = 5,000 / 19 = ` **263 gpm** -- the slow fill site, not the tank size, dominates the cycle, exactly the
bottleneck the shuttle-flow tile warns about.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`, placed inside the Group F comment block after
`tanker-shuttle-flow` -- the `citations.test.js` **Group F audit count bumps 32 -> 33**); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`tanker-shuttle-cycle` -> `computeTankerShuttleCycle` in
`../../calc-fire.js`); `scripts/related-tiles.mjs` (-> `tanker-shuttle-flow` / `water-supply-duration` /
`nfpa-1142-water-supply`); `data/search/aliases.json` ("shuttle cycle time", "tanker cycle", "fill dump travel time",
"water shuttle cycle", "tanker turnaround", plus question rows); the id appended to the calc-fire declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the round-trip doubling, the fill-site sensitivity, and the error
seams (non-finite, non-positive tank / fill / dump / distance / speed). Renderer hand-written mirroring the
`tanker-shuttle-flow` pattern (`makeNumber` / `makeOutputLine`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group F audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 3,000-gal example
-> 12.86 min cycle / 233 gpm).

## 5. Roadmap position

Builds the cycle time `tanker-shuttle-flow` requires, closing the rural-supply chain with `water-supply-duration` and
`nfpa-1142-water-supply`. The v580-named fill-site-limited maximum-fleet-size solver remains a deliberate future
follow-on. Further Group F growth stays evidence-driven.
