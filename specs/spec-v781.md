# roughlogic.com Specification v781 -- COGO Inverse (Two Points to Bearing and Distance) (calc-survey.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`** (Group P),
> no new module, group, or dependency. Inherits spec.md through spec-v780.md. Explore sweep #20 (entry 1).
>
> **The gap, and the evidence for it.** The `cogo-forward-point` tile locates a new point from a bearing and distance; its
> complement -- the **COGO inverse**, the distance and azimuth *between* two known points -- is the other half of every
> traverse computation, and no tile does it. `distance = sqrt(dN^2 + dE^2)`, `azimuth = atan2(dE, dN)` clockwise from
> north. The number this settles: from **N5000/E5000** to **N5141.42/E5141.42** the line runs **200.00 ft** at azimuth
> **45.00 deg** -- exactly mirroring the forward tile's worked point. Grep confirmed no point-to-point inverse exists
> (`traverse-closure` sums a loop; `area-by-coordinates` gives area).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`cogo-forward-point` sibling: the coordinates, distance, and latitude/departure carry `L`; the azimuth is dimensionless.
The v18/v21 contract: a non-finite input (via `_finiteGuard`) or two identical points (a zero-length line, undefined
bearing) returns `{ error }`. Citation discipline (v19/v22): the COGO inverse by name (Ghilani & Wolf; FM 5-233),
`GOVERNANCE.general` matching the sibling; the note states the azimuth is `atan2(dE, dN)` clockwise from north normalized
to 0-360 deg, that this is the exact inverse of `cogo-forward-point` (the round-trip), that a quadrant bearing comes from
`bearing-conversion`, and that it is plane (grid) geometry with no curvature or grid scale factor.

## 2. The tile

### 2.1 `cogo-inverse-locate` -- COGO Inverse (Two Points to Bearing and Distance)

```
inputs:
  start_n   northing of point 1 (ft)
  start_e   easting of point 1 (ft)
  end_n     northing of point 2 (ft)
  end_e     easting of point 2 (ft)

delta_n    = end_n - start_n
delta_e    = end_e - start_e
distance   = sqrt(delta_n^2 + delta_e^2)
azimuth    = atan2(delta_e, delta_n) x 180/pi, normalized to 0-360 deg
```

**Pinned worked example.** N1 = 5000, E1 = 5000, N2 = 5141.42, E2 = 5141.42:
`dN = 141.42, dE = 141.42`; `distance = sqrt(141.42^2 x 2) = ` **200.00 ft**; `azimuth = atan2(141.42, 141.42) = ` **45.00 deg**.
Due north gives azimuth 0, east 90, south 180, west 270. Feeding this azimuth and distance into `cogo-forward-point` from
point 1 lands on point 2 -- the inverse->forward round-trip pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["surveying", "field"]`) placed with the survey-depth tiles **past the
exact-count-audited `// Group P: Field` .. `// Group Q` block** (beside `grid-to-ground`), so the Group P audit count is
untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the COGO inverse, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`cogo-inverse-locate` ->
`computeCogoInverseLocate`); `scripts/related-tiles.mjs` (-> `cogo-forward-point` / `bearing-conversion` /
`traverse-closure`); `data/search/aliases.json` (5 collision-checked aliases: "distance and bearing between two points",
"azimuth between two points", ...); the calc-survey `SURVEY_RENDERERS` map entry via a hand-written renderer (two
northing/easting pairs) and the id added to the calc-survey declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
example, the four cardinal azimuths, the inverse->forward round-trip against `computeCogoForwardPoint` across a sweep, and
the error seams. The calc-survey.js gzip cap is unchanged (the addition fits under the current cap). Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,229 -> 1,230.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 200.00 ft at azimuth
45.00 deg).

## 5. Roadmap position

Completes the COGO pair -- `cogo-forward-point` (locate from a bearing and distance) and `cogo-inverse-locate` (bearing
and distance between two points) -- the two operations every traverse and stakeout computation is built from. Continues
the post-inverse forward-coverage vein (Explore sweep #20). A convergence-angle (grid vs geodetic north) tile is the
natural next survey addition; it stays evidence-driven.
