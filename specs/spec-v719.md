# roughlogic.com Specification v719 -- Max Wind Speed Before a Load's Swing Limit (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`** (Group Z),
> no new module, group, or dependency. Inherits spec.md through spec-v718.md. Sweep-10 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `wind-on-load` tile runs the swing relation forward: from a wind
> speed it returns the lateral force and swing angle on a suspended load. The in-service shutdown question is the inverse
> -- **the wind speed at which the load reaches a maximum allowable swing**. From `swing = atan(wind_lb / weight)` and
> `wind_lb = 0.00256 V^2 x area x shape`, `V = sqrt( weight x tan(swing) / (0.00256 x area x shape) )`. The number this
> settles: a **4,000-lb** load with **200 ft^2** of sail reaches a **5-degree** swing at **~20.7 mph**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the `wind-on-load`
sibling: the weight and lateral force are `M L T^-2` (lb), the sail area is `L^2`, the returned wind speed is `L T^-1`
(mph), and the swing angle and shape coefficient are dimensionless. The v18/v21 contract: any non-finite input, a swing
angle outside (0, 90) degrees, or a non-positive weight, sail area, or shape coefficient returns `{ error }`. Citation
discipline (v19/v22): the swing relation solved for the wind speed, `GOVERNANCE.rigging` matching the sibling, citing the
ASCE 7 velocity-pressure constant and OSHA 1926 Subpart CC; the note states that **large-area, light loads reach the swing
limit at low wind and are the most dangerous, this is a planning estimate off the sustained wind and the projected sail
area, gusts exceed the sustained number, a tag-line crew controls the rest, and the manufacturer's maximum permissible
in-service wind speed and the load chart govern -- many large lifts shut down well below storm wind**.

## 2. The tile

### 2.1 `max-wind-speed-for-lift` -- Max Wind Speed Before a Load's Swing Limit

```
inputs:
  max_swing_deg    dimensionless   allowable swing off vertical (over 0, under 90; default 5)
  load_weight_lb   M L T^-2        load weight (> 0)
  sail_area_ft2    L^2             projected sail area (> 0)
  shape_coef       dimensionless   shape coefficient (> 0, default 1.6)

wind_lb = load_weight_lb x tan(max_swing_deg)
max_wind_mph = sqrt( wind_lb / (0.00256 x sail_area_ft2 x shape_coef) )
```

**Pinned worked example.** swing = 5 deg, weight = 4,000 lb, area = 200 ft^2, shape = 1.6:
`wind_lb = 4000 x tan(5 deg) = 350 lb`, `V = sqrt(350 / (0.00256 x 200 x 1.6)) = sqrt(427.2) = ` **20.7 mph**; feeding
20.7 mph back through `wind-on-load` returns a 5-degree swing, the target. A lighter 1,000-lb load reaches the same swing
at only ~10.3 mph.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`) placed beside `wind-on-load` (Group Z is un-audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (swing relation solved for the wind speed, `GOVERNANCE.rigging`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`max-wind-speed-for-lift` -> `computeMaxWindSpeedForLift`); `scripts/related-tiles.mjs` (-> `wind-on-load` /
`tagline-force` / `crane-net-capacity` / `wind-pressure`); `data/search/aliases.json` (5 collision-checked question
aliases: "max wind speed to lift a panel", "when to stop lifting for wind", ...); the calc-rigging `RIGGING_RENDERERS` map
entry via a hand-written NON-exported renderer (four number fields; kept un-exported like the sibling renderers) and the
id added to the calc-rigging declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeWindOnLoad` across a swing/weight/area sweep, the lighter-load-lower-wind monotonicity, and the error seams
(including the swing-out-of-range guard). The calc-rigging.js gzip cap (raised to 26500 B in spec-v713) is expected to
hold. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,167 ->
1,168.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 20.7 mph for a 4,000-lb
load with 200 ft^2 of sail at a 5-degree swing cap).

## 5. Roadmap position

Pairs the forward wind tile (`wind-on-load`, swing from a wind speed) with its inverse (wind speed from a swing limit),
the two halves of the in-service-wind question. Further Group Z rigging growth stays evidence-driven.
