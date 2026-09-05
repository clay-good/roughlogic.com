# roughlogic.com Specification v1512 -- Crusher Reduction Ratio and Product Gradation (`calc-mining.js`, Group E Carpentry and Construction, quarry and aggregate, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A crushing circuit is a chain of reduction ratios, and each machine type has a range it can actually do. Asking a jaw for a ratio of 10 or a cone for 3 is how a plant ends up with a bottleneck nobody can find, and the arithmetic that shows it fits on one screen.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive feed or product size, or a product size at or above the feed size returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the reduction-ratio convention and typical ranges by crusher type as standard aggregate practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`crusher reduction ratio`, `crushing circuit stages`, `jaw cone reduction ratio`, `feed to product size crusher`, `how many crushing stages`.

## 2. The tile

### 2.1 `crusher-reduction-ratio` -- Crusher Reduction Ratio and Product Gradation

```
reduction ratio   R = F / P        (feed size / product size, usually the 80% passing sizes)
typical ranges    jaw 4:1 to 6:1, gyratory 4:1 to 7:1, cone 3:1 to 6:1,
                  impactor 10:1 to 20:1, roll 2:1 to 4:1
circuit ratio     R_total = R_1 x R_2 x R_3 ...     (ratios MULTIPLY through stages)
stages needed     n = log(R_total) / log(R_per_stage)
```

Ratios multiply through a circuit, which is why a plant reducing 24 in feed to 3/4 in product needs a total
ratio of 32 and cannot get there in one machine. Splitting 32 across two stages needs about 5.7 each -- workable
for a jaw then a cone. Across three stages it is 3.2 each, comfortable, and that is why most aggregate plants are
three-stage.

The field value of this tile is diagnostic rather than design. When a plant is not making spec or a machine is
running hot and passing oversize, computing the ratio each machine is actually being asked to perform usually
identifies the offender in one line: a cone being fed material the jaw did not reduce enough is being asked for a
ratio outside its range, and no adjustment at the cone fixes a problem upstream of it. The tile reports the
implied ratio per stage for a target, so a plant can see how many stages the job actually needs.

**Inputs:** feed size and product size (80% passing), the crusher type at each stage, and the number of stages in the circuit

**Outputs:** the reduction ratio per stage and for the circuit, whether each ratio falls inside the typical range for that machine type, the number of stages a target ratio requires, and the intermediate sizes an even split implies

## 3. Worked example

A pit feeding 24 in run-of-quarry, making a 0.75 in product:

```
R_total = 24 / 0.75 = 32.0
one stage   -> 32.0:1, outside every crusher's range
two stages  -> sqrt(32.0) = 5.66:1 each, intermediate size 4.24 in
three stages-> 3.17:1 each, intermediates 7.56 in and 2.38 in
```

Two stages at 5.66:1 is achievable -- a jaw at the top of its range then a cone at the top of
its -- but both machines run at their limit, which means wear, heat, and no margin when the feed gets blocky.
Three stages at 3.17:1 puts every machine in the comfortable middle of its range, which is why the
third crusher usually pays for itself in liner life and uptime rather than in tonnage.

The diagnostic use: if the jaw is actually producing 6.0 in rather than the 4.2 in the two-stage
plan assumed, the cone is being asked for `6.0/0.75` = 8.0:1, outside its range, and the cone is not the
problem.

## 4. Scope and non-goals

Reduction ratio arithmetic on 80% passing sizes. It does not size a crusher, predict capacity or power draw,
or generate a product gradation -- those come from the manufacturer's capacity tables and closed-side-setting
curves for the specific machine and material, and product gradation depends strongly on rock friability and on
whether the circuit is open or closed. Closed-circuit operation with recirculating load changes the effective
ratio and the tonnage through the machine substantially and is not modeled. It does not evaluate feed
gradation, moisture, clay content, or the surge and screening capacity between stages, which is usually what
actually limits a plant. Screen capacity is `screen-deck-capacity`. The crusher manufacturer's selection data and
the plant designer govern.
