# roughlogic.com Specification v1028 -- Closet Rod and Shelf Takeoff (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1027.md.
>
> **The gap, and the evidence for it.** No closet tile exists; the only closet-adjacent alias is "layout
> marks for even shelves" pointing at `equal-spacing`, which returns spacing, not footage or support
> counts. Discovery batch 3: CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: negative
lengths, all-zero walls, a non-integer linen count, or non-positive spacing/stock return `{ error }`.
Citation discipline: takeoff arithmetic, no standard claimed; hang heights named as practice, not code.
Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `closet-shelf-takeoff` -- Closet Rod and Shelf Takeoff

```
inputs:  single_hang_ft, double_hang_ft, linen_wall_ft + linen_shelf_count (4),
         bracket_spacing_in (32), stock_length_ft (8)
compute: rod_lf   = single + 2 x double
         shelf_lf = single + double + linen x count
         supports per run = ceil(run x 12 / spacing) + 1 (an end support plus every spacing);
         double-hang carries two tiers; a linen stack one per shelf
         sticks/boards = ceil(LF / stock); any single run longer than stock is FLAGGED
         (the splice must land at a support, which can change the buy)
outputs: rod_lf, shelf_lf, rod_sticks, shelf_boards, brackets, splice_needed, note
```

**Worked example (pinned).** 6-ft single + 4-ft double + 3-ft linen (4 shelves), 32-in supports, 8-ft
stock: 14 ft of rod (2 sticks), 22 ft of shelf (3 boards), 22 supports -- 4 + 2x3 + 4x3. The support
count is the number a straight LF calculator never produces, and the middle bracket is what keeps a
loaded 6-ft rod from smiling.

## 3. Scope limits

Wood rod/shelf takeoff; wire shelving counts by the same wall lengths but uses its own bracket system
(manufacturer instructions govern, the note says so). Hang heights (66 / 40+80 / linen ~76 in) are stated
as practice. Each hang category is treated as one continuous run for the end-support count -- enter walls
separately for multi-wall closets.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins the worked example, the per-run support
formula, the double-hang two-tier identity, the splice flag seam at run = stock, additivity, and error
seams.
