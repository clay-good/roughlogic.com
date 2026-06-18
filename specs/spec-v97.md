# roughlogic.com Specification v97 -- Hardscape Takeoff: Pavers and Segmental Retaining Wall (Group E, 2 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 651 -> 653; 25 groups; a minor stamp).** v97 inherits everything from spec.md through
> spec-v96.md and changes none of it. It adds two tiles to **Group E (Carpentry and
> Construction)** and changes no existing tile's output. **No new group, no new
> dependencies, no telemetry, no AI, US standards only.** Both land in `calc-finish.js`
> (the finish-and-site-carpentry take-off bench created in spec-v95) -- hardscape is the
> site-carpentry half of that bench.
>
> **The gap, and the evidence for it.** Group E moves and places bulk material --
> `aggregate` (cubic yards and tons from area, depth, and density), `excavation`,
> `asphalt-tonnage` -- and the new `calc-finish.js` does interior finish take-offs. What
> the catalog does **not** have is the hardscape take-off a landscaper or mason runs on
> a patio or a wall: the **paver patio** (pavers per square foot from the unit face,
> the count with a cut allowance, and the base-aggregate and bedding-sand volumes), and
> the **segmental retaining wall** (the blocks per course and the number of courses
> including the buried first course, the total and cap blocks, and the base-trench and
> drainage gravel). A concept-check against the post-v96 live ids for paver, paver-patio,
> retaining-wall, segmental, and wall-block returned nothing. `aggregate` gives bulk
> cubic yards from a single area-and-depth, but it does not count pavers, lay out wall
> courses, or split a job into base versus bedding versus drainage gravel. These two are
> daily estimates for hardscape crews, and the catalog has neither.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `paver-patio` carries an area over a unit face area to a
  dimensionless paver count (times a waste factor), and an area times a depth (length)
  to a volume (cubic yards); `retaining-wall-block` carries a length over a block length
  to a dimensionless course count, a height over a block height to a dimensionless
  number of courses, their product to a total block count, and length-by-width-by-depth
  products to base and drainage gravel volumes. Every constant -- the 144 sq in per sq
  ft, the 27 cu ft per cu yd (and the combined 324 for area-inches to cubic yards), the
  1 in per ft embedment rule, and the standard base-trench and drainage-zone dimensions
  -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive area, paver length or width, wall length, exposed height, block length,
  or block height returns `{ error }`. A negative depth or waste returns `{ error }`.
  Paver, course, and block counts are `ceil` of finite ratios. The buried first course
  is the greater of the 1-in-per-foot embedment and one full block height (you bury at
  least one course). The retaining-wall tile carries an **advisory flag** when the
  exposed height exceeds about 4 ft (or whenever there is a slope or surcharge above):
  the flag does not change the count, it states that such walls need an engineered
  design with geogrid.
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.general`** (a material
  take-off is construction arithmetic). The retaining-wall tile additionally carries the
  engineered-design advisory above; it is a *material count*, not a wall design. Sources
  are named, never reproduced: the **ICPI interlocking-paver** base and bedding
  guidance (a compacted aggregate base of about 4 to 6 in for pedestrian and 8 to 12 in
  for vehicular, about 1 in of bedding sand, and roughly a 5 percent cut allowance,
  more for herringbone and curves); and the **segmental retaining-wall manufacturer**
  guidance (Allan Block / Versa-Lok: the block face sizes, a leveling pad about 2 ft
  wide by 6 in deep, a drainage zone of clean gravel about 12 in wide behind the block
  for the full height, and a buried first course of about 1 in per 1 ft of wall height).
  The depths, waste, and block sizes are representative defaults the user edits, and the
  loose-versus-compacted note (order roughly 10 to 15 percent over the in-place volume)
  is stated as guidance.
- Tile ids are kebab-case and checked against the post-v96 live ids. Neither collides
  with `aggregate`, `excavation`, `asphalt-tonnage`, `masonry-count`, or any Group E
  take-off tile (see Section 3).

## 2. The tiles

### 2.1 `paver-patio` -- Paver Patio Takeoff (pavers, base, and bedding sand) (Group E, calc-finish.js)

From the patio area and the paver face, the pavers to order with a cut allowance, and
the compacted base-aggregate and bedding-sand volumes underneath.

```
inputs:
  area_sqft        L    patio area (sq ft)
  paver_length_in  L    paver face length (in)
  paver_width_in   L    paver face width (in)
  base_depth_in    L    compacted base depth (in; default 6; 4-6 walkway, 8-12 driveway)
  sand_depth_in    L    bedding sand depth (in; default 1)
  waste_pct        -    paver cut / breakage allowance (percent; default 5; ~10 for herringbone/curves)

