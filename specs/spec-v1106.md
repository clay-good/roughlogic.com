# roughlogic.com Specification v1106 -- Kitchen Cabinet Linear-Foot Takeoff (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1105.md.
>
> **The gap, and the evidence for it.** No cabinet tile exists. The only "cabinet" aliases point at
> `led-tape-run` and `led-video-wall` (under-cabinet lighting); there is no "toe kick", "filler strip", or
> "casework" alias. `trim-linear-footage` does perimeter trim only. Confirmed CLEAR twice, by discovery
> batches 3 and 7, despite the catalog having a `kitchen` trade and a `calc-kitchen.js` -- that module is
> food-service operations, not casework.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: negative runs,
all-zero runs, a non-integer corner count, non-positive depth or standard width, or negative filler /
toe-kick return `{ error }`. A base run entirely consumed by openings and corners is an ERROR, not a
silent zero. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `cabinet-linear-feet` -- Kitchen Cabinet Linear-Foot Takeoff

```
inputs:  base_wall_ft, wall_cab_ft, tall_ft, appliance_openings_ft, corners,
         cabinet_depth_in (24), filler_per_corner_in (3), standard_width_in (24),
         toe_kick_height_in (4)
compute: corner_loss = corners x depth / 12
         base_lf     = base_wall - appliance_openings - corner_loss
         wall_lf, tall_lf pass through;  total = base + wall + tall
         cabinets    = ceil(LF x 12 / standard_width), per run type
         countertop  = base_lf + corner_loss        <- the top DOES run the corner
         toe_kick    = base_lf + tall_lf, and its square footage
outputs: base_lf, wall_lf, tall_lf, total_lf, corner_loss_ft, filler_ft,
         base_cabinets, wall_cabinets, tall_cabinets, countertop_lf, toe_kick_lf, toe_kick_sf, note
```

**The one piece of real geometry.** Each inside corner eats one cabinet DEPTH off one of its two legs,
because the two runs cannot both occupy the corner. That is why an L-kitchen measured wall-to-wall always
over-counts, and it is the arithmetic the tile exists to get right: the pinned 22-ft base run with 5 ft of
appliance openings and two corners bills **13 LF, not 22**.

**And the corollary that catches people the other way:** the COUNTERTOP does run the full corner, so it is
reported with the corner length added back -- 17 LF against the cabinets' 13. Ordering top by the cabinet
figure comes up short.

**Worked example (pinned).** Above, plus 16 ft of wall and 3 ft of tall: 32 total LF, 7 / 8 / 2 standard
boxes, 0.50 ft of filler, 5.33 sf of toe kick. Cross-check: a 12-ft galley with no corners loses nothing
and its countertop equals the run exactly.

## 3. Scope limits

Cabinet counts assume every box is the single standard width entered; a real elevation mixes widths, so the
count is a check on the linear feet, not an order -- stated in the note. Filler should be ordered even when
the arithmetic closes, because it absorbs out-of-square walls and gives door and drawer clearance. No
manufacturer size table is reproduced. The shop drawing and the manufacturer's nominal sizes govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `countertop-overhang-support`. Fuzzer
pins the corner rule across five corner/depth combinations, the countertop-exceeds-cabinets identity for
every corner count, the no-corner identity, ceiling behavior of the counts at two standard widths, that
wall and tall runs are untouched by corners and appliances, and the fully-consumed-run error.
