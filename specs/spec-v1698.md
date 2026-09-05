# roughlogic.com Specification v1698 -- Tree Cabling Support System Rating (ANSI A300) (`calc-arborist.js`, Group L Agriculture and Forestry, arboriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; arboriculture and landscape), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A cable between two leaders is a supplemental support system, and it has a rating that has to relate to the load it might see. Cabling is not a repair for a defect and it does not make a hazardous tree safe -- it reduces the likelihood of one specific failure, and it commits the owner to inspecting it forever.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive cable rating, placement distance, or anchor capacity, or a placement below the union returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ANSI A300 Part 3 support systems by name with the ISA best management practices and a qualified arborist named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tree cabling rating`, `ansi a300 cabling`, `codominant stem cable`, `tree support system inspection`, `static versus dynamic cabling`.

## 2. The tile

### 2.1 `tree-cabling-rating` -- Tree Cabling Support System Rating (ANSI A300)

```
placement          commonly two thirds of the distance from the defect to the branch ends
                   higher placement gives more mechanical advantage
system rating      the cable, its terminations, and its anchors each have ratings; the
                   system is the weakest of them
static vs dynamic  static steel systems restrict movement; dynamic synthetic systems allow
                   some movement and load only at the extremes
load               difficult to determine; depends on crown area, wind, and the geometry
number of cables   a single cable, multiple cables, or a triangular arrangement
inspection         annual, and after significant weather; cables fail, anchors embed,
                   and trees grow around hardware
```

The two-thirds placement rule is a moment-arm rule: a cable placed further out from the defect it supports has
a longer lever and restrains the same movement with less force, so it does more with a smaller system. Placing a
cable low, close to the union, puts it at a mechanical disadvantage and loads it heavily -- which is where cable
and hardware failures concentrate.

What cabling does and does not do is the part worth being clear about. It reduces the likelihood of one specific
failure -- typically a codominant union splitting -- by limiting how far the two parts can move apart. It does not
strengthen the union, it does not address decay, it does not reduce the load on the tree, and it does not make a
tree with a poor structure into a sound one. A tree whose risk is unacceptable without a cable is usually a tree
whose risk is unacceptable with one.

The commitment is the part owners are not told. A cable is a permanent installation in a living, growing organism:
the tree grows around the hardware, the anchors can embed or be encapsulated, synthetic materials degrade with
ultraviolet exposure, and the cable itself corrodes. Annual inspection and eventual replacement are part of the
system, and an uninspected twenty-year-old cable is a hazard of its own rather than a mitigation.

**Inputs:** the distance from the union to the branch ends and the proposed cable placement, the crown area and exposure for the load estimate, the cable and hardware ratings, the anchor type, and whether the system is static or dynamic

**Outputs:** the placement as a fraction of the distance from the union, the mechanical advantage relative to a lower placement, the system rating as the minimum of the components, the estimated load at the entered exposure, the margin, and the inspection interval

## 3. Worked example

A codominant union with the branch ends 24 ft above it, cable placed at the two-thirds point:

```
placement = 24 x 2/3 = 16 ft above the union
```

Compare a cable placed at 8 ft -- a third of the way, which is easier to reach and a common shortcut:

```
moment arm ratio = 16 / 8 = 2
```

**The low cable carries twice the force** to restrain the same movement, because it works at half the lever. That
is where cable and hardware failures concentrate, and it is entirely a placement decision.

**What the cable does.** It limits how far the two leaders can separate, which reduces the likelihood of the
union splitting in a wind event. It does not strengthen the union, reduce the load, or address decay. A tree
whose union is already failing, or whose leaders carry significant decay, is not made acceptable by a cable --
and installing one on such a tree can create a false sense that the risk has been managed.

**The system rating is its weakest component**: cable, thimbles, terminations, and anchors each have a rating,
and a high-rated cable through an undersized anchor is an undersized system.

**And the commitment.** This installation needs annual inspection and inspection after significant storms, for as
long as the tree stands. The tree grows around the hardware, anchors embed, and synthetic systems degrade in
ultraviolet light. A twenty-year-old uninspected cable is a hazard rather than a mitigation, and the owner has to
be told that at installation rather than discovering it.

## 4. Scope and non-goals

A placement and rating screen. Support system design -- cable size, hardware, anchor type, number and
configuration of cables, and whether a support system is appropriate at all -- is set by ANSI A300 Part 3 and
requires assessment by a qualified arborist; the load a system will see is genuinely difficult to determine and
depends on crown area, exposure, wind, and the tree's dynamic response, which this tile does not compute. It does
not evaluate the defect being supported, the tree's overall condition, or the risk (`trunk-strength-loss` and a
tree risk assessment), and cabling is not a substitute for reducing the load, reducing the target, or removing
the tree. It does not address installation methods, drilling and hardware placement, or the damage that improper
installation causes. It does not address bracing, which is a different treatment. ANSI A300 Part 3, the ISA best
management practices for tree support systems, and a qualified arborist govern.
