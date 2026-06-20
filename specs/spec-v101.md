# roughlogic.com Specification v101 -- Electrician Design Bench: NEC Pull-Box Sizing and the Lumen-Method Luminaire Count (New Module calc-elecdesign.js, Group A, 2 New Tiles)

> **Implementation status: LANDED 2026-06-19 (catalog 659 -> 661; 25 groups; landed
> together with v102 + v103 as the field-service design bench pass, package 0.66.0, a
> minor stamp).** v101 inherits everything from spec.md through spec-v100.md and
> changes none of it. It adds two tiles to **Group A (Electrical)** and changes no existing
> tile's output. **No new group, no new dependencies, no telemetry, no AI, US standards
> only.** Both tiles land in a new **`calc-elecdesign.js`** bench (the design/layout work
> an electrician does before the rough-in), keeping `calc-electrical.js` off its cap -- see
> the §3 module note.
>
> **The gap, and the evidence for it.** Group A is the deepest group in the catalog (82
> rows): `box-fill`, `conduit-fill`, `voltage-drop`, `breaker-sizing`, conduit bending
> (`conduit-offset`, `conduit-saddle`, `conduit-90-stub`, `rolling-offset`), and the rest.
> But two everyday *design* numbers an electrician sizes off the print are missing. There is
> no **pull-box / junction-box sizing** tile: `box-fill` (NEC 314.16) is the cubic-inch
> conductor-volume fill of a device or outlet box; it does **not** size the *dimensions* of
> a pull or junction box for large raceways under **NEC 314.28**, which is a length/width
> minimum driven by the largest raceway, not a volume. A concept-check of the post-v100 live
> ids for `pull-box`, `junction`, `conduit-body`, and `wireway` returned nothing. And there
> is no **lumen-method** tile: `lighting-density` is a watts-per-square-foot energy-code
> check, `lux-to-footcandle` is a unit conversion, `lighting-beam` is stage photometry, and
> `projector-brightness` is AV; none answers the classic question "how many fixtures do I
> need to hit a target footcandle in this room?" -- the IES lumen method with a coefficient
> of utilization and a light-loss factor. These are daily numbers an electrician reaches for
> at layout and rough-in.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `pull-box-sizing` carries a dimensionless multiplier times a
  length (inches) to a length (inches); `lumen-method` carries an illuminance (footcandles,
  lumens per square foot) times an area (square feet) over a luminous flux (lumens) times
  two dimensionless factors to a dimensionless count, and the inverse count-to-footcandles.
  Every constant -- the 8x straight-pull and 6x angle-pull multipliers of NEC 314.28(A), and
  the footcandle = lumen-per-square-foot identity -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. For
  `pull-box-sizing`: a non-positive largest-raceway trade size returns `{ error }`; a
  negative same-row raceway sum returns `{ error }` (zero is valid -- a single raceway on
  the wall). For `lumen-method`: a non-positive footcandle target, area, lumens-per-
  luminaire, coefficient of utilization, or light-loss factor returns `{ error }`; a
  coefficient of utilization or light-loss factor outside the open interval (0, 1.5]
  returns `{ error }` (CU can exceed 1.0 with high-reflectance interreflection but is bounded
  to catch a fat-fingered entry); the luminaire count is rounded **up** to a whole fixture
  and the achieved footcandles are reported at that integer count.
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.general`** (these are
  design arithmetic; the code and the design standard govern, and the AHJ is the law).
  Sources are named, never reproduced: **NEC (NFPA 70) 314.28(A)(1) and (A)(2)** for the
  straight-pull and angle/U-pull minimums (the 8x and 6x multipliers and the same-row
  additive rule are stated, not quoted); and the **IES lumen method** (the zonal-cavity
  number-of-luminaires relation, with the coefficient of utilization read from the
  manufacturer's photometric report and the light-loss factor built from lamp-lumen
  depreciation and dirt depreciation). The note states that NEC 314.28 also requires the
  distance between raceway entries enclosing the same conductor to be at least 6x the larger
  raceway, and that the AHJ governs.
- Tile ids are kebab-case and checked against the post-v100 live ids. Neither collides with
  `box-fill` (Group A), `lighting-density` (Group A), `lux-to-footcandle` (Group A),
  `lighting-beam` (Group L stage), or any other live tile (see Section 3).

## 2. The tiles

### 2.1 `pull-box-sizing` -- NEC 314.28 Pull and Junction Box Sizing (Group A, calc-elecdesign.js)

The minimum box dimension for a pull or junction box on large raceways, the way an
electrician sizes it off the print: pick the largest raceway, then apply the straight-pull
or angle-pull rule.

```
inputs:
  pull_type           -    "straight" or "angle" (angle covers angle and U pulls)
  largest_raceway_in  L    trade size of the largest raceway on the wall (in)
  other_raceways_in   L    sum of the OTHER raceway trade sizes in the same row (in; default 0)

