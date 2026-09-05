# roughlogic.com Specification v1544 -- Track Ballast Section Volume and Tonnage (`calc-rail.js`, Group E Carpentry and Construction, railroad track, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Ordering ballast for a surfacing project is a cross-section times a length, and the cross-section is a trapezoid with shoulders and side slopes that people leave out. The shortfall shows up as a train of ballast that runs out two thousand feet short of the crossing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive top width, depth, or length, or a negative side slope ratio returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the trapezoidal section volume relation and placed-density conversion as standard track practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ballast section volume`, `track ballast tonnage`, `ballast cross section trapezoid`, `surfacing raise ballast`, `ballast cubic yards per mile`.

## 2. The tile

### 2.1 `ballast-section-volume` -- Track Ballast Section Volume and Tonnage

```
cross-section area  A = (b_top + b_bottom) / 2 x depth        (trapezoid, sq ft)
b_bottom            b_top + 2 x slope_ratio x depth
volume              V = A x length / 27        (cu yd)
tonnage             T = V x ballast density / 2,000 (about 1.35 to 1.45 ton/cu yd placed)
raise               a surfacing lift needs the volume of the RAISE, not the full section
```

The section is wider at the bottom than at the top because of the side slopes, and on a 1.5:1 slope with a
foot of depth that is three extra feet of width -- a large fraction of the total. Computing the section as a
rectangle at the top width understates the volume substantially, and the understatement grows with depth.

The distinction that matters on a surfacing job is between the full section and the RAISE. Lifting existing track
two inches does not require a new section; it requires the volume of the two-inch lift plus what fills the crib
and shoulder that the lift opens up. Ordering the full section for a raise buys several times what is needed, and
ordering the raise volume for new construction buys a fraction of it.

Placed density is the other quiet term. Ballast is bought by the ton and placed by the cubic yard, and the
conversion depends on the stone and on compaction -- roughly 1.35 to 1.45 tons per placed cubic yard for typical
granite. Using loose density rather than placed overstates the yards a ton will cover.

**Inputs:** top width of the ballast section, section depth, side slope ratio, shoulder width, project length, ballast placed density, and for a surfacing job the raise height

**Outputs:** the cross-sectional area, the volume in cubic yards, the tonnage at the entered density, the yards and tons per track mile, the volume for a stated raise, and the length a stated tonnage will cover

## 3. Worked example

A ballast section 8 ft wide at the top, 12 in deep, on 1.5:1 side slopes:

```
bottom width = 8 + 2 x 1.5 x (12/12) = 11.0 ft
area         = (8 + 11.0) / 2 x 1.0 = 9.50 sq ft
per mile     = 9.50 x 5,280 / 27            = 1,858 cu yd/mile
tonnage      = 1,858 x 1.40                = 2,601 tons/mile
```

About 2,601 tons a mile. Computing that section as a plain 8 ft by 1.0 ft rectangle gives
8.00 sq ft instead of 9.50 -- 16% low, or 411 tons a
mile of ballast that never gets ordered.

The raise case: lifting existing track 2 in over 3,000 ft needs roughly
`8 x (2/12) x 3,000 / 27` = 148 cu yd plus crib and shoulder fill -- a small fraction of
the 1,056 cu yd the full section would imply.

## 4. Scope and non-goals

A prismatic volume for a uniform trapezoidal section. It does not account for the ballast displaced by ties,
which is a real deduction, or for the crib volume between ties on a raise; it does not handle transitions,
turnouts, crossings, bridge approaches, or variable-depth sections, and it does not account for ballast lost into
a soft subgrade, which on bad track can consume a large multiple of the calculated volume. Placed density varies
with stone type, gradation, and degree of compaction and must be taken from the supplier's material. It does not
design the ballast section, which is set by the railroad's standard plans for the class of track, axle load, and
subgrade, and it does not evaluate ballast fouling, drainage, or the subgrade condition that usually determines
whether more ballast will actually fix the track. The railroad's standard plans and engineering instructions
govern.
