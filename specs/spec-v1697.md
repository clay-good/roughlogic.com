# roughlogic.com Specification v1697 -- Tree Root Ball Diameter and Weight (ANSI Z60.1) (`calc-arborist.js`, Group L Agriculture and Forestry, arboriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; arboriculture and landscape), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A nursery root ball is sized from the trunk caliper by a standard, and its weight is what decides whether it can be moved by hand, by a machine, or at all. The weight climbs with the cube of the ball diameter, so a modest increase in tree size is a large increase in what has to be lifted.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive caliper or ball diameter, or a soil density at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ANSI Z60.1 root ball sizing by name with ANSI A300 Part 6 for transplanting cited, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`root ball size caliper`, `ansi z60.1 ball diameter`, `tree ball weight`, `transplant ball size`, `how heavy is a root ball`.

## 2. The tile

### 2.1 `root-ball-size-weight` -- Tree Root Ball Diameter and Weight (ANSI Z60.1)

```
ball diameter     from trunk caliper, per ANSI Z60.1; roughly 10 to 12 in of ball
                  diameter per inch of caliper for shade trees
ball depth        a fraction of the diameter, commonly 60 to 75%
volume            approximately a spherical segment or a cylinder-with-taper
weight            volume x soil density; moist loam roughly 100 to 110 lb/cu ft
                  a ball is heavier than people estimate by a wide margin
handling          weight determines hand, two-wheel, machine, or crane handling
survival          a larger ball retains more roots and transplants better; the trade is
                  handling weight and cost
```

The cube relationship is what surprises people at the truck. Doubling the caliper roughly doubles the ball
diameter, which multiplies its volume by about eight and its weight with it -- so a 2 in caliper tree with a
manageable ball and a 4 in caliper tree of the same species are entirely different handling problems, and the
crew that moved one by hand needs a machine for the other.

The standard exists because ball size is a survival matter rather than a convenience. A tree's fine absorbing
roots extend far beyond any practical ball, so digging severs most of them, and the ball's size determines what
fraction remains to support the crown until new roots grow. Undersized balls are a leading cause of transplant
failure, and the failure shows up over the following one or two seasons rather than immediately.

The handling weight is a safety matter as well as a logistics one. A ball that looks liftable is routinely not:
moist soil at over 100 pounds per cubic foot makes even a modest ball a several-hundred-pound object with no good
handholds, and back injuries and dropped trees both follow from underestimating it. Knowing the weight before the
tree arrives determines the equipment on site.

**Inputs:** trunk caliper, the ball diameter to caliper ratio from the standard, the ball depth ratio, the soil density and moisture condition, and the tree species and type

**Outputs:** the required ball diameter and depth for the entered caliper, the ball volume, the ball weight at the entered soil density, the handling class the weight implies, and the ball weight at the next caliper size up

## 3. Worked example

A 6 in caliper shade tree at 10 in of ball diameter per inch of caliper:

```
ball diameter = 6 x 10 = 60 in = 5.0 ft
ball depth    = 5.0 x 0.65 = 3.2 ft
volume        ~ pi/4 x 5.0^2 x 3.2 = 63.8 cu ft
weight        = 63.8 x 105 = 6,700 lb
```

**Over 3.4 tons for a 6 in tree.** That is a crane or a large
tree spade, not a crew and a cart -- and it is a number worth having before the delivery arrives.

Now a 3 in caliper tree:

```
ball diameter = 30 in
volume        ~ 8.0 cu ft
weight        = 838 lb
```

Half the caliper, **8 times
lighter** -- which is why smaller nursery stock is so much cheaper to install and why it frequently catches up
with larger stock within a few seasons, since it loses proportionally fewer roots and establishes faster.

The trade the standard encodes: a larger ball for the same caliper retains more roots and transplants better, at
the cost of weight and handling. Undersizing the ball to make the tree movable is trading survival for
convenience.

## 4. Scope and non-goals

A volume and weight estimate using ratios the user supplies. Ball sizes are set by ANSI Z60.1 and vary by plant
type -- shade trees, conifers, and shrubs have different ratios -- and by whether the stock is field-grown,
container-grown, or in-ground fabric. Soil density varies substantially with soil type and moisture; a saturated
clay ball is far heavier than the figure used here. It does not address the handling equipment, rigging, or the
lifting practices that a heavy ball requires, and lifting a tree by its trunk rather than by the ball damages the
root-trunk connection. It does not address planting depth, which is the single most common cause of transplant
failure -- the root flare must be at grade, and a ball planted to its own top is usually too deep -- or backfill,
staking, and aftercare irrigation. ANSI Z60.1 for the stock standard, ANSI A300 Part 6 for transplanting, and a
qualified arborist or nursery professional govern.