straight: min_dimension_in = 8 * largest_raceway_in
angle:    min_dimension_in = 6 * largest_raceway_in + other_raceways_in
between_same_conductor_in = 6 * largest_raceway_in   (always reported)
```

Outputs: the governing minimum box dimension (inches) for the chosen pull type, the
straight and angle minimums side by side for context, and the minimum distance between
raceway entries that enclose the same conductor. The note line states: 314.28(A)(1) sets a
straight-pull length of at least 8x the largest raceway; 314.28(A)(2) sets the distance
from each raceway entry to the opposite wall on an angle or U pull at 6x the largest
raceway plus the sum of the other raceways in that same row; the distance between raceway
entries enclosing the same conductor must be at least 6x the larger raceway; these are
*minimums* and the box's listed dimensions, conductor bending space, and the AHJ govern.

**Worked example (pinned).** A straight pull with a 3 in largest raceway: 8 x 3 = **24 in**
minimum box length. An angle pull on the same wall with two other 2 in raceways in the row
(other_raceways_in = 4): 6 x 3 + 4 = **22 in**; the distance between entries enclosing the
same conductor is 6 x 3 = **18 in**. Cross-check (an angle pull, single raceway, no others):
6 x 3 + 0 = **18 in**. Cross-check (a straight pull, 2 in raceway): 8 x 2 = **16 in**.
Degenerate inputs (largest_raceway_in <= 0, a negative other_raceways_in, non-finite) return
an error.

### 2.2 `lumen-method` -- Lumen-Method Luminaire Count (Group A, calc-elecdesign.js)

The number of fixtures to hit a target maintained footcandle level in a room, the IES way:
required light divided by the light each fixture actually delivers to the work plane.

```
inputs:
  target_fc         -    target maintained illuminance (footcandles)
  area_sqft         L^2  room area to light (ft^2)
  lumens_per_lum    -    initial lumens per luminaire (from the photometric report)
  cu                -    coefficient of utilization (0 < cu <= 1.5; default 0.7)
  llf               -    light-loss factor (0 < llf <= 1; default 0.8)

