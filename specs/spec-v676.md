# roughlogic.com Specification v676 -- Throw Distance for a Target Beam Pool (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N,
> stage / live-production), no new module, group, or dependency. Inherits spec.md through spec-v675.md.
>
> **The gap, and the evidence for it.** Spec-v51 (`lighting-beam`) runs the theatrical beam geometry forward: given a
> throw distance, it returns the beam (pool) diameter. The hang question a lighting designer asks is the inverse --
> **how far do I hang this fixture to get the pool size I want**. The forward tile makes you guess throws and re-read the
> pool; the inverse solves it directly. From `beam_diameter = 2 x throw x tan(beam angle / 2)`,
> `throw = D / (2 x tan(beam angle / 2))`. The number this settles: a 20 degree fixture makes a 10.6 ft pool from a
> **30 ft** throw, and a wider 40 degree beam reaches the same pool from just **14.5 ft** -- the wider the beam, the
> shorter the hang for a given pool.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`lighting-beam` sibling: the target pool diameter and the returned throw are `L` (ft or m per the same distance-unit
select), and the beam angle is `dimensionless` (degrees). The v18/v21 contract: any non-finite input, a non-positive
pool diameter, or a beam angle outside (0, 180) returns `{ error }`. Citation discipline (v19/v22): the beam-spread
geometry solved for the throw, first-principles photometry by name and `GOVERNANCE.rigging` matching the sibling; the
note states that **a wider beam reaches the same pool from a shorter throw, this is the geometry only (the center-beam
illuminance still falls with the square of the throw, so a farther hang for a bigger pool is also dimmer -- check the
level with the lighting-beam tile), the beam angle entered should be the one being designed to (beam angle to 50%
intensity, or field angle to 10%), and the fixture cut sheet governs**.

## 2. The tile

### 2.1 `lighting-throw-for-pool` -- Throw Distance for a Target Beam Pool

```
inputs:
  target_pool_diameter   ft/m   desired beam (pool) diameter (> 0)
  beam_angle_deg         deg    full-cone beam angle, 0-180
  distance_unit          -      ft or m

throw_distance = target_pool_diameter / (2 x tan(beam_angle_deg / 2))   [same unit]
```

**Pinned worked example (a 20 degree fixture).** D = 10.58 ft, beam angle = 20 deg:
`throw = 10.58 / (2 x tan(10 deg)) = 10.58 / 0.3527 = ` **30 ft**; feeding 30 ft back through `lighting-beam` returns a
10.58 ft pool, the input. **Cross-check (a wider beam).** Same 10.58 ft pool from a 40 degree beam:
`throw = 10.58 / (2 x tan(20 deg)) = ` **14.5 ft** -- the wider beam casts the same pool from less than half the throw.

## 3. Wiring

A `tools-data.js` row (group `N`, trades `["stage"]`, beside `lighting-beam`, which sits OUTSIDE the exact-8
`// Group N: Stage`..`// Group O` audit block, so no count issue); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (beam geometry solved for throw, `GOVERNANCE.rigging` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`lighting-throw-for-pool` ->
`computeLightingThrowForPool` in `../../calc-stage.js`); `scripts/related-tiles.mjs` (-> `lighting-beam` / `dmx-planner`
/ `truss-capacity` / `projector-brightness`, and the forward tile links back); `data/search/aliases.json` ("throw
distance for a pool size", "how far to hang a light", "hang distance for beam diameter", plus adjacent rows);
`STAGE_RENDERERS["lighting-throw-for-pool"]` via a hand-written renderer with the same distance-unit `makeSelect` as the
sibling (the select feeds the compute, satisfying check-dead-inputs) and the id added to the calc-stage declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning both examples, the wider-beam-shorter-throw check, the round-trip through
`computeLightingBeam` across angles and both units, and the error seams. The mechanical/rigging-governance test uses an
explicit id list this tile is not on, so no conflict. The calc-stage.js gzip cap (raised for v664/v667) is raised again
here (this is the third Group N inverse added to calc-stage.js this campaign). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 30 ft throw for a 10.58 ft pool at 20 deg).

## 5. Roadmap position

Pairs the forward lighting tile (`lighting-beam`, pool from throw) with its inverse (throw from a target pool), the two
halves of the fixture-hang question. Further Group N growth stays evidence-driven.
