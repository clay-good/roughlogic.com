# roughlogic.com Specification v57 — Equal Spacing Layout (1 New Tile)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.51.0, a
> minor; catalog 583 -> 584, wiring lint 31 renderer modules / 584 tile-id
> entries).** v57 is a catalog-growth spec in the single-tile-deepening lineage.
> It inherits everything from spec.md through spec-v56.md and changes none of it.
>
> v57 deepens **Group G (Cross-Trade Utilities)** with one of the most-performed
> layout calculations on a job site that the catalog did not cover: spacing a row
> of items evenly in a run. **No new group, no new module, no new dependencies,
> no telemetry, no AI, US standards only.** It lands in `calc-layout.js`, the
> layout & shop-geometry bench, next to `decimal-to-fraction` and the polygon /
> bolt-circle / arc family.
>
> **The gap, and the evidence for it.** Every deck railing, fence, wainscot,
> shelf-pin row, and stud wall needs the same arithmetic: how many balusters /
> pickets / studs fit a run, and what is the exact even gap. The catalog had
> nothing for it -- `decimal-to-fraction` converts one measurement,
> `deck-ledger-fasteners` is a code-table spacing for one specific connector, and
> no tile divides a run into equal parts. A concept-check for
> spacing / baluster / picket / divide-into-parts returned nothing.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. (Lengths are `L`; the count and mode are dimensionless.)
- The v18/v21 tile contract applies: a non-positive run, a negative item width, a
  non-positive max gap (max-gap mode), a count below 1 (count mode), or any
  non-finite input returns `{ error }`. The position list is bounded to 200
  entries so a large count cannot build an unbounded array; an over-fitting count
  returns a finite negative gap flagged `fits: false`, not an error or a leak.
- The v19/v22 citation discipline applies; the entry is first-principles
  (public domain) with `GOVERNANCE.general`.
- The tile id is kebab-case and checked against the 583 live ids:
  `equal-spacing` does not collide and is not a concept-duplicate (§3).

## 2. The tile

### `equal-spacing` — Equal Spacing Layout (Group G, calc-layout.js)

```
gap   = (run - N x width) / (N + 1)        N items, N+1 equal gaps (both ends)
pitch = gap + width                        center-to-center
max-gap mode: N = ceil((run - gmax) / (width + gmax))   smallest N with gap <= gmax
count mode:   N given; gap follows; gap < 0 means the items do not fit
positions (item centers from the start): (i-1)(gap+width) + gap + width/2,  i = 1..N
  for width = 0 (layout marks) the i-th division point is i x gap
```

Two modes: **count from a maximum gap** (the railing case -- the smallest number
of items whose gap stays at or below a limit) and **gap from a desired count**
(the divide-a-run-into-equal-parts case). Item width 0 lays out division points /
marks. The tile reports the count, the exact gap, the center-to-center pitch, and
the item-center positions from a single datum.

**Worked example (pinned).** A 60 in run between posts, 1.5 in balusters, 4 in
maximum gap (the IRC R312.1.3 4 in sphere rule): `N = ceil((60 - 4)/(1.5 + 4)) =
ceil(10.18) = 11` balusters; `gap = (60 - 11 x 1.5)/12 = 3.625 in`; pitch
`3.625 + 1.5 = 5.125 in`. (Ten balusters would give a 4.09 in gap, over the
limit, so 11 is the minimum.) Cross-checks: dividing a 100 in run into 6 equal
parts (5 marks, width 0) gives a 16.667 in gap with the middle mark at 50 in; six
2 in items in a 10 in run report a negative gap flagged "does not fit." Degenerate
inputs (run <= 0, width < 0, max gap <= 0, count < 1, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the 583 live tiles: `decimal-to-fraction` converts a
single measurement; `deck-ledger-fasteners` gives an IRC-table fastener spacing
for one connector (not even infill spacing); no tile spaces a row of items evenly
or divides a run into equal parts. **Ships.** It joins the layout bench in
`calc-layout.js`.

Per-tile wiring: a `tools-data.js` row (group `G`), `tile-meta.js` `_TILES`,
`citations.js`, `test/fixtures/worked-examples.json`,
`test/fixtures/compute-map.js` (module path `../../calc-layout.js`),
`scripts/related-tiles.mjs` (`equal-spacing` -> `decimal-to-fraction` /
`stair-stringer-layout` / `square-footage`), `data/search/aliases.json` (5
aliases), the `app.js` `LAYOUT_RENDERERS` declare, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js` block
pinning the baluster example, the count-mode division, the over-fit flag, and the
error seams. `calc-layout.js` is at 91.5% of its 13500 B cap after the row -- no
bump, but it joins the watch list.

## 4. As-landed verification (gate plan)

The same green bar: `npm run lint` (every gate; the wiring lint reports **31
renderer modules / 584 tile-id entries**; the spec-v49 `check-readme-counts` gate
agrees at 584 tiles / 610 sitemap URLs), `npm test` (the unit suite, +1 test
-> 5,521), `npm run build` (584 tile + 24 group shells, 610-URL sitemap), `npm run
data:verify`, the worked-examples runner (+1 fixture), the 320 px shell audit (584
tile shells), and the full-catalog render-no-nan Chromium sweep plus the a11y gate
(the new tile verified clean, rendered output read to the digit: 11 balusters,
3.625 in gap, 5.125 in pitch).

## 5. Roadmap position

v57 brings Group G to 51 tiles. The catalog at 584 is broad and the
layout/measurement bench is now well-rounded. The standing module-cap watch list:
`calc-layout.js` (91.5% after this row), `tools-data.js` (95% of the 50000 B cap),
`calc-kitchen.js`, `calc-stage.js`, `calc-field.js`, and `calc-construction.js`
(94%, the next per-tile split candidate if Group E grows).
