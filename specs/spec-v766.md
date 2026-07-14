# roughlogic.com Specification v766 -- COGO Forward Locate from Bearing and Distance (calc-survey.js, Group P, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`** (Group P),
> no new module, group, or dependency. Inherits spec.md through spec-v765.md. Explore sweep #17 (entry 1) -- the
> post-inverse forward-coverage vein in the thin survey module (6 computes).
>
> **The gap, and the evidence for it.** The survey module carries `traverse-closure` (which sums latitudes and departures
> over a *whole loop* for misclosure) and `area-by-coordinates`, but there is no tile for the single most common COGO
> operation: **locate one new point** from a known point, an azimuth, and a distance (a radial stakeout / forward locate).
> The relation is `dN = D cos(Az)`, `dE = D sin(Az)`; `N2 = N1 + dN`, `E2 = E1 + dE`. The number this settles: from
> **N5000/E5000** at **azimuth 45 deg** over **200 ft**, the new point is **N5141.42 / E5141.42**. Grep confirmed no
> `cogo`, `bearing and distance`, or forward-locate tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`traverse-closure` / `stadia-distance` siblings: the coordinates, latitude/departure, and distance carry the length
treatment (`L`); the azimuth is dimensionless. The v18/v21 contract: a non-finite input (via the module `_finiteGuard`),
an azimuth outside `[0, 360]`, or a non-positive distance returns `{ error }`. Citation discipline (v19/v22): the
latitude/departure forward-locate relation by name (Ghilani & Wolf; FM 5-233), `GOVERNANCE.general`; the note states this
is plane (grid) geometry -- it ignores earth curvature and any grid scale factor, and a quadrant bearing (N45E) must be
converted to a whole-circle azimuth first (the `bearing-conversion` tile handles the quadrant and declination).

## 2. The tile

### 2.1 `cogo-forward-point` -- COGO Forward Locate from Bearing and Distance

```
inputs:
  start_n       start northing N1 (ft)
  start_e       start easting E1 (ft)
  azimuth_deg   azimuth clockwise from north (0 to 360 deg)
  distance_ft   distance D (ft, > 0)

delta_n = D cos(Az)     (latitude)
delta_e = D sin(Az)     (departure)
end_n   = N1 + delta_n
end_e   = E1 + delta_e
```

**Pinned worked example.** N1 = 5000, E1 = 5000, Az = 45 deg, D = 200 ft:
`dN = 200 cos45 = 141.421`, `dE = 200 sin45 = 141.421`; `N2 = ` **5141.421**, `E2 = ` **5141.421**. Due north (Az 0)
puts all 200 ft in +dN; due east (Az 90) in +dE; south and west flip the signs. Re-running from the located point on the
reverse azimuth (Az + 180) over the same distance returns exactly to the start -- the closure check the fuzzer pins.

## 3. Wiring

A `tools-data.js` row (group `P`, trades `["field", "surveying"]`) placed with the survey-depth tiles **past the
exact-count-audited `// Group P: Field` .. `// Group Q` block** (beside `taping-corrections`), so the Group P audit count
is untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the latitude/departure relation,
`GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`cogo-forward-point` -> `computeCogoForwardPoint`); `scripts/related-tiles.mjs` (-> `traverse-closure` /
`area-by-coordinates` / `bearing-conversion`); `data/search/aliases.json` (5 collision-checked aliases: "coordinate from
bearing and distance", "radial stakeout point", ...); the calc-survey `SURVEY_RENDERERS` map entry via a hand-written
renderer (start N/E, azimuth, distance number fields) and the id added to the calc-survey declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the four cardinal azimuths, the reverse-azimuth closure round-trip and
the leg-length identity across a sweep, and the error seams. The calc-survey.js gzip cap (raised to 10500 B in this spec)
covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile
count 1,214 -> 1,215.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> N5141.42 / E5141.42 for
N5000/E5000 at azimuth 45 deg over 200 ft).

## 5. Roadmap position

Fills the missing primary COGO operation -- the forward locate that pairs with `traverse-closure` (the loop check) and
`area-by-coordinates` (the area from coordinates). Continues the post-inverse forward-coverage vein (Explore sweep #17);
the survey module can still take a `curve-deflection-stakeout` next. Further survey tiles stay evidence-driven.