pavers_per_sqft = 144 / (paver_length_in * paver_width_in)
pavers          = ceil(area_sqft * pavers_per_sqft * (1 + waste_pct / 100))
base_cuyd       = area_sqft * base_depth_in / 324
sand_cuyd       = area_sqft * sand_depth_in / 324
```

Outputs: the pavers per square foot, the pavers to order with waste, and the base and
bedding-sand volumes in cubic yards. The note line states: pavers per square foot are
144 over the face area in square inches (a 4 x 8 in paver is 4.5 per sq ft); add about 5
percent for cuts on a straight pattern and nearer 10 percent for herringbone, diagonals,
and curves; the base carries the load -- about 4 to 6 in compacted for a walkway or
patio and 8 to 12 in for a driveway, over about 1 in of bedding sand; cubic yards are
the area times the depth in inches over 324; and aggregate is ordered loose, so add
roughly 10 to 15 percent over these in-place volumes for compaction.

**Worked example (pinned).** A 200 sq ft patio, 4 x 8 in pavers, a 6 in base, 1 in sand,
5 percent waste: pavers per sq ft = 144 / 32 = **4.5**; pavers = ceil(200 x 4.5 x 1.05)
= ceil(945) = **945**; base = 200 x 6 / 324 = **3.70 cu yd**; sand = 200 x 1 / 324 =
**0.62 cu yd**. Cross-check (6 x 9 in pavers): pavers per sq ft = 144 / 54 = **2.67**,
pavers = ceil(200 x 2.67 x 1.05) = ceil(560) = **560**. Cross-check (a driveway base, 10
in): base = 200 x 10 / 324 = **6.17 cu yd**. Degenerate inputs (area_sqft <= 0, a paver
dimension <= 0, a negative depth or waste, non-finite) return an error.

### 2.2 `retaining-wall-block` -- Segmental Retaining Wall Takeoff (blocks, caps, and gravel) (Group E, calc-finish.js)

From the wall run and exposed height and the block face, the blocks per course and the
number of courses (with the buried first course), the total and cap blocks, and the
base-trench and drainage gravel.

```
inputs:
  wall_length_ft   L    wall run (ft)
  exposed_height_ft L   wall height above grade (ft)
  block_length_in  L    block face length (in; default 18 -- e.g. Allan Block; 16 -- Versa-Lok)
  block_height_in  L    block face height (in; default 8; 6 -- Versa-Lok)

