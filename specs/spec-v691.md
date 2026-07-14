# roughlogic.com Specification v691 -- Screw Conveyor Speed for a Target Capacity (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K,
> mechanic), no new module, group, or dependency. Inherits spec.md through spec-v690.md.
>
> **The gap, and the evidence for it.** Spec-v (`screw-conveyor`) runs the CEMA capacity method forward: given a screw
> speed, it returns the volumetric capacity. The commissioning question a millwright asks is the inverse -- **what auger
> speed do I run (or dial into the VFD) to hit a target throughput**. The forward tile makes you guess RPMs and re-read
> the capacity; the inverse solves it directly. From `Q = flight_area x (pitch/12) x (rpm x 60) x loading`,
> `rpm = target_ft3_hr / (flight_area x (pitch/12) x 60 x loading)`. The number this settles: a 9 in screw with a 2.5 in
> shaft, 9 in pitch, at 30% loading needs **40 RPM** for **220 ft^3/hr**; double the target and it needs **80 RPM** --
> capacity is linear in speed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`screw-conveyor` sibling: the target capacity, the RPM, and the loading fraction are `dimensionless` (ft^3/hr, rev/min,
fraction, as the sibling labels them), and the diameters and pitch are `L` (in). It reuses the sibling's flight-area and
inches-to-feet conversion. The v18/v21 contract: any non-finite input, a non-positive target, a screw diameter not
positive, a shaft diameter outside [0, screw diameter), a non-positive pitch, or a loading fraction outside (0, 1]
returns `{ error }`. Citation discipline (v19/v22): the CEMA Book No. 350 capacity method solved for speed, by name; the
note states that **capacity is linear in speed (double the RPM, double the throughput), a mass rate is converted to the
volumetric target by dividing by the bulk density first, CEMA caps the speed by screw diameter (large augers run
slower), and a flagged high RPM means step up a screw size instead -- CEMA and the manufacturer govern**.

## 2. The tile

### 2.1 `screw-conveyor-rpm` -- Screw Conveyor Speed for a Target Capacity

```
inputs:
  target_ft3_hr        ft^3/hr   target volumetric capacity (> 0)
  screw_diameter_in    in        screw (flight) diameter (> 0)
  shaft_diameter_in    in        shaft / pipe diameter, [0, screw diameter)
  pitch_in             in        pitch (> 0)
  loading_fraction     -         trough loading per the CEMA class, (0, 1]

flight_area = (pi/4) x ((D/12)^2 - (d/12)^2)
rpm = target_ft3_hr / (flight_area x (pitch/12) x 60 x loading_fraction)
```

**Pinned worked example (a 9 in auger).** target = 220 ft^3/hr, D = 9 in, d = 2.5 in, pitch = 9 in, loading = 0.30:
`flight_area = (pi/4)((0.75)^2 - (0.2083)^2) = 0.4077 ft^2`, `rpm = 220.16 / (0.4077 x 0.75 x 60 x 0.30) = ` **40 RPM**;
feeding 40 RPM back through `screw-conveyor` returns 220 ft^3/hr, the input. **Cross-check (a bigger target).** Same
auger at 440 ft^3/hr: `rpm = ` **80 RPM** -- capacity is linear in speed, so twice the throughput is twice the RPM (but
verify it against the CEMA diameter speed limit).

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) placed in the LATER Group K section beside `chamber-cc-for-cr`,
NOT beside `screw-conveyor` in the original block -- the Group K audit-coverage test asserts exactly 12 ids in the
`// Group K: Mechanic`..`// Group L` block, so the row must stay out of it; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (CEMA Book No. 350 solved for speed, `GOVERNANCE.general` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`screw-conveyor-rpm` ->
`computeScrewConveyorRpm` in `../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `screw-conveyor` /
`affinity-laws` / `belt-pulley`, and the forward tile links back); `data/search/aliases.json` ("auger rpm for a
capacity", "screw speed for target throughput", "how fast to run an auger", plus adjacent rows);
`MECHANIC_RENDERERS["screw-conveyor-rpm"]` via the module's `_simpleRenderer` factory (mirroring `screw-conveyor`) and
the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the
linear-in-speed relation, the round-trip through `computeScrewConveyor`, and the error seams. The calc-mechanic.js gzip
cap is expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 40 RPM for 220 ft^3/hr).

## 5. Roadmap position

Pairs the forward conveyor tile (`screw-conveyor`, capacity from speed) with its inverse (speed from a target capacity),
the two halves of the auger-commissioning question. Further Group K growth stays evidence-driven.
