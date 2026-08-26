# roughlogic.com Specification v1418 -- Refrigerant Recovery Time and Cylinder Fill Limit (calc-hvacservice.js, Group C, HVAC and refrigeration service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, HVAC and refrigeration service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Recovery is a legally required step with two numbers attached and the catalog has neither: how long the recovery will take, and how much refrigerant the cylinder on the floor may legally hold. The cylinder limit in particular is not the number stamped on the cylinder -- it is 80% of water capacity adjusted for the refrigerant's density, and overfilling a recovery cylinder is both an EPA violation and a rupture hazard.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive charge, recovery rate, or cylinder water capacity, or a specific gravity or fill fraction at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the DOT and EPA 80 percent maximum fill requirement for recovery cylinders and the EPA Section 608 recovery requirements, cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `refrigerant-recovery-time` -- Refrigerant Recovery Time and Cylinder Fill Limit

```
liquid phase time = liquid charge / liquid recovery rate
vapor phase time  = vapor charge / vapor recovery rate
total time        = liquid + vapor + evacuation to the required vacuum
max cylinder fill = 0.80 x cylinder water capacity x refrigerant specific gravity
remaining room    = max fill - current net weight
```

Recovery time is dominated by the vapor phase, and by a large margin. A recovery machine moving liquid in push-pull
handles pounds per minute; the same machine pulling the last vapor out to the required vacuum moves a fraction of
that, and it slows further as pressure falls. Recovering liquid first, wherever the system and the machine allow
it, is the difference between a ten-minute job and an hour-long one.

The fill limit is the safety number. A recovery cylinder is rated by *water capacity* -- the weight of water it
would hold -- and DOT and EPA both cap the fill at 80% of that, so the cylinder never becomes liquid-full at
elevated temperature. The refrigerant's specific gravity then converts water pounds to refrigerant pounds, and
because most refrigerants are denser than water the limit is *more* pounds than 80% of the water capacity, not
fewer. A "50 lb" cylinder is a water-capacity designation and holds a different net weight of every refrigerant.
Weighing the cylinder, not guessing, is the only way to know, and the float switch is a backup rather than the
method.

**Inputs:** total charge and the split between liquid and vapor recovery, liquid and vapor recovery rates,
evacuation time, cylinder water capacity, refrigerant specific gravity, cylinder tare weight, current gross
weight.

**Outputs:** liquid, vapor, and total recovery time; maximum legal fill in net pounds; current net weight; and
remaining capacity.

## 3. Worked example

A 45 lb charge recovered 30 lb as liquid at 8 lb/min and 15 lb as vapor at 3 lb/min, into a cylinder with a 47.7 lb
water capacity, refrigerant specific gravity 1.06:

```
liquid time = 30 / 8            = 3.75 min
vapor time  = 15 / 3            = 5.00 min
recovery    = 8.75 min, plus evacuation to the required vacuum
max fill    = 0.80 x 47.7 x 1.06 = 40.4 lb net
```

The recovery itself is under nine minutes -- but the cylinder cannot take the charge. Forty-five pounds into a
40.4 lb limit means a second cylinder, and a technician who put it all in one would be over by more than four
pounds with no visible sign of it. Note also the phase split: pulling all 45 lb as vapor at 3 lb/min would have
taken 15 minutes rather than 8.75, and on a large system that ratio is the whole afternoon.

## 4. Scope and non-goals

Time and capacity arithmetic. It does not tell you the required evacuation level, which depends on the equipment
size, the refrigerant, and whether the appliance is being opened for service or disposed of -- those levels are
set in EPA regulation under Section 608 and they are not optional. It does not address recovery machine selection,
cylinder inspection and hydrostatic test dates, the prohibition on mixing refrigerants in one cylinder, tare
weight verification, or the record-keeping the regulation requires. Handling refrigerant requires EPA Section 608
certification. The EPA, DOT, the cylinder manufacturer, and the equipment manufacturer govern.