buried_in     = max(exposed_height_ft * 1.0, block_height_in)     (1 in per ft, >= one course)
total_height_in = exposed_height_ft * 12 + buried_in
courses       = ceil(total_height_in / block_height_in)
blocks_per_row= ceil(wall_length_ft * 12 / block_length_in)
total_blocks  = courses * blocks_per_row
cap_blocks    = blocks_per_row                                    (one finishing row)
base_cuyd     = wall_length_ft * 2.0 * 0.5 / 27                   (2 ft wide x 6 in deep pad)
drain_cuyd    = wall_length_ft * 1.0 * (total_height_in / 12) / 27 (12 in zone, full height)
over_4ft      = exposed_height_ft > 4                             (advisory: engineer + geogrid)
```

Outputs: the blocks per course, the number of courses (including the buried first
course), the total blocks, the cap blocks, the base-trench gravel and the drainage
gravel in cubic yards, and the engineered-design advisory flag. The note line states:
bury the first course about 1 in for every 1 ft of wall height (at least one full
course) so the wall has a footing in the ground; lay a compacted leveling pad about 2 ft
wide and 6 in deep of crushed stone; backfill a drainage zone of clean gravel about 12
in wide behind the block for the full height, with a perforated drain at the toe vented
to daylight; cap the top course with adhesive; and a wall over about 4 ft, or any wall
with a slope or load above it, needs an engineered design with geogrid -- this tile
counts material, it does not design the wall.

**Worked example (pinned).** A 30 ft wall, 3 ft exposed, Allan Block 18 x 8 in: buried =
max(3 x 1, 8) = **8 in** (one course governs); total height = 36 + 8 = 44 in; courses =
ceil(44 / 8) = **6**; blocks per course = ceil(30 x 12 / 18) = ceil(20) = **20**; total =
6 x 20 = **120 blocks**; caps = **20**; base = 30 x 2.0 x 0.5 / 27 = **1.11 cu yd**;
drainage = 30 x 1.0 x (44 / 12) / 27 = **4.07 cu yd**; under 4 ft, no advisory.
Cross-check (Versa-Lok 16 x 6 in, same wall): blocks per course = ceil(360 / 16) =
ceil(22.5) = **23**; buried = max(3, 6) = **6 in**; total = 42 in; courses = ceil(42 / 6)
= **7**; total = 7 x 23 = **161 blocks**. Cross-check (a 5 ft exposed wall, 18 x 8 in):
buried = max(5, 8) = **8 in**; total = 68 in; courses = ceil(68 / 8) = **9**; total = 9 x
20 = **180 blocks**, and the **over-4-ft advisory flags** (engineer and geogrid).
Degenerate inputs (wall_length_ft <= 0, exposed_height_ft <= 0, a block dimension <= 0,
non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v96 live tiles. `aggregate` returns bulk cubic yards
and tons from one area-and-depth-and-density; it does not count pavers per square foot,
lay out wall courses, or split a hardscape job into base, bedding, and drainage gravel
-- `paver-patio` and `retaining-wall-block` produce those distinct, multi-part outputs.
`masonry-count` counts brick and CMU for a *vertical wall by mortar joint*, not
segmental dry-stacked retaining block with its embedment and gravel zones. `excavation`
and `asphalt-tonnage` are unrelated bulk-earth and paving tiles. No live tile does a
paver or segmental-retaining-wall take-off. **Both ship**, into `calc-finish.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `E`, trades
`["hardscape", "landscaping", "masonry"]`); `tile-meta.js` `_TILES`; a `citations.js`
entry (the `GOVERNANCE.general` governance and the retaining-wall engineered-design
advisory from Section 1; the formula string; assumptions listing every bundled constant
-- the 144 sq in per sq ft, the 324 area-inch-to-cubic-yard constant, the base/sand
depth defaults and the 5/10 percent paver waste, the 1-in-per-foot embedment, the 2 ft x
6 in base pad and 12 in drainage zone, and the loose-versus-compacted note -- naming the
ICPI and the Allan Block / Versa-Lok references without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-finish.js`);
`scripts/related-tiles.mjs` (`paver-patio` -> `aggregate` / `retaining-wall-block` /
`square-footage`; `retaining-wall-block` -> `paver-patio` / `aggregate` /
`masonry-count`); `data/search/aliases.json` (e.g. `paver-patio`: "paver calculator",
"pavers per square foot", "patio base", "bedding sand", "paver count";
`retaining-wall-block`: "retaining wall", "wall block", "segmental wall", "allan block",
"versa-lok"); the `app.js` `FINISH_RENDERERS` declare (created in v95) gains both ids;
the `// dims:` annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins both worked examples, every `ceil` count,
the buried-course `max` seam, the over-4-ft advisory flag, and every error seam.

**Module note.** `calc-finish.js` (the v95 finish-and-site-carpentry bench) is the home
-- hardscape is its site-carpentry half. The two tiles fit within the module's headroom;
if the as-built size crosses the v95 cap, this spec authorizes a documented bump (the
v95 cap was set at about 6,000 B with the standard +20 percent headroom; +2 hardscape
tiles may warrant raising it to about **9,000 B**). The group letter (`E`) is
independent of the module; both tiles keep `group: "E"`.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **653 tiles** and the matching sitemap URL count);
`npm test` (+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (653 tile shells, regenerated sitemap); `npm run data:verify`;
the worked-examples runner; the 320 px shell audit (the pavers / base / sand lines and
the blocks / courses / caps / gravel lines all wrap, not scroll, on a phone); and the
full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered output
read to the value (200 sq ft of 4 x 8 in pavers -> 945 pavers, 3.70 cu yd base; a 30 ft
x 3 ft Allan Block wall -> 120 blocks, 20 caps, 4.07 cu yd drainage gravel).

## 5. Roadmap position

v97 lands the hardscape take-off in the v95 finish-and-site module, linking the new
tiles to `aggregate` (which still serves a single bulk area-and-depth) and to
`square-footage`. Further growth should stay evidence-driven (a named gap a hardscape
crew hits) -- candidates include a **paver-restraint and polymeric-sand** add-on take-off,
a **stair / step-block** count, and a **mulch-and-soil bag** tile (only if it adds the
bag-count and material-default-depth value the generic `aggregate` lacks, to avoid a
pure duplicate). The standing module-cap watch now includes `calc-finish.js`.
