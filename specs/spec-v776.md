# roughlogic.com Specification v776 -- State-Plane Grid-to-Ground Distance (calc-survey.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`** (Group P),
> no new module, group, or dependency. Inherits spec.md through spec-v775.md. Explore sweep #19 (entry 2).
>
> **The gap, and the evidence for it.** Both `cogo-forward-point` and `edm-slope-reduction` explicitly note they do **not**
> apply a grid scale factor -- yet on a state-plane or UTM project every measured (ground) distance must be reduced to grid
> and back, and no tile does it. The relation is `EF = R/(R+h)` (R = 20,906,000 ft, NGS mean earth radius),
> `CF = grid-scale-factor x EF`, `ground = grid / CF`. The number this settles: a **10,000 ft** grid distance at a
> **0.9999** scale factor and **5,280 ft** ellipsoid height is **10,003.53 ft** on the ground. Grep confirmed no
> `grid-to-ground` / `combined factor` / `sea level factor` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the survey
siblings: the grid and ground distances and the ellipsoid height carry `L`, the scale factors are dimensionless. The
v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive grid distance, a non-positive grid scale
factor, or a non-finite ellipsoid height returns `{ error }`. Citation discipline (v19/v22): the grid-to-ground reduction
by name (NGS State Plane Coordinate System), `GOVERNANCE.general`; the note states the grid scale factor is a user-supplied
projection value near 1.0 (from NGS tools / survey software), and that `h` is the **ellipsoid** height = orthometric
elevation H + geoid height N (N negative in the conterminous US), so the user enters `H + N`, not the elevation alone.

## 2. The tile

### 2.1 `grid-to-ground` -- State-Plane Grid-to-Ground Distance

```
inputs:
  grid_distance_ft      grid (map/projection) distance (ft, > 0)
  grid_scale_factor     projection scale factor at the point (near 1.0, > 0)
  ellipsoid_height_ft   ellipsoid height h = orthometric H + geoid N (ft)

elevation_factor  = R / (R + h)          (R = 20,906,000 ft)
combined_factor   = grid_scale_factor x elevation_factor
ground_distance   = grid_distance / combined_factor      (reverse: grid = ground x CF)
```

**Pinned worked example.** grid = 10,000 ft, GSF = 0.9999, h = 5,280 ft:
`EF = 20906000/20911280 = 0.9997475`; `CF = 0.9999 x 0.9997475 = 0.9996475`; `ground = 10000/0.9996475 = ` **10,003.53 ft**.
At sea level (h = 0) EF is exactly 1 and `ground = grid / GSF`; above the ellipsoid the ground exceeds the grid (CF < 1).
The reverse `grid = ground x CF` and linearity in the grid distance are pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["surveying", "field"]`) placed with the survey-depth tiles **past the
exact-count-audited `// Group P: Field` .. `// Group Q` block** (beside `edm-slope-reduction`), so the Group P audit count
is untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the reduction, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`grid-to-ground` ->
`computeGridToGround`); `scripts/related-tiles.mjs` (-> `edm-slope-reduction` / `cogo-forward-point` /
`traverse-closure`); `data/search/aliases.json` (5 collision-checked aliases: "grid to ground distance", "combined scale
factor", ...); the calc-survey `SURVEY_RENDERERS` map entry via a hand-written renderer (grid distance, grid scale
factor, ellipsoid height fields) and the id added to the calc-survey declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the example, the sea-level EF=1 case, the CF identity and the reverse across a sweep, the linearity, and the error
seams. The calc-survey.js gzip cap (raised to 15500 B in this spec) covers the addition. Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,224 -> 1,225.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 10,003.53 ft ground for a
10,000 ft grid distance at 0.9999 and 5,280 ft).

## 5. Roadmap position

Supplies the grid scale factor the COGO, slope-reduction, and traverse tiles all name as out of their scope -- completing
the state-plane reduction toolkit alongside the curvature-and-refraction correction. Continues the post-inverse
forward-coverage vein (Explore sweep #19). A convergence-angle (grid vs geodetic north) tile is the natural next
state-plane addition; it stays evidence-driven.
