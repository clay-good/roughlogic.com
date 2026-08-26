# roughlogic.com Specification v1350 -- Ice Machine Capacity and Bin Sizing (calc-kitchen.js, Group O, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group O has 19 tiles and none of them size the single most-specified piece of equipment in a food-service package. A reader picking an ice machine has to convert covers into pounds per day, then derate the nameplate for the room and water temperature the machine will actually see, then size a bin that is not the same number. No existing tile does any of the three.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive cover count, pounds per cover, derate factor, or utilization, or a derate or utilization outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the manufacturer AHRI 810 rating condition (70 F air / 50 F water) and the standard derate practice, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `ice-machine-sizing` -- Ice Machine Capacity and Bin Sizing

```
daily demand (lb/day) = covers x lb per cover
required nameplate    = daily demand / (derate factor x utilization)
bin capacity          = daily demand x peak-period fraction
```

Ice machines are cataloged at the AHRI 810 rating point -- 70 F ambient air and 50 F inlet water. A machine in a
real kitchen sees neither. At 90 F air and 70 F water the same machine makes roughly 20% less ice, so the nameplate
must be bought oversized or the bin runs dry at the dinner rush. Utilization is the second derate: a machine run at
100% duty has no recovery margin and no room for a bad day, so the practice is to size it to about 90%.

The bin is a separate question from the machine. The machine is sized for the *day*; the bin is sized for the
*peak block*, the fraction of the day's ice that has to be sitting in the bin when the rush starts, because
production during the rush is slower than draw. A bin sized to the daily figure is money spent on stainless.

**Inputs:** covers per day, pounds of ice per cover, derate factor for the installed air and water temperature,
target utilization, peak-period fraction of daily demand.

**Outputs:** daily ice demand (lb/day), required nameplate production at the rating point (lb/day), and required
bin capacity (lb), with the derate and utilization that produced them.

## 3. Worked example

A 300-cover restaurant at 1.5 lb of ice per cover, machine room at 90 F with 70 F make-up water (derate 0.80),
sized to 90% utilization, with 40% of the day's ice needed in the bin at the start of dinner:

```
daily demand   = 300 x 1.5           = 450 lb/day
nameplate      = 450 / (0.80 x 0.90) = 625 lb/day at 70/50
bin            = 450 x 0.40          = 180 lb
```

So a 500 lb/day machine is undersized by a fifth and a 700 lb/day machine is the buy. Sanity check the derate: at
the rating point itself (derate 1.00) the same restaurant needs only 500 lb/day of nameplate, and the whole 125 lb
difference is the room and the water, not the menu.

## 4. Scope and non-goals

Pounds per cover is a planning benchmark, not a measurement -- a bar-heavy concept runs well above 1.5 and a
quick-service counter well below. The tile does not pick a cube style, size the condenser water or the drain, or
check the electrical branch circuit (the catalog's existing branch-circuit tiles do that). Remote and
water-cooled condensers derate on a different curve than the air-cooled figure this tile assumes. A planning aid;
the manufacturer's capacity curve and the AHJ govern.
