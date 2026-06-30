# roughlogic.com Specification v215 -- Eave Ice-Barrier Membrane Coverage and Rolls (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED 2026-06-30. Batch spec-v215..v217 (roofing material takeoff -- the install-side gaps the
> catalog's shingle-only `roofing-squares` left: the eave ice barrier, the metal-panel alternative, and the
> ridge-cap-and-fastener accessories).**
> In-scope catalog expansion under the spec-v106 trades-only charter: eave ice barrier is installed by
> roofers. Adds one tile to **`calc-construction.js`** (Group E); no new module, group, or dependency.
> Inherits spec.md through spec-v214.md.
>
> **The gap, and the evidence for it.** `roofing-squares` orders the field shingles, the underlayment rolls,
> the drip edge, and the starter strip, and `attic-ventilation` and `gutter-downspout` handle the eave's air
> and water. But nothing in the catalog orders the one membrane the code makes mandatory at the eave in cold
> climates: the ice barrier. IRC R905.1.2 requires a self-adhering ice barrier from the lowest roof edge to a
> point at least 24 in inside the exterior wall line, measured up the slope -- and a deep overhang or a low
> pitch quietly pushes that coverage past a single 36 in course, so a one-roll-per-eave guess shorts the order.
> The catalog can felt a roof but cannot tell a roofer how many courses of ice-and-water the eave actually
> needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The eave length,
the overhang, the pitch rise, the roll width, the roll length, and the side lap are a length (`L`, in or ft);
the courses and the rolls are `dimensionless`. The slope factor is the dimensionless run-to-slope multiplier
`sqrt(rise^2 + 12^2) / 12`. The v18/v21 contract: any non-finite input, a non-positive eave length / roll
width / roll length, a negative overhang / side lap, a pitch rise outside 0-24 in per 12, or a side lap that
meets or exceeds the roll width (no net coverage per course) returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the coverage-and-roll relations by name; `editionNote` names **IRC
R905.1.2** (the ice-barrier extent: from the eave to 24 in inside the exterior wall line) and the
**ASTM D1970** self-adhering polymer-modified membrane standard, and states that **the ice barrier is required
only where the AHJ has adopted it (a history of ice forming at the eaves), the 24 in is measured to the inside
of the exterior wall line, valley and low-slope-transition coverage is a separate manual add, and this is a
material takeoff, not an installation detail** -- an ordering aid, not a flashing plan.

## 2. The tile

### 2.1 `ice-barrier-coverage` -- Eave Ice-and-Water Membrane Courses and Rolls

```
inputs:
  eave_length_ft L   total eave run to protect, ft (sum of all eaves)
  overhang_in    L   horizontal overhang from the exterior wall line to the eave edge, in
  pitch_rise     L   roof pitch, rise in inches per 12 of run (0-24)
  roll_width_in  L   membrane roll width, in   (default 36)
  roll_len_ft    L   membrane roll length, ft  (default 66.7 = a 2-square, 200 sq ft roll)
  side_lap_in    L   course-to-course up-slope lap, in (default 6)

slope_factor      = sqrt(pitch_rise^2 + 144) / 12
coverage_in       = (overhang_in + 24) * slope_factor      # 24 in inside the exterior wall line, IRC R905.1.2
effective_course  = roll_width_in - side_lap_in            # net width added by each course beyond the first
courses           = coverage_in <= roll_width_in
                      ? 1
                      : 1 + ceil((coverage_in - roll_width_in) / effective_course)
roll_lf           = courses * eave_length_ft
rolls             = ceil(roll_lf / roll_len_ft)
```

**Pinned worked example (typical 4/12, 12 in overhang).** A 40 ft eave run, 12 in overhang, 4/12 pitch,
36 in roll, 66.7 ft roll, 6 in side lap: `slope_factor = sqrt(16 + 144) / 12 = sqrt(160) / 12 = 1.054`;
`coverage = (12 + 24) * 1.054 = 36 * 1.054 = 37.95 in`; this exceeds the 36 in roll, so
`courses = 1 + ceil((37.95 - 36) / 30) = 1 + ceil(0.065) = 2`; `roll_lf = 2 * 40 = 80 ft`;
`rolls = ceil(80 / 66.7) = ceil(1.20) = ` **2 rolls** (2 courses up the eave).
**Cross-check (steep 12/12, 24 in overhang -- the third course).** Same 40 ft eave, but a 24 in overhang and a
12/12 pitch: `slope_factor = sqrt(144 + 144) / 12 = sqrt(288) / 12 = 1.4142`;
`coverage = (24 + 24) * 1.4142 = 48 * 1.4142 = 67.88 in`;
`courses = 1 + ceil((67.88 - 36) / 30) = 1 + ceil(1.06) = 3`; `roll_lf = 3 * 40 = 120 ft`;
`rolls = ceil(120 / 66.7) = ` **2 rolls** (3 courses). The deep overhang and steep slope add a whole third
course of membrane up the eave -- the same eave length, but half again the up-slope coverage, which is exactly
the shortfall a one-roll-per-eave guess misses.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["roofing","carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the coverage-and-roll relations, `editionNote` naming IRC R905.1.2
and ASTM D1970 and the AHJ-adoption / wall-line / valley-separate caveats);
`test/fixtures/worked-examples.json` (the 4/12 example + the steep-and-deep cross-check);
`test/fixtures/compute-map.js` (`ice-barrier-coverage` -> `computeIceBarrierCoverage` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `roofing-squares` / `roof-pitch` /
`gutter-downspout`); `data/search/aliases.json` ("ice barrier", "ice and water shield", "ice dam membrane",
"eave membrane", "self adhering underlayment", "ice guard"); the id appended to the existing construction
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, eave / roll dims <= 0,
negative overhang / side lap, pitch out of 0-24, side lap >= roll width). Raise the `calc-construction.js`
size cap by ~20 percent if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the single-course path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the slope-factor /
coverage / courses / rolls stack wraps on a phone); render-no-nan + a11y sweep, output read to the value
(40 ft / 12 in / 4-12 -> 2 courses, 2 rolls).

## 5. Roadmap position

Opens the roofing material-takeoff batch (v215..v217). Pairs with `roofing-squares` (field shingles) and
`gutter-downspout` (eave water) as the third eave order. `metal-roof-panels` (v216) is the metal alternative
to the shingle field; `ridge-cap-fasteners` (v217) closes the cap and nail accessories. A valley-membrane and
low-slope-transition sub-mode is a deliberate future follow-on.
