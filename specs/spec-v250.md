# roughlogic.com Specification v250 -- Sprinkler Head Count and Spacing (NFPA 13) (calc-firesprinkler.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-01). Batch spec-v248..v250 (the fire-sprinkler system-design trio). This spec closes the
> batch: from the system demand to the heads that put it on the floor.**
> In-scope catalog expansion under the spec-v106 trades-only charter: laying out sprinkler heads to a maximum protection
> area and a maximum spacing is the sprinkler fitter's takeoff -- how many heads a room needs, how far apart, and how far
> off the walls. Adds one tile to **`calc-firesprinkler.js`** (Group F, trade `["fire"]`, beside `fire-pump-curve` and
> `sprinkler-system-demand`); no new module, group, or dependency. Inherits spec.md through spec-v249.md.
>
> **The gap, and the evidence for it.** The catalog prices sprinkler discharge (`sprinkler-density`, `sprinkler-k-factor`)
> and now the system demand (`sprinkler-system-demand`), but nothing lays the heads out. NFPA 13 caps both the protection
> area per head and the linear spacing between heads by hazard class -- 225 ft^2 and 15 ft for light hazard, 130 ft^2 and
> 15 ft for ordinary hazard, 100 ft^2 (and 12 ft) for extra hazard on a hydraulically calculated system -- and the head
> count falls out of whichever limit binds first. For ordinary hazard the 130 ft^2 area cap forces a spacing near 11.4 ft,
> tighter than the 15 ft linear cap, so a 40 by 30 ft room needs 12 heads rather than the 6 a naive 15 ft grid would give.
> The `sprinkler-precip-rate` tile is an irrigation-zone precipitation rate for landscaping, not a fire-sprinkler head
> layout, and no tile turns a room and a hazard class into a head count, a grid spacing, and the maximum distance to the
> walls.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The room length and width,
the maximum spacing, the governing spacing, and the maximum wall distance are lengths (ft); the maximum protection area
per head and the achieved area per head are areas (ft^2); the heads per line, the number of lines, and the total head
count are `dimensionless` counts; the coverage-ok flag is a boolean. The v18/v21 contract: any non-finite input, a
non-positive room length / width, a non-positive maximum spacing, or a non-positive area per head, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the layout relations by name; `editionNote` names **NFPA 13
(Standard for the Installation of Sprinkler Systems), 2022** (governing spacing `= min(max_spacing, sqrt(area_per_head))`,
heads per line `= ceil(length / spacing)`, lines `= ceil(width / spacing)`, total `= heads_per_line x lines`, achieved
area per head `= room_area / total`, max wall distance `= spacing / 2`), gives the hazard-class caps as editable (Light
225 ft^2 / 15 ft, Ordinary 130 ft^2 / 15 ft, Extra 100 ft^2 / 12 ft), and states that **this is a rectangular-bay
standard-spray-upright/pendent estimate -- obstructions, beams and the beam rule, sloped or high ceilings, small rooms,
extended-coverage and residential heads, and ESFR/storage layouts each have their own spacing and clearance rules, the
minimum spacing between heads (typically 6 ft, to prevent cold-soldering) is a separate check, and this is a takeoff aid,
not a stamped sprinkler layout** -- a qualified fire-protection designer and the AHJ govern.

## 2. The tile

### 2.1 `sprinkler-head-layout` -- Sprinkler Head Count and Spacing

```
inputs:
  room_length     ft     room length, ft
  room_width      ft     room width, ft
  area_per_head   ft2    maximum protection area per head, ft^2 (default 130, ordinary hazard)
  max_spacing     ft     maximum linear spacing between heads, ft (default 15)

spacing        = min(max_spacing, sqrt(area_per_head))
heads_per_line = ceil(room_length / spacing)
num_lines      = ceil(room_width / spacing)
total_heads    = heads_per_line * num_lines
room_area      = room_length * room_width
achieved_area_per_head = room_area / total_heads
max_wall_distance      = spacing / 2
coverage_ok    = achieved_area_per_head <= area_per_head
```

**Pinned worked example (ordinary-hazard storeroom, 40 by 30 ft).** Area per head 130 ft^2, max spacing 15 ft:
`spacing = min(15, sqrt(130)) = min(15, 11.40) = 11.40 ft` (the area cap binds, not the 15 ft linear cap);
`heads_per_line = ceil(40 / 11.40) = 4`; `num_lines = ceil(30 / 11.40) = 3`; `total = 4 x 3 = ` **12 heads**;
`achieved_area_per_head = 1,200 / 12 = 100 ft^2` (<= 130, coverage OK); `max_wall_distance = 11.40 / 2 = 5.70 ft`.
**Cross-check (same room, light hazard).** Area per head 225 ft^2, max spacing 15 ft: `spacing = min(15, sqrt(225)) =
min(15, 15) = 15 ft` (now the linear cap binds); `heads_per_line = ceil(40 / 15) = 3`; `num_lines = ceil(30 / 15) = 2`;
`total = ` **6 heads**; `achieved_area_per_head = 1,200 / 6 = 200 ft^2` (<= 225, OK). Same room, half the heads -- the
hazard class, through the protection-area cap, is what sets the head count, and for ordinary hazard the area cap, not the
15 ft spacing, is the limit that governs.

## 3. Wiring

A `tools-data.js` row (group `F`, trade `["fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the layout relations, `editionNote` naming NFPA 13 2022 with the hazard-class caps and the
obstruction / beam-rule / small-room / extended-coverage / minimum-spacing / not-a-layout caveats);
`test/fixtures/worked-examples.json` (the ordinary-hazard example + the light-hazard cross-check);
`test/fixtures/compute-map.js` (`sprinkler-head-layout` -> `computeSprinklerHeadLayout` in
`../../calc-firesprinkler.js`); `scripts/related-tiles.mjs` (-> `sprinkler-system-demand` / `sprinkler-density` /
`fire-pump-curve`); `data/search/aliases.json` ("sprinkler heads", "head spacing", "head count", "sprinkler layout",
"protection area", "coverage area", "NFPA 13 spacing", "sprinkler grid"); the id appended to the
`FIRESPRINKLER_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples and the error seams (non-finite, room length / width <= 0,
max spacing <= 0, area per head <= 0) plus the coverage-fail flag path. Raise the `calc-firesprinkler.js` size cap if
needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the non-positive-input error paths, the coverage-fail flag); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the spacing / heads-per-line /
lines / total / achieved-area stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (40 by 30 ft
ordinary hazard -> 12 heads at 11.40 ft, 5.70 ft to walls).

## 5. Roadmap position

Closes the fire-sprinkler system-design batch (v248..v250) and rounds out the `calc-firesprinkler.js` module started at
v248. Lays out the discharge density that `sprinkler-density` prices and that `sprinkler-system-demand` (v249) totals into
the flow the `fire-pump-curve` (v248) pump must feed -- pump, supply, and layout now form a closed design loop. A
minimum-spacing / cold-soldering check, an obstruction and beam-rule clearance tile, and an extended-coverage / ESFR
layout variant are deliberate future follow-ons. With this batch landed, the fire-sprinkler system-design cluster is
saturated at the screening-aid altitude the charter targets.
