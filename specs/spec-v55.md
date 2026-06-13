# roughlogic.com Specification v55 — Regular Polygon Miter and Layout (1 New Tile)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.50.0, a
> minor; catalog 582 -> 583, wiring lint 30 renderer modules / 583 tile-id
> entries).** v55 is a catalog-growth spec in the single-tile-deepening lineage.
> It inherits everything from spec.md through spec-v54.md and changes none of it.
>
> v55 deepens **Group G (Cross-Trade Utilities)** with the regular-polygon frame
> layout every woodworker, fabricator, and finish carpenter needs but the catalog
> only half-covered. **No new group, no new module, no new dependencies, no
> telemetry, no AI, US standards only.** It lands in `calc-fab.js`, the
> cross-trade Fabrication & Layout bench, alongside `bolt-circle`, `circular-arc`,
> and `circle-from-3-points`.
>
> **The gap, and the evidence for it.** Building any N-sided frame -- an octagon
> column wrap, a hexagon planter, a picture frame, a segmented turning ring, a
> bay-window or gazebo facet -- needs the joint miter angle (180/N degrees off
> square) and the piece length for a target size. The catalog's `geometry` tile
> already does regular-polygon *area* (hexagon) and *perimeter* (from a side
> list), and `compound-miter` (spec-v54) does sprung crown, but **nothing turns a
> side count into a miter saw setting** or converts a target across-flats /
> across-corners dimension into a cut length. The geometry tile doing half the job
> (area but not the miter) is the evidence the gap is real.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. (The side count and angles are dimensionless; the side,
  across-flats, across-corners, and perimeter are lengths and the area is `L^2`;
  the `// dims:` annotation marks each.)
- The v18/v21 tile contract applies: fewer than 3 sides, more than 360, a
  non-positive size, or any non-finite input returns `{ error }`; no tile throws,
  hangs, or leaks a non-finite output field.
- The v19/v22 citation discipline applies; the entry is first-principles
  (public domain) with `GOVERNANCE.general`.
- The tile id is kebab-case and checked against the 582 live ids:
  `polygon-miter` does not collide and is not a concept-duplicate (§3).

## 2. The tile

### `polygon-miter` — Regular Polygon Miter and Layout (Group G, calc-fab.js)

```
miter (off square) = 180 / N                  per joint, both ends (2N cuts)
interior angle     = (N - 2) x 180 / N
side from across-flats:   s = flats   x tan(180/N)
side from across-corners: s = corners x sin(180/N)
across-flats   = s / tan(180/N)               face-to-face width
across-corners = s / sin(180/N)               point-to-point diameter
perimeter = N x s        area = (N x s^2) / (4 tan(180/N))
error if N < 3, N > 360, or size <= 0
```

The user gives the number of sides and a target size as one of three dimensions
(side length, across-flats width, or across-corners diameter); the tile recovers
the side length and reports the miter saw setting, the interior angle, the
across-flats and across-corners dimensions, the perimeter, and the area. The size
mode is a labeled select so a value is never read against the wrong dimension.

**Worked example (pinned).** A regular hexagon (N = 6) with side 12 in: miter
`180/6 = 30 deg`; interior `(6-2)180/6 = 120 deg`; across-corners
`12/sin(30) = 24 in`; across-flats `12/tan(30) = 20.7846 in`; perimeter 72 in;
area `(6 x 144)/(4 tan 30) = 374.123 in^2`. Cross-checks: an octagon (N = 8)
gives the known 22.5 deg miter, and entering its across-flats width recovers the
side `flats x tan(22.5)`; a square (N = 4) gives 45 deg; an equilateral triangle
(N = 3) gives 60 deg. Degenerate inputs (N < 3, size <= 0, non-finite) error.

## 3. Concept-check and wiring

Concept-checked against the 582 live tiles: `geometry` gives regular-polygon area
and a polygon perimeter from a side list but no miter angle or size conversion;
`compound-miter` is sprung crown (spring + corner -> miter + bevel, a different
problem); `bolt-circle` lays out holes on a circle, not a polygon frame. No tile
turns a side count into a saw miter or sizes a regular polygon to a target
across-flats / across-corners dimension. **Ships.** It joins the layout family in
`calc-fab.js`.

Per-tile wiring: a `tools-data.js` row (group `G`), `tile-meta.js` `_TILES`,
`citations.js`, `test/fixtures/worked-examples.json`,
`test/fixtures/compute-map.js` (module path `../../calc-fab.js`),
`scripts/related-tiles.mjs` (`polygon-miter` -> `compound-miter` / `bolt-circle`
/ `decimal-to-fraction`), `data/search/aliases.json` (5 aliases), the `app.js`
`FAB_RENDERERS` declare, the `// dims:` annotation, the regenerated v14 corpus +
tile-index, and a `test/unit/bounds-fuzzer.test.js` block pinning the hexagon,
the octagon across-flats round-trip, the across-corners round-trip, and the error
seams. `calc-fab.js` holds at 96% of its 20000 B cap -- no bump; the module is
lazy-loaded and not in the home payload.

## 4. As-landed verification (gate plan)

The same green bar: `npm run lint` (every gate; the wiring lint reports **30
renderer modules / 583 tile-id entries**; the spec-v49 `check-readme-counts` gate
agrees at 583 tiles / 609 sitemap URLs), `npm test` (the unit suite, +1 test
-> 5,520), `npm run build` (583 tile + 24 group shells, 609-URL sitemap), `npm run
data:verify`, the worked-examples runner (+1 fixture), the 320 px shell audit (583
tile shells), and the full-catalog render-no-nan Chromium sweep plus the a11y gate
(the new tile verified clean, rendered output read to the digit: 30 deg miter,
120 deg interior, 24 in across corners).

## 5. Roadmap position

v55 brings Group G to 50 tiles. The catalog at 583 is broad and the layout/geometry
family (`geometry`, `bolt-circle`, `circular-arc`, `circle-from-3-points`,
`compound-miter`, `polygon-miter`) is now well-rounded, so future tile work
continues to run the live concept-check hard before adding. The standing
module-cap watch list carries `calc-fab.js` (96%), `tools-data.js` (95% of the
50000 B cap), `calc-kitchen.js`, `calc-stage.js`, `calc-field.js`, and
`calc-construction.js` (94%); `calc-fab.js` is now the next split candidate.
