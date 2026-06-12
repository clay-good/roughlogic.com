# roughlogic.com Specification v53 — Linear Interpolation (1 New Tile)

> **Implementation status: CLOSED 2026-06-12 (package stamped 0.48.0, a
> minor; catalog 580 -> 581, wiring lint 30 renderer modules / 581 tile-id
> entries).** v53 is a catalog-growth spec in the single-tile-deepening lineage.
> It inherits everything from spec.md through spec-v52.md and changes none of it.
>
> v53 deepens **Group G (Cross-Trade Utilities)** with the most universal
> chart-reading operation in the trades: linear interpolation. **No new group, no
> new module, no new dependencies, no telemetry, no AI, US standards only.** It
> lands in `calc-cross.js`.
>
> **The gap, and the evidence for it.** Reading a value between two published
> table rows is something every trade does -- a NEMA conductor-derate table, an
> ACI water/cement curve, a refrigerant P-T chart, a pump curve, a steam table, a
> psychrometric chart, a sensor calibration. The operation is so common that the
> catalog already performs it *internally* in a dozen tiles (the grep for
> `interpolat` hits `calc-electrical`, `calc-construction`, `calc-hvac`,
> `calc-agriculture`, `calc-historical`, and more). But there was no standalone
> tile to do it by hand for an arbitrary table. That internal ubiquity is the
> evidence the gap is real, not invented.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. (The quantities are unitless table values; the
  `// dims:` annotation marks them dimensionless.)
- The v18/v21 tile contract applies: two equal reference x-values (a vertical
  line) returns `{ error }`, as does any non-finite input; no tile throws, hangs,
  or leaks a non-finite output field.
- The v19/v22 citation discipline applies; the entry is first-principles
  (public domain) with `GOVERNANCE.general`.
- The tile id is kebab-case and checked against the 580 live ids:
  `linear-interpolation` does not collide and is not a concept-duplicate -- no
  existing tile exposes general table interpolation as its function (§3).

## 2. The tile

### `linear-interpolation` — Linear Interpolation (Group G, calc-cross.js)

```
slope = (y2 - y1) / (x2 - x1)          (error if x2 == x1)
y     = y1 + (x - x1) x slope
extrapolated when x is outside [min(x1,x2), max(x1,x2)]
```

The tile reports the interpolated `y`, the slope, and -- importantly -- whether
the query is a true interpolation (between the points) or an extrapolation
(outside them), since the straight-line assumption is least reliable past the
bracketing rows. Descending x order (the table read top-to-bottom) is handled.

**Worked example (pinned).** Reference points (0, 10) and (10, 30), query x = 4:
slope `= (30 - 10) / (10 - 0) = 2`; `y = 10 + (4 - 0) x 2 = 18`, within range.
Cross-checks: (50, 212) and (100, 302) at x = 75 -> y = 257; querying x = 15
against (0, 0) and (10, 100) returns y = 150 flagged as an extrapolation; equal
x-values return an error.

## 3. Concept-check and wiring

Concept-checked against the 580 live tiles: interpolation is used *inside* many
tiles but exposed by none as its function; `unit-converter` converts units (not
table reads); `ramp-slope` / `slope-from-level` compute a physical grade (not a
y-at-x read). No general linear-interpolation / table-lookup tile exists.
**Ships.** It sits in the cross-trade-utility tier alongside `unit-converter`,
`decimal-to-fraction`, and `geometry`.

Per-tile wiring: a `tools-data.js` row (group `G`), `tile-meta.js` `_TILES`,
`citations.js`, `test/fixtures/worked-examples.json`,
`test/fixtures/compute-map.js` (module path `../../calc-cross.js`),
`scripts/related-tiles.mjs` (`linear-interpolation` -> `unit-converter` /
`ramp-slope` / `slope-from-level`), `data/search/aliases.json` (5 aliases), the
`app.js` `CROSS_RENDERERS` declare, the `// dims:` annotation, the regenerated v14
corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js` block pinning the
worked example, the extrapolation flag, the descending-order case, and the error
seams. The `tools-data.js` registry crossed its cap on the new row, so its gzip
cap is bumped 48000 -> 50000 B (lazy-loaded, not in the home-view payload). The
new row is in the spec-v43 Group-G appendix, so the Group-G original-block
citation count assertion is unaffected.

## 4. As-landed verification (gate plan)

The same green bar: `npm run lint` (every gate; the wiring lint must report **30
renderer modules / 581 tile-id entries**; the spec-v49 `check-readme-counts` gate
must agree at 581 tiles / 607 sitemap URLs), `npm test` (the unit suite, +1 test
-> 5,518), `npm run build` (581 tile + 24 group shells, 607-URL sitemap), `npm run
data:verify`, the worked-examples runner (+1 fixture), the 320 px shell audit (581
tile shells), and the full-catalog render-no-nan Chromium sweep plus the a11y gate
(the new tile verified clean, rendered output read to the digit).

This spec also records an **independent correctness re-audit of the spec-v40
calc-shop batch** (the ten machinist/fabricator/welder tiles): each formula and
empirical constant was re-derived from first principles -- machining-time (feed =
RPM x IPR; t = L / feed), turning MRR (12 x SFM x DOC x IPR = 4.32), surface
finish (Rt = f^2/8r = 100 uin), taper (atan((D-d)/2L) = 2.38594 deg), three-wire
(best wire 1/(2cos30) = 0.57735 x P; M = E + 3W - 1.51553 P), punch force
(perimeter x T x shear = 19634.95 lb), press-brake (575 x (UTS/60) x T^2/V =
8.984 tons/ft), weld duty cycle (60 x (250/300)^2 = 41.67%), and IIW carbon
equivalent (C + Mn/6 + ... = 0.38333) -- and all ten match. No correction needed;
the catalog's recent additions are confirmed correct, not merely self-consistent.

## 5. Roadmap position

v53 brings Group G to 49 tiles. The catalog at 581 is broad; the under-served
substantive groups are largely filled (S Legal sits behind the reviewed-data
gate, T Lab is comprehensive), so future tile work runs the live concept-check
hard before adding. The standing module-cap watch list carries `calc-kitchen.js`,
`calc-stage.js`, `calc-field.js`, `calc-cross.js` (93%), and `tools-data.js` (now
94% of the bumped 50000 B).
