# roughlogic.com Specification v60 -- Water-Loss Documentation (2 New Tiles)

> **Implementation status: OPEN (proposed 2026-06-13; targets package 0.54.0, a
> minor; catalog 588 -> 590, Group D 23 -> 25).** v60 inherits everything from
> spec.md through spec-v59.md and changes none of it. It assumes v58 and v59 have
> landed (catalog base 588).
>
> v60 completes the Group D batch with the two documentation calculators that book-
> end a water job: the **dry-standard check** (is this material dry yet, measured
> against an unaffected reference) and the **flood-cut take-off** (how much drywall,
> baseboard, and insulation comes out at a given cut height). The suite tracks the
> drying *process* (`drying-log`, `grains-removed`) but had no tile for the two
> documentation numbers an estimator writes on the moisture map: the dry goal per
> material, and the demolition quantity. **No new group, no new dependencies, no
> telemetry, no AI, US standards only.** Both land in `calc-restoration.js`.
>
> **The gap, and the evidence for it.** A concept-check for
> dry-standard / dry-goal / moisture-content-goal / flood-cut / demolition-takeoff
> returned nothing. `drying-goal` targets indoor *air* GPP (a psychrometric set
> point), not the *material* moisture-content dry standard (affected vs unaffected
> reading), and `drying-log` tracks the chamber boundary test over days, not the
> per-material dry verdict. No tile computes flood-cut demolition quantities.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `moisture-dry-goal` inputs are dimensionless meter
  readings / percentage points (the moisture-content scale is a dimensionless
  ratio); `flood-cut-quantity` carries a length (`L`, cut height) and a length
  (`L`, wall run) producing an area (`L^2`) and dimensionless sheet counts.
- The v18/v21 tile contract applies. `moisture-dry-goal`: a non-finite reading, or
  a non-positive acceptable delta, returns `{ error }`. `flood-cut-quantity`: a
  non-positive wall run, a non-positive cut height, or any non-finite input returns
  `{ error }`; the sheet count is `ceil` of a finite ratio, bounded.
- The v19/v22 citation discipline applies. Both use `GOVERNANCE.general`, naming
  **IICRC S500-2021** (the dry-standard / drying-goal concept, and the structural
  removal principle) by name; the standard text is not reproduced.
- Tile ids are kebab-case and checked against the live ids: `moisture-dry-goal` and
  `flood-cut-quantity` do not collide and are not concept-duplicates (§3).

## 2. The tiles

### 2.1 `moisture-dry-goal` -- Dry Standard vs Affected Reading (Group D, calc-restoration.js)

The S500 dry standard is a comparison: a material is dry when its moisture content
matches that of similar *unaffected* material in the same structure. This tile
takes the unaffected reference reading, the affected reading, and an acceptable
delta, and returns the gap, a dry / wet verdict, and the points still to remove.

```
inputs:
  reference_reading   dimensionless  unaffected like-material meter reading (the dry standard)
  affected_reading    dimensionless  current reading on the affected material
  acceptable_delta    dimensionless  allowed margin above the standard (default 4)

delta          = affected_reading - reference_reading
at_dry_standard = delta <= acceptable_delta
points_to_go    = max(0, delta - acceptable_delta)
```

Outputs: the delta above the standard, the dry / wet verdict (at dry standard, or
continue drying), and the points still to remove to reach the goal. The note line
states: the reference must be the *same material, meter, mode, and scale* as the
affected reading (a pin meter reads relative on non-wood; a wood scale is only
valid on wood); the dry standard is the unaffected reading, not a fixed number; and
the protocol and a calibrated meter govern acceptance.

**Worked example (pinned).** Unaffected drywall reads 12 (relative scale), affected
reads 35, acceptable delta 4: delta = 35 - 12 = **23**, verdict = **continue
drying**, points to go = 23 - 4 = **19**. After drying, affected reads 15: delta =
3, **at dry standard** (3 <= 4), points to go = 0. Cross-check (wood, % MC):
reference 11% MC, affected 14%, delta-allow 2 -> delta 3, continue drying, 1 point
to go. Degenerate inputs (non-finite reading, acceptable_delta <= 0) return an
error.

### 2.2 `flood-cut-quantity` -- Flood-Cut Demolition Take-Off (Group D, calc-restoration.js)

A flood cut removes the wet lower band of drywall to a chosen height above the
wick line. Given the affected wall run and the cut height, this returns the drywall
area removed, the 4x8 sheet count to replace it, the baseboard linear feet, and the
batt-insulation area if the cavity is insulated -- the demolition take-off an
estimator writes on the scope.

