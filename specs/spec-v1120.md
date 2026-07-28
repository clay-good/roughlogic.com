# roughlogic.com Specification v1120 -- SRW Geogrid Layer Spacing and Layout (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1119.md.
>
> **The gap, self-declared.** `retaining-wall-block`'s own description ends: *"Over 4 ft needs an
> engineered design with geogrid."* Then it stops. Nothing in the catalog says how many layers, at what
> spacing, how long, or how much material. `retaining-wall-stability` is a cast-in-place cantilever wall,
> a different structure entirely. Discovery batch 8: CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
height, depth, or block height, a negative buried depth, a suggested maximum outside 0-32 in, a length
basis outside 0.4-1.2H, or a block taller than its own spacing limit return `{ error }`. Renderer: this
module's `_simpleRenderer`.

## 2. The tile

### 2.1 `srw-geogrid-spacing` -- SRW Geogrid Layer Spacing and Layout

```
inputs:  wall_height_ft (total, including the buried course), block_depth_in, block_height_in,
         base_course_buried_in, ncma_suggested_max_in (24), grid_length_basis (0.6)
compute: limit    = min(2 x depth, 32 in, 2.7 ft, suggested)
         spacing  = floor(limit / block height) x block height     grid lands on a JOINT
         levels   = floor((floor(H/hb) - 1) / courses_per_layer) + 1, first one course up
         crest    = H - top layer height                            left unreinforced
         length   = max(0.6 H, 4 ft);  area = levels x length
         lifts    = ceil(spacing / 8 in)
outputs: spacing_limit_in, twice_depth_in, actual_spacing_in, courses_per_layer, total_courses,
         layer_count, first_layer_height_in, top_layer_height_in, unreinforced_crest_in,
         crest_exceeds_spacing, grid_length_ft, length_governed_by_minimum, grid_sf_per_lf,
         compaction_lifts, exposed_ft, governing_rule, note
```

**Three standards, one rule.** The spacing limit comes from the **block**, not the soil or the loading.
NCMA Design Manual 3rd ed. §7.2.2, AASHTO LRFD 2016 §11.10.2.3.1, and FHWA NHI-10-024 §4.4.7.d all cap
spacing at twice the unit depth. They differ only in the absolute ceiling -- 32 in, 2.7 ft (32.4 in), and
32 in respectively -- and NCMA separately *suggests* 24 in to reduce construction stability problems. The
tile applies the most restrictive and **names the rule that produced it**, so the number is auditable.

**The rounding is the useful part.** Grid lands on a course joint, never mid-block, so the limit rounds
**down** to a whole course. Keystone TIS-15 gives two examples and both are pinned as fixtures: an 8-in
tall by 9-in deep unit is limited to 18 in but built at **16**; a 6-in tall by 10-in deep unit is limited
to 20 in but built at **18**. A deeper block raised the limit and a shorter block still landed lower --
which is why reading the limit off the wall and using it directly is wrong.

**Two things the layout hides.** The facing above the uppermost layer is left unreinforced, and when the
courses do not divide evenly it can end up taller than the layer spacing itself -- the height AASHTO asks
the designer to evaluate for bulging. The tile reports it and flags that case. Separately, compaction
lifts cap at 8 in loose thickness *regardless* of grid spacing; a 24-in spacing is three lifts, not one,
and that is the rule most often broken on a fast job.

## 3. Scope, stated plainly

Layout, spacing compliance, and quantity **only**. This tile does not size the grid. Long-term design
strength, pullout length beyond the failure plane, block-to-grid connection strength, and global and
compound stability all require a project-specific analysis with the geotechnical report, the
manufacturer's reduction factors, and the specific unit. No proprietary strength table, reduction factor,
or connection curve is used or reproduced -- none is needed for what this computes.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `retaining-wall-block` (which now links
back), `retaining-wall-stability`, `lateral-earth-pressure`, and `aggregate`. `check-module-sizes` cap for calc-finish.js raised 22000 -> 27000. Fuzzer pins both published
examples, the min-of-four limit across 24 depth/suggested combinations, that the working spacing is always
a whole course and never exceeds the limit, monotonicity in block depth, internal consistency of layer
geometry and quantity at five wall heights, the 0.6H-versus-4-ft crossover, that no lift exceeds 8 in,
that buried depth changes exposed height but never the spacing, and every error seam including the
block-taller-than-its-limit case.
