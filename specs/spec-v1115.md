# roughlogic.com Specification v1115 -- Tree Appraisal by the CTLA Trunk Formula (calc-arborist.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-arborist.js`** (Group L), no new module, group, or dependency. Inherits spec.md through
> spec-v1114.md.
>
> **The gap, and the evidence for it.** Zero hits for "CTLA", "trunk formula", or "tree appraisal" in
> tools-data.js, aliases.json, or any calc module (the "appraisal" aliases all hit real-estate tiles). The
> existing arborist set -- `trunk-decay-strength`, `trunk-min-shell-thickness`, `tree-open-cavity`,
> `tree-protection-zone`, `tree-crz-encroachment`, `crown-pruning-dose`, `tree-height-clinometer`,
> `tree-rigging-shock` -- is entirely biomechanics and geometry. None of it answers what a tree is worth,
> which is the number a damage claim or removal dispute actually turns on. Discovery batches 1 and 7 both
> flagged it CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
diameter or unit cost, or any rating outside 0-100, returns `{ error }`. Renderer: hand-written
non-exported (module convention). **No table shipped** -- see §3.

## 2. The tile

### 2.1 `tree-appraisal-ctla` -- Tree Appraisal by the CTLA Trunk Formula

```
inputs:  dbh_in, unit_cost_per_sq_in (60), species_pct (100), condition_pct (100), location_pct (100)
compute: trunk_area = pi/4 x d^2
         basic_value = unit_cost x trunk_area
         combined = species% x condition% x location%      MULTIPLICATIVE
         appraised = basic_value x combined
         measurement height: 4.5 ft above grade over 12 in diameter, 1 ft at or below
outputs: trunk_area_sq_in, basic_value, species_f, condition_f, location_f, combined_factor,
         appraised_value, depreciation_pct, measure_at, large_trunk, note
```

**Three things the tile makes explicit.** Value scales with trunk AREA, so it goes as the **square** of
diameter -- doubling the trunk quadruples the basic value, which is why a mature tree is so much harder to
replace than two small ones. The measurement height **switches at 12 in** and using the wrong one on a
flaring trunk is the most common measurement error. And the three ratings are **multiplicative**: 90/90/90
is 72.9%, not 90% and not 70% -- the fuzzer pins exactly that, because reading them as additive is the
error that makes appraisals argue.

**Worked example (pinned).** 24-in trunk at $60/sq in with 80/70/75 ratings: area 452.39 sq in, basic value
$27,143, combined factor 42.0%, **appraised $11,400** (58% depreciation). Cross-check at 12 in pins both the
quarter-value square law and that exactly 12 in still measures at 1 ft.

## 3. Why no table ships, and the honesty framing

Every factor is a user input. The unit cost is regional and moves with nursery prices; the species,
condition, and location percentages come from a regional plant appraisal committee guide. A national
default would be wrong everywhere, so none is provided -- consistent with this campaign's pattern of making
a locally-varying value an input rather than shipping a guess.

The note and citation both say plainly: **this is an estimating aid, not an appraisal.** A defensible
appraisal is a qualified appraiser's report, and courts and insurers look at the appraiser rather than the
arithmetic. Single-stem trunks only; multi-stem trees use a different area rule, and very large or historic
specimens may call for cost-of-cure or income approaches instead.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins the full chain against its own algebra, the
square law across five diameters, the 12-in boundary from both sides, the multiplicative-not-additive
property, that a zero on any single axis zeroes the value, and unit-cost linearity.