```
inputs:
  wall_run_lf    L      total linear feet of affected wall
  cut_height_in  L      height of the cut above the floor (default 24 in)
  two_sided      flag   cavity wet on both wall faces (double the drywall)
  insulated      flag   cavity holds batt insulation to remove

faces            = two_sided ? 2 : 1
drywall_ft2      = wall_run_lf x (cut_height_in / 12) x faces
sheets_4x8       = ceil(drywall_ft2 / 32)        32 ft^2 per 4x8 sheet
baseboard_lf     = wall_run_lf                    one run of base trim
insulation_ft2   = insulated ? wall_run_lf x (cut_height_in / 12) : 0
```

Outputs: drywall area removed (ft^2), replacement 4x8 sheet count, baseboard linear
feet, and batt-insulation area. The note line states: the cut height is a field
decision driven by the highest moisture reading (the wick line measured with a
meter), not a fixed 2 ft rule; Category 3 losses typically require removing all wet
porous material, which can exceed the cut; and pre-1980 structures require lead /
asbestos assessment before any demolition.

**Worked example (pinned).** 60 LF of affected wall, 24 in cut, one side,
insulated: drywall = 60 x (24/12) x 1 = **120 ft^2**; sheets = ceil(120/32) =
**4** (4 x 32 = 128 ft^2, ~ 8 ft^2 waste); baseboard = **60 LF**; insulation = 60 x
2 = **120 ft^2**. Cross-check (two-sided, same run): drywall = 240 ft^2, sheets =
ceil(240/32) = 8. Degenerate inputs (wall run <= 0, cut height <= 0, non-finite)
return an error.

## 3. Concept-check and wiring

Concept-checked against the live catalog. `drying-goal` targets *air* GPP (a
psychrometric set point); `moisture-dry-goal` is the *material* moisture-content
comparison against an unaffected reference -- a different quantity and a different
decision. `drying-log` tracks the chamber boundary test over multiple days;
`moisture-dry-goal` is a single per-material verdict. No tile computes flood-cut
demolition quantities (`square-footage` and the Group E framing take-offs are
new-construction geometry, not a wet-band removal). **Both ship**, into
`calc-restoration.js`.

Per-tile wiring (each tile): a `tools-data.js` row (group `D`, trades
`["restoration"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(`moisture-dry-goal`: IICRC S500-2021 dry-standard concept by name,
`GOVERNANCE.general`, assumptions listing the default acceptable delta and the
same-material/same-meter requirement; `flood-cut-quantity`: IICRC S500-2021
structural-removal principle by name, `GOVERNANCE.general`, assumptions listing the
default 24 in cut height and the 32 ft^2-per-sheet constant);
`test/fixtures/worked-examples.json` (the pinned dry-standard case and the 60 LF
flood cut, plus cross-checks); `test/fixtures/compute-map.js` (module path
`../../calc-restoration.js`); `scripts/related-tiles.mjs` (`moisture-dry-goal` ->
`drying-log` / `drying-goal` / `drying-times`; `flood-cut-quantity` ->
`standing-water` / `mold-remediation-level` / `square-footage`);
`data/search/aliases.json` (`moisture-dry-goal`: "dry standard", "dry goal",
"moisture content", "dry verdict", "moisture meter"; `flood-cut-quantity`:
"flood cut", "demolition", "drywall removal", "take off", "sheetrock", "baseboard");
the `// dims:` annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins both worked examples, the two-sided and
wood-MC cross-checks, and every error seam.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; `check-readme-counts` must
agree at **590 tiles** and the matching sitemap URL count); `npm test` (+2 tests);
`npm run build` (590 tile shells + sitemap); `npm run data:verify`; the
worked-examples runner (+2 fixtures); the 320 px shell audit (the dry/wet verdict
and the four take-off outputs must wrap, not scroll, on a phone); and the
full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered
output read to the value (35 vs 12, delta-allow 4 -> continue drying / 19 to go;
60 LF / 24 in / one side -> 120 ft^2 / 4 sheets / 60 LF base / 120 ft^2 batt).

## 5. Roadmap position

v60 brings Group D to 25 tiles and closes the documentation gap, completing the
three-spec batch (v58 scoping, v59 chemistry and sampling, v60 documentation). The
suite now spans a water-and-mold job end to end: scope and Condition (v58) -> PPE,
containment, and equipment sizing (existing) -> drying process tracking with the
boundary test (existing) -> antimicrobial mix and air sampling (v59) -> the
dry-standard verdict and demolition take-off (v60). The `calc-restoration.js`
module-cap watch carries through this batch; if the six new rows cross the byte
cap, the authorized `calc-mold.js` per-tile split lands, mirroring the spec-v56
`calc-fab.js -> calc-layout.js` precedent. With this batch Group D is broad and
well-rounded; further growth should be evidence-driven (a named gap a working
remediator hits), not catalog-filling.
