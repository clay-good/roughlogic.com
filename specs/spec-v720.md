# roughlogic.com Specification v720 -- Basic Wind Speed from Velocity Pressure (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E), no new module, group, or dependency. Inherits spec.md through spec-v719.md. Closes the sweep-10 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `wind-pressure` tile runs ASCE 7 forward: from a basic wind speed
> it returns the base velocity pressure `q = 0.00256 V^2` (before the Kz/Kzt/Kd/G/Cp factors). The check question is the
> inverse -- **the equivalent basic wind speed behind a bare velocity pressure**. Solving `q = 0.00256 V^2` for V gives
> `V = sqrt(q / 0.00256)`. The number this settles: a **25-psf** velocity pressure corresponds to a **~98.8 mph** basic
> wind speed. To keep it unambiguous the tile inverts the VELOCITY pressure only, not a Cp-loaded design surface pressure.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`wind-pressure` sibling: the velocity pressure is `M L^-1 T^-2` (psf) and the returned wind speed is `L T^-1` (mph). The
v18/v21 contract: any non-finite input or a non-positive velocity pressure returns `{ error }`. Citation discipline
(v19/v22): the ASCE 7 base velocity pressure solved for V, `GOVERNANCE.structural` matching the sibling; the note is
explicit that **the input is the BARE velocity pressure q, not a Cp-loaded design surface pressure -- to work back from a
component/cladding or MWFRS design pressure, first divide out the exposure/height Kz, topographic Kzt, directionality Kd,
gust G, and pressure Cp factors to recover q -- and ASCE 7 and the engineer of record govern**.

## 2. The tile

### 2.1 `wind-speed-from-velocity-pressure` -- Basic Wind Speed from Velocity Pressure

```
inputs:
  velocity_pressure_psf   M L^-1 T^-2   bare velocity pressure q (> 0)

wind_speed_mph = sqrt( velocity_pressure_psf / 0.00256 )
```

**Pinned worked example.** q = 25 psf: `V = sqrt(25 / 0.00256) = sqrt(9,765.6) = ` **98.8 mph**; feeding 98.8 mph back
through `wind-pressure` returns a 25-psf base velocity pressure `q_psf`, the input. A higher velocity pressure implies a
higher wind speed (60 psf -> ~153 mph).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`) placed beside `wind-pressure` (Group E is un-audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (base velocity pressure solved for V, `GOVERNANCE.structural`
matching the sibling, with the bare-q framing); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`wind-speed-from-velocity-pressure` -> `computeWindSpeedFromVelocityPressure`);
`scripts/related-tiles.mjs` (-> `wind-pressure` / `snow-load` / `wind-on-load`); `data/search/aliases.json` (5
collision-checked question aliases: "wind speed from velocity pressure", "what wind speed gives 25 psf", ...); the
calc-construction `CONSTRUCTION_RENDERERS` map entry via a hand-written NON-exported single-input renderer (kept
un-exported so it is not a corpus function needing fuzzer-sentinel coverage, unlike the exported `renderWindPressure`) and
the id added to the calc-construction declare list in `app.js` (no data-shard mapping -- this is a pure formula); the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeWindPressure`'s base q across a
velocity-pressure sweep, the higher-q-higher-speed monotonicity, and the error seams. The calc-construction.js gzip cap is
expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from home first paint. Home tile count
1,168 -> 1,169.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 98.8 mph for a 25-psf
velocity pressure).

## 5. Roadmap position

Pairs the forward wind-pressure tile (`wind-pressure`, q from a wind speed) with its inverse (wind speed from q), the two
halves of the velocity-pressure question, and closes the sweep-10 inverse queue. Further Group E construction growth stays
evidence-driven.
