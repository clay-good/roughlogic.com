# roughlogic.com Specification v540 -- Search Track Spacing and Coverage (calc-rescue.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rescue.js`**
> (Group P, field, backcountry, and SAR); no new module, group, or dependency. Inherits spec.md through spec-v539.md.
>
> **The gap, and the evidence for it.** `search-probability` combines already-known per-pass detection probabilities
> across multiple passes, but it cannot answer the planning question that comes first: given how far a searcher can
> detect the subject (the effective sweep width) and how tightly the search lines are spaced, what probability of
> detection does one pass achieve -- and how tight must the spacing be to hit a target? That derivation, from search
> theory, is `coverage C = W / S` and `POD = 1 - e^(-C)`. The catch the tile makes explicit is that the sweep width `W`
> is not the raw sensor range: it must first be corrected for weather, fatigue, terrain, and speed, and the exponential
> (random-search) model is deliberately conservative -- parallel-track sweeps achieve higher POD at the same coverage.
> The tile takes the corrected sweep width and either the track spacing (to get POD) or a target POD (to get the
> spacing), and returns the coverage, the single-pass POD, and the required spacing -- the numbers a search planner sets
> a segment's resources from.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The sweep width and track
spacing are lengths (`L`, in meters or feet, consistently); the coverage and the POD are `dimensionless`. The v18/v21
contract: any non-finite input, a non-positive sweep width, a non-positive track spacing (when solving POD), or a target
POD outside `(0, 1)` (when solving spacing) returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general`
over the search-theory relations by name (NSARC / USCG search theory; exponential detection model); `editionNote` names
the **search coverage and detection model**, prints `coverage = sweep_width / track_spacing`,
`POD = 1 - e^(-coverage)`, and the inverse `track_spacing = sweep_width / (-ln(1 - target_POD))`, and states that **the
sweep width must first be corrected for weather, fatigue, terrain, and speed (the raw detection range overstates it),
the exponential random-search model is conservative and parallel-track sweeps reach a higher POD at the same coverage,
this is single-pass POD (multiple passes compound via search-probability), and the incident commander and search plan
govern** -- a planning aid, not a guarantee of detection.

## 2. The tile

### 2.1 `search-track-spacing` -- Coverage and POD From Sweep Width and Line Spacing

```
inputs:
  sweep_width_m     m    effective (corrected) sweep width W
  track_spacing_m   m    track (line) spacing S (0 = solve from target POD)
  target_pod        -    desired single-pass POD (used when spacing is 0)

coverage       = track_spacing_m > 0 ? sweep_width_m / track_spacing_m : null    [-]
pod            = coverage != null ? 1 - e^(-coverage) : null                      [-]
spacing_for_pod = target_pod in (0,1) ? sweep_width_m / (-ln(1 - target_pod)) : null   [m]
```

**Pinned worked example (a 100 m corrected sweep width, 50 m track spacing).** The coverage is
`100 / 50 = 2.0`, so the single-pass POD is `1 - e^(-2.0) = 1 - 0.135 = ` **0.86** -- a tight, high-confidence sweep of
that segment. **Cross-check (loosening the spacing to hit a target).** To achieve a target POD of `0.80` with the same
100 m sweep width: `spacing = 100 / (-ln(1 - 0.80)) = 100 / (-ln 0.2) = 100 / 1.609 = ` **62 m** -- searchers can run
lines 62 m apart and still make 80% detection, freeing resources for more ground; spacing tighter than that buys
diminishing extra POD. The tile returns the coverage, the single-pass POD, and the required spacing.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["field", "fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the coverage-to-POD example + the
target-POD-to-spacing cross-check); `test/fixtures/compute-map.js` (`search-track-spacing` -> `computeSearchTrackSpacing`
in `../../calc-rescue.js`); `scripts/related-tiles.mjs` (-> `search-probability` / `area-by-coordinates` /
`pacing-distance`); `data/search/aliases.json` ("track spacing", "search coverage", "probability of detection", "sweep
width", "pod search", "search theory", "csv coverage", "search line spacing"); the id appended to the rescue renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the coverage relation, the exponential POD, the inverse spacing solve, and the error seams (non-
finite, non-positive sweep / spacing, target POD out of range). Hand-writes its renderer (mirroring the calc-rescue.js
`search-probability` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the coverage / POD / spacing stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 50 m example -> coverage 2.0, POD 0.86).

## 5. Roadmap position

Feeds the per-pass POD that `search-probability` then compounds across passes -- together they take a search from
geometry to cumulative probability of success. A sweep-width-correction helper (applying weather/fatigue/speed factors
to a raw detection range) and a searcher-hours estimate (area over spacing over speed) are deliberate future follow-ons.
Further Group P growth stays evidence-driven.
