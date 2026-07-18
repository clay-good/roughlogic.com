# roughlogic.com Specification v973 -- Float-Method (Velocity-Area) Open-Channel Flow (calc-water.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M), no
> new module, group, or dependency. Inherits spec.md through spec-v972.md. Water/wastewater-operations sweep, beside the
> accepted `weir-flow` and `manning-pipe-capacity` tiles.
>
> **The gap, and the evidence for it.** The open-channel tiles are weir/flume, Manning, Froude -- none is the field
> float/velocity-area gauging estimate an operator makes with a stopwatch. Grep confirmed no float-method / velocity-area
> tile. The number this settles: a float running 20 ft in 10 s in a 4 ft x 1.5 ft channel gauges about **10.2 cfs**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing ft, s, and a coefficient), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive distance /
time / width / depth, or a coefficient outside (0,1] returns `{ error }`. Citation discipline (v19/v22): the float
(velocity-area) method by name, `GOVERNANCE.general`; the note states that C (~0.85, 0.8-0.9) converts the measured
SURFACE velocity to the lower MEAN velocity, that accuracy improves by averaging several runs in the fast thread and
surveying the real cross-section, and that this is a rough estimate -- a permit-compliance flow needs a calibrated device
and the metering standard and permit govern.

## 2. The tile

### 2.1 `float-method-flow` -- Float-Method (Velocity-Area) Open-Channel Flow

```
inputs:
  float_distance_ft float travel distance (ft), default 20
  travel_time_s     travel time (s), default 10
  channel_width_ft  channel width (ft), default 4
  mean_depth_ft     mean depth (ft), default 1.5
  float_coefficient surface-to-mean velocity coefficient C (0-1, ~0.85), default 0.85

surface_velocity_fps = float_distance_ft / travel_time_s
cross_area_ft2       = channel_width_ft x mean_depth_ft
flow_cfs             = float_coefficient x surface_velocity_fps x cross_area_ft2
flow_gpm             = flow_cfs x 448.831
```

**Pinned worked example.** 20 ft in 10 s, 4 ft wide, 1.5 ft deep, C 0.85: surface velocity = `20/10 = 2.0 ft/s`, area =
`4 x 1.5 = 6 ft^2`, flow = `0.85 x 2.0 x 6 = ` **10.2 cfs** (**4,578 gpm**). Cross-check: a rougher channel at **C 0.80**
cuts the flow to `0.80 x 2.0 x 6 = ` **9.6 cfs**.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water", "wastewater"]`, beside `dechlorination-dose`); a `tile-meta.js`
`_TILES` entry (`M`); a `citations.js` entry (float/velocity-area method, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the base example plus the rougher-channel cross-check, pinning the velocity and flow); `test/fixtures/
compute-map.js` (`float-method-flow` -> `computeFloatMethodFlow`, module `../../calc-water.js`); `scripts/related-
tiles.mjs` (-> `weir-flow` / `manning-pipe-capacity` / `detention-time`); `data/search/aliases.json` (5 collision-checked
aliases: "float method flow", "velocity area method", "open channel flow measurement", "ditch flow", "stream gauging
float"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `WATER_RENDERERS` map (non-exported,
so no DOM-sentinel dims row), and the id added to the calc-water declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the velocity/area/flow, the lower-C and slower-float and bigger-area directions, and the error seams. The
calc-water.js gzip cap and the Group M group shell are watched at build (cap raised for this sweep). Home tile count
1,421 -> 1,422.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20 ft / 10 s / 4 ft / 1.5 ft / 0.85 -> 10.2 cfs).

## 5. Roadmap position

Water/wastewater operations beside `weir-flow`, serving the water/wastewater operator (water / wastewater). Deliberately
the rough field gauging estimate; a current-meter traverse or calibrated flume, a surveyed cross-section, the metering
standard, and the permit govern a compliance flow. Stays evidence-driven. Continues the water-operations sweep at 1 new
spec (v973).
