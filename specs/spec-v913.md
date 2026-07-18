# roughlogic.com Specification v913 -- Static Rollover Threshold (calc-trucking.js, Group J, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`** (Group J),
> no new module, group, or dependency. Inherits spec.md through spec-v912.md. Trucking stability field-screen, mirroring
> the informational safety-limit framing of the landed `tire-load-check` and `axle-load-distribution` tiles (apply the
> public physics; the loaded truck governs).
>
> **The gap, and the evidence for it.** The catalog checks a truck's axle weights and tire ratings but nothing screens
> its **rollover stability**. Grep confirmed no rollover tile in calc-trucking. Every ramp-rollover starts with a CG too
> high for the speed. The number this settles: a 72 in track over an 80 in loaded CG has a static rollover threshold of
> **0.45 g** -- on a 200 ft ramp that impends near **37 mph**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply: the track width, CG height,
and curve radius carry `L`, the threshold is dimensionless (g), and the rollover speed carries `L*T^-1`. The v18/v21
contract: a non-finite or non-positive track width or CG height, or a negative curve radius, returns `{ error }`; a zero
curve radius returns a null rollover speed (the SRT still computes). Citation discipline (v19/v22): the static stability
factor by name (SRT = half-track / CG-height; rollover speed = sqrt(SRT x g x R), g = 32.174 ft/s^2), `GOVERNANCE.general`;
the note states that this is a rigid-body STATIC screen, that suspension roll, tire slip, load shift, and the transient of
a fast steer or a decreasing-radius ramp all lower the real threshold, that a loaded van runs about 0.35 to 0.45 g while
a tanker or high-cube sits lower, and that the loaded CG height and the truck govern -- it is not a substitute for driving
to conditions.

## 2. The tile

### 2.1 `static-rollover-threshold` -- Static Rollover Threshold

```
inputs:
  track_width_in   axle track, wheel centerline to centerline (in)
  cg_height_in     loaded center-of-gravity height above ground (in)
  curve_radius_ft  steady curve / ramp radius (ft, 0 = skip rollover speed)

srt_g              = (track_width_in / 2) / cg_height_in
rollover_speed_mph = sqrt( srt_g x 32.174 x curve_radius_ft ) x 0.6818   [null if radius = 0]
```

**Pinned worked example.** 72 in track, 80 in loaded CG, 200 ft curve:
`srt = (72/2)/80 = ` **0.45 g**; `speed = sqrt(0.45 x 32.174 x 200) x 0.6818 = ` **36.7 mph**. Cross-check: a low
flatbed at 96 in track and a 60 in CG is `(96/2)/60 = ` **0.80 g** -- nearly twice as stable, because the threshold is
the half-track over the CG height, so lowering the load or widening the track both help.

## 3. Wiring

A `tools-data.js` row (group `J`, trades `["trucking"]`, beside `axle-load-distribution`); a `tile-meta.js` `_TILES`
entry (`J`); a `citations.js` entry (static stability factor, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the low-flatbed cross-check, pinning the SRT and rollover speed); `test/fixtures/compute-map.js`
(`static-rollover-threshold` -> `computeStaticRolloverThreshold`, module `../../calc-trucking.js`);
`scripts/related-tiles.mjs` (-> `axle-load-distribution` / `truck-off-tracking` / `tire-load-check`);
`data/search/aliases.json` (5 collision-checked aliases: "static rollover threshold", "static stability factor", "truck
rollover speed", "rollover g", "tanker rollover"), then `node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the
`TRUCKING_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-trucking declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the SRT, rollover speed, null-speed seam, monotonicity in CG
height, and the error seams (non-positive track / CG, negative radius, non-finite). The calc-trucking.js gzip cap is
watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from
home first paint. Home tile count 1,361 -> 1,362.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((72/2)/80 -> 0.45 g; ~37 mph on a 200 ft ramp).

## 5. Roadmap position

Trucking stability field-screen beside `axle-load-distribution`, serving the driver / carrier (trucking). Deliberately a
static screen; the loaded CG height, the suspension, and the dynamics govern the real threshold. Stays evidence-driven.
Continues the trucking safety-ops sweep at 1 new spec (v913).
