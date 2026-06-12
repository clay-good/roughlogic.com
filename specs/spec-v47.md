# roughlogic.com Specification v47 — Circle Through Three Points (1 New Tile)

> **Implementation status: CLOSED 2026-06-11 (package stamped 0.44.0, a
> minor; catalog 576 -> 577, wiring lint 30 renderer modules / 577 tile-id
> entries).** v47 is a catalog-growth spec in the lineage of v15/.../v43/v44. It
> inherits everything from spec.md through spec-v46.md and changes none of it.
>
> v47 deepens **Group G (Cross-Trade Utilities)** with one first-principles,
> hand-verifiable tile: the circle (center + radius) through three measured points
> on an arc -- the triangle's circumcircle, the inverse of `bolt-circle`. **No new
> group, no new module, no new dependencies, no telemetry, no AI, US standards
> only.** It lands in `calc-fab.js` (the Group G fabrication & layout bench, with
> headroom), alongside `bolt-circle`, `circular-arc`, and the conduit/pipe suite.
>
> **The gap.** `bolt-circle` lays out hole positions on a *known* circle (center
> and diameter given); `circular-arc` (spec-v44) recovers a curve from a chord and
> the rise at *exact* midspan. But in the field you often cannot place the rise at
> a known midspan -- you can only take three points off the curve. No tile
> recovered the circle from three arbitrary points. That is the general
> field-measurement case for a curved wall, a road curve, a tank or pipe radius,
> or any arc you can touch at three spots.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit: three collinear or
  coincident points (a zero determinant) return `{ error }`, as does any
  non-finite input; no tile throws, hangs, or leaks a non-finite output field.
- The v19/v22 citation discipline applies to the new `citations.js` entry: it is
  first-principles coordinate geometry (public domain), cited as such.
- The tile id is kebab-case and was checked against the 576 live ids:
  `circle-from-3-points` does not collide and does not duplicate an existing tile
  by concept (see §3).

## 2. The tile

### `circle-from-3-points` — Circle Through Three Points (Group G, calc-fab.js)

Given three points `P1(x1,y1)`, `P2(x2,y2)`, `P3(x3,y3)` on an arc, the circle
through all three is the triangle's circumcircle:

```
D  = 2·(x1(y2−y3) + x2(y3−y1) + x3(y1−y2))            (zero ⟹ collinear ⟹ error)
cx = (|P1|²(y2−y3) + |P2|²(y3−y1) + |P3|²(y1−y2)) / D
cy = (|P1|²(x3−x2) + |P2|²(x1−x3) + |P3|²(x2−x1)) / D
R  = distance((cx,cy), P1)
```

where `|Pi|² = xi² + yi²`. The tile reports the center, radius, diameter, and
circumference, in whatever consistent length unit the points are given in.

**Worked example (pinned).** Points `(0,0)`, `(4,0)`, `(0,3)`: `D = 2·(0 + 12 +
0) = 24`; `cx = (0 + 16·3 + 0)/24 = 2`; `cy = (0 + 0 + 9·4)/24 = 1.5`; `R =
dist((2,1.5),(0,0)) = √(4 + 2.25) = 2.5`. (This is the classic check: a right
triangle's hypotenuse is the diameter, so the circumradius is half the
hypotenuse, `5/2 = 2.5`.) Cross-check: `(5,0)`, `(0,5)`, `(−5,0)` → center
`(0,0)`, radius `5`. Collinear `(0,0),(1,1),(2,2)` and coincident points return an
error.

## 3. Concept-check and wiring

Concept-checked against the 576 live tiles: `bolt-circle` lays out holes on a
known circle; `circular-arc` recovers a circle from a chord + midspan rise;
`center-of-gravity-2point`, `rolling-offset`, and the pipe/conduit tiles solve
unrelated shapes. No tile recovers a circle from three arbitrary points. **Ships.**

Per-tile wiring: a `tools-data.js` row (a `spec-v47` section after the v44 row,
`group: "G"`), `tile-meta.js` `_TILES`, `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js` (module path
`../../calc-fab.js`), `scripts/related-tiles.mjs` (`circle-from-3-points` →
`circular-arc` / `bolt-circle` / `rolling-offset`), `data/search/aliases.json` (5
aliases), the `app.js` `FAB_RENDERERS` declare, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js` block
pinning the worked example (plus the R5 case and the collinear / coincident /
non-finite error seams). The `tools-data.js` registry fit the new row within its
current 48000 B cap (no bump).

## 4. As-landed verification (gate plan)

The same green bar the recent tile specs cleared: `npm run lint` (every gate; the
wiring lint must report **30 renderer modules / 577 tile-id entries**), `npm test`
(the unit suite, +1 test → 5,514), `npm run build` (577 tile + 24 group shells,
603-URL sitemap), `npm run data:verify`, the worked-examples runner (+1 fixture),
the 320 px shell audit (577 tile shells), `check:dist` + `check:shells`, and the
full-catalog render-no-nan Chromium sweep plus the a11y gate (the new tile
verified clean, rendered output read to the digit: center (2, 1.5), radius 2.5).

## 5. Roadmap position

v47 completes the layout-geometry trio in `calc-fab.js` (chord+rise via
`circular-arc`, three-point via `circle-from-3-points`, hole-circle via
`bolt-circle`). The standing module-cap watch list carries `calc-mechanic.js`,
`calc-water.js`, `calc-agriculture.js`, `calc-hvac.js`, `calc-electrical.js`,
`calc-cross.js`, and the `tools-data.js` registry (now ~97% of 48000 B, due for a
bump on the next row). Further first-principles candidates remain whatever
survives a live concept-check.
