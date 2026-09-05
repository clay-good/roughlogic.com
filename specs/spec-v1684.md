# roughlogic.com Specification v1684 -- CMU Grout Lift and Pour Height Limits (`calc-masonry.js`, Group E Carpentry and Construction, masonry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-masonry.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; masonry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Grouting a masonry wall too tall too fast blows the wall out, and the code limits both the lift -- how much grout goes in at once -- and the pour, the total height grouted before the wall is allowed to cure. The limits depend on the grout space and on whether the grout is consolidated.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive lift or pour height, a grout space dimension below the minimum for the grout type, or a pour height exceeding the entered code limit returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the TMS 602 grout lift and pour limits by name with the adopted building code and special inspector named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`grout lift pour height masonry`, `tms 602 grout limits`, `cmu grout blowout`, `grout cleanouts required height`, `consolidation reconsolidation grout`.

## 2. The tile

### 2.1 `grout-lift-pour-height` -- CMU Grout Lift and Pour Height Limits

```
lift              the depth of grout placed and consolidated in one operation
pour              the total height of grout placed before construction resumes
                  a pour is made up of one or more lifts
limits            set by TMS 602 as a function of grout space dimension, unit type,
                  grout type (fine or coarse), and whether cleanouts are provided
consolidation     grout must be consolidated and reconsolidated; unconsolidated grout
                  leaves voids and does not develop bond
cleanouts         required at the base for pours above a stated height, so the space
                  can be inspected and cleaned before grouting
blowout           the hydrostatic pressure of fluid grout against unbraced masonry
```

The two limits control different failures. The lift limit is about consolidation: grout placed deeper than can
be properly vibrated leaves voids, and voids in a grouted cell mean the reinforcement is not embedded and the
wall does not have the strength the drawings assume. The pour limit is about the wall's own strength while the
grout is fluid: freshly grouted masonry is holding back a column of liquid at roughly 140 pounds per cubic foot,
and a pour higher than the wall can resist blows it out.

Cleanouts are the provision that gets omitted and then required. Above a stated pour height the code requires
openings at the base of every grouted cell so mortar droppings can be removed and the space inspected before
grouting, and they are closed only after inspection. A wall built without them and discovered at inspection has
to be opened, which is far more expensive than building them in.

Consolidation and reconsolidation is a two-step requirement rather than one. Grout is vibrated when placed and
again after initial water loss, because the grout settles as the masonry absorbs water and reconsolidation closes
the void that leaves at the top of the lift.

**Inputs:** the grout space least dimension, the grout type (fine or coarse), the unit type, the proposed lift and pour heights, whether cleanouts are provided, and the code limits for the configuration

**Outputs:** the maximum lift and pour height for the entered grout space and grout type, the proposed values against them, the number of lifts in the pour, whether cleanouts are required at the entered pour height, and a blowout risk flag where the pour exceeds the limit

## 3. Worked example

A grouted CMU wall with a 3 in by 6 in grout space, coarse grout, proposed pour height 5 ft.

The code's tables give the maximum pour height for that grout space, grout type, and unit, and the maximum lift
within it. The two questions a mason needs answered at the wall are whether this pour is allowed and how many
lifts it takes.

**The blowout arithmetic behind the pour limit:**

```
fluid grout at roughly 140 pcf
pressure at the base of a 5 ft pour = 140 x 5 / 144 = 4.9 psi
```

4.9 psi against the inside of a wall whose mortar joints are hours old. Double the pour to 10 ft and
the pressure doubles to 9.7 psi -- and blowouts are exactly what happens when a crew decides to grout
a full storey in one go because the pump is already there.

**Cleanouts**: above the code's threshold pour height, openings are required at the base of every grouted cell.
A wall laid without them and then found to need them has to be opened at the base -- which means cutting units
out of a completed wall, and it is entirely avoidable by checking the pour height before laying.

**Consolidation** is not one operation. The grout is vibrated when placed and reconsolidated after the masonry
has absorbed water and the grout has settled, which closes the void left at the top of the lift. A single pass
leaves that void, and it is directly over the reinforcement lap in many walls.

## 4. Scope and non-goals

A limit comparison against code values the user supplies. Maximum lift and pour heights, the minimum grout
space dimensions for fine and coarse grout, the cleanout requirements, and the conditions under which higher
pours are permitted are set by TMS 602 and the adopted building code, and they depend on the grout space, the
unit, the grout type, and in some cases on demonstration by a grout demonstration panel -- the code's tables
govern rather than any single value. It does not address grout mix design, slump, aggregate, or the difference
between grout and mortar and concrete, which are distinct materials with distinct specifications. It does not
address reinforcement placement, lap lengths, or positioning, or the inspection and testing the code requires for
the level of quality assurance specified. It does not address hot and cold weather grouting requirements. TMS 602,
the adopted building code, the project specification, and the special inspector govern.
