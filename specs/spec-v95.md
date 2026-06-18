# roughlogic.com Specification v95 -- Tile-Setting and Resilient-Flooring Takeoff (Group E, 2 New Tiles, New `calc-finish.js` Module)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 647 -> 649; 25 groups; modules 49 -> 50; a minor stamp).** v95 inherits everything
> from spec.md through spec-v94.md and changes none of it. It adds two tiles to **Group
> E (Carpentry and Construction)** and changes no existing tile's output. **No new
> group, no new dependencies, no telemetry, no AI, US standards only.** Both land in a
> **new module `calc-finish.js`** (`FINISH_RENDERERS`), the finish-and-site-carpentry
> take-off bench named as the natural future home in the spec-v94 §3 module note and §5
> roadmap (the spec-v70..v89 split precedent). Establishing it here relieves the
> standing `calc-construction.js` cap watch instead of bumping that module again.
>
> **The gap, and the evidence for it.** Group E has a deep take-off bench, and v94 adds
> fencing, but two of the most common interior-finish take-offs there are remain
> missing. `tile-count` counts tile (with waste) and estimates the grout *volume* in
> cubic inches; it does **not** size the **thin-set setting mortar** -- the bags of
> mortar a setter buys, which depend entirely on the *trowel notch* (a 1/4 in square
> notch covers roughly twice the area of a 1/2 in notch). And nothing in the catalog
> does a **resilient / luxury-vinyl-plank flooring take-off**: the *boxes* to order from
> the room area and the box coverage, the **waste allowance by install pattern**
> (straight versus a 45-degree diagonal versus herringbone), and the **last-row /
> starting-row balance** that decides whether the first course must be ripped so the
> room does not end on a sliver. A concept-check against the post-v94 live ids for
> flooring, flooring-takeoff, thinset, thin-set, mortar-coverage, and lvt returned
> nothing. `paint-coverage` does gallons per coat; `mortar-mix` does *masonry* mortar
> from a brick/CMU count (a different product and trade); `tile-count` does tile and
> grout volume, not thin-set bags and not resilient flooring. These two are daily
> estimates for tile setters and floor installers, and the catalog has neither.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `thinset-coverage` carries an area over a per-bag coverage
  (area) to a dimensionless bag count, with a waste fraction; `flooring-takeoff`
  carries an area times a waste factor over a per-box coverage (area) to a dimensionless
  box count, and a width (length) over a plank width (length) to a dimensionless row
  count and a last-row remainder (length). Every constant -- the 12 in per foot, the
  trowel-notch coverage figures (about 95, 63, and 45 sq ft per 50-lb bag), and the
  pattern waste fractions (about 10, 15, and 17 percent) -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive area, room length or width, per-bag or per-box coverage, or bag weight
  returns `{ error }`. A negative waste percent returns `{ error }`. Bag and box counts
  are `ceil` of finite ratios (you cannot buy a fraction of a bag or a box). The
  last-row outputs are `null` when no plank width is given (the box count still
  computes); a remainder that is already comfortable (at least a third of a plank, the
  common rip threshold) returns a `rip_needed` flag of false with the full plank width.
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.general`** (a
  material take-off is construction arithmetic, not a structural design). Sources are
  named, never reproduced: the **manufacturer thin-set coverage charts** (Custom
  Building Products / Mapei / Laticrete) that tie a square-notch trowel size to the
  square feet a 50-lb bag covers, with the ANSI A108 minimum mortar-contact note (about
  80 percent in dry areas, 95 percent in wet or exterior); the **published flooring
  waste rules of thumb** (about 10 percent for a straight lay, 15 percent for a
  diagonal, 17 percent for herringbone, more around many doorways and obstacles); and
  the **standard last-row balancing rule** (when the final strip would be narrower than
  about a third of a plank, rip the first row so the first and last rows match). The
  coverage figures, box size, and waste percents are representative defaults the
  estimator edits; every value is an editable input.
- Tile ids are kebab-case and checked against the post-v94 live ids. Neither collides
  with `tile-count`, `mortar-mix`, `paint-coverage`, `square-footage`, or any Group E
  take-off tile (see Section 3).

## 2. The tiles

### 2.1 `thinset-coverage` -- Thin-Set Mortar Bags by Trowel Size (Group E, calc-finish.js)

The bags of thin-set a tile job needs, sized off the trowel notch the way a setter
actually buys it. `tile-count` gives the tile and the grout volume; this gives the
setting mortar.

```
inputs:
  area_sqft            L    area to be tiled (sq ft)
  trowel               -    square-notch trowel size (select): 1/4 in -> 95 sq ft/bag,
                            1/4 x 3/8 in -> 63 sq ft/bag, 1/2 in -> 45 sq ft/bag
  coverage_per_bag     L    optional override of the per-bag coverage (sq ft per 50-lb bag; 0 = use trowel)
  bag_weight_lb        F    bag weight the coverage is rated at (lb; default 50)
  waste_pct            -    waste / mixing-loss allowance (percent; default 10)

