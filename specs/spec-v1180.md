# roughlogic.com Specification v1180 -- Accessible Parking Space Geometry (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 97 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1179.md.
>
> **The gap is self-declared.** `accessible-parking-count` (spec-v1159) says how many spaces a lot owes
> and states in its own scope note that the geometry of the spaces under 502 is not checked. This is that
> geometry.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown space
type, angled flag, or aisle side, or a non-positive width, length, clearance, or slope ratio return
`{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 502.2 with its exception, 502.3.1 through 502.3.4,
502.4 with its exception, and 502.5. A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `accessible-parking-geometry` -- Accessible Parking Space Geometry (502)

```
inputs:  space_type (van|car), space_width_in, aisle_width_in, space_length_in,
         aisle_length_in, angled, aisle_side, vertical_clearance_in, surface_slope_ratio
compute: car   -> 96 in space, 60 in aisle
         van   -> 132 in space with a 60 in aisle, OR 96 in space with a 96 in aisle
         aisle must extend the full length of the space
         angled van spaces: aisle on the passenger side
         van space, aisle, and route: 98 in vertical clearance;  slope no steeper than 1:48
outputs: required_space_width_in, required_aisle_width_in, wide_van_path, wide_aisle_path,
         width_ok, space_deficit_in, aisle_deficit_in, pair_width_in, min_pair_width_in,
         both_van_layouts_equal, length_ok, length_deficit_in, side_applies, side_ok,
         clearance_applies, clearance_ok, clearance_deficit_in, slope_ok, passes, note
```

**There are two legal van layouts and they cost the same ground.** 132 + 60 and 96 + 96 both total **192
in** of pavement, so choosing between them is a layout decision rather than a compliance one -- and where a
132-in stall will not fit between existing islands, widening the *aisle* instead is the same ground for the
same money. That is the observation the tile exists to surface, and the fuzzer pins it on both paths. The
default example is the pairing that satisfies neither: a 96-in space beside a 60-in aisle, 36 in short on
both counts.

**Three rules fail independently of the widths**, and the cross-check fixture trips all of them on a
dimensionally correct 132-in stall. The aisle must run the **full length** of the space, so a stub aisle at
the head of a stall is 96 in short. On an **angled** van space the aisle must be on the passenger side --
the one rule that cannot be satisfied by flipping the stripes at the far end, because it is about which
side a lift deploys from; on a straight van space or any car space the tile reports `null` rather than a
verdict. And van spaces, their aisles, **and the vehicular routes serving them** need 98 in of clearance,
which disqualifies a parking structure before a single line is painted.

**Slope is the quiet one.** 1:48 is about 2%, flatter than most paving crews target for drainage, so it is
the item that fails on a lot that drains well -- and the note says so.

## 3. Scope

A geometry screen, not a striping plan. Not checked: how many accessible and van spaces are required, which
is `accessible-parking-count`; whether the aisle overlaps the vehicular way, which a drawing shows better
than a dimension; marking, which must discourage parking in the aisle; identification signage and its
mounting; the accessible route from the space to the entrance and whether it crosses the vehicular way;
curb ramps and their placement relative to the aisle; the requirement that spaces sit on the shortest
accessible route; and state and local law, several of which require more.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `accessible-parking-count`,
`ada-ramp-slope`, `striping-paint-quantity`, and `accessible-route-width`. The tools-data row sits inside
the parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, both legal van
layouts with their seams and the equal-pavement identity, that an intermediate 72-in aisle satisfies
neither, the car path having no 132-in option, the aisle-length rule at four length pairs with exact
deficits, the passenger-side rule applying only to angled van spaces with `null` elsewhere, the 98-in
clearance van-only with exact deficits, the slope seam, that every check fails independently, and every
error seam. A test-authoring bug was caught in the process -- a result object spread into an inputs object
-- and fixed before landing.
