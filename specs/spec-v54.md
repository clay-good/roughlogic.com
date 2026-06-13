# roughlogic.com Specification v54 — Compound Miter for Crown Molding (1 New Tile)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.49.0, a
> minor; catalog 581 -> 582, wiring lint 30 renderer modules / 582 tile-id
> entries).** v54 is a catalog-growth spec in the single-tile-deepening lineage.
> It inherits everything from spec.md through spec-v53.md and changes none of it.
>
> v54 deepens **Group E (Carpentry and Construction)** with the one piece of
> finish-carpentry math that has no first-principles substitute in the catalog:
> the two saw settings to cut crown molding flat on the table. **No new group, no
> new module, no new dependencies, no telemetry, no AI, US standards only.** It
> lands in `calc-shop.js` (the machine-shop & fabrication bench already hosts
> Group E welding/sheet-metal tiles, so a Group E carpentry-layout tile is at
> home there; group letter is independent of module per the v28/v36/v39
> precedent, and `calc-shop.js` has the headroom `calc-construction.js`, at 94%
> of its cap, does not).
>
> **The gap, and the evidence for it.** Crown molding installed "sprung" against
> the wall does not sit flat against a single saw fence: cutting it flat on the
> table needs a *compound* cut, a miter (table swing) AND a bevel (blade tilt),
> and getting either wrong wastes expensive stock on every corner. Finish
> carpenters reach for a printed compound-miter chart for exactly two profiles
> (38-degree and 45-degree spring) at exactly one corner (90 degrees) and have
> nothing for the out-of-square corners a real house is full of. The catalog has
> `pipe-miter-cut` (lobster-back pipe), `roof-pitch`, and `rafter`, but nothing
> that turns a spring angle and a wall corner into saw settings. That printed
> chart is the evidence the gap is real, and it is also the independent worked
> example this tile is verified against.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. (The quantities are angles in degrees; the `// dims:`
  annotation marks them dimensionless.)
- The v18/v21 tile contract applies: a spring angle outside (0, 90) or a wall
  corner outside (0, 180) returns `{ error }`, as does any non-finite input; no
  tile throws, hangs, or leaks a non-finite output field.
- The v19/v22 citation discipline applies; the entry is first-principles
  (public domain) with `GOVERNANCE.general`.
- The tile id is kebab-case and checked against the 581 live ids:
  `compound-miter` does not collide and is not a concept-duplicate -- no existing
  tile turns a spring angle into saw settings (§3).

## 2. The tile

### `compound-miter` — Compound Miter (Crown Molding) (Group E, calc-shop.js)

```
miter (table swing) = atan( tan(corner/2) x sin(spring) )
bevel (blade tilt)  = asin( cos(spring) x cos(corner/2) )
spring = molding profile angle from the wall (38 or 45 deg typical)
corner = wall corner angle (90 deg for a square corner)
error if spring not in (0, 90) or corner not in (0, 180)
```

The tile reports the miter (saw-table) angle and the bevel (blade-tilt) angle
for crown cut **flat** on the saw table -- the common shop method. The two angle
magnitudes are identical for an inside and an outside corner; only the workpiece
orientation and which side is the keeper change, which the tile states. Arbitrary
(out-of-square) wall corners are handled, which is the whole reason to compute
instead of reading the two-row printed chart.

**Worked example (pinned).** A 38-degree spring crown at a 90-degree corner:
miter `= atan(tan(45) x sin(38)) = atan(0.61566) = 31.62 deg`; bevel
`= asin(cos(38) x cos(45)) = asin(0.55721) = 33.86 deg`. Cross-check against the
other charted profile: 45-degree spring at a 90-degree corner -> miter
`= atan(tan(45) x sin(45)) = 35.26 deg`, bevel `= asin(cos(45) x cos(45)) =
asin(0.5) = 30.00 deg`. Both reproduce the standard published compound-miter
chart to the digit. Degenerate inputs (spring 0 or 90, corner 0 or 180,
non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the 581 live tiles: `pipe-miter-cut` cuts a lobster-back
pipe elbow (not sprung trim), `roof-pitch` and `rafter` give a single roof angle
(not a two-axis compound cut), `bend-allowance` is sheet-metal flat-pattern, and
`bolt-circle` / `circular-arc` are layout geometry with no spring-angle concept.
No tile turns a molding spring angle and a wall corner into a miter+bevel pair.
**Ships.** It sits with the other angle-and-layout bench math in `calc-shop.js`.

Per-tile wiring: a `tools-data.js` row (group `E`), `tile-meta.js` `_TILES`,
`citations.js`, `test/fixtures/worked-examples.json`,
`test/fixtures/compute-map.js` (module path `../../calc-shop.js`),
`scripts/related-tiles.mjs` (`compound-miter` -> `roof-pitch` / `rafter` /
`decimal-to-fraction`), `data/search/aliases.json` (5 aliases), the `app.js`
`SHOP_RENDERERS` declare, the `// dims:` annotation, the regenerated v14 corpus +
tile-index, and a `test/unit/bounds-fuzzer.test.js` block pinning both chart
profiles and the error seams. `calc-shop.js` holds at 90% of its 16000 B cap, so
no cap bump is needed; the module is lazy-loaded and not in the home payload.

## 4. As-landed verification (gate plan)

The same green bar: `npm run lint` (every gate; the wiring lint reports **30
renderer modules / 582 tile-id entries**; the spec-v49 `check-readme-counts` gate
agrees at 582 tiles / 608 sitemap URLs), `npm test` (the unit suite, +1 test
-> 5,519), `npm run build` (582 tile + 24 group shells, 608-URL sitemap), `npm run
data:verify`, the worked-examples runner (+1 fixture), the 320 px shell audit (582
tile shells), and the full-catalog render-no-nan Chromium sweep plus the a11y gate
(the new tile verified clean, rendered output read to the digit: 31.62 / 33.86).

## 5. Roadmap position

v54 brings Group E to 61 tiles. The catalog at 582 is broad; the under-served
substantive groups are largely filled, so future tile work continues to run the
live concept-check hard before adding. The standing module-cap watch list carries
`calc-kitchen.js`, `calc-stage.js`, `calc-field.js`, `calc-construction.js`
(94%), `calc-cross.js` (93%), and `tools-data.js` (94% of the 50000 B cap).