cov_per_bag = coverage_per_bag > 0 ? coverage_per_bag : trowel_table[trowel]
order_area  = area_sqft * (1 + waste_pct / 100)
bags        = ceil(order_area / cov_per_bag)
```

Outputs: the per-bag coverage used, the order area with waste, and the bags of thin-set
to buy. The note line states: thin-set coverage is set by the *trowel notch*, not the
tile -- a 1/4 in square notch spreads about 95 sq ft per 50-lb bag, a 1/4 x 3/8 in notch
about 63, and a 1/2 in notch about 45, because a deeper notch leaves more mortar; large
or uneven tile wants a deeper notch and back-buttering, which cuts the coverage
further; the code wants about 80 percent mortar contact in dry areas and 95 percent in
wet or exterior, so do not stretch a bag; and this is the *setting* mortar -- `tile-count`
gives the tile and the grout, and `mortar-mix` is the masonry mortar for brick and
block, a different product.

**Worked example (pinned).** 200 sq ft, a 1/4 x 3/8 in trowel (63 sq ft per bag), 10
percent waste: order area = 200 x 1.10 = **220 sq ft**; bags = ceil(220 / 63) =
ceil(3.49) = **4 bags**. Cross-check (a 1/2 in notch for large tile, 45 sq ft per bag):
bags = ceil(220 / 45) = ceil(4.89) = **5 bags**. Cross-check (a 1/4 in notch for mosaic,
95 sq ft per bag): bags = ceil(220 / 95) = ceil(2.32) = **3 bags**. Degenerate inputs
(area_sqft <= 0, a per-bag coverage <= 0, bag_weight_lb <= 0, a negative waste,
non-finite) return an error.

### 2.2 `flooring-takeoff` -- Resilient / LVP Flooring Boxes, Waste, and Last Row (Group E, calc-finish.js)

From the room and the box coverage, the boxes of plank or tile to order at the waste
allowance for the install pattern, and -- when a plank width is given -- the last-row
balance that tells you whether to rip the first course.

```
inputs:
  room_length_ft   L    room length (ft)
  room_width_ft    L    room width (ft)
  box_coverage_sqft L   coverage per carton (sq ft; default 20)
  pattern          -    install pattern (select): straight -> 10%, diagonal -> 15%, herringbone -> 17%
  waste_pct        -    optional override waste (percent; 0 = use pattern)
  plank_width_in   L    optional plank face width, for the last-row balance (in; 0 = off)

field_area  = room_length_ft * room_width_ft
waste       = waste_pct > 0 ? waste_pct : pattern_table[pattern]
order_area  = field_area * (1 + waste / 100)
boxes       = ceil(order_area / box_coverage_sqft)

