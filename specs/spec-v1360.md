# roughlogic.com Specification v1360 -- Par Level and Order Quantity (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has economic order quantity and reorder point for an inventory-carrying business, but a kitchen does not order that way. It orders to a par -- enough on the shelf to cover the lead time plus the interval until the next delivery -- and converts the shortfall to whole cases. Neither the par arithmetic nor the case rounding is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive usage rate, lead time, order cycle, or pack size, a negative on-hand or on-order quantity, or a safety factor below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the par-level inventory method used in food service (usage x coverage period x safety factor), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `par-level-order` -- Par Level and Order Quantity

```
coverage days = lead time + order cycle
par level     = average daily usage x coverage days x (1 + safety factor)
order needed  = par level - on hand - on order
cases         = ceil(order needed / units per case)
```

A par is not a minimum and it is not an average -- it is the quantity that has to be on the shelf at the moment
an order is placed so the kitchen does not run out before the *next* delivery lands. That is two intervals, not
one: the lead time until this order arrives, plus the full cycle until the following order arrives. Sizing a par
to lead time alone is the single most common way a walk-in runs dry on a Saturday.

The last line is what separates this from a spreadsheet. Food arrives in cases, so the order is always rounded
up, and the tile reports both the raw shortfall and the whole cases -- along with the overshoot, which is what
lands in the walk-in as excess and eventually as waste.

**Inputs:** average daily usage (in the counting unit), lead time (days), order cycle (days), safety factor,
quantity on hand, quantity already on order, units per case.

**Outputs:** coverage days, par level, order needed, whole cases to order, and the overshoot above par that the
case rounding creates.

## 3. Worked example

A protein used at 24 lb/day, 2-day lead time, ordered every 3 days, 25% safety factor, 40 lb on hand, nothing on
order, 10 lb cases:

```
coverage = 2 + 3                    = 5 days
par      = 24 x 5 x 1.25            = 150 lb
order    = 150 - 40 - 0             = 110 lb
cases    = ceil(110 / 10)           = 11 cases (110 lb, no overshoot)
```

Drop the safety factor to zero and the par falls to 120 lb and the order to 8 cases -- 30 lb less inventory, and
a stockout on any day usage runs a quarter above average. That is the trade the safety factor is buying, stated
in cases.

## 4. Scope and non-goals

Average daily usage is an input, not a forecast: the tile does not know about a banquet on Friday, a holiday, or
a seasonal swing, and a par built on a flat average will be short in every peak. It assumes deliveries arrive on
schedule and complete. It does not model shelf life, which caps the par independently -- a five-day par on a
three-day product is spoilage, not inventory, and the tile will not stop you. It does not price the order. The
distributor's order guide and the product's shelf life govern.
