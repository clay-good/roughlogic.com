# roughlogic.com Specification v1817 -- Order Pick Rate and Labour Standard (`calc-warehouse.js`, Group J Trucking and Logistics, warehouse racking and material handling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-warehouse.js`**
> (Group J Trucking and Logistics, hub `/groups/trucking/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A picking standard is built from the elements of the task, and in nearly every warehouse the largest element is walking. That is why batch picking pays: it attacks the half of the day that produces nothing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive line count, units per line, or element time, a negative setup allowance, or a personal fatigue and delay allowance outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the element time standard build-up and the personal fatigue and delay allowance convention with the facility's own time study data and the applicable labour agreements named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`order pick labor standard`, `lines per hour picking`, `travel time share picking`, `batch picking productivity`, `warehouse pick rate pfd allowance`.

## 2. The tile

### 2.1 `order-pick-labor-standard` -- Order Pick Rate and Labour Standard

```
element build-up time per line = travel to the location + the pick itself +
                 an increment for each unit beyond the first
travel           the walk or ride between locations, and in a discrete-order
                 operation it is typically half the line time or more
order time       lines x time per line, plus a setup and close allowance per order
PF and D         personal, fatigue, and delay -- a percentage allowance added to
                 the working time; 10 to 20% is usual
rate             lines per hour and units per hour, from the allowed order time
batch picking    picking several orders in one pass amortises the travel across
                 them, then requires a sort afterwards
the trade        batching cuts travel and adds sortation work and complexity; the
                 net depends on order profile -- many small orders batch well,
                 few large ones do not
```

A labour standard is an engineered time, not an observed average, and the distinction matters when it is used
to staff or to pay. Building it from elements makes the standard explainable, lets a change to any one element
be priced, and survives a change in the order mix -- an observed rate does none of those things and becomes
wrong the moment the profile shifts. The elements themselves come from time study or from a predetermined
motion time system.

Travel dominates and it is the element with no output. Every second spent walking between locations produces
nothing, and in a discrete-order operation over a large floor it routinely exceeds the time spent actually
picking. Slotting, zoning, pick-path sequencing, and batching are all attacks on the same element, and none of
them make the pick itself faster.

Batching is the strongest of those levers and it is bounded by what comes after. Picking four orders in one
pass divides the travel roughly by four, at the cost of a sortation step and the risk of mis-sorting. Where
orders are small and numerous the arithmetic is overwhelming; where orders are large the travel was already
amortised across many lines and batching buys little while still costing the sort.

**Inputs:** the lines per order and units per line, the travel, pick, and per-additional-unit times, the setup and close allowance, the personal fatigue and delay allowance, and the batch size

**Outputs:** the time per line, the total pick time, the allowed order time, the lines and units per hour, the share of the time spent travelling, and the same figures under batch picking

## 3. Worked example

An order of 120 lines at 2.5 units per line:

```
time per line = 18 travel + 12 pick + 1.5 x 3 per extra unit = 34.5 s
pick time     = 120 x 34.5 = 4,140 s = 69.0 min
allowed       = (69.0 + 8 setup) x 1.15 = 88.5 min
rate          = 81 lines/h, 203 units/h
```

**81 lines an hour is the standard.** Now look at where the time went:

```
travel = 120 x 18 = 2,160 s of 4,140 = 52%
```

**52% of the picking time is walking**, and none of it touches a carton. That is the ordinary condition in
a discrete-order operation, and it is why every serious productivity intervention in a warehouse is aimed at
travel rather than at the pick.

**Batch four orders into one pass** and the travel is amortised -- not by a full factor of four, because the
picker still walks between the locations the combined order needs, but substantially:

```
travel per line = 7.0 s
time per line   = 23.5 s
allowed         = 63.2 min
rate            = 114 lines/h
```

**114 lines an hour against 81 -- a 40 percent improvement**, from changing nothing about the pick, the
product, the racking, or the people. **The entire gain came out of the element that produced nothing.**

**What it costs is the sort.** Four orders picked together have to be separated afterwards, which is work the
discrete method never needed and which carries a mis-sort risk the discrete method never had. **The arithmetic
above prices the gain; the order profile decides whether the sort is worth it** -- many small orders batch
overwhelmingly well, and a warehouse whose orders are already 120 lines each has amortised its travel
already.

## 4. Scope and non-goals

An engineered time standard. The element times are entered and must come from a time study or a predetermined motion time system applied to the specific operation -- travel time in particular depends on the floor size, the slotting, the pick path, the equipment, and the congestion, and a figure from another warehouse is not transferable. It uses a single average line and a single travel element in place of a distribution: real pick paths vary enormously between orders, and an average that fits the mean order can badly misprice the tails. It does not model the batching benefit rigorously -- the travel saving from batching depends on how the combined orders' locations cluster, which is a routing problem -- and the figure used here is illustrative. It does not address slotting, zoning, pick path sequencing, or the sortation work batching creates, and it does not evaluate technology alternatives such as voice, light, or goods-to-person systems, which change the element structure rather than the element times. It takes no position on how a standard should be used for performance management or incentive pay, which is a labour relations matter with its own requirements. The facility's own time study or predetermined motion time data, the applicable labour agreements, and the industrial engineer govern.