# last-row balance (only when plank_width_in > 0), across the room width:
width_in    = room_width_ft * 12
full_rows   = floor(width_in / plank_width_in)
remainder   = width_in - full_rows * plank_width_in
rip_needed  = remainder > 0 and remainder < plank_width_in / 3
start_width = rip_needed ? (remainder + plank_width_in) / 2 : plank_width_in
```

Outputs: the field area, the waste percent applied, the order area, the boxes to buy,
and -- when a plank width is given -- the number of full rows, the leftover last-row
width, and whether to rip the first row (with the balanced start width). The note line
states: order the field area plus a waste allowance set by the pattern -- about 10
percent straight, 15 percent on a 45-degree diagonal, 17 percent for herringbone,
because every angled plank gets a miter cut and the drop-offs do not reuse; add a few
points more for many doorways and obstacles; floating floors need a 1/4 to 3/8 in
expansion gap at the perimeter that the baseboard hides; and if the last row would come
out narrower than about a third of a plank, rip the *first* row so the room starts and
ends on matching widths -- a sliver at the wall looks like a mistake.

**Worked example (pinned).** A 12 ft x 15 ft room, 20 sq ft cartons, a straight lay (10
percent), 7.5 in planks: field = 180 sq ft; order = 180 x 1.10 = **198 sq ft**; boxes =
ceil(198 / 20) = ceil(9.9) = **10 boxes**. Last row: width = 12 x 12 = 144 in; full rows
= floor(144 / 7.5) = **19** (142.5 in); remainder = **1.5 in**, which is under 7.5 / 3 =
2.5 in, so **rip the first row** to (1.5 + 7.5) / 2 = **4.5 in**. Cross-check (the same
room laid diagonal, 15 percent): order = 180 x 1.15 = **207 sq ft**, boxes = ceil(207 /
20) = ceil(10.35) = **11 boxes**. Cross-check (a 6 in plank in the same room): full rows
= floor(144 / 6) = **24** exactly, remainder = **0**, so the last row is a full plank and
**no rip** is needed. Degenerate inputs (room_length_ft <= 0, room_width_ft <= 0,
box_coverage_sqft <= 0, a negative waste, non-finite) return an error; a plank_width_in
of 0 returns `null` last-row outputs.

## 3. Concept-check and wiring

Concept-checked against the post-v94 live tiles. `tile-count` counts tile with a waste
allowance and estimates the grout volume in cubic inches; it does not size the thin-set
setting mortar in bags (which depends on the trowel notch, not the tile), so
`thinset-coverage` is a different quantity and a non-overlapping companion. `mortar-mix`
sizes *masonry* mortar from a brick or CMU count -- a different product (Portland/lime
masonry mortar, not thin-set) and trade. `square-footage` and `paint-coverage` do area
and paint, not flooring boxes or the last-row layout. No live tile sizes thin-set bags
by trowel or does a resilient-flooring box take-off with pattern waste and a last-row
balance. **Both ship**, into the new `calc-finish.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `E`, trades
`["flooring", "tile", "carpentry"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(the `GOVERNANCE.general` governance from Section 1; the formula string; assumptions
listing every bundled constant -- the trowel-notch coverage figures, the 50-lb bag
basis and the ANSI A108 mortar-contact note, the pattern waste percents, the box size,
the 12 in per foot, and the one-third-plank rip threshold -- naming the manufacturer
thin-set charts and the standard flooring-waste and last-row references without
reproduction); `test/fixtures/worked-examples.json` (every pinned example and
cross-check); `test/fixtures/compute-map.js` (module path `../../calc-finish.js`);
`scripts/related-tiles.mjs` (`thinset-coverage` -> `tile-count` / `flooring-takeoff` /
`mortar-mix`; `flooring-takeoff` -> `tile-count` / `thinset-coverage` /
`square-footage`); `data/search/aliases.json` (e.g. `thinset-coverage`: "thinset",
"thin-set", "tile mortar", "mortar coverage", "trowel size"; `flooring-takeoff`:
"flooring calculator", "lvp", "vinyl plank", "flooring boxes", "flooring waste"); the
`app.js` declares a new **`FINISH_RENDERERS`** group for `./calc-finish.js` carrying
both ids; the `// dims:` annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins both worked examples, every `ceil` count,
the `null` last-row branch, the rip-versus-no-rip seam, and every other error seam.

**Module note (new module).** `calc-finish.js` is a new lazy-loaded renderer module --
the finish-and-site-carpentry take-off bench the spec-v94 §3/§5 roadmap names. Creating
it now (rather than bumping `calc-construction.js`, which sits at its 62,000 B cap after
v94) follows the spec-v70..v89 split precedent and gives Group E finish/site tiles a
home with headroom. Its `scripts/check-module-sizes.mjs` cap is set at about **6,000 B**
(the two tiles build to roughly 3 to 4 KB gzipped, plus the spec-v70 +20 percent
headroom convention); it is **not in the home-view first-paint payload** (the spec-v10
§H.2 budget ticks only from the `app.js` declare change). `scripts/build.mjs` `FILES`,
`sw.js` precache `SHELL_ASSETS`, and `scripts/check-dimensions.mjs` `GRADUATED_MODULES`
gain `calc-finish.js`. Group letter (`E`) is independent of the module; both tiles keep
`group: "E"`. Subsequent finish/site specs (v96..v98) target this same module.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **649 tiles** and **50 modules** and the matching
sitemap URL count); `npm test` (+2 worked-example fixtures and their cross-checks; the
new bounds-fuzzer block; one new `FINISH_RENDERERS` row); `npm run build` (649 tile
shells, +1 dist module, regenerated sitemap); `npm run data:verify`; the worked-examples
runner; the 320 px shell audit (the coverage / order-area / bags lines and the boxes /
rows / last-row lines all wrap, not scroll, on a phone); and the full-catalog
render-no-nan Chromium sweep plus the a11y gate, with the rendered output read to the
value (200 sq ft at a 1/4 x 3/8 in trowel -> 4 bags; 12 x 15 ft straight in 20 sq ft
boxes -> 10 boxes and a 4.5 in ripped first row).

## 5. Roadmap position

v95 opens the finish-and-site-carpentry module the v94 roadmap named, landing the two
most-requested interior-finish take-offs (thin-set bags and resilient-flooring boxes)
and linking them to the existing `tile-count`. Further growth should stay
evidence-driven (a named gap a tile setter or floor installer hits) -- the next
candidates are a **self-leveling underlayment** bag take-off (bags by area, depth, and a
maker's yield) and a **baseboard / trim and transition-strip** linear take-off; both
would land in `calc-finish.js` beside these. The standing module-cap watch continues on
`citations.js` and `tools-data.js` (the flat registries) and the next renderer-split
candidates (`calc-construction.js` and `calc-cross.js`).