count_raw = (target_fc * area_sqft) / (lumens_per_lum * cu * llf)
count     = ceil(count_raw)
achieved_fc = count * lumens_per_lum * cu * llf / area_sqft
```

Outputs: the number of luminaires (rounded up), the exact (un-rounded) count for context,
the maintained footcandles actually achieved at the integer count, and the total installed
lumens. The note line states: the lumen method sizes the *average* maintained level over
the work plane, not a point value or uniformity; the coefficient of utilization comes from
the fixture's photometric report at the room's cavity ratio and surface reflectances; the
light-loss factor is the product of lamp-lumen depreciation and luminaire-dirt depreciation
for the maintenance interval; round up so the design meets the target at end of life; and a
photometric layout governs spacing and uniformity.

**Worked example (pinned).** A 40 ft x 30 ft office (area_sqft = 1200) at a 50 fc target,
5000 lumen troffers, cu = 0.7, llf = 0.8: count_raw = (50 x 1200) / (5000 x 0.7 x 0.8) =
60000 / 2800 = **21.43**, so **22 luminaires**; achieved = 22 x 5000 x 0.7 x 0.8 / 1200 =
61600 / 1200 = **51.3 fc**. Cross-check (a 100 ft x 50 ft warehouse, area 5000, 30 fc,
20000 lumen high-bays, cu 0.8, llf 0.85): count_raw = (30 x 5000) / (20000 x 0.8 x 0.85) =
150000 / 13600 = **11.03**, so **12 luminaires**; achieved = 12 x 20000 x 0.8 x 0.85 / 5000
= **32.6 fc**. Degenerate inputs (target_fc <= 0, area_sqft <= 0, lumens_per_lum <= 0, cu
or llf <= 0 or out of band, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v100 live tiles. `box-fill` (Group A) is the NEC 314.16
cubic-inch volume fill of a device/outlet box -- a different code section and a different
quantity (volume, not a length minimum); it does not size a 314.28 pull box.
`lighting-density` (Group A) is a watts-per-square-foot energy-code allowance,
`lux-to-footcandle` (Group A) is a unit conversion, `lighting-beam` (Group L) is stage
photometry, and `projector-brightness` is AV; none computes a lumen-method luminaire count.
No live tile sizes a pull/junction box or counts luminaires by the lumen method. **Both
ship** into the new `calc-elecdesign.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `A`; `pull-box-sizing`
trades `["electrical"]`, `lumen-method` trades `["electrical"]`); `tile-meta.js` `_TILES`;
a `citations.js` entry (the `GOVERNANCE.general` governance from Section 1; the formula
string; assumptions listing every bundled constant -- the 8x/6x NEC 314.28 multipliers and
the same-row additive rule, the footcandle = lumen-per-square-foot identity, and the
CU/LLF basis -- naming NEC 314.28 and the IES lumen method without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (`pull-box-sizing` -> `../../calc-elecdesign.js`;
`lumen-method` -> `../../calc-elecdesign.js`); `scripts/related-tiles.mjs`
(`pull-box-sizing` -> `box-fill` / `conduit-fill` / `cable-tray-fill`; `lumen-method` ->
`lighting-density` / `lux-to-footcandle` / `service-load`); `data/search/aliases.json`
(e.g. `pull-box-sizing`: "pull box", "junction box size", "314.28", "angle pull",
"straight pull"; `lumen-method`: "lumen method", "number of fixtures", "footcandles",
"how many lights", "coefficient of utilization"); a new `ELECDESIGN_RENDERERS` declare in
`app.js` carrying both ids; the `// dims:` annotations; and the regenerated v14 corpus +
tile-index. A `test/unit/bounds-fuzzer.test.js` block pins both worked examples, the
straight/angle branch, the round-up-and-achieved-fc path, and every error seam.

**Module note.** `calc-electrical.js` sits at ~48.7 KB gzipped against its 52,000 B cap
(~93.7%, already in WARN territory), so a third Group A tile does not belong there. Per
spec-v10 §H.1 the preferred remediation at a brushing cap is a per-bench split, the pattern
used by v72 (`calc-feeder.js`), v79 (`calc-powerquality.js`), and v88 (`calc-solar.js`).
This spec creates **`calc-elecdesign.js`**, a new electrical design/layout bench, with a
cap of **5,000 B** (current + ~20% headroom; the two small tiles build to roughly 2 KB
gzipped). It is lazy-loaded and not in the home-view first-paint payload. Group letter
(`A`) is independent of the module; both tiles keep `group: "A"`.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **661 tiles** and the matching sitemap URL count, and the
new `calc-elecdesign.js` cap is registered in `scripts/check-module-sizes.mjs`); `npm test`
(+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer block); `npm run
build` (661 tile shells, regenerated sitemap); `npm run data:verify`; the worked-examples
runner; the 320 px shell audit (the straight/angle minimums and the luminaire-count /
achieved-fc lines all wrap, not scroll, on a phone); and the full-catalog render-no-nan
Chromium sweep plus the a11y gate, with the rendered output read to the value (a 3 in
straight pull -> 24 in, the 3 in angle pull with two 2 in others -> 22 in; the 1200 ft^2
office at 50 fc / 5000 lm / 0.7 / 0.8 -> 22 luminaires, 51.3 fc).

## 5. Roadmap position

v101 opens an electrical design/layout bench with the two most-asked-for design numbers
that the rough-in tiles did not cover. Further growth should stay evidence-driven (a named
gap an electrician hits) -- candidates include a **conduit-body (LB/T) conductor count**, a
**receptacles/lighting-outlets per branch circuit** count (NEC 220.14), and a
**room-cavity-ratio helper** that feeds the lumen-method CU lookup; none ships without the
field need. The standing module-cap watch adds `calc-elecdesign.js` after this landing and
keeps `calc-electrical.js` on the split-watch list.
