# roughlogic.com Specification v1383 -- Idle Fuel Burn, Cost, and Engine-Hour Equivalent (calc-trucking.js, Group J, trucking and logistics, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group J computes cost per mile, fuel surcharge, and a maintenance reserve, but idle time is invisible in all three -- it burns fuel and accumulates engine hours while the odometer does not move, so it lands nowhere in a per-mile model. For a fleet it is a five-figure annual line that nobody has costed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive idle rate, hours, fuel price, or truck count, or a negative operating-day count, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the diesel idle consumption rate and the engine-hour-to-road-mile equivalence used in maintenance scheduling, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `idle-fuel-cost` -- Idle Fuel Burn, Cost, and Engine-Hour Equivalent

```
annual idle hours = idle hours per day x operating days
annual gallons    = annual idle hours x gallons per hour
annual cost       = annual gallons x fuel price
fleet cost        = annual cost x trucks
equivalent miles  = annual idle hours x miles per engine hour
cost per mile add = fleet cost / fleet annual miles
```

A heavy-duty diesel at idle burns something near 0.8 gallons an hour, more with the HVAC loaded and more again on
an older engine. That is a small number per hour and a very large one per year, and because idling produces no
miles it is entirely absent from a cost-per-mile model built from fuel divided by odometer -- it silently inflates
the per-mile fuel number instead of appearing as its own line.

The engine-hour line is the second cost and the one fleets underestimate. Maintenance intervals are driven by
engine hours as much as by miles, and an idling hour is conventionally counted as somewhere around seven road
miles of wear. A truck idling six hours a day accrues the maintenance equivalent of a substantial extra route
every year, and it will reach its overhaul on the odometer far earlier than the mileage suggests.

**Inputs:** idle hours per day, operating days per year, idle fuel rate (gal/hr), fuel price, number of trucks,
miles per idle engine hour, fleet annual miles (for the per-mile line).

**Outputs:** annual idle hours, gallons, cost per truck and for the fleet, equivalent road miles of engine wear,
and the cents-per-mile the idling adds.

## 3. Worked example

A truck idling 6 hours a day, 250 operating days, 0.8 gal/hr, diesel at $4.10, across a 20-truck fleet:

```
annual idle hours = 6 x 250            = 1,500 hr
annual gallons    = 1,500 x 0.8        = 1,200 gal
annual cost       = 1,200 x 4.10       = $4,920 per truck
fleet cost        = 4,920 x 20         = $98,400
equivalent miles  = 1,500 x 7          = 10,500 miles of engine wear per truck
```

Nearly a hundred thousand dollars of fuel that produced no revenue miles, plus the maintenance equivalent of
adding 10,500 miles to every truck in the fleet. Against 110,000 fleet miles per truck, the idle fuel alone adds
4.5 cents to every mile the fleet runs -- which is roughly what an APU or a bunk heater costs to amortize, and
that is the comparison the tile exists to make.

## 4. Scope and non-goals

A cost model, not an idle policy. Idle rate varies with engine, ambient temperature, accessory load, and engine
speed, and should be measured from the truck's own ECM data rather than assumed -- most modern engines report
idle hours and idle fuel directly. The miles-per-engine-hour equivalence is a maintenance convention, not a
measurement. The tile does not model APU or bunk-heater fuel, does not account for the state and municipal
anti-idling regulations that make some of this idling illegal in the first place, and does not address the
sleeper-berth comfort and safety reasons the idling is happening. The engine manufacturer, the ECM data, and
state anti-idling law govern.
